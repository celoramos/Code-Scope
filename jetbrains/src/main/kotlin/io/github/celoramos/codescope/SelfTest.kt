package io.github.celoramos.codescope

import com.intellij.execution.ProgramRunnerUtil
import com.intellij.execution.RunManager
import com.intellij.execution.application.ApplicationConfiguration
import com.intellij.execution.application.ApplicationConfigurationType
import com.intellij.execution.executors.DefaultDebugExecutor
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.WriteAction
import com.intellij.openapi.components.service
import com.intellij.openapi.module.ModuleManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.projectRoots.JavaSdk
import com.intellij.openapi.projectRoots.ProjectJdkTable
import com.intellij.openapi.roots.CompilerProjectExtension
import com.intellij.openapi.roots.ModuleRootModificationUtil
import com.intellij.openapi.roots.ProjectRootManager
import com.intellij.openapi.startup.ProjectActivity
import com.intellij.openapi.project.DumbService
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.wm.WindowManager
import java.awt.Frame
import com.intellij.xdebugger.XDebuggerManager
import com.intellij.xdebugger.XDebuggerUtil
import java.io.File
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/*
 * Teste de ponta a ponta no IntelliJ de verdade, só com -Dcodescope.selfTest=Classe:linha:passos:saída.
 * Abre o exemplo, põe um breakpoint, debuga, dá F8 os passos pedidos e grava
 * os snapshots que o painel montou. jetbrains/self-test.ts compara com os do VS Code.
 */
class SelfTest : ProjectActivity {
    override suspend fun execute(project: Project) {
        val spec = System.getProperty("codescope.selfTest") ?: return
        val (name, line, steps, out) = spec.split(":", limit = 4)
        // -PselfTest=Settings:0:0 monta Settings > Tools > Code Scope, muda os valores pela tela,
        // aplica, confere o que ficou salvo e escreve {"ok":true} (ou ERRO) na saída.
        if (name == "Settings") {
            val app = ApplicationManager.getApplication()
            app.invokeLater {
                val result = runCatching { checkSettings() }
                File(out).writeText(result.fold({ "{\"ok\":true}\n" }, { "ERRO: ${it.stackTraceToString()}" }))
                app.exit(true, true, false)
            }
            return
        }
        Thread { run(project, name, line.toInt(), steps.toInt(), File(out)) }.start()
    }

    private fun run(project: Project, name: String, line: Int, steps: Int, out: File) {
        val result = StringBuilder()
        try {
            val snapshots = LinkedBlockingQueue<String>()
            project.service<CodeScopeService>().onSnapshot = { snapshots.add(it) }
            // Para o diagnóstico: cada execução que começou, como terminou e o que o programa escreveu.
            project.messageBus.connect().subscribe(com.intellij.execution.ExecutionManager.EXECUTION_TOPIC, object : com.intellij.execution.ExecutionListener {
                override fun processStarted(executorId: String, env: com.intellij.execution.runners.ExecutionEnvironment, handler: com.intellij.execution.process.ProcessHandler) {
                    executions.add("começou (${env.runProfile.name})")
                    handler.addProcessListener(object : com.intellij.execution.process.ProcessListener {
                        override fun onTextAvailable(event: com.intellij.execution.process.ProcessEvent, outputType: com.intellij.openapi.util.Key<*>) {
                            console.add(event.text.trim())
                            while (console.size > 15) console.poll()
                        }
                    })
                }
                override fun processNotStarted(executorId: String, env: com.intellij.execution.runners.ExecutionEnvironment) {
                    executions.add("não começou (${env.runProfile.name})")
                }
                override fun processTerminated(executorId: String, env: com.intellij.execution.runners.ExecutionEnvironment, handler: com.intellij.execution.process.ProcessHandler, exitCode: Int) {
                    executions.add("terminou com $exitCode")
                }
            })
            val dir = project.basePath!!
            // Com a IDE ainda indexando, a configuração de execução pode sair sem SDK.
            DumbService.getInstance(project).waitForSmartMode()
            lateinit var settings: com.intellij.execution.RunnerAndConfigurationSettings
            ApplicationManager.getApplication().invokeAndWait {
                WindowManager.getInstance().getFrame(project)?.extendedState = Frame.MAXIMIZED_BOTH
                lateinit var jdk: com.intellij.openapi.projectRoots.Sdk
                WriteAction.run<Throwable> {
                    val home = System.getProperty("codescope.jdk")
                    val table = ProjectJdkTable.getInstance()
                    jdk = table.findJdk("codescope-jdk") ?: JavaSdk.getInstance().createJdk("codescope-jdk", home, false).also(table::addJdk)
                    ProjectRootManager.getInstance(project).projectSdk = jdk
                    CompilerProjectExtension.getInstance(project)!!.compilerOutputUrl = "file://$dir/out"
                }
                val module = ModuleManager.getInstance(project).modules.first()
                val root = LocalFileSystem.getInstance().refreshAndFindFileByPath(dir)!!
                ModuleRootModificationUtil.updateModel(module) { model ->
                    val entry = model.contentEntries.firstOrNull() ?: model.addContentEntry(root)
                    if (entry.sourceFolders.isEmpty()) entry.addSourceFolder(root, false)
                    model.sdk = jdk
                    // As classes vão para out/, compiladas pelo javac abaixo.
                    model.getModuleExtension(com.intellij.openapi.roots.CompilerModuleExtension::class.java).apply {
                        inheritCompilerOutputPath(false)
                        setCompilerOutputPath("file://$dir/out")
                    }
                }
                val file = LocalFileSystem.getInstance().refreshAndFindFileByPath("$dir/$name.java")!!
                XDebuggerUtil.getInstance().toggleLineBreakpoint(project, file, line - 1)
                settings = RunManager.getInstance(project).createConfiguration(name, ApplicationConfigurationType::class.java)
                (settings.configuration as ApplicationConfiguration).apply {
                    mainClassName = name
                    setModule(module)
                    // Sem o build da IDE antes de rodar: no CI ele falha de vez em quando e o programa
                    // "não começa". O javac abaixo compila os exemplos do mesmo jeito toda vez.
                    beforeRunTasks = emptyList()
                }
            }
            compileSamples(dir)
            val launch = {
                ApplicationManager.getApplication().invokeAndWait {
                    ProgramRunnerUtil.executeConfiguration(settings, DefaultDebugExecutor.getDebugExecutorInstance())
                }
            }
            // Trocar o SDK do módulo reindexa o projeto, e uma execução pedida durante a indexação
            // não sai: espera de novo, lança e confere se a sessão de debug apareceu (até 3 vezes).
            val debugging = { XDebuggerManager.getInstance(project).currentSession != null }
            for (attempt in 1..3) {
                DumbService.getInstance(project).waitForSmartMode()
                launch()
                val until = System.currentTimeMillis() + 60_000
                while (!debugging() && snapshots.isEmpty() && System.currentTimeMillis() < until) Thread.sleep(500)
                if (debugging() || snapshots.isNotEmpty()) break
            }
            result.append("[\n")
            for (k in 0..steps) {
                val snap = snapshots.poll(180, TimeUnit.SECONDS)
                // O programa acabou (depois de um erro, por exemplo): fica o que chegou até aqui.
                if (snap == null && k > 0 && XDebuggerManager.getInstance(project).currentSession == null) break
                snap ?: error("o passo $k não chegou ao painel. ${diagnostics(project)}")
                if (k > 0) result.append(",\n")
                result.append(snap)
                if (k == steps) break
                // codescope.stepDelay (ms) segura cada passo na tela, para gravar o painel animando.
                Thread.sleep(System.getProperty("codescope.stepDelay")?.toLong() ?: 0)
                val session = XDebuggerManager.getInstance(project).currentSession ?: break
                // codescope.stepInto=true usa o F7 (entra nas funções), como os exemplos de recursão pedem.
                val into = System.getProperty("codescope.stepInto") == "true"
                ApplicationManager.getApplication().invokeAndWait { if (into) session.stepInto() else session.stepOver(false) }
            }
            result.append("\n]\n")
            out.writeText(result.toString())
        } catch (e: Throwable) {
            out.writeText("ERRO: ${e.stackTraceToString()}\n$result")
        } finally {
            ApplicationManager.getApplication().invokeLater { ApplicationManager.getApplication().exit(true, true, false) }
        }
    }
}

/** A tela de configurações monta, e o que muda nela fica salvo ao aplicar; depois volta aos padrões. */
private fun checkSettings() {
    val values = CodeScopeSettings.current
    val configurable = CodeScopeConfigurable()
    val component = configurable.createComponent()
    check(component.componentCount > 0) { "tela de configurações vazia" }
    check(!configurable.isModified) { "tela nova já aparece modificada" }
    val boxes = mutableListOf<javax.swing.JCheckBox>()
    fun collect(c: java.awt.Container) {
        for (child in c.components) {
            if (child is javax.swing.JCheckBox) boxes.add(child)
            if (child is java.awt.Container) collect(child)
        }
    }
    collect(component)
    check(boxes.size == 3) { "esperava 3 caixas de marcar, achei ${boxes.size}" }
    boxes.forEach { it.isSelected = !it.isSelected }
    check(configurable.isModified) { "mudar a caixa não marcou a tela como modificada" }
    configurable.apply()
    check(!values.beginnerMode && !values.revealOnDebug && !values.pauseOnErrors) { "aplicar não salvou as caixas" }
    values.beginnerMode = true
    values.revealOnDebug = true
    values.pauseOnErrors = true
    configurable.disposeUIResources()
}

/** Por que um passo não chegou: houve sessão de debug, o painel montou, o JCEF funciona aqui, o painel reclamou de algo. */
private val executions = java.util.concurrent.ConcurrentLinkedQueue<String>()
private val console = java.util.concurrent.ConcurrentLinkedQueue<String>()

private fun diagnostics(project: Project): String {
    val session = XDebuggerManager.getInstance(project).currentSession
    val service = project.service<CodeScopeService>()
    return "sessão de debug: ${session?.let { if (it.isSuspended) "parada" else "rodando" } ?: "nenhuma"}; " +
        "painel montado: ${service.hasPanel} (${service.panelState}); JCEF: ${com.intellij.ui.jcef.JBCefApp.isSupported()}; " +
        "erros do painel: ${service.panelErrors.joinToString(" | ").take(1500)}; " +
        "execuções: ${executions.joinToString(", ")}; console: ${console.filter { it.isNotBlank() }.joinToString(" / ").take(1500)}"
}

/** javac -g de todos os exemplos para out/, com o JDK do teste. */
private fun compileSamples(dir: String) {
    val home = System.getProperty("codescope.jdk")
    val javac = File(home, if (System.getProperty("os.name").startsWith("Windows")) "bin/javac.exe" else "bin/javac")
    val sources = File(dir).listFiles { f -> f.extension == "java" }!!.map { it.absolutePath }
    val process = ProcessBuilder(listOf(javac.absolutePath, "-g", "-encoding", "UTF-8", "-d", "$dir/out") + sources)
        .redirectErrorStream(true).start()
    val output = process.inputStream.bufferedReader().readText()
    check(process.waitFor() == 0) { "javac falhou: ${output.take(1500)}" }
    LocalFileSystem.getInstance().refreshAndFindFileByPath("$dir/out")
}

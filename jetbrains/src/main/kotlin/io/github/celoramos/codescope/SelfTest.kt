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
        Thread { run(project, name, line.toInt(), steps.toInt(), File(out)) }.start()
    }

    private fun run(project: Project, name: String, line: Int, steps: Int, out: File) {
        val result = StringBuilder()
        try {
            val snapshots = LinkedBlockingQueue<String>()
            project.service<CodeScopeService>().onSnapshot = { snapshots.add(it) }
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
                }
                val file = LocalFileSystem.getInstance().refreshAndFindFileByPath("$dir/$name.java")!!
                XDebuggerUtil.getInstance().toggleLineBreakpoint(project, file, line - 1)
                settings = RunManager.getInstance(project).createConfiguration(name, ApplicationConfigurationType::class.java)
                (settings.configuration as ApplicationConfiguration).apply {
                    mainClassName = name
                    setModule(module)
                }
            }
            val launch = {
                ApplicationManager.getApplication().invokeAndWait {
                    ProgramRunnerUtil.executeConfiguration(settings, DefaultDebugExecutor.getDebugExecutorInstance())
                }
            }
            launch()
            result.append("[\n")
            for (k in 0..steps) {
                var snap = snapshots.poll(120, TimeUnit.SECONDS)
                // A primeira execução às vezes não sai (a IDE ainda arrumando o projeto): uma segunda tentativa.
                if (snap == null && k == 0 && XDebuggerManager.getInstance(project).currentSession == null) {
                    launch()
                    snap = snapshots.poll(180, TimeUnit.SECONDS)
                }
                snap ?: error("o passo $k não chegou ao painel")
                if (k > 0) result.append(",\n")
                result.append(snap)
                if (k == steps) break
                // codescope.stepDelay (ms) segura cada passo na tela, para gravar o painel animando.
                Thread.sleep(System.getProperty("codescope.stepDelay")?.toLong() ?: 0)
                val session = XDebuggerManager.getInstance(project).currentSession ?: break
                ApplicationManager.getApplication().invokeAndWait { session.stepOver(false) }
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

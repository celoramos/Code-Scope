package io.github.celoramos.codescope

import com.google.gson.JsonObject
import com.intellij.debugger.engine.JavaDebugProcess
import com.intellij.debugger.engine.SuspendContextImpl
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.xdebugger.XDebugSession
import java.util.Base64
import javax.swing.JComponent

/** Liga as sessões de debug da IDE ao painel do projeto. */
@Service(Service.Level.PROJECT)
class CodeScopeService(private val project: Project) : Disposable {
    private val log = logger<CodeScopeService>()
    private var panel: CodeScopePanel? = null
    /** O painel já foi montado nesta janela (o SelfTest usa no diagnóstico). */
    val hasPanel get() = panel != null
    /** Erros que o painel mandou; o SelfTest põe no diagnóstico. */
    val panelErrors = java.util.concurrent.ConcurrentLinkedQueue<String>()
    /** O que acontece antes de o painel existir fica guardado para quando ele abrir. */
    private val early = mutableListOf<JsonObject>()
    @Volatile private var dap: JavaDap? = null
    private var revealed = false
    /** Usado pelo SelfTest: cada snapshot que o painel montou, em JSON. */
    @Volatile var onSnapshot: ((String) -> Unit)? = null

    fun createPanel(parent: Disposable): JComponent {
        // Sem o navegador embutido (desligado em algumas instalações), o painel não tem onde desenhar.
        if (!com.intellij.ui.jcef.JBCefApp.isSupported()) return noBrowserMessage()
        val p = CodeScopePanel(parent, ::request)
        panel = p
        p.send(settingsEvent())
        early.splice().forEach(p::send)
        return p.component
    }

    private fun settingsEvent(): JsonObject {
        val s = CodeScopeSettings.current
        return obj("type" to "settings", "animationSpeed" to s.animationSpeed, "maxElements" to s.maxElements, "beginnerMode" to s.beginnerMode)
    }

    /** Configurações mudaram em Settings > Tools > Code Scope. */
    fun sendSettings() = send(settingsEvent())

    private fun send(event: JsonObject) {
        ApplicationManager.getApplication().invokeLater {
            panel?.send(event) ?: early.add(event)
        }
    }

    fun sessionStarted() {
        dap = null
        revealed = false
        early.clear()
        send(obj("type" to "session-start"))
    }

    fun sessionStopped() {
        dap = null
        send(obj("type" to "session-end"))
    }

    fun paused(session: XDebugSession) {
        val process = (session.debugProcess as? JavaDebugProcess)?.debuggerSession?.process ?: return
        val context = session.suspendContext as? SuspendContextImpl ?: return
        val d = JavaDap(project, session, process, context)
        dap = d
        ApplicationManager.getApplication().executeOnPooledThread {
            val reason = runCatching { d.reason() }.getOrDefault("breakpoint")
            send(obj("type" to "stopped", "threadId" to 1, "reason" to reason, "debugType" to "java"))
        }
        revealOnFirstStop()
    }

    /** Abre o painel na primeira parada, sem tirar o foco do editor (o F8 continua andando). */
    private fun revealOnFirstStop() {
        if (revealed || !CodeScopeSettings.current.revealOnDebug) return
        revealed = true
        ApplicationManager.getApplication().invokeLater {
            ToolWindowManager.getInstance(project).getToolWindow("Code Scope")?.show(null)
        }
    }

    /** Requisições do painel (HostRequest em src/host/bridge.ts). */
    private fun request(req: JsonObject): Any? = when (req.get("kind").asString) {
        "dap" -> {
            val d = dap ?: throw IllegalStateException("o programa não está parado")
            d.handle(req.get("command").asString, req.get("args")?.takeIf { it.isJsonObject }?.asJsonObject)
        }
        "source" -> readSource(req.get("file").asString)
        "focus-editor" -> {
            ApplicationManager.getApplication().invokeLater {
                FileEditorManager.getInstance(project).selectedTextEditor?.contentComponent?.requestFocusInWindow()
            }
            null
        }
        "save-image" -> {
            saveImage(req.get("data").asString, req.get("step").asInt)
            null
        }
        "log" -> {
            val text = req.get("text").asString
            if (text.startsWith("snapshot ")) onSnapshot?.invoke(text.removePrefix("snapshot "))
            if (req.get("level").asString == "error") {
                log.warn(text)
                panelErrors.add(text)
            } else {
                log.debug(text)
            }
            null
        }
        else -> null
    }

    /** Texto do arquivo como está no editor, mesmo antes de salvar. */
    private fun readSource(path: String): String? = ReadAction.compute<String?, Throwable> {
        val file = LocalFileSystem.getInstance().findFileByPath(path) ?: return@compute null
        FileDocumentManager.getInstance().getDocument(file)?.text
    }

    private fun saveImage(data: String, step: Int) {
        val bytes = Base64.getDecoder().decode(data.substringAfter(","))
        ApplicationManager.getApplication().invokeLater {
            val dialog = FileChooserFactory.getInstance()
                .createSaveFileDialog(FileSaverDescriptor("Code Scope", "", "png"), project)
            val target = dialog.save("code-scope-passo-$step.png") ?: return@invokeLater
            target.file.writeBytes(bytes)
        }
    }

    override fun dispose() {}
}

private fun <T> MutableList<T>.splice(): List<T> = toList().also { clear() }

/** O que aparece no lugar do painel quando a IDE roda sem o navegador embutido (JCEF). */
private fun noBrowserMessage(): JComponent {
    val pt = java.util.Locale.getDefault().language == "pt"
    val text = if (pt) {
        "<html>O Code Scope desenha o painel no navegador embutido da IDE (JCEF), que está desligado aqui.<br><br>" +
            "Ligue em Help &gt; Find Action &gt; <b>Choose Boot Java Runtime for the IDE</b>, escolhendo um runtime com JCEF, e reinicie a IDE.</html>"
    } else {
        "<html>Code Scope draws its panel in the IDE's built-in browser (JCEF), which is off here.<br><br>" +
            "Turn it on in Help &gt; Find Action &gt; <b>Choose Boot Java Runtime for the IDE</b>, picking a runtime with JCEF, and restart the IDE.</html>"
    }
    return com.intellij.ui.components.JBLabel(text).apply { border = com.intellij.util.ui.JBUI.Borders.empty(12) }
}

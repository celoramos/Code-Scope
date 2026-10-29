package io.github.celoramos.codescope

import com.intellij.debugger.engine.JavaDebugProcess
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.xdebugger.XDebugProcess
import com.intellij.xdebugger.XDebugSessionListener
import com.intellij.xdebugger.XDebuggerManagerListener

/** Cada sessão de debug de Java: início, paradas (F8, F7, breakpoints) e fim. */
class DebugListener(private val project: Project) : XDebuggerManagerListener {
    override fun processStarted(debugProcess: XDebugProcess) {
        if (debugProcess !is JavaDebugProcess) return
        val service = project.service<CodeScopeService>()
        val session = debugProcess.session
        service.sessionStarted()
        val restore = PauseOnErrors.enable(project)
        session.addSessionListener(object : XDebugSessionListener {
            override fun sessionPaused() = service.paused(session)
            override fun sessionStopped() {
                restore()
                service.sessionStopped()
            }
        })
    }
}

class CodeScopeToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val component = project.service<CodeScopeService>().createPanel(toolWindow.disposable)
        toolWindow.contentManager.addContent(ContentFactory.getInstance().createContent(component, null, false))
    }
}

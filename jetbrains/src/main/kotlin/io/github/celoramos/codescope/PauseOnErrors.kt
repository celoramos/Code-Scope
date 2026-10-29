package io.github.celoramos.codescope

import com.intellij.debugger.ui.breakpoints.JavaExceptionBreakpointType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.xdebugger.XDebuggerManager
import com.intellij.xdebugger.breakpoints.XBreakpointType
import org.jetbrains.java.debugger.breakpoints.properties.JavaExceptionBreakpointProperties

/*
 * Como a extensão do VS Code (src/debug/pauseOnErrors.ts): o programa para no
 * erro que ninguém tratou, para o painel mostrar a posição que não existe ou o
 * objeto null. O IntelliJ já tem o breakpoint "Any Exception"; ele fica ligado
 * só para erros não tratados durante a sessão e volta ao que era no fim.
 */
object PauseOnErrors {
    /** Liga e devolve como desfazer; não mexe se a pessoa já configurou esse breakpoint. */
    fun enable(project: Project): () -> Unit {
        val type = XBreakpointType.EXTENSION_POINT_NAME.findExtension(JavaExceptionBreakpointType::class.java) ?: return {}
        val manager = XDebuggerManager.getInstance(project).breakpointManager
        val breakpoint = manager.getDefaultBreakpoints(type).firstOrNull() ?: return {}
        if (breakpoint.isEnabled) return {}
        val properties = breakpoint.properties as? JavaExceptionBreakpointProperties ?: return {}
        val caught = properties.NOTIFY_CAUGHT
        val uncaught = properties.NOTIFY_UNCAUGHT
        val app = ApplicationManager.getApplication()
        app.invokeAndWait {
            properties.NOTIFY_CAUGHT = false
            properties.NOTIFY_UNCAUGHT = true
            breakpoint.isEnabled = true
        }
        return {
            app.invokeLater {
                breakpoint.isEnabled = false
                properties.NOTIFY_CAUGHT = caught
                properties.NOTIFY_UNCAUGHT = uncaught
            }
        }
    }
}

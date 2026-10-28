package io.github.celoramos.codescope

import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.ui.JBColor
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import java.awt.Color

/*
 * O CSS do painel usa as variáveis de cor do VS Code (--vscode-*). Aqui elas
 * vêm do tema da IDE, para o painel acompanhar o claro, o escuro e os outros.
 */
object Theme {
    private fun css(c: Color): String =
        if (c.alpha == 255) "#%02x%02x%02x".format(c.red, c.green, c.blue)
        else "rgba(${c.red}, ${c.green}, ${c.blue}, ${"%.2f".format(java.util.Locale.ROOT, c.alpha / 255.0)})"

    private fun named(key: String, fallback: Color) = css(JBColor.namedColor(key, fallback))

    fun vars(): Map<String, String> {
        val dark = !JBColor.isBright()
        val scheme = EditorColorsManager.getInstance().globalScheme
        val fg = UIUtil.getLabelForeground()
        val bg = UIUtil.getPanelBackground()
        val font = UIUtil.getLabelFont()
        val accent = JBUI.CurrentTheme.Focus.focusColor()
        return mapOf(
            "font-family" to "'${font.family}', system-ui, sans-serif",
            "font-size" to "${font.size}px",
            "editor-font-family" to "'${scheme.editorFontName}', monospace",
            "foreground" to css(fg),
            "descriptionForeground" to css(UIUtil.getContextHelpForeground()),
            "errorForeground" to named("Label.errorForeground", if (dark) Color(0xF8, 0x51, 0x49) else Color(0xC7, 0x22, 0x2D)),
            "focusBorder" to css(accent),
            "sideBar-background" to css(bg),
            "editor-background" to css(scheme.defaultBackground),
            "panel-border" to css(JBColor.border()),
            "widget-shadow" to "rgba(0, 0, 0, 0.3)",
            "textLink-foreground" to css(JBUI.CurrentTheme.Link.Foreground.ENABLED),
            "textLink-activeForeground" to css(JBUI.CurrentTheme.Link.Foreground.HOVERED),
            "button-background" to named("Button.default.startBackground", accent),
            "button-foreground" to named("Button.default.foreground", Color.WHITE),
            "button-hoverBackground" to named("Button.default.endBackground", accent),
            "toolbar-hoverBackground" to css(JBUI.CurrentTheme.ActionButton.hoverBackground()),
            "progressBar-background" to css(accent),
            "input-background" to named("TextField.background", bg),
            "input-foreground" to css(fg),
            "input-border" to css(JBColor.border()),
            "keybindingLabel-background" to "rgba(128, 128, 128, 0.17)",
            "keybindingLabel-foreground" to css(fg),
            "keybindingLabel-border" to "rgba(128, 128, 128, 0.4)",
            "keybindingLabel-bottomBorder" to "rgba(128, 128, 128, 0.5)",
            "editor-stackFrameHighlightBackground" to if (dark) "rgba(255, 255, 0, 0.2)" else "rgba(255, 255, 102, 0.45)",
            "charts-green" to if (dark) "#89d185" else "#388a34",
            "charts-yellow" to if (dark) "#cca700" else "#bf8803",
            "charts-red" to if (dark) "#f14c4c" else "#e51400",
            "charts-purple" to if (dark) "#b180d7" else "#652d90",
            "charts-orange" to if (dark) "#d18616" else "#d18616",
            "charts-blue" to if (dark) "#3794ff" else "#1a85ff",
        )
    }

    /** Para o atributo style do <html>: aspas simples, que não fecham o atributo. */
    fun inlineStyle(): String = vars().entries.joinToString("; ") { (k, v) -> "--vscode-$k: $v" }.replace("\"", "'")

    fun bodyClass(): String = if (JBColor.isBright()) "vscode-light" else "vscode-dark"

    /** Troca de tema com o painel aberto. */
    fun script(): String {
        val sets = vars().entries.joinToString("") { (k, v) ->
            "s.setProperty('--vscode-$k', ${com.google.gson.Gson().toJson(v)});"
        }
        return "(function(){var s=document.documentElement.style;$sets document.body.className=${com.google.gson.Gson().toJson(bodyClass())};})();"
    }
}

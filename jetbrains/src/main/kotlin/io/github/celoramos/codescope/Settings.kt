package io.github.celoramos.codescope

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.dsl.builder.bindIntText
import com.intellij.ui.dsl.builder.bindItem
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.panel
import java.util.Locale
import javax.swing.JComponent

/*
 * As mesmas configurações da extensão do VS Code (codeScope.* no settings.json),
 * em Settings > Tools > Code Scope.
 */
@Service(Service.Level.APP)
@State(name = "CodeScope", storages = [Storage("codeScope.xml")])
class CodeScopeSettings : PersistentStateComponent<CodeScopeSettings.Values> {
    class Values {
        var animationSpeed = "normal"
        var beginnerMode = true
        var maxElements = 50
        var revealOnDebug = true
        var pauseOnErrors = true
    }

    private var values = Values()
    override fun getState() = values
    override fun loadState(state: Values) {
        values = state
    }

    companion object {
        val current: Values get() = service<CodeScopeSettings>().state
    }
}

class CodeScopeConfigurable : Configurable {
    private val pt = Locale.getDefault().language == "pt"
    private fun t(pt: String, en: String) = if (this.pt) pt else en
    private var ui: DialogPanel? = null
    private val speeds = listOf("slow", "normal", "fast", "off")
    private fun speedLabel(s: String) = when (s) {
        "slow" -> t("Lenta", "Slow")
        "fast" -> t("Rápida", "Fast")
        "off" -> t("Desligada", "Off")
        else -> "Normal"
    }

    override fun getDisplayName() = "Code Scope"

    override fun createComponent(): JComponent {
        val v = CodeScopeSettings.current
        val p = panel {
            row(t("Velocidade das animações:", "Animation speed:")) {
                comboBox(speeds, com.intellij.ui.SimpleListCellRenderer.create("") { speedLabel(it) })
                    .bindItem({ v.animationSpeed }, { v.animationSpeed = it ?: "normal" })
            }
            row {
                checkBox(t("Modo iniciante: uma frase explica o que mudou em cada passo", "Beginner mode: a sentence explains what changed in each step"))
                    .bindSelected(v::beginnerMode)
            }
            row(t("Posições lidas de cada array:", "Positions read from each array:")) {
                intTextField(1..500).bindIntText(v::maxElements)
            }
            row {
                checkBox(t("Abrir o painel na primeira parada do debug", "Open the panel on the first debugger stop"))
                    .bindSelected(v::revealOnDebug)
            }
            row {
                checkBox(t("Parar o programa em erros que ninguém trata", "Pause the program on errors nobody handles"))
                    .bindSelected(v::pauseOnErrors)
            }
        }
        ui = p
        return p
    }

    override fun isModified() = ui?.isModified() ?: false

    override fun apply() {
        ui?.apply()
        // Os painéis abertos pegam a mudança na hora.
        for (project in ProjectManager.getInstance().openProjects) project.service<CodeScopeService>().sendSettings()
    }

    override fun reset() {
        ui?.reset()
    }

    override fun disposeUIResources() {
        ui = null
    }
}

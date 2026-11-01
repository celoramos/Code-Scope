package io.github.celoramos.codescope

import com.intellij.ide.impl.ProjectUtil
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileChooser.FileChooser
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.ui.Messages
import java.nio.file.Files
import java.nio.file.Path
import java.util.Locale

/* Os dois comandos do menu Tools que vêm da extensão do VS Code. */

private fun inPortuguese() = Locale.getDefault().language == "pt"

/** Modo apresentação: o painel maximizado, com letra maior e animações mais lentas. */
class PresentationAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        project.getService(CodeScopeService::class.java).togglePresentation()
    }
}

/**
 * "Abrir um exemplo": copia os exemplos de Java, que vão dentro do plugin, para
 * <pasta>/code-scope-java e abre essa pasta. Uma pasta que já existe fica como
 * está: a pessoa pode ter mexido nos exemplos.
 */
class OpenSampleAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val descriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
            .withTitle(if (inPortuguese()) "Onde salvar os exemplos?" else "Where should the samples go?")
        val parent = FileChooser.chooseFile(descriptor, e.project, null) ?: return
        val target = Path.of(parent.path).resolve("code-scope-java")
        try {
            if (!Files.exists(target)) copySamples(target)
        } catch (error: java.io.IOException) {
            Messages.showErrorDialog(e.project, error.message ?: error.toString(), "Code Scope")
            return
        }
        ProjectUtil.openOrImport(target, null, true)
    }

    private fun copySamples(target: Path) {
        Files.createDirectories(target)
        val names = resource("/samples/java/index.txt").reader().readLines().filter { it.isNotBlank() }
        for (name in names) resource("/samples/java/$name").use { Files.copy(it, target.resolve(name)) }
    }

    private fun resource(path: String) = javaClass.getResourceAsStream(path) ?: throw java.io.IOException("$path não está no plugin")
}

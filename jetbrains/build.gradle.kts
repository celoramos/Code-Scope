plugins {
    id("org.jetbrains.kotlin.jvm") version "2.4.20"
    id("org.jetbrains.intellij.platform") version "2.19.0"
}

group = "io.github.celoramos"
version = "0.7.0"

repositories {
    mavenCentral()
    intellijPlatform { defaultRepositories() }
}

dependencies {
    intellijPlatform {
        val local = providers.gradleProperty("ideaLocal")
        if (local.isPresent) local(local.get()) else intellijIdea(providers.gradleProperty("platformVersion"))
        bundledPlugin("com.intellij.java")
        // Desde a 2026.2 o navegador embutido (JCEF) é um plugin à parte.
        bundledPlugin("com.intellij.modules.jcef")
    }
}

kotlin { jvmToolchain(21) }

intellijPlatform {
    pluginConfiguration {
        ideaVersion { sinceBuild = "262" }
    }
    // Token do Marketplace da JetBrains; o release.yml passa pelo segredo JETBRAINS_TOKEN.
    publishing { token = providers.environmentVariable("JETBRAINS_TOKEN") }
    buildSearchableOptions = false
    // Sem formulários do GUI Designer: nada para instrumentar.
    instrumentCode = false
}

// O painel (HTML com o núcleo TypeScript dentro) sai do repositório principal: npx tsx jetbrains/bundle-panel.ts
val bundlePanel by tasks.registering(Exec::class) {
    workingDir = rootDir.parentFile
    commandLine(if (System.getProperty("os.name").startsWith("Windows")) listOf("cmd", "/c", "npx", "tsx", "jetbrains/bundle-panel.ts") else listOf("npx", "tsx", "jetbrains/bundle-panel.ts"))
    inputs.dir(rootDir.parentFile.resolve("src"))
    inputs.dir(rootDir.parentFile.resolve("media"))
    outputs.dir(layout.projectDirectory.dir("src/main/resources/codescope"))
}
tasks.processResources { dependsOn(bundlePanel) }

// Teste de ponta a ponta: ./gradlew runIde -PselfTest=BubbleSort:6:12 abre uma cópia de
// samples/java no IntelliJ, debuga e grava os snapshots em build/self-test/<Classe>.json.
tasks.runIde {
    val spec = providers.gradleProperty("selfTest")
    if (spec.isPresent) {
        val name = spec.get().substringBefore(":")
        val work = layout.buildDirectory.dir("self-test/project-$name").get().asFile
        val out = layout.buildDirectory.file("self-test/$name.json").get().asFile
        val outPath = out.invariantSeparatorsPath
        doFirst {
            work.deleteRecursively()
            rootDir.parentFile.resolve("samples/java").listFiles { f -> f.extension == "java" }!!.forEach { it.copyTo(work.resolve(it.name)) }
            out.delete()
        }
        jvmArgs("-Xmx1200m", "-Dcodescope.selfTest=${spec.get()}:$outPath", "-Dcodescope.jdk=${System.getProperty("java.home")}",
            "-Didea.trust.all.projects=true", "-Djb.consents.confirmation.enabled=false", "-Didea.initially.ask.config=never",
            "-Dcodescope.stepDelay=${providers.gradleProperty("stepDelay").getOrElse("0")}")
        args(work.absolutePath)
    }
}

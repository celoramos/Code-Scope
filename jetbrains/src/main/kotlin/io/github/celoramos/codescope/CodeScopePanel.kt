package io.github.celoramos.codescope

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.util.Locale
import javax.swing.JComponent

/*
 * O painel do Code Scope num navegador embutido (JCEF). O HTML traz o painel,
 * o modelo e o coletor (src/host/standalone.ts); esta classe só leva os
 * eventos do depurador para ele e responde as requisições que ele faz.
 */
class CodeScopePanel(parent: Disposable, private val onRequest: (JsonObject) -> Any?) : Disposable {
    private val log = logger<CodeScopePanel>()
    private val gson = Gson()
    private val browser = JBCefBrowser()
    private val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
    private var loaded = false
    private val pending = mutableListOf<String>()

    val component: JComponent get() = browser.component

    init {
        Disposer.register(parent, this)
        Disposer.register(this, browser)
        Disposer.register(this, query)
        query.addHandler { payload ->
            // Responde fora da thread do navegador: ler o depurador pode levar um tempo.
            ApplicationManager.getApplication().executeOnPooledThread { answer(payload) }
            null
        }
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(cefBrowser: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (!frame.isMain) return
                run(bridgeScript())
                loaded = true
                pending.splice().forEach(::run)
            }
        }, browser.cefBrowser)
        ApplicationManager.getApplication().messageBus.connect(this)
            .subscribe(LafManagerListener.TOPIC, LafManagerListener { run(Theme.script()) })
        browser.loadHTML(html())
    }

    /** Evento do depurador para o painel (HostEvent em src/host/bridge.ts). */
    fun send(event: JsonObject) {
        val js = "window.codeScope && window.codeScope.receive(${gson.toJson(event)})"
        if (loaded) run(js) else pending.add(js)
    }

    private fun answer(payload: String) {
        val message = JsonParser.parseString(payload).asJsonObject
        val id = message.get("id").asInt
        val js = try {
            val request = JsonParser.parseString(message.get("request").asString).asJsonObject
            val result = onRequest(request)
            "window.__codeScopeResolve($id, true, ${gson.toJson(gson.toJson(result))})"
        } catch (e: Throwable) {
            log.debug("requisição falhou: $payload", e)
            "window.__codeScopeResolve($id, false, ${gson.toJson(e.message ?: e.toString())})"
        }
        run(js)
    }

    private fun run(js: String) = browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)

    /** Liga window.__codeScopeSend ao JBCefJSQuery, com respostas por id. */
    private fun bridgeScript() = """
        window.__csPending = {}; window.__csNext = 1;
        window.__codeScopeSend = function (request, ok, fail) {
          var id = window.__csNext++;
          window.__csPending[id] = [ok, fail];
          var payload = JSON.stringify({ id: id, request: request });
          ${query.inject("payload")}
        };
        window.__codeScopeResolve = function (id, ok, text) {
          var p = window.__csPending[id];
          delete window.__csPending[id];
          if (p) ok ? p[0](text) : p[1](0, text);
        };
        ${Theme.script()}
    """.trimIndent()

    private fun html(): String {
        val language = if (Locale.getDefault().language == "pt") "pt" else "en"
        val text = javaClass.getResourceAsStream("/codescope/panel-$language.html")!!.bufferedReader().readText()
        return text.replace("style=\"/*theme*/\"", "style=\"${Theme.inlineStyle()}\"")
            .replace("<body", "<body class=\"${Theme.bodyClass()}\"")
    }

    override fun dispose() {}
}

private fun <T> MutableList<T>.splice(): List<T> = toList().also { clear() }

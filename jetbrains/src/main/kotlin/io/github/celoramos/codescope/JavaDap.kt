package io.github.celoramos.codescope

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.debugger.engine.DebugProcessImpl
import com.intellij.debugger.engine.JavaValue
import com.intellij.debugger.engine.SuspendContextImpl
import com.intellij.debugger.engine.events.DebuggerCommandImpl
import com.intellij.debugger.jdi.StackFrameProxyImpl
import com.intellij.openapi.application.ReadAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.roots.ProjectFileIndex
import com.intellij.xdebugger.XDebugSession
import com.intellij.xdebugger.evaluation.XDebuggerEvaluator
import com.intellij.xdebugger.frame.XValue
import com.sun.jdi.ArrayReference
import com.sun.jdi.ObjectReference
import com.sun.jdi.PrimitiveValue
import com.sun.jdi.StringReference
import com.sun.jdi.Value
import com.sun.jdi.event.ExceptionEvent
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

/*
 * Responde as requisições do Debug Adapter Protocol que o coletor do Code
 * Scope faz (threads, stackTrace, scopes, variables, evaluate, exceptionInfo)
 * lendo o depurador de Java da IDE. Vale para uma parada: cada parada ganha
 * um JavaDap novo, e os variablesReference só valem dentro dela.
 */
class JavaDap(
    private val project: Project,
    private val session: XDebugSession,
    private val process: DebugProcessImpl,
    private val context: SuspendContextImpl,
) {
    private sealed interface Node
    private class Locals(val frame: Int) : Node
    private class Children(val obj: ObjectReference, val expr: String?) : Node
    private class EntryNode(val entry: Entry, val expr: String?) : Node

    private val nodes = mutableListOf<Node>()
    private fun ref(node: Node): Int {
        nodes.add(node)
        return nodes.size
    }

    /** A parada foi um erro (breakpoint de exceção)? */
    fun reason(): String = jdi { if (exceptionEvent() != null) "exception" else "breakpoint" }

    fun handle(command: String, args: JsonObject?): JsonElement = when (command) {
        "threads" -> obj("threads" to JsonArray().apply { add(obj("id" to 1, "name" to "main")) })
        "stackTrace" -> jdi { stackTrace() }
        "scopes" -> {
            val frameId = args?.get("frameId")?.asInt ?: 1
            obj("scopes" to JsonArray().apply { add(obj("name" to "Local", "variablesReference" to ref(Locals(frameId - 1)), "expensive" to false)) })
        }
        "variables" -> jdi {
            val start = args?.get("start")?.asInt ?: 0
            val count = args?.get("count")?.asInt ?: 0
            obj("variables" to variables(args?.get("variablesReference")?.asInt ?: 0, start, count))
        }
        "evaluate" -> evaluate(args?.get("expression")?.asString.orEmpty())
        "exceptionInfo" -> jdi { exceptionInfo() }
        else -> throw IllegalArgumentException("requisição não suportada: $command")
    }

    private fun frames(): List<StackFrameProxyImpl> = context.thread?.frames().orEmpty()

    private fun stackTrace(): JsonObject {
        val list = JsonArray()
        frames().take(20).forEachIndexed { i, frame ->
            val location = frame.location()
            val method = location.method()
            val args = method.argumentTypeNames().joinToString(",") { simpleName(it) }
            val name = "${simpleName(location.declaringType().name())}.${method.name()}($args)"
            val file = ReadAction.compute<com.intellij.openapi.vfs.VirtualFile?, Throwable> {
                process.positionManager.getSourcePosition(location)?.file?.virtualFile
            }
            val inProject = file != null && ReadAction.compute<Boolean, Throwable> { ProjectFileIndex.getInstance(project).isInContent(file) }
            val source = JsonObject().apply {
                file?.let {
                    addProperty("name", it.name)
                    addProperty("path", it.path)
                }
            }
            val f = obj("id" to i + 1, "name" to name, "line" to location.lineNumber(), "column" to 1, "source" to source)
            // Código do JDK e de bibliotecas: o coletor para a pilha de chamadas aqui.
            if (!inProject) f.addProperty("presentationHint", "subtle")
            list.add(f)
        }
        return obj("stackFrames" to list, "totalFrames" to list.size())
    }

    private fun variables(reference: Int, start: Int, count: Int): JsonArray {
        val out = JsonArray()
        when (val node = nodes.getOrNull(reference - 1)) {
            is Locals -> {
                val frame = frames().getOrNull(node.frame) ?: return out
                for (local in frame.visibleVariables()) {
                    out.add(variable(local.name(), frame.getValue(local), local.typeName(), local.name()))
                }
                frame.thisObject()?.let { out.add(variable("this", it, null, "this")) }
            }
            is Children -> children(node, start, count).forEach(out::add)
            is EntryNode -> {
                out.add(variable("key", node.entry.key, null, null))
                out.add(variable("value", node.entry.value, null, null))
            }
            null -> {}
        }
        return out
    }

    private fun children(node: Children, start: Int, count: Int): List<JsonObject> {
        val obj = node.obj
        fun page(size: Int) = start until (if (count > 0) minOf(size, start + count) else size)
        if (obj is ArrayReference) {
            val range = page(obj.length())
            if (range.isEmpty()) return emptyList()
            val values = obj.getValues(range.first, range.last - range.first + 1)
            return range.mapIndexed { k, i -> variable("$i", values[k], null, node.expr?.let { "$it[$i]" }) }
        }
        mapEntries(obj)?.let { entries ->
            return page(entries.size).map { i ->
                val e = entries[i]
                val type = e.node?.let { simpleName(it.referenceType().name()) } ?: "Map\$Entry"
                val id = e.node?.uniqueID() ?: obj.uniqueID()
                obj(
                    "name" to "$i",
                    "value" to "$type@$id ${shortText(e.key)}:${shortText(e.value)}",
                    "type" to type,
                    "variablesReference" to ref(EntryNode(e, null)),
                    "indexedVariables" to 0,
                    "namedVariables" to 2,
                )
            }
        }
        collectionItems(obj)?.let { items ->
            return page(items.size).map { i -> variable("$i", items[i], null, node.expr?.let { "$it.get($i)" }) }
        }
        return obj.referenceType().allFields().filterNot { it.isStatic }.map { f ->
            variable(f.name(), obj.getValue(f), f.typeName(), node.expr?.let { "$it.${f.name()}" })
        }
    }

    /** Uma variável no formato do Java Debugger do VS Code. */
    private fun variable(name: String, value: Value?, declared: String?, expr: String?): JsonObject {
        val v = JsonObject()
        v.addProperty("name", name)
        expr?.let { v.addProperty("evaluateName", it) }
        var reference = 0
        var indexed = 0
        val text: String = when (value) {
            null -> "null"
            is PrimitiveValue -> primitiveText(value)
            is StringReference -> "\"${value.value()}\""
            is ArrayReference -> {
                indexed = value.length()
                if (indexed > 0) reference = ref(Children(value, expr))
                val type = simpleName(value.referenceType().name())
                type.replaceFirst("[]", "[$indexed]") + "@${value.uniqueID()}"
            }
            is ObjectReference -> {
                val box = unboxed(value)
                val size = when {
                    box != null -> null
                    isMap(value) -> mapEntries(value)?.size
                    isCollection(value) -> collectionItems(value)?.size
                    else -> null
                }
                when {
                    box != null -> primitiveText(box)
                    size != null -> {
                        indexed = size
                        if (size > 0) reference = ref(Children(value, expr))
                        "${simpleName(value.referenceType().name())}@${value.uniqueID()} size=$size"
                    }
                    else -> {
                        reference = ref(Children(value, expr))
                        "${simpleName(value.referenceType().name())}@${value.uniqueID()}"
                    }
                }
            }
            else -> value.toString()
        }
        v.addProperty("value", text)
        typeName(value, declared)?.let { v.addProperty("type", it) }
        v.addProperty("variablesReference", reference)
        v.addProperty("indexedVariables", indexed)
        v.addProperty("namedVariables", 0)
        return v
    }

    /** Avalia no quadro atual com o avaliador da IDE (o mesmo do Evaluate Expression). */
    private fun evaluate(expression: String): JsonObject {
        val evaluator: XDebuggerEvaluator = session.currentStackFrame?.evaluator
            ?: throw IllegalStateException("sem quadro para avaliar")
        val future = CompletableFuture<XValue>()
        evaluator.evaluate(expression, object : XDebuggerEvaluator.XEvaluationCallback {
            override fun evaluated(result: XValue) { future.complete(result) }
            override fun errorOccurred(errorMessage: String) { future.completeExceptionally(IllegalStateException(errorMessage)) }
        }, null)
        val result = future.get(15, TimeUnit.SECONDS)
        val value = (result as? JavaValue)?.descriptor?.value
        return jdi {
            val v = variable("result", value, null, null)
            obj("result" to v.get("value").asString, "variablesReference" to v.get("variablesReference").asInt)
        }
    }

    private fun exceptionEvent(): ExceptionEvent? =
        context.eventSet?.firstOrNull { it is ExceptionEvent } as? ExceptionEvent

    private fun exceptionInfo(): JsonObject {
        val exception = exceptionEvent()?.exception() ?: return JsonObject()
        val type = exception.referenceType().name()
        val message = exception.referenceType().fieldByName("detailMessage")
            ?.let { exception.getValue(it) as? StringReference }?.value()
        return obj(
            "exceptionId" to type,
            "description" to (message ?: ""),
            "details" to obj("fullTypeName" to type, "message" to (message ?: "")),
        )
    }

    /** Roda na thread do depurador, a única onde a JDI pode ser lida. */
    private fun <T> jdi(block: () -> T): T {
        val future = CompletableFuture<T>()
        process.managerThread.schedule(object : DebuggerCommandImpl() {
            override fun action() {
                try {
                    future.complete(block())
                } catch (e: Throwable) {
                    future.completeExceptionally(e)
                }
            }

            override fun commandCancelled() {
                future.completeExceptionally(IllegalStateException("a parada acabou"))
            }
        })
        return future.get(30, TimeUnit.SECONDS)
    }
}

fun obj(vararg pairs: Pair<String, Any?>): JsonObject = JsonObject().apply {
    for ((k, v) in pairs) when (v) {
        null -> {}
        is JsonElement -> add(k, v)
        is Number -> addProperty(k, v)
        is Boolean -> addProperty(k, v)
        else -> addProperty(k, v.toString())
    }
}

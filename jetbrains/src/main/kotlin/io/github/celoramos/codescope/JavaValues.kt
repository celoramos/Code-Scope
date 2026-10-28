package io.github.celoramos.codescope

import com.sun.jdi.ArrayReference
import com.sun.jdi.ArrayType
import com.sun.jdi.BooleanValue
import com.sun.jdi.CharValue
import com.sun.jdi.ClassType
import com.sun.jdi.Field
import com.sun.jdi.IntegerValue
import com.sun.jdi.ObjectReference
import com.sun.jdi.PrimitiveValue
import com.sun.jdi.ReferenceType
import com.sun.jdi.StringReference
import com.sun.jdi.Value

/*
 * Lê valores da JVM (JDI) e os escreve como o Java Debugger do VS Code
 * (vscjava.vscode-java-debug) escreve, porque é esse o formato que o
 * adaptador de Java do Code Scope (src/debug/adapters/java.ts) entende:
 *   array      "int[5]@10", type "int[]"
 *   coleção    "ArrayList@11 size=4"
 *   dicionário "HashMap@26 size=1", entradas 'HashMap$Node@44 "sol":"1"'
 *   objeto     "Turma$Aluno@30"
 *   texto      "\"Ana\"", type "String"
 * Coleções e dicionários são lidos pelos campos internos das classes do JDK,
 * sem chamar métodos no programa parado.
 */

private val BOXED = setOf(
    "java.lang.Integer", "java.lang.Long", "java.lang.Short", "java.lang.Byte",
    "java.lang.Double", "java.lang.Float", "java.lang.Boolean", "java.lang.Character",
)

/** "java.util.ArrayList" vira "ArrayList"; "pkg.Turma$Aluno" vira "Turma$Aluno"; arrays mantêm os colchetes. */
fun simpleName(type: String): String {
    val generic = type.substringBefore('<')
    val base = generic.substringBefore('[')
    return base.substringAfterLast('.') + generic.removePrefix(base)
}

fun primitiveText(v: PrimitiveValue): String = when (v) {
    is CharValue -> v.value().toString()
    is BooleanValue -> v.value().toString()
    else -> v.toString()
}

/** Primitivo embrulhado (Integer, Character...) como o primitivo de dentro; o aluno vê o número. */
fun unboxed(obj: ObjectReference): PrimitiveValue? {
    if (obj.referenceType().name() !in BOXED) return null
    val field = obj.referenceType().fieldByName("value") ?: return null
    return obj.getValue(field) as? PrimitiveValue
}

fun isBoxed(obj: ObjectReference) = obj.referenceType().name() in BOXED

private fun implements(type: ReferenceType, iface: String): Boolean =
    type is ClassType && type.allInterfaces().any { it.name() == iface }

fun isCollection(obj: ObjectReference) = implements(obj.referenceType(), "java.util.Collection")
fun isMap(obj: ObjectReference) = implements(obj.referenceType(), "java.util.Map")

private fun ObjectReference.field(name: String): Value? {
    val f: Field = referenceType().fieldByName(name) ?: return null
    return getValue(f)
}

private fun ObjectReference.int(name: String): Int? = (field(name) as? IntegerValue)?.value()
private fun ObjectReference.obj(name: String): ObjectReference? = field(name) as? ObjectReference

/** Itens de uma coleção do JDK, na ordem em que o programa vê; null se a classe não é conhecida. */
fun collectionItems(obj: ObjectReference, limit: Int = 10_000): List<Value?>? {
    val name = obj.referenceType().name()
    val out = mutableListOf<Value?>()
    fun fromArray(arr: ArrayReference?, size: Int): List<Value?>? =
        arr?.let { if (size == 0) emptyList() else it.getValues(0, minOf(size, it.length(), limit)) }
    return when {
        name == "java.util.ArrayList" -> fromArray(obj.obj("elementData") as? ArrayReference, obj.int("size") ?: 0)
        name == "java.util.Vector" || name == "java.util.Stack" ->
            fromArray(obj.obj("elementData") as? ArrayReference, obj.int("elementCount") ?: 0)
        name == "java.util.LinkedList" -> {
            var node = obj.obj("first")
            while (node != null && out.size < limit) {
                out.add(node.field("item"))
                node = node.obj("next")
            }
            out
        }
        name == "java.util.ArrayDeque" -> {
            val arr = obj.obj("elements") as? ArrayReference ?: return null
            val head = obj.int("head") ?: 0
            val tail = obj.int("tail") ?: 0
            var i = head
            while (i != tail && out.size < limit && arr.length() > 0) {
                out.add(arr.getValue(i))
                i = (i + 1) % arr.length()
            }
            out
        }
        name == "java.util.PriorityQueue" -> fromArray(obj.obj("queue") as? ArrayReference, obj.int("size") ?: 0)
        name == "java.util.Arrays\$ArrayList" -> (obj.obj("a") as? ArrayReference)?.let { fromArray(it, it.length()) }
        name == "java.util.ImmutableCollections\$List12" || name == "java.util.ImmutableCollections\$Set12" -> {
            val e0 = obj.field("e0")
            val e1 = obj.field("e1")
            // Com um item só, e1 guarda um marcador interno (um Object puro), não um item.
            listOfNotNull(e0) + listOfNotNull(e1).filterNot { it is ObjectReference && it.referenceType().name() == "java.lang.Object" }
        }
        name == "java.util.ImmutableCollections\$ListN" || name == "java.util.ImmutableCollections\$SubList" ->
            (obj.obj("elements") as? ArrayReference)?.let { fromArray(it, obj.int("size") ?: it.length()) }
        name == "java.util.HashSet" || name == "java.util.LinkedHashSet" ->
            obj.obj("map")?.let { m -> mapEntries(m, limit)?.map { it.key } }
        name == "java.util.TreeSet" -> obj.obj("m")?.let { m -> mapEntries(m, limit)?.map { it.key } }
        name.startsWith("java.util.Collections\$Unmodifiable") || name.startsWith("java.util.Collections\$Synchronized") ->
            (obj.obj("list") ?: obj.obj("c"))?.let { collectionItems(it, limit) }
        else -> null
    }
}

class Entry(val node: ObjectReference?, val key: Value?, val value: Value?)

/** Entradas de um dicionário do JDK; null se a classe não é conhecida. */
fun mapEntries(obj: ObjectReference, limit: Int = 10_000): List<Entry>? {
    val name = obj.referenceType().name()
    val out = mutableListOf<Entry>()
    fun node(n: ObjectReference) = Entry(n, n.field("key"), n.field("value"))
    return when (name) {
        "java.util.LinkedHashMap" -> {
            var n = obj.obj("head")
            while (n != null && out.size < limit) {
                out.add(node(n))
                n = n.obj("after")
            }
            out
        }
        "java.util.HashMap", "java.util.Hashtable", "java.util.concurrent.ConcurrentHashMap" -> {
            val table = obj.obj("table") as? ArrayReference ?: return out
            for (bucket in table.values) {
                var n = bucket as? ObjectReference
                while (n != null && out.size < limit) {
                    out.add(node(n))
                    n = n.obj("next")
                }
            }
            out
        }
        "java.util.TreeMap" -> {
            fun walk(n: ObjectReference?) {
                if (n == null || out.size >= limit) return
                walk(n.obj("left"))
                out.add(node(n))
                walk(n.obj("right"))
            }
            walk(obj.obj("root"))
            out
        }
        "java.util.ImmutableCollections\$Map1" -> listOf(Entry(null, obj.field("k0"), obj.field("v0")))
        "java.util.ImmutableCollections\$MapN" -> {
            val table = obj.obj("table") as? ArrayReference ?: return out
            val values = table.values
            for (i in 0 until values.size - 1 step 2) {
                if (values[i] != null) out.add(Entry(null, values[i], values[i + 1]))
            }
            out
        }
        else -> if (name.startsWith("java.util.Collections\$Unmodifiable")) obj.obj("m")?.let { mapEntries(it, limit) } else null
    }
}

/** Texto curto para a entrada de um dicionário: '"sol"', '"1"' ou 'ImmutableCollections$List12@38'. */
fun shortText(v: Value?): String = when (v) {
    null -> "null"
    is StringReference -> "\"${v.value()}\""
    is PrimitiveValue -> primitiveText(v)
    is ObjectReference -> unboxed(v)?.let { "\"${primitiveText(it)}\"" } ?: "${simpleName(v.referenceType().name())}@${v.uniqueID()}"
    else -> v.toString()
}

/** Tipo para o painel: o da variável declarada, ou o do valor quando ela é Object ou interface. */
fun typeName(v: Value?, declared: String?): String? = when {
    v == null -> null
    v is ArrayReference -> simpleName((v.type() as ArrayType).name())
    v is ObjectReference && isBoxed(v) -> simpleName(v.referenceType().name())
    v is ObjectReference -> simpleName(v.referenceType().name())
    else -> declared?.let(::simpleName) ?: simpleName(v.type().name())
}

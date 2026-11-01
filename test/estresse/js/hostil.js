class Ruim { get bomba() { throw new Error('getter quebrado'); } toString() { throw new Error('toString quebrado'); } }
const ruim = new Ruim();
const proxy = new Proxy({}, { get() { throw new Error('proxy quebrado'); }, ownKeys() { throw new Error('ownKeys quebrado'); } });
const proxyLista = new Proxy([1, 2, 3], {});
const ciclo = [1]; ciclo.push(ciclo);
const objCiclo = {}; objCiclo.eu = objCiclo;
const esparso = [1, , , 4]; esparso[20] = 9;
const comProp = [1, 2]; comProp.extra = 'x'; comProp[-1] = 'neg';
const tipado = new Uint8Array([1, 2, 3]);
const flutua = new Float64Array(5);
const buffer = new ArrayBuffer(8);
const semProto = Object.create(null); semProto.a = 1;
const fraco = new WeakMap(); const fracoS = new WeakSet();
const simbolo = Symbol('s');
const especiais = [undefined, null, NaN, Infinity, -Infinity, -0, 10n ** 400n, simbolo, new Date(NaN), /a/g, () => 1, class X {}];
const texto = 'aç😀\n\t"\'<script>alert(1)</script>\u0000';
const chaves = { '': 1, '<b>': 2, 'a b': 3, 0: 4, [simbolo]: 5 };
const vazios = [[], {}, new Map(), new Set(), '', [[]], [[], [1]]];
const irregular = [[1, 2, 3], [4], [], [5, 6]];
const misto = [1, 'dois', 3.5, null, [4], { c: 5 }];
function* gen() { yield 1; yield 2; }
const g = gen();
const promessa = Promise.resolve(1);
const rejeitada = Promise.reject(new Error('x')); rejeitada.catch(() => {});
var i = 2 ** 60; // PARE
var j = -1;
var k = i;
misto[j] = 0;
g.next();
var x = 1;

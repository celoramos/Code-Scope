class Base { #segredo = 1; static total = 0; get s() { return this.#segredo; } }
class Filha extends Base { constructor() { super(); this.v = [1, 2]; } }
const f = new Filha();
const { a, ...resto } = { a: 1, b: 2, c: 3 };
const [p, ...cauda] = [1, 2, 3];
const conj = new Set([1, 2]);
const mapa = new Map([['a', 1], [{ o: 1 }, [2]]]);
function troca(v, i, j) { [v[i], v[j]] = [v[j], v[i]]; return v; }
const soma = (() => { let t = 0; return (n) => (t += n); })();
async function espera(ms) { await new Promise((r) => setTimeout(r, ms)); return ms; }
async function principal() {
  let lista = [3, 1, 2]; // PARE
  troca(lista, 0, 2);
  await espera(5);
  lista = lista.map((x) => x * 2);
  lista.sort((x, y) => x - y);
  for (const [i, v] of lista.entries()) lista[i] = v + 1;
  conj.add(3);
  mapa.set('b', 2);
  soma(3);
  f.v.push(3);
  try { null.x; } catch (e) { var erro = e; }
  while (lista.length) lista.pop();
  return lista;
}
principal();

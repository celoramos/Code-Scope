const grafo = new Map([ // @pare
  ['A', ['B', 'C']],
  ['B', ['D']],
  ['C', ['D']],
  ['D', []],
]);

function bfs(inicio) {
  const visitados = new Set([inicio]);
  const fila = [inicio];
  const ordem = [];
  while (fila.length > 0) {
    const atual = fila.shift();
    ordem.push(atual);
    for (const vizinho of grafo.get(atual)) {
      if (!visitados.has(vizinho)) {
        visitados.add(vizinho);
        fila.push(vizinho);
      }
    }
  }
  return ordem;
}

function dfs(atual, visitados = new Set(), ordem = []) {
  visitados.add(atual);
  ordem.push(atual);
  for (const vizinho of grafo.get(atual)) {
    if (!visitados.has(vizinho)) dfs(vizinho, visitados, ordem);
  }
  return ordem;
}

const largura = bfs('A');
const profundidade = dfs('A');
const matriz = [
  [0, 1, 1, 0],
  [0, 0, 0, 1],
  [0, 0, 0, 1],
  [0, 0, 0, 0],
];
let arestas = 0;
for (let i = 0; i < matriz.length; i++) {
  for (let j = 0; j < matriz[i].length; j++) {
    arestas += matriz[i][j];
  }
}
console.log(largura, profundidade, arestas);

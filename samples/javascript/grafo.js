function visitar() {
  // Cada cidade e as cidades ligadas a ela.
  const grafo = {
    A: ['B', 'C'],
    B: ['A', 'D'],
    C: ['A', 'D'],
    D: ['B', 'C'],
  };
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const fila = ['A'];
  const visitados = ['A'];
  while (fila.length > 0) {
    const atual = fila.shift();
    for (const vizinho of grafo[atual]) {
      if (!visitados.includes(vizinho)) {
        visitados.push(vizinho);
        fila.push(vizinho);
      }
    }
  }
  console.log(visitados);
}

visitar();

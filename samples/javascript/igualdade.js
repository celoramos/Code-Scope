class Ponto {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function comparar() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const p = new Ponto(1, 2);
  const q = new Ponto(1, 2);
  const r = p;
  if (p === q) {
    console.log('p === q');
  }
  if (r === p) {
    console.log('r === p');
  }
  const a = 'ana';
  const b = 'an' + 'a';
  if (a === b) {
    console.log('a === b');
  }
}

comparar();

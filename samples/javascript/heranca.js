class Animal {
  constructor(nome) {
    this.nome = nome;
  }

  falar() {
    return '...';
  }
}

class Cachorro extends Animal {
  falar() {
    return 'Au!';
  }
}

class Gato extends Animal {
  falar() {
    return 'Miau!';
  }
}

function main() {
  const bichos = [new Cachorro('Rex'), new Gato('Mia'), new Animal('Bob')];
  // Coloque um breakpoint na linha abaixo e use F11 (step into) para ver qual falar() roda.
  for (let i = 0; i < bichos.length; i++) {
    const som = bichos[i].falar();
    console.log(bichos[i].nome + ':', som);
  }
}

main();

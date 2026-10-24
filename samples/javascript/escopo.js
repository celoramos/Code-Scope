function main() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  let total = 1;
  for (let i = 0; i < 2; i++) {
    const dobro = i * 2;
    total = total + dobro;
  }
  {
    // Este total é outra variável: dentro do bloco, ela esconde a de fora.
    let total = 100;
    total = total + 1;
  }
  console.log(total);
}

main();

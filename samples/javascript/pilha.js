function desfazer() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const historico = [];
  historico.push('digitou A');
  historico.push('digitou B');
  historico.push('apagou B');
  let desfeito = historico.pop();
  desfeito = historico.pop();
  console.log('Sobrou:', historico);
}

desfazer();

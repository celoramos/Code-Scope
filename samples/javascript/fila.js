function impressora() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const documentos = [];
  documentos.push('relatorio.pdf');
  documentos.push('foto.png');
  documentos.push('carta.docx');
  let imprimindo = documentos.shift();
  imprimindo = documentos.shift();
  console.log('Na fila:', documentos);
}

impressora();

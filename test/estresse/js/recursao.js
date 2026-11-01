function desce(n, lista) {
  lista.push(n);
  if (n === 0) {
    return 0; // PARE
  }
  return 1 + desce(n - 1, lista);
}
console.log(desce(900, []));

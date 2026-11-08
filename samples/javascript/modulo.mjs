// Módulo ES (.mjs, ou "type": "module" no package.json): as variáveis de fora das funções também aparecem.
// Coloque um breakpoint na linha abaixo e use F10 (step over).
const fila = [];
fila.push('Ana');
fila.push('Bia');
const primeira = fila.shift();

console.log(primeira, fila);

function esperar(ms, valor) {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

async function buscarTudo() {
  const a = await esperar(1, 'a');
  const b = await esperar(1, 'b');
  const juntos = await Promise.all([esperar(1, 'c'), esperar(1, 'd')]);
  return [a, b, ...juntos];
}

function* contagem(limite) {
  for (let i = 0; i < limite; i++) yield i;
}

const numeros = [...contagem(3)]; // @pare
buscarTudo().then((resultado) => {
  const total = resultado.length;
  console.log(numeros, resultado, total);
});

function fibMemo(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n < 2) return n;
  memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  return memo[n];
}

function lcs(a, b) {
  const tabela = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tabela[i][j] = a[i - 1] === b[j - 1] ? tabela[i - 1][j - 1] + 1 : Math.max(tabela[i - 1][j], tabela[i][j - 1]);
    }
  }
  return tabela[a.length][b.length];
}

function fatorial(n) {
  let resultado = 1n;
  for (let i = 2n; i <= n; i++) resultado *= i;
  return resultado;
}

const f = fibMemo(15); // @pare
const comum = lcs('ABCB', 'BDCB');
const grande = fatorial(25n);
console.log(f, comum, grande);

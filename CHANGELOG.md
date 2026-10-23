# Changelog

## 0.2.0

### Corrigido

- O painel mostrava `?` em todas as posições com o Java Debugger real: os elementos se chamam `0`, `1`... e não `[0]`, e objetos vêm como `int[5]@10`. Encontrado pelo novo teste de integração.

### Novo

- Matrizes (`int[][]`) desenhadas como grade, com a linha e a coluna lidas do código (`grade[i][j]`).
- Listas (`ArrayList`, `LinkedList`...): inserção e remoção animadas, lista vazia visível desde a criação.
- `char` com aspas simples; boolean, char, double e String entre as variáveis.
- Linha que executou e próxima linha, com o texto do código.
- Explicação do caminho do programa: if verdadeiro ou falso, laço que continua ou termina, volta ao início do laço, break.
- Frases de ponteiro mais naturais: "avançou", "recuou", "voltou para 0".
- Linha do tempo com controle deslizante, Home/End e "voltar ao passo mais recente".
- Configurações: modo iniciante, velocidade da animação, limite de elementos, nomes que não viram seta, abrir o painel ao iniciar o debug.
- Comandos "Mostrar painel" e "Limpar histórico".
- Teste de integração com o Java Debugger real e CI no GitHub Actions, que também gera o `.vsix`.

## 0.0.1

- Primeira versão: arrays Java como caixas, ponteiros `i`/`j`, animação de troca, histórico de passos e texto explicativo.

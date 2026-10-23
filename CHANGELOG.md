# Changelog

## 0.3.0

### Novo

- Pilha desenhada como uma torre aberta em cima: `push` faz o item cair no topo, `pop` faz ele subir e sumir, e a etiqueta "topo" acompanha. A torre fica presa pela base, então empilhar não empurra os itens de baixo.
- Fila desenhada como uma esteira com saída e entrada: `offer` entra pela direita, `poll` sai pela frente, com as etiquetas "frente" e "fim".
- O papel da coleção vem do código: `Stack` e `Queue` pelo tipo, e `ArrayDeque`/`LinkedList` pelos métodos usados (`push`/`pop` ou `offer`/`poll`). A ordem do `ArrayDeque` usado como pilha é corrigida para o topo ficar em cima.
- Explicações com a regra de cada estrutura ("na pilha, sai sempre o último que entrou") e uma nota para `peek()`, que só olha a ponta sem tirar nada.
- Item removido de lista, pilha ou fila sai animado, e os vizinhos fecham o espaço no mesmo movimento.
- Exemplos novos: Pilha, Fila e Parenteses.

### Corrigido

- Elementos de coleções com tipos embrulhados (`Character`, `Integer`...) apareciam como `'Character'`; agora o valor de verdade é lido.

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

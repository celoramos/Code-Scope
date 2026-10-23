import * as assert from 'node:assert/strict';
import { explain } from '../src/model/explain';

describe('explain', () => {
  it('primeiro passo descreve os arrays', () => {
    assert.deepEqual(explain([{ kind: 'array-added', array: 'arr', length: 5, structure: 'array' }], true), [
      'Primeiro passo: arr tem 5 posições.',
    ]);
  });

  it('primeiro passo sem arrays', () => {
    assert.deepEqual(explain([], true), ['Primeiro passo. Ainda não há arrays nas variáveis locais.']);
  });

  it('posição alterada', () => {
    assert.deepEqual(explain([{ kind: 'set', array: 'arr', index: 2, from: '5', to: '3' }]), [
      'arr[2] mudou de 5 para 3.',
    ]);
  });

  it('troca em um passo', () => {
    assert.deepEqual(explain([{ kind: 'swap', array: 'arr', a: 1, b: 2, steps: 1 }]), [
      'arr[1] e arr[2] trocaram de lugar.',
    ]);
  });

  it('troca em dois passos menciona a auxiliar', () => {
    const [text] = explain([{ kind: 'swap', array: 'arr', a: 0, b: 1, steps: 2 }]);
    assert.match(text, /^arr\[0\] e arr\[1\] terminaram de trocar de lugar\./);
    assert.match(text, /variável auxiliar/);
  });

  it('arrays antes de ponteiros', () => {
    assert.deepEqual(
      explain([
        { kind: 'pointer', name: 'j', from: 0, to: 1 },
        { kind: 'set', array: 'arr', index: 0, from: '5', to: '1' },
      ]),
      ['arr[0] mudou de 5 para 1.', 'j avançou de 0 para 1.'],
    );
  });

  it('ponteiro que recua, que volta a zero e que salta', () => {
    assert.deepEqual(
      explain([
        { kind: 'pointer', name: 'fim', from: 5, to: 4 },
        { kind: 'pointer', name: 'j', from: 3, to: 0 },
        { kind: 'pointer', name: 'meio', from: 2, to: 7 },
      ]),
      ['fim recuou de 5 para 4.', 'j voltou para 0 (o laço recomeçou).', 'meio mudou de 2 para 7.'],
    );
  });

  it('ponteiro criado e removido', () => {
    assert.deepEqual(
      explain([
        { kind: 'pointer', name: 'temp', to: 5 },
        { kind: 'pointer', name: 'k', from: 2 },
      ]),
      ['temp foi criada valendo 5.', 'k saiu de escopo.'],
    );
  });

  it('arrays criados, removidos e trocados', () => {
    assert.deepEqual(
      explain([
        { kind: 'array-added', array: 'copia', length: 1, structure: 'array' },
        { kind: 'array-removed', array: 'tmp' },
        { kind: 'array-resized', array: 'arr', from: 3, to: 6 },
      ]),
      [
        'O array copia foi criado com 1 posição.',
        'O array tmp saiu de escopo.',
        'arr agora tem 6 posições (antes tinha 3).',
      ],
    );
  });

  it('nascimento de lista e matriz', () => {
    assert.deepEqual(
      explain([
        { kind: 'array-added', array: 'lista', length: 0, structure: 'list' },
        { kind: 'array-added', array: 'grade', length: 2, structure: 'matrix', cols: 3 },
      ]),
      ['A lista lista foi criada vazia.', 'A matriz grade foi criada com 2 linhas e 3 colunas.'],
    );
    assert.deepEqual(explain([{ kind: 'array-added', array: 'grade', length: 2, structure: 'matrix', cols: 3 }], true), [
      'Primeiro passo: grade tem 2 linhas e 3 colunas.',
    ]);
  });

  it('lista, matriz e variável simples', () => {
    assert.deepEqual(
      explain([
        { kind: 'insert', array: 'lista', index: 1, value: '"leite"', shifted: true, structure: 'list' },
        { kind: 'remove', array: 'lista', index: 2, value: '"café"', shifted: false, structure: 'list' },
        { kind: 'set', array: 'grade[1]', index: 2, from: '6', to: '60' },
        { kind: 'scalar', name: 'achou', from: 'false', to: 'true' },
      ]),
      [
        'lista ganhou "leite" na posição 1. Os itens que estavam dali em diante andaram uma posição.',
        '"café" saiu do fim de lista (posição 2).',
        'grade[1][2] mudou de 6 para 60.',
        'achou mudou de false para true.',
      ],
    );
  });

  it('nada mudou', () => {
    assert.deepEqual(explain([]), ['Nada mudou neste passo.']);
  });

  it('o caminho do programa substitui o "nada mudou" e vem depois das mudanças', () => {
    assert.deepEqual(explain([], false, ['A condição foi falsa.']), ['A condição foi falsa.']);
    assert.deepEqual(explain([{ kind: 'pointer', name: 'j', from: 0, to: 1 }], false, ['Volta.']), [
      'j avançou de 0 para 1.',
      'Volta.',
    ]);
  });
});

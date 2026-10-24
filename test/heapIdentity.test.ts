import * as assert from 'node:assert/strict';
import { alignHeap, objectPaths } from '../src/model/heapIdentity';
import type { HeapObject, Snapshot } from '../src/model/snapshot';

const node = (id: string, valor: string, proximo: string | null): HeapObject => ({
  id,
  type: 'No',
  fields: [
    { name: 'proximo', value: proximo ? 'No {…}' : 'null', ref: proximo },
    { name: 'valor', value: valor },
  ],
});
const snap = (heap: HeapObject[], refs: [string, string | null][]): Snapshot => ({
  file: 'listaLigada.js',
  line: 1,
  arrays: [],
  pointers: [],
  heap,
  refs: refs.map(([name, ref]) => ({ name, ref })),
});

describe('identidade dos objetos entre passos', () => {
  it('caminhos curtos de cada objeto a partir das variáveis', () => {
    const s = snap([node('~1', '10', '~2'), node('~2', '20', null)], [['inicio', '~1'], ['atual', '~2']]);
    const paths = objectPaths(s);
    assert.deepEqual([...(paths.get('~1') ?? [])], ['inicio']);
    assert.deepEqual([...(paths.get('~2') ?? [])].sort(), ['atual', 'inicio.proximo']);
  });

  it('atual andando na lista não troca os nós de lugar (passo real do js-debug)', () => {
    const prev = snap(
      [node('~19', '10', '~21'), node('~21', '20', '~24'), node('~24', '30', null)],
      [['atual', '~19'], ['inicio', '~19']],
    );
    // No passo seguinte, o coletor achou primeiro o nó de atual (agora o 20) e deu ids novos.
    const next = snap(
      [node('~40', '20', '~41'), node('~41', '30', null), node('~42', '10', '~40')],
      [['atual', '~40'], ['inicio', '~42']],
    );
    alignHeap(prev, next);
    assert.deepEqual(next.refs, [
      { name: 'atual', ref: '~21' },
      { name: 'inicio', ref: '~19' },
    ]);
    assert.deepEqual(
      next.heap?.map((o) => [o.id, o.fields[0].ref]),
      [
        ['~21', '~24'],
        ['~24', null],
        ['~19', '~21'],
      ],
    );
  });

  it('objeto novo continua com id novo', () => {
    const prev = snap([node('~1', '10', null)], [['inicio', '~1']]);
    const next = snap([node('~5', '10', '~6'), node('~6', '20', null)], [['inicio', '~5']]);
    alignHeap(prev, next);
    assert.deepEqual(next.heap?.map((o) => o.id), ['~1', '~6']);
  });

  it('ids do debugger (Java, Python) não mudam', () => {
    const prev = snap([node('@12', '10', null)], [['inicio', '@12']]);
    const next = snap([node('@12', '10', null)], [['inicio', '@12']]);
    alignHeap(prev, next);
    assert.equal(next.heap?.[0].id, '@12');
  });
});

import * as assert from 'node:assert/strict';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { heapView } from '../../src/model/heap';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/*
 * C# pela extensão C# (coreclr). Precisa de um .NET SDK no PATH: o
 * runTest.ts acrescenta o de .vscode-test/dotnet quando existe. Sem .NET,
 * os testes são pulados.
 */
const dir = path.join(samplesRoot, 'csharp');
const dll = path.join(dir, 'bin', 'Debug', 'net8.0', 'Exemplos.dll');

/**
 * No CI, a extensão C# já deixou de registrar o "coreclr" sem erro nenhum na
 * ativação. O log dela (canal "C#") diz por quê: vai para a saída do teste.
 */
function printCsharpLog(): void {
  const logs = path.join(samplesRoot, '..', '.vscode-test', 'user-data', 'logs');
  const runs = fs.existsSync(logs) ? fs.readdirSync(logs).sort() : [];
  const dir = runs.length > 0 ? path.join(logs, runs[runs.length - 1], 'window1', 'exthost', 'ms-dotnettools.csharp') : logs;
  const file = path.join(dir, 'C#.log');
  const tail = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8').split(/\r?\n/).slice(-80).join('\n') : undefined;
  console.warn(tail ? `log da extensão C#:\n${tail}` : `sem log da extensão C# em ${dir}`);
}

function debugCs(name: string, breakpointLine: number, steps: number): Promise<Snapshot[]> {
  return debugFile({
    file: path.join(dir, `${name}.cs`),
    breakpointLine,
    steps,
    config: { type: 'coreclr', request: 'launch', name: `C# ${name}`, program: dll, args: [name], cwd: dir, console: 'internalConsole' },
    dump: `cs-${name}`,
    async before() {
      // A extensão C# baixa o debugger na primeira ativação; sem esperar, o "coreclr" ainda não existe.
      const api: unknown = await vscode.extensions.getExtension('ms-dotnettools.csharp')?.activate();
      // A extensão devolve null quando desiste de ativar (plataforma, por exemplo).
      if (api === null || api === undefined) console.warn(`C#: activate() devolveu ${api}`);
    },
  });
}

describe('C# (vsdbg) real', function () {
  before(function () {
    const build = cp.spawnSync('dotnet', ['build', '-nologo', '-v', 'q'], { cwd: dir, shell: process.platform === 'win32', encoding: 'utf-8' });
    if (build.status !== 0 || !fs.existsSync(dll) || !vscode.extensions.getExtension('ms-dotnettools.csharp')) {
      console.warn('C#: sem .NET ou sem a extensão C#; testes pulados.');
      this.skip();
    }
  });

  let logged = false;
  afterEach(function () {
    if (this.currentTest?.state === 'failed' && !logged) {
      logged = true;
      printCsharpLog();
    }
  });

  it('BubbleSort.cs: array, ponteiros e troca com temp', async () => {
    const snaps = await debugCs('BubbleSort', 9, 14);
    assert.deepEqual(snaps[0].arrays.find((a) => a.name === 'numeros')?.values, ['5', '1', '4', '2', '8']);
    assert.ok(snaps.some((s) => s.pointers.some((p) => p.name === 'j')), 'j nunca apareceu');
    assert.ok(allChanges(snaps).some((c) => c.kind === 'swap'), `trocas: ${JSON.stringify(allChanges(snaps))}`);
  });

  it('Pilha.cs: Stack com o topo no fim do desenho', async () => {
    const snaps = await debugCs('Pilha', 8, 6);
    const full = snaps.find((s) => s.arrays.some((a) => a.name === 'pratos' && a.length === 3));
    assert.equal(full?.arrays.find((a) => a.name === 'pratos')?.kind, 'stack');
    assert.deepEqual(full?.arrays.find((a) => a.name === 'pratos')?.values, ['"azul"', '"verde"', '"vermelho"']);
  });

  it('Dicionario.cs: Dictionary com chave nova e valor trocado', async () => {
    const snaps = await debugCs('Dicionario', 9, 40);
    const changes = allChanges(snaps);
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === undefined), `mudanças: ${JSON.stringify(changes)}`);
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === '1' && c.value === '2'));
  });

  it('ListaLigada.cs: nós em cadeia, com o mesmo id de um passo para o outro', async () => {
    const snaps = await debugCs('ListaLigada', 19, 9);
    const full = snaps.find((s) => (s.heap?.length ?? 0) >= 3);
    assert.ok(full, `heap: ${JSON.stringify(snaps.at(-1)?.heap)}`);
    assert.deepEqual(heapView(full).lists[0]?.nodes.map((n) => n.value), ['10', '20', '30']);
    const heads = new Set(snaps.map((s) => s.refs?.find((r) => r.name === 'inicio')?.ref).filter(Boolean));
    assert.equal(heads.size, 1, `o nó do começo mudou de id: ${[...heads].join(', ')}`);
  });
});

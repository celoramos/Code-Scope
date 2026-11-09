import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { declaredClasses, declaredEnums } from '../src/debug/adapters/adapter';
import { collectStep, toSource, type Declarations } from '../src/core/collectStep';
import type { Session } from '../src/debug/dapCollector';
import { ProjectDeclarations, scanDeclarations } from '../src/projectDeclarations';

type Var = { name: string; value: string; type?: string; variablesReference: number; evaluateName?: string };

/** Sessão falsa parada no main de /proj/app/Main.java; a referência 1 são as locais. */
function session(vars: Record<number, Var[]>): Session {
  return {
    async customRequest(command: string, args?: any) {
      if (command === 'stackTrace') return { stackFrames: [{ id: 10, name: 'Main.main(String[])', line: 3, source: { path: '/proj/app/Main.java' } }] };
      if (command === 'scopes') return { scopes: [{ name: 'Local', variablesReference: 1 }] };
      if (command === 'evaluate') return { result: 'false' };
      return { variables: vars[args.variablesReference] ?? [] };
    },
  };
}

// O main usa uma lista ligada cujas classes moram em ListaLigada.java e No.java.
const main = 'public class Main {\n  public static void main(String[] args) {\n    ListaLigada lista = new ListaLigada();\n  }\n}\n';
const vars: Record<number, Var[]> = {
  1: [{ name: 'lista', value: 'ListaLigada@12', type: 'ListaLigada', variablesReference: 2, evaluateName: 'lista' }],
  2: [
    { name: 'inicio', value: 'No@13', type: 'No', variablesReference: 3 },
    { name: 'tamanho', value: '1', type: 'int', variablesReference: 0 },
  ],
  3: [
    { name: 'proximo', value: 'null', variablesReference: 0 },
    { name: 'valor', value: '7', type: 'int', variablesReference: 0 },
  ],
};

async function step(project?: Declarations) {
  return (await collectStep(session(vars), 1, {
    debugType: 'java',
    limits: { maxElements: 50, maxArrays: 20 },
    readSource: async () => toSource(main),
    ...(project ? { projectDeclarations: async () => project } : {}),
  }))!.snapshot;
}

describe('Classes declaradas em outro arquivo do programa', () => {
  it('a lista ligada do main aparece quando No e ListaLigada moram em outros arquivos', async () => {
    const snap = await step({ classes: new Set(['ListaLigada', 'No']), enums: new Set() });
    assert.deepEqual(snap.refs, [{ name: 'lista', ref: '@12' }]);
    assert.deepEqual(
      snap.heap?.map((o) => o.type),
      ['ListaLigada', 'No'],
    );
  });

  it('sem as declarações do projeto, fica como antes: só as classes do próprio arquivo', async () => {
    const snap = await step();
    assert.equal(snap.heap, undefined);
  });
});

describe('Busca das declarações nas pastas do projeto', () => {
  let root: string;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'code-scope-projeto-'));
    const write = (rel: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    };
    write('src/main/java/com/escola/app/Main.java', main);
    write('src/main/java/com/escola/modelo/No.java', 'package com.escola.modelo;\npublic class No { int valor; No proximo; }\n');
    write('src/main/java/com/escola/modelo/Cor.java', 'public enum Cor { AZUL, VERDE }\n');
    write('src/main/java/com/escola/modelo/no.py', 'class NaoEJava: pass\n');
    write('node_modules/lib/Falso.java', 'public class Falso {}\n');
    write('target/classes/Gerado.java', 'public class Gerado {}\n');
    write('.oculto/Escondido.java', 'public class Escondido {}\n');
  });
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it('acha as classes e os enums da mesma linguagem, inclusive em outro pacote', async () => {
    const found = await scanDeclarations(root, path.join(root, 'src/main/java/com/escola/app'), ['.java']);
    assert.deepEqual([...found.classes].sort(), ['Main', 'No']);
    assert.deepEqual([...found.enums], ['Cor']);
  });

  it('pula dependências, saída de build e pastas ocultas', async () => {
    const found = await scanDeclarations(root, root, ['.java']);
    for (const name of ['Falso', 'Gerado', 'Escondido', 'NaoEJava']) assert.ok(!found.classes.has(name), name);
  });

  it('a mesma busca serve à sessão inteira', async () => {
    const decls = new ProjectDeclarations(() => root);
    const file = path.join(root, 'src/main/java/com/escola/app/Main.java');
    const first = decls.get(file, ['.java']);
    assert.equal(decls.get(file, ['.java']), first);
    decls.clear();
    assert.notEqual(decls.get(file, ['.java']), first);
    assert.equal(decls.get('relativo/Main.java', ['.java']), undefined);
  });
});

describe('Declarações que o aluno escreve', () => {
  it('C: o nome do typedef é o que o programa usa', () => {
    const c = 'typedef struct no {\n  int valor;\n  struct no *prox;\n} No;\ntypedef struct { char nome[20]; union { int a; float b; } u; } Aluno;\ntypedef struct fila Fila;\n';
    assert.deepEqual([...declaredClasses(c)].sort(), ['Aluno', 'Fila', 'No', 'fila', 'no']);
  });
  it('nomes com acento: class Nó, enum Direção', () => {
    assert.ok(declaredClasses('class Nó:\n    pass\n').has('Nó'));
    assert.ok(declaredClasses('class Árvore { }').has('Árvore'));
    assert.ok(declaredEnums('enum Direção { NORTE, SUL }').has('Direção'));
    assert.ok(declaredEnums('enum class Cor { Azul };').has('Cor'));
  });
});

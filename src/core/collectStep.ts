import { collectSnapshot, type Collected, type Limits, type Session } from '../debug/dapCollector';
import { applyCollectionRoles, pickAdapter } from '../debug/adapters';
import { declaredClasses } from '../debug/adapters/adapter';
import { evaluateCondition } from '../debug/conditionEval';
import { readExceptionInfo, type ExceptionInfoBody } from '../debug/exceptionFilters';
import { parseClasses } from '../model/classes';
import { parseCondition } from '../model/condition';
import { dropVariables, notYetDeclared } from '../model/declared';
import type { Snapshot } from '../model/snapshot';
import { applyTextRoles } from '../model/text';

/*
 * Uma parada do debugger vira um Snapshot. Não depende do editor: o VS Code
 * passa a sessão DAP dele, e o plugin JetBrains passa uma sessão que responde
 * as mesmas requisições lendo o depurador da IDE.
 */

export interface Source {
  text: string;
  lines: string[];
}

export interface StepOptions {
  /** Tipo da sessão ("java", "python"...), que escolhe o adaptador. */
  debugType: string;
  limits: Limits;
  /** Texto do arquivo; undefined quando não dá para ler. */
  readSource: (file: string) => Promise<Source | undefined>;
  previous?: Snapshot;
  reason?: string;
}

export interface Step {
  snapshot: Snapshot;
  collected: Collected;
}

export async function collectStep(session: Session, threadId: number | undefined, opts: StepOptions): Promise<Step | undefined> {
  const thread = threadId ?? (await firstThread(session));
  if (thread === undefined) return undefined;
  // O mesmo arquivo serve para achar as classes do aluno e o texto da linha.
  const sources = new Map<string, Promise<Source | undefined>>();
  const sourceOf = (file: string) => {
    if (!sources.has(file)) sources.set(file, opts.readSource(file));
    return sources.get(file) as Promise<Source | undefined>;
  };
  const collected = await collectSnapshot(session, thread, (file) => pickAdapter(opts.debugType, file), opts.limits, {
    userTypes: async (file) => {
      const s = await sourceOf(file);
      return s ? declaredClasses(s.text) : undefined;
    },
    previous: opts.previous,
  });
  if (!collected) return undefined;
  const snap = collected.snapshot;
  const source = await sourceOf(snap.file);
  snap.code = source?.lines[snap.line - 1]?.trim();
  if (source) applyCollectionRoles(snap, source.text, collected.adapter);
  if (source) applyTextRoles(snap, source.text);
  // Em C, a variável declarada mais abaixo ainda guarda lixo: só entra quando a declaração rodar.
  if (source && collected.adapter.id === 'c') {
    const names = [...snap.arrays, ...snap.pointers, ...(snap.scalars ?? []), ...(snap.refs ?? []), ...(snap.maps ?? [])].map((v) => v.name);
    dropVariables(snap, notYetDeclared(source.text, snap.line, names));
  }
  // Classes do arquivo: herança (polimorfismo) e se escrevem equals (identidade e igualdade).
  const classes = source ? parseClasses(source.text) : {};
  if (Object.keys(classes).length > 0) snap.classes = classes;
  if (opts.reason === 'exception') snap.exception = await readException(session, thread);
  // A linha parada testa uma condição? Cada parte vira verdadeiro ou falso antes de rodar.
  const parsed = snap.exception ? undefined : parseCondition(snap.code, collected.adapter.id === 'python' ? 'python' : 'c');
  if (parsed) snap.condition = await evaluateCondition(session, collected.raw.frame.id, parsed, snap);
  return { snapshot: snap, collected };
}

/** Texto separado em linhas, como o painel usa. */
export function toSource(text: string): Source {
  return { text, lines: text.split(/\r?\n/) };
}

async function firstThread(session: Session): Promise<number | undefined> {
  const { threads } = (await session.customRequest('threads')) as { threads: { id: number }[] };
  return threads[0]?.id;
}

/**
 * Tipo e mensagem do erro que parou o programa. Todos os debuggers testados
 * respondem exceptionInfo; se algum não responder, fica só o aviso genérico.
 */
async function readException(session: Session, threadId: number): Promise<Snapshot['exception']> {
  try {
    return readExceptionInfo((await session.customRequest('exceptionInfo', { threadId })) as ExceptionInfoBody);
  } catch {
    return { type: '', message: '' };
  }
}

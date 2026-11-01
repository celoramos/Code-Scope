import { enclosingFunction } from '../../model/enclosing';
import type { Snapshot } from '../../model/snapshot';
import type { LanguageAdapter } from './adapter';
import { cAdapter } from './c';
import { csharpAdapter } from './csharp';
import { genericAdapter } from './generic';
import { goAdapter } from './go';
import { javaAdapter } from './java';
import { javascriptAdapter } from './javascript';
import { pythonAdapter } from './python';

/** Adaptadores com regras próprias. Para adicionar uma linguagem, crie o arquivo e registre aqui. */
export const ADAPTERS: readonly LanguageAdapter[] = [javaAdapter, javascriptAdapter, pythonAdapter, csharpAdapter, cAdapter, goAdapter];

/**
 * Escolhe pelo tipo da sessão de debug; se for desconhecido, pela extensão do
 * arquivo; se nada bater, o modo genérico, que funciona com qualquer debugger.
 */
export function pickAdapter(debugType: string, file: string): LanguageAdapter {
  const lower = file.toLowerCase();
  return (
    ADAPTERS.find((a) => a.debugTypes.includes(debugType)) ??
    ADAPTERS.find((a) => a.extensions.some((ext) => lower.endsWith(ext))) ??
    genericAdapter
  );
}

/** Marca listas usadas como pilha ou fila e deixa a pilha com o topo no fim. */
export function applyCollectionRoles(snapshot: Snapshot, source: string, adapter: LanguageAdapter): void {
  if (!adapter.collectionRole) return;
  // A função parada decide primeiro: duas variáveis com o mesmo nome em funções diferentes não se misturam.
  const local = enclosingFunction(source, snapshot.line, adapter.id === 'python');
  for (const arr of snapshot.arrays) {
    if (arr.kind !== 'list') continue;
    const role = (local && adapter.collectionRole(local, arr.name)) ?? adapter.collectionRole(source, arr.name);
    if (!role) continue;
    arr.kind = role.role;
    if (role.topFirst) arr.values.reverse();
  }
}

export { cAdapter, csharpAdapter, genericAdapter, goAdapter, javaAdapter, javascriptAdapter, pythonAdapter };

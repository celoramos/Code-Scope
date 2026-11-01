import type { Change } from './diff';
import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * Nível detalhado da explicação: as mesmas mudanças, escritas como quem lê o
 * estado da memória, para quem já passou das frases do modo iniciante.
 */

function detail(c: Change): string | undefined {
  switch (c.kind) {
    case 'set':
      return `${c.array}[${c.index}]: ${c.from} → ${c.to}`;
    case 'swap':
      return `${c.array}[${c.a}] ↔ ${c.array}[${c.b}]`;
    case 'insert':
      return `${c.array}[${c.index}] + ${c.value}`;
    case 'remove':
      return `${c.array}[${c.index}] − ${c.value}`;
    case 'insert-many':
      return `${c.array}[${c.index}] + ${c.values.join(', ')}`;
    case 'remove-many':
      return `${c.array}[${c.index}] − ${c.values.join(', ')}`;
    case 'set-add':
      return `${c.array} + ${c.value}`;
    case 'set-remove':
      return `${c.array} − ${c.value}`;
    case 'array-resized':
      return `${c.array}: ${c.from} → ${c.to}`;
    case 'pointer':
    case 'scalar':
      return `${c.name}: ${c.from ?? '∅'} → ${c.to ?? '∅'}`;
    case 'map-put':
      return `${c.map}[${c.key}]: ${c.from ?? '∅'} → ${c.value}`;
    case 'map-remove':
      return `${c.map}[${c.key}] − ${c.value}`;
    default:
      return undefined;
  }
}

export function stepDetails(changes: Change[], snapshot: Snapshot, executed: number | undefined, language: Language): string[] {
  const m = MESSAGES[language];
  const depth = (snapshot.calls ?? []).filter((c) => !c.program).length;
  return [m.detailLines(executed, snapshot.line), ...(depth > 1 ? [m.detailDepth(depth)] : []), ...changes.flatMap((c) => detail(c) ?? [])];
}

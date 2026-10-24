import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * Nomes iguais em lugares diferentes: a variável de um bloco de dentro que
 * esconde a de fora, e o parâmetro com o mesmo nome de um campo do objeto
 * (pontos e this.pontos). O código sempre usa a de dentro; quem está
 * aprendendo costuma achar que é uma só.
 */

/** Variáveis do código que escondem outra, com o valor da escondida. */
export function shadows(s: Snapshot): Record<string, string> {
  return Object.fromEntries((s.shadowed ?? []).map((v) => [v.name, v.value]));
}

/** Campos do objeto do método (this, self) com o mesmo nome de uma variável local. */
export function fieldShadows(s: Snapshot): { name: string; owner: string }[] {
  const owner = (s.refs ?? []).find((r) => r.name === 'this' || r.name === 'self');
  const obj = owner?.ref ? s.heap?.find((o) => o.id === owner.ref) : undefined;
  if (!owner || !obj) return [];
  const locals = new Set([...s.pointers.map((p) => p.name), ...(s.scalars ?? []).map((v) => v.name), ...s.arrays.map((a) => a.name)]);
  return obj.fields.filter((f) => locals.has(f.name)).map((f) => ({ name: f.name, owner: owner.name }));
}

/** Nomes cuja variável de dentro começou ou deixou de existir neste passo. */
export function shadowChanges(prev: Snapshot | undefined, next: Snapshot): Set<string> {
  const before = prev ? shadows(prev) : {};
  const now = shadows(next);
  return new Set([...Object.keys(now).filter((n) => !(n in before)), ...Object.keys(before).filter((n) => !(n in now))]);
}

export function scopeNotes(prev: Snapshot | undefined, next: Snapshot, language: Language): string[] {
  const m = MESSAGES[language];
  const out: string[] = [];
  const before = prev ? shadows(prev) : {};
  const now = shadows(next);
  const value = (name: string) =>
    next.pointers.find((p) => p.name === name)?.value.toString() ?? next.scalars?.find((v) => v.name === name)?.value ?? '?';
  for (const [name, outer] of Object.entries(now)) {
    if (!(name in before)) out.push(m.shadowStarted(name, value(name), outer));
  }
  for (const name of Object.keys(before)) {
    if (!(name in now)) out.push(m.shadowEnded(name, value(name)));
  }
  const hadField = new Set((prev ? fieldShadows(prev) : []).map((f) => f.name));
  for (const f of fieldShadows(next)) if (!hadField.has(f.name)) out.push(m.shadowField(f.name, f.owner));
  return out;
}

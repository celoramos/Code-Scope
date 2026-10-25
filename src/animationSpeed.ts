export type AnimationSpeed = 'slow' | 'normal' | 'fast' | 'off';

/** Valores da 0.6.0 e anteriores, em português; quem já configurou não perde a escolha. */
const OLD_VALUES: Record<string, AnimationSpeed> = { lenta: 'slow', rapida: 'fast', desligada: 'off' };

/** Valor do settings.json para a velocidade; valor desconhecido vira normal. */
export function readAnimationSpeed(value: unknown): AnimationSpeed {
  if (value === 'slow' || value === 'normal' || value === 'fast' || value === 'off') return value;
  return (typeof value === 'string' && OLD_VALUES[value]) || 'normal';
}

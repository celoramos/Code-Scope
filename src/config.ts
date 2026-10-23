import * as vscode from 'vscode';
import type { Limits } from './debug/dapCollector';
import type { FrameOptions } from './model/frame';

export type AnimationSpeed = 'lenta' | 'normal' | 'rapida' | 'desligada';

export interface Settings {
  limits: Limits;
  frame: FrameOptions;
  animationSpeed: AnimationSpeed;
  revealOnDebug: boolean;
}

/** Lê as configurações codeScope.* a cada uso, para pegar mudanças sem recarregar. */
export function readSettings(): Settings {
  const c = vscode.workspace.getConfiguration('codeScope');
  return {
    limits: {
      maxElements: clamp(c.get('maxElements', 50), 1, 500),
      maxArrays: 20,
    },
    frame: {
      valueNames: new Set(c.get<string[]>('valueNames', []).map((n) => n.toLowerCase())),
      beginnerMode: c.get('beginnerMode', true),
    },
    animationSpeed: c.get<AnimationSpeed>('animationSpeed', 'normal'),
    revealOnDebug: c.get('revealOnDebug', true),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(n), min), max);
}

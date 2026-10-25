import * as vscode from 'vscode';
import { readAnimationSpeed, type AnimationSpeed } from './animationSpeed';
import type { Limits } from './debug/dapCollector';
import type { FrameOptions } from './model/frame';
import type { Language } from './model/messages';

export type { AnimationSpeed };

export interface Settings {
  limits: Limits;
  frame: FrameOptions;
  animationSpeed: AnimationSpeed;
  revealOnDebug: boolean;
  pauseOnErrors: boolean;
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
      language: uiLanguage(),
    },
    animationSpeed: readAnimationSpeed(c.get('animationSpeed')),
    revealOnDebug: c.get('revealOnDebug', true),
    pauseOnErrors: c.get('pauseOnErrors', true),
  };
}

/**
 * O painel fala a língua do VS Code: português para qualquer variante de
 * "pt", inglês para o resto. Trocar o idioma do VS Code recarrega a janela,
 * então basta ler uma vez por uso.
 */
export function uiLanguage(): Language {
  return vscode.env.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(n), min), max);
}

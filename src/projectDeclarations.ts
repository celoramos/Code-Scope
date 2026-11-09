import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Declarations } from './core/collectStep';
import { declaredClasses, declaredEnums } from './debug/adapters/adapter';

/*
 * Classes e enums declarados nos outros arquivos do programa. Quem aprende orientação a objetos
 * separa cedo: No.java e ListaLigada.java ao lado do Main.java, from no import No no Python,
 * import { No } from './no.js'. Só com as classes do arquivo parado, a lista ligada do main
 * sumia do painel, porque a classe No mora em outro arquivo.
 *
 * A busca anda pelas pastas do projeto, primeiro perto do arquivo parado, e lê só arquivos da
 * mesma linguagem; pula dependências, saída de build e ambientes virtuais, e para num limite de
 * arquivos para um repositório gigante não travar a primeira parada.
 */

/** Pastas que não são código do aluno. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  'site-packages',
  'build',
  'dist',
  'out',
  'target',
  'bin',
  'obj',
  '.gradle',
  '.idea',
  '.vscode',
  '.vscode-test',
  '.mvn',
  'vendor',
]);

export const MAX_FILES = 300;
/** Pastas visitadas no máximo: uma pasta "Documentos" inteira não pode travar o debug. */
const MAX_DIRS = 2000;
const MAX_BYTES = 300_000;
const MAX_DEPTH = 12;

/**
 * Lê as declarações dos arquivos com as extensões dadas: primeiro a pasta do arquivo parado
 * (near), depois o resto da raiz (root), que é a pasta do projeto aberto no editor.
 */
export async function scanDeclarations(root: string, near: string, extensions: readonly string[]): Promise<Declarations> {
  const wanted = new Set(extensions.map((e) => e.toLowerCase()));
  const files: string[] = [];
  const seenDirs = new Set<string>();
  const inside = path.relative(root, near);
  const starts = inside && !inside.startsWith('..') && !path.isAbsolute(inside) ? [near, root] : [root];
  for (const start of starts) {
    // Largura primeiro: os arquivos mais perto da raiz de cada busca entram antes do limite.
    let level = [start];
    for (let depth = 0; depth <= MAX_DEPTH && level.length > 0 && files.length < MAX_FILES; depth++) {
      const next: string[] = [];
      for (const dir of level) {
        if (seenDirs.has(dir) || seenDirs.size >= MAX_DIRS || files.length >= MAX_FILES) continue;
        seenDirs.add(dir);
        let entries: import('node:fs').Dirent[];
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const e of entries) {
          if (e.isDirectory()) {
            if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) next.push(path.join(dir, e.name));
          } else if (e.isFile() && wanted.has(path.extname(e.name).toLowerCase()) && files.length < MAX_FILES) {
            files.push(path.join(dir, e.name));
          }
        }
      }
      level = next;
    }
  }
  const classes = new Set<string>();
  const enums = new Set<string>();
  for (const file of new Set(files)) {
    try {
      const stat = await fs.stat(file);
      if (stat.size > MAX_BYTES) continue;
      const text = await fs.readFile(file, 'utf8');
      for (const c of declaredClasses(text)) classes.add(c);
      for (const e of declaredEnums(text)) enums.add(e);
    } catch {
      // Arquivo apagado no meio da busca, ou sem permissão: fica de fora.
    }
  }
  return { classes, enums };
}

/** Uma busca por projeto e linguagem durante a sessão de debug; a próxima sessão busca de novo. */
export class ProjectDeclarations {
  private readonly cache = new Map<string, Promise<Declarations>>();

  constructor(private readonly rootOf: (file: string) => string | undefined) {}

  clear(): void {
    this.cache.clear();
  }

  get(file: string, extensions: readonly string[]): Promise<Declarations> | undefined {
    if (!file || !path.isAbsolute(file) || extensions.length === 0) return undefined;
    const near = path.dirname(file);
    const root = this.rootOf(file) ?? near;
    const key = `${root}|${near}|${extensions.join(',')}`;
    let found = this.cache.get(key);
    if (!found) {
      found = scanDeclarations(root, near, extensions);
      this.cache.set(key, found);
    }
    return found;
  }
}

/*
 * Nomes do código do aluno, com acento: quem aprende em português escreve class Nó,
 * início, posição e índices. O \w e o \b do JavaScript só conhecem letras sem acento:
 * "posição" virava "posi", "índices" não começava num \b e "pilhaé" tinha um no meio.
 * Todos pedem a flag u na expressão.
 */

/** Nome de classe ou variável. */
export const IDENT = '[\\p{L}_$][\\p{L}\\p{N}_$]*';

/** Letra que pode estar num nome. */
export const NAME_CHAR = '[\\p{L}\\p{N}_$]';

/** No lugar de \b antes de um nome: o caractere anterior não é parte de outro nome. */
export const NAME_START = '(?<![\\p{L}\\p{N}_$])';

/** No lugar de \b depois de um nome. */
export const NAME_END = '(?![\\p{L}\\p{N}_$])';

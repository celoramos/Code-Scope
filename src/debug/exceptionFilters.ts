/** Filtros de exceção do DAP, sem depender do VS Code (os testes unitários usam). */

export interface ExceptionFilter {
  filter: string;
  label?: string;
}

export interface SetExceptionBreakpointsArgs {
  filters?: string[];
  filterOptions?: { filterId: string }[];
  [key: string]: unknown;
}

/** O filtro de exceções não tratadas que o debugger oferece, se houver. */
export function uncaughtFilter(filters: readonly ExceptionFilter[]): string | undefined {
  return (filters.find((f) => f.filter === 'uncaught') ?? filters.find((f) => /uncaught|unhandled/i.test(f.filter) && !/^user/i.test(f.filter)))?.filter;
}

/** Os argumentos do VS Code com o filtro a mais, ou undefined se ele já estava lá. */
export function withFilter(args: SetExceptionBreakpointsArgs | undefined, id: string): SetExceptionBreakpointsArgs | undefined {
  const base: SetExceptionBreakpointsArgs = { filters: [], ...args };
  if (base.filters?.includes(id) || base.filterOptions?.some((o) => o.filterId === id)) return undefined;
  // Debuggers com filterOptions recebem o filtro lá; os outros, na lista simples.
  if (Array.isArray(base.filterOptions) && base.filterOptions.length > 0) {
    return { ...base, filterOptions: [...base.filterOptions, { filterId: id }] };
  }
  return { ...base, filters: [...(base.filters ?? []), id] };
}

export interface ExceptionInfoBody {
  exceptionId?: string;
  description?: string;
  details?: { typeName?: string; fullTypeName?: string; message?: string };
}

/**
 * Tipo curto e mensagem a partir da resposta de exceptionInfo. Cada debugger
 * preenche de um jeito: o Java põe o nome completo da classe em exceptionId;
 * o js-debug põe "TypeError: Cannot read..." inteiro, às vezes com a pilha
 * nas linhas seguintes.
 */
export function readExceptionInfo(info: ExceptionInfoBody): { type: string; message: string } {
  let type = (info.details?.typeName ?? info.details?.fullTypeName ?? info.exceptionId ?? '').split('\n')[0].trim();
  let message = (info.details?.message ?? info.description ?? '').split('\n')[0].trim();
  const joined = /^([\w.$]+):\s*(.*)$/.exec(type);
  if (joined) {
    type = joined[1];
    if (!message || message === info.exceptionId?.split('\n')[0].trim()) message = joined[2];
  }
  type = type.split(/[.$]/).pop() ?? type;
  // O Java põe a mensagem entre aspas; outros repetem o tipo na frente ("TypeError: ...",
  // "java.lang.ArrayIndexOutOfBoundsException: ...").
  message = message.replace(/^"(.*)"$/, '$1');
  const prefix = /^([\w.$]+):\s*/.exec(message);
  if (type && prefix && prefix[1].split(/[.$]/).pop() === type) message = message.slice(prefix[0].length);
  return { type, message };
}

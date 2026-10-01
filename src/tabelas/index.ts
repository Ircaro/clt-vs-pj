import { tabela2026 } from './2026';
import type { TabelaAno } from './tipos';

export const tabelasOficiais: Record<number, TabelaAno> = {
  2026: tabela2026,
};

export const anosDisponiveis = Object.keys(tabelasOficiais)
  .map(Number)
  .sort((a, b) => b - a);

export const anoMaisRecente = anosDisponiveis[0] ?? 2026;

export function tabelaOficial(ano: number): TabelaAno {
  const tabela = tabelasOficiais[ano] ?? tabelasOficiais[anoMaisRecente];
  if (!tabela) throw new Error(`Nenhuma tabela cadastrada para ${ano}`);
  return structuredClone(tabela);
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function mesclar(base: unknown, sobre: unknown): unknown {
  if (!ehObjeto(base) || !ehObjeto(sobre)) return sobre === undefined ? base : sobre;
  const resultado: Record<string, unknown> = { ...base };
  for (const [chave, valor] of Object.entries(sobre)) resultado[chave] = mesclar(base[chave], valor);
  return resultado;
}

export function completarTabela(tabela: unknown): unknown {
  return mesclar(tabelaOficial(anoMaisRecente), tabela);
}

export type { TabelaAno } from './tipos';

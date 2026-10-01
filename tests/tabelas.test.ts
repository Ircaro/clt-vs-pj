import { describe, expect, it } from 'vitest';
import { tabelaOficial, tabelasOficiais } from '../src/tabelas';
import { tabela2026 } from '../src/tabelas/2026';
import { validarTabela } from '../src/tabelas/validacao';

describe('Tabelas oficiais', () => {
  it.each(Object.values(tabelasOficiais).map((t) => [t.ano, t]))('a tabela de %i é válida', (_, tabela) => {
    expect(validarTabela(tabela)).toEqual([]);
  });

  it('entrega uma cópia para não alterar a oficial', () => {
    const copia = tabelaOficial(2026);
    copia.salarioMinimo = 1;
    expect(tabela2026.salarioMinimo).toBe(1621);
  });
});

describe('Validação de tabela importada', () => {
  it('rejeita conteúdo que não é tabela', () => {
    expect(validarTabela(null)).not.toEqual([]);
    expect(validarTabela({ ano: 2027 }).length).toBeGreaterThan(0);
  });

  it('rejeita faixas fora de ordem', () => {
    const tabela = structuredClone(tabela2026);
    tabela.inss.faixas[1]!.ate = 100;
    expect(validarTabela(tabela).some((e) => e.includes('inss.faixas[1]'))).toBe(true);
  });

  it('só aceita faixa sem limite na última posição', () => {
    const tabela = structuredClone(tabela2026);
    tabela.irrf.faixas[0]!.ate = null;
    expect(validarTabela(tabela).some((e) => e.includes('só a última'))).toBe(true);
  });
});

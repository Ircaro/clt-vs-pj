import { describe, expect, it } from 'vitest';
import { aliquotaEfetivaSimples, inssContribuinteIndividual, inssEmpregado, irrf, irrfPlr } from '../src/calc/impostos';
import { tabela2026 } from '../src/tabelas/2026';

describe('INSS empregado 2026', () => {
  it('aplica a alíquota progressiva por faixa', () => {
    expect(inssEmpregado(3000, tabela2026)).toBe(248.6);
  });

  it('cobra 7,5% sobre o salário mínimo', () => {
    expect(inssEmpregado(1621, tabela2026)).toBe(121.58);
  });

  it('limita a contribuição ao teto', () => {
    expect(inssEmpregado(8475.55, tabela2026)).toBe(988.09);
    expect(inssEmpregado(25000, tabela2026)).toBe(988.09);
  });

  it('retorna zero para salário zerado ou negativo', () => {
    expect(inssEmpregado(0, tabela2026)).toBe(0);
    expect(inssEmpregado(-100, tabela2026)).toBe(0);
  });
});

describe('INSS contribuinte individual (pró-labore)', () => {
  it('cobra 11% limitado ao teto', () => {
    expect(inssContribuinteIndividual(5600, tabela2026)).toBe(616);
    expect(inssContribuinteIndividual(20000, tabela2026)).toBe(932.31);
  });
});

describe('IRRF mensal 2026 com a redução da Lei 15.270/2025', () => {
  it('zera o imposto para rendimento de até R$ 5.000', () => {
    const r = irrf({ rendimentoBruto: 5000, inss: inssEmpregado(5000, tabela2026), dependentes: 0 }, tabela2026);
    expect(r.usouSimplificado).toBe(true);
    expect(r.impostoTabela).toBe(312.89);
    expect(r.imposto).toBe(0);
  });

  it('aplica a redução parcial entre R$ 5.000,01 e R$ 7.350', () => {
    const r = irrf({ rendimentoBruto: 6000, inss: inssEmpregado(6000, tabela2026), dependentes: 0 }, tabela2026);
    expect(r.usouSimplificado).toBe(false);
    expect(r.impostoTabela).toBe(564.85);
    expect(r.reducao).toBe(179.75);
    expect(r.imposto).toBe(385.1);
  });

  it('não aplica redução acima de R$ 7.350', () => {
    const r = irrf({ rendimentoBruto: 10000, inss: 988.09, dependentes: 0 }, tabela2026);
    expect(r.reducao).toBe(0);
    expect(r.imposto).toBeCloseTo(1569.55, 1);
  });

  it('deduz dependentes da base', () => {
    const sem = irrf({ rendimentoBruto: 10000, inss: 988.09, dependentes: 0 }, tabela2026);
    const com = irrf({ rendimentoBruto: 10000, inss: 988.09, dependentes: 2 }, tabela2026);
    expect(sem.imposto - com.imposto).toBeCloseTo(2 * 189.59 * 0.275, 1);
  });
});

describe('IRRF sobre PLR', () => {
  it('isenta até o limite da tabela exclusiva', () => {
    expect(irrfPlr(7640.8, tabela2026)).toBe(0);
  });

  it('usa a tabela exclusiva de PLR', () => {
    expect(irrfPlr(10000, tabela2026)).toBe(182.77);
  });
});

describe('Simples Nacional', () => {
  it('calcula a alíquota efetiva do Anexo III', () => {
    expect(aliquotaEfetivaSimples(240000, tabela2026.simples.anexoIII)).toBeCloseTo(0.073, 6);
  });

  it('usa a alíquota nominal na primeira faixa', () => {
    expect(aliquotaEfetivaSimples(120000, tabela2026.simples.anexoIII)).toBeCloseTo(0.06, 6);
    expect(aliquotaEfetivaSimples(120000, tabela2026.simples.anexoV)).toBeCloseTo(0.155, 6);
  });
});

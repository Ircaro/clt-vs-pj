import { describe, expect, it } from 'vitest';
import { calcularClt, type EntradaClt } from '../src/calc/clt';
import { notaPjEquivalente, salarioCltEquivalente } from '../src/calc/equivalencia';
import { calcularPj, type EntradaPj } from '../src/calc/pj';
import { tabela2026 } from '../src/tabelas/2026';

const pj: EntradaPj = {
  valorMensal: 0,
  diasFerias: 30,
  feriasRemuneradas: true,
  bonusAnual: 0,
  regime: 'melhor',
  atividadePermiteMei: true,
  modoProLabore: 'otimizado',
  proLaboreManual: 0,
  aliquotaIss: 0.03,
  dependentes: 0,
  planoSaudeContratante: 0,
  outrosBeneficiosContratante: 0,
  custos: [
    { nome: 'Contabilidade', valor: 250, periodicidade: 'mensal', mei: false },
    { nome: 'Certificado digital', valor: 200, periodicidade: 'anual', mei: false },
  ],
};

const clt: EntradaClt = {
  salarioBruto: 10000,
  dependentes: 0,
  plrAnual: 0,
  valeRefeicaoAlimentacao: 800,
  valeTransporte: 0,
  planoSaudeEmpresa: 600,
  outrosBeneficios: 0,
  descontoPlanoSaude: 0,
  outrosDescontos: 0,
  considerarFgts: true,
  considerarMultaFgts: false,
};

const totalPj = (nota: number) => calcularPj({ ...pj, valorMensal: nota }, tabela2026).escolhido;

describe('Nota PJ equivalente', () => {
  it('acha o empate mais barato mesmo com a queda no fim do limite do MEI', () => {
    const alvo = 90000;
    const nota = notaPjEquivalente(alvo, pj, tabela2026);
    expect(nota).not.toBeNull();
    expect(nota!).toBeLessThan(8100);
    expect(totalPj(nota!).cenario.regime).toBe('mei');
    expect(totalPj(nota!).anual.total).toBeGreaterThanOrEqual(alvo - 0.01);
    expect(totalPj(nota! - 50).anual.total).toBeLessThan(alvo);
  });

  it('pula para a ME quando o MEI não alcança o alvo', () => {
    const alvo = 100000;
    const nota = notaPjEquivalente(alvo, pj, tabela2026)!;
    expect(totalPj(nota).cenario.regime).not.toBe('mei');
    expect(totalPj(nota).anual.total).toBeCloseTo(alvo, 0);
  });

  it('entrega a nota que rende a margem pedida sobre a CLT', () => {
    const hoje = calcularClt(clt, tabela2026).anual.total;
    const nota = notaPjEquivalente(hoje * 1.2, { ...pj, atividadePermiteMei: false }, tabela2026)!;
    const resultado = calcularPj({ ...pj, atividadePermiteMei: false, valorMensal: nota }, tabela2026).escolhido;
    expect(resultado.anual.total / hoje).toBeCloseTo(1.2, 3);
  });

  it('retorna nulo quando o alvo é inalcançável', () => {
    expect(notaPjEquivalente(1e9, pj, tabela2026)).toBeNull();
  });
});

describe('Salário CLT equivalente', () => {
  it('entrega o salário que rende a margem pedida sobre o PJ', () => {
    const hoje = totalPj(14000).anual.total;
    const salario = salarioCltEquivalente(hoje * 1.1, clt, tabela2026)!;
    expect(calcularClt({ ...clt, salarioBruto: salario }, tabela2026).anual.total / hoje).toBeCloseTo(1.1, 3);
  });
});

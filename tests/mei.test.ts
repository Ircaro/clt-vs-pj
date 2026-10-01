import { describe, expect, it } from 'vitest';
import { irpfAnual } from '../src/calc/impostos';
import { calcularCenarioPj, calcularPj, dasMeiMensal, type EntradaPj } from '../src/calc/pj';
import { completarTabela } from '../src/tabelas';
import { tabela2026 } from '../src/tabelas/2026';
import { validarTabela } from '../src/tabelas/validacao';

const mei: EntradaPj = {
  valorMensal: 6000,
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
    { nome: 'Tarifa bancária', valor: 20, periodicidade: 'mensal', mei: true },
  ],
};

const cenarioMei = { regime: 'mei' as const, proLaboreMensal: 0 };

describe('IR anual 2026', () => {
  it('zera o imposto para rendimento tributável de até R$ 60 mil', () => {
    const r = irpfAnual(55000, 0, tabela2026);
    expect(r.impostoTabela).toBeGreaterThan(0);
    expect(r.imposto).toBe(0);
  });

  it('aplica a redução parcial entre R$ 60 mil e R$ 88,2 mil', () => {
    const r = irpfAnual(80000, 0, tabela2026);
    expect(r.deducao).toBe(16000);
    expect(r.impostoTabela).toBe(6695.34);
    expect(r.reducao).toBe(783.73);
    expect(r.imposto).toBe(5911.61);
  });

  it('limita o desconto simplificado', () => {
    expect(irpfAnual(200000, 0, tabela2026).deducao).toBe(17640);
  });
});

describe('MEI', () => {
  it('cobra DAS fixo de 5% do salário mínimo + ISS', () => {
    expect(dasMeiMensal(tabela2026)).toBe(86.05);
  });

  it('não paga pró-labore e só considera os custos marcados como MEI', () => {
    const r = calcularCenarioPj(mei, cenarioMei, tabela2026);
    expect(r.proLabore.bruto).toBe(0);
    expect(r.impostosEmpresaAnual).toBe(1032.6);
    expect(r.custosAnual).toBe(240);
    expect(r.lucroDistribuivelAnual).toBe(70727.4);
    expect(r.lucroIsentoAnual).toBe(23040);
    expect(r.irpfAnual).toBe(0);
    expect(r.invalido).toBeNull();
  });

  it('invalida o MEI acima do limite com a tolerância de 20%', () => {
    const r = calcularCenarioPj({ ...mei, valorMensal: 8500, custos: [] }, cenarioMei, tabela2026);
    expect(r.alertas.some((a) => a.includes('perde o MEI desde o início do ano'))).toBe(true);
    expect(r.invalido).not.toBeNull();
  });

  it('cobra DAS complementar no excesso de até 20%', () => {
    const r = calcularCenarioPj({ ...mei, valorMensal: 7500, custos: [] }, cenarioMei, tabela2026);
    expect(r.invalido).toBeNull();
    expect(r.impostosEmpresa.find((i) => i.nome.includes('complementar'))?.valor).toBe(540);
  });

  it('deixa o MEI fora da comparação quando a atividade não foi marcada', () => {
    const r = calcularCenarioPj({ ...mei, atividadePermiteMei: false }, cenarioMei, tabela2026);
    expect(r.invalido).toMatch(/atividade não marcada/);
  });

  it('aceita o MEI escolhido diretamente sem questionar a atividade', () => {
    const r = calcularPj({ ...mei, regime: 'mei', atividadePermiteMei: false }, tabela2026);
    expect(r.escolhido.cenario.regime).toBe('mei');
    expect(r.escolhido.invalido).toBeNull();
    expect(r.escolhido.alertas).toEqual([]);
  });

  it('explica o motivo quando o MEI escolhido passa do limite', () => {
    const r = calcularPj({ ...mei, regime: 'mei', valorMensal: 14000 }, tabela2026).escolhido;
    expect(r.invalido).not.toBeNull();
    expect(r.alertas[0]).toContain('o MEI não é possível');
  });

  it('escolhe o MEI quando é permitido e compensa', () => {
    const r = calcularPj(mei, tabela2026);
    expect(r.escolhido.cenario.regime).toBe('mei');
    expect(r.avaliados.map((c) => c.porte)).toContain('ME');
  });

  it('ignora o MEI inválido na escolha do melhor regime', () => {
    const r = calcularPj({ ...mei, atividadePermiteMei: false }, tabela2026);
    expect(r.escolhido.cenario.regime).not.toBe('mei');
  });
});

describe('Tabelas antigas salvas no navegador', () => {
  it('ganham os campos novos ao serem carregadas', () => {
    const antiga = structuredClone(tabela2026) as Partial<typeof tabela2026>;
    delete antiga.mei;
    delete antiga.irpfAnual;
    antiga.salarioMinimo = 1700;
    const completa = completarTabela(antiga) as typeof tabela2026;
    expect(validarTabela(completa)).toEqual([]);
    expect(completa.salarioMinimo).toBe(1700);
    expect(completa.mei.limiteAnual).toBe(81000);
  });
});

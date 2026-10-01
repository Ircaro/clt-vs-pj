import { describe, expect, it } from 'vitest';
import { calcularClt, type EntradaClt } from '../src/calc/clt';
import { notaPjEquivalente, salarioCltEquivalente } from '../src/calc/equivalencia';
import { calcularCenarioPj, calcularPj, type EntradaPj } from '../src/calc/pj';
import { tabela2026 } from '../src/tabelas/2026';

const clt: EntradaClt = {
  salarioBruto: 10000,
  dependentes: 0,
  plrAnual: 0,
  valeRefeicaoAlimentacao: 0,
  valeTransporte: 0,
  planoSaudeEmpresa: 0,
  outrosBeneficios: 0,
  descontoPlanoSaude: 0,
  outrosDescontos: 0,
  considerarFgts: true,
  considerarMultaFgts: false,
};

const pj: EntradaPj = {
  valorMensal: 20000,
  diasFerias: 30,
  feriasRemuneradas: true,
  bonusAnual: 0,
  regime: 'melhor',
  atividadePermiteMei: false,
  modoProLabore: 'otimizado',
  proLaboreManual: 0,
  aliquotaIss: 0.03,
  dependentes: 0,
  planoSaudeContratante: 0,
  outrosBeneficiosContratante: 0,
  custos: [],
};

describe('CLT', () => {
  it('monta o holerite mensal', () => {
    const r = calcularClt(clt, tabela2026);
    expect(r.mensal.inss).toBe(988.09);
    expect(r.mensal.liquido).toBeCloseTo(7442.36, 1);
  });

  it('paga férias com 1/3 e 13º', () => {
    const r = calcularClt(clt, tabela2026);
    expect(r.mesFerias.bruto).toBeCloseTo(13333.33, 2);
    expect(r.decimoTerceiro.bruto).toBe(10000);
    expect(r.anual.bruto).toBeCloseTo(10000 * 11 + 13333.33 + 10000, 1);
  });

  it('deposita 8% de FGTS sobre salários, férias e 13º', () => {
    const r = calcularClt(clt, tabela2026);
    expect(r.fgtsAnual).toBeCloseTo(10000 * (13 + 1 / 3) * 0.08, 1);
  });

  it('ignora o FGTS quando desmarcado', () => {
    const r = calcularClt({ ...clt, considerarFgts: false }, tabela2026);
    expect(r.anual.fgts).toBe(0);
  });

  it('limita o desconto de vale-transporte a 6% do salário', () => {
    const r = calcularClt({ ...clt, salarioBruto: 3000, valeTransporte: 400 }, tabela2026);
    expect(r.descontoValeTransporte).toBe(180);
  });

  it('soma benefícios ao pacote anual', () => {
    const r = calcularClt({ ...clt, valeRefeicaoAlimentacao: 1000, planoSaudeEmpresa: 800 }, tabela2026);
    expect(r.anual.beneficios).toBe(21600);
  });
});

describe('PJ', () => {
  it('usa o Anexo III quando o pró-labore atinge o Fator R', () => {
    const r = calcularCenarioPj(pj, { regime: 'simples', proLaboreMensal: 5600 }, tabela2026);
    expect(r.anexo).toBe('III');
    expect(r.impostosEmpresaAnual).toBe(17520);
    expect(r.proLabore.inss).toBe(616);
    expect(r.proLabore.irrf).toBe(228.86);
    expect(r.lucroDistribuivelAnual).toBe(155280);
    expect(r.anual.dinheiroLiquido).toBeCloseTo(212341.68, 1);
  });

  it('cai no Anexo V com pró-labore mínimo', () => {
    const r = calcularCenarioPj(pj, { regime: 'simples', proLaboreMensal: 1621 }, tabela2026);
    expect(r.anexo).toBe('V');
    expect(r.impostosEmpresaAnual).toBe(38700);
  });

  it('calcula o Lucro Presumido com INSS patronal', () => {
    const r = calcularCenarioPj(pj, { regime: 'presumido', proLaboreMensal: 1621 }, tabela2026);
    expect(r.impostosEmpresaAnual).toBe(34392);
    expect(r.inssPatronalAnual).toBe(3890.4);
  });

  it('escolhe o cenário com maior valor líquido', () => {
    const r = calcularPj(pj, tabela2026);
    expect(r.avaliados).toHaveLength(4);
    expect(r.escolhido.anexo).toBe('III');
    expect(r.avaliados.find((c) => c.cenario.regime === 'mei')?.invalido).toMatch(/Faturamento acima/);
  });

  it('desconta os custos de manter o CNPJ', () => {
    const custos = [
      { nome: 'Contabilidade', valor: 250, periodicidade: 'mensal' as const, mei: false },
      { nome: 'Certificado digital', valor: 200, periodicidade: 'anual' as const, mei: false },
    ];
    const sem = calcularCenarioPj(pj, { regime: 'simples', proLaboreMensal: 5600 }, tabela2026);
    const com = calcularCenarioPj({ ...pj, custos }, { regime: 'simples', proLaboreMensal: 5600 }, tabela2026);
    expect(com.custosAnual).toBe(3200);
    expect(sem.anual.total - com.anual.total).toBeCloseTo(3200, 2);
  });

  it('deixa de faturar os dias de férias não remuneradas', () => {
    const r = calcularCenarioPj({ ...pj, feriasRemuneradas: false }, { regime: 'simples', proLaboreMensal: 5600 }, tabela2026);
    expect(r.faturamentoAnual).toBe(220000);
  });

  it('retém 10% dos dividendos acima de R$ 50 mil por mês', () => {
    const r = calcularPj({ ...pj, valorMensal: 90000 }, tabela2026).escolhido;
    expect(r.retencaoDividendosAnual).toBeGreaterThan(0);
    expect(r.alertas.some((a) => a.includes('retenção'))).toBe(true);
  });
});

describe('Equivalência', () => {
  it('encontra a nota PJ que iguala um total alvo', () => {
    const alvo = calcularPj(pj, tabela2026).escolhido.anual.total;
    const nota = notaPjEquivalente(alvo, pj, tabela2026);
    expect(nota).not.toBeNull();
    expect(nota!).toBeCloseTo(20000, 0);
  });

  it('encontra o salário CLT que iguala um total alvo', () => {
    const alvo = calcularClt(clt, tabela2026).anual.total;
    const salario = salarioCltEquivalente(alvo, clt, tabela2026);
    expect(salario!).toBeCloseTo(10000, 0);
  });
});

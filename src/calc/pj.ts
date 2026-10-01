import type { TabelaAno } from '../tabelas/tipos';
import { aliquotaEfetivaSimples, arred, inssContribuinteIndividual, irpfAnual, irrf } from './impostos';

export type Periodicidade = 'mensal' | 'anual';
export type Regime = 'melhor' | 'mei' | 'simples' | 'presumido';
export type ModoProLabore = 'otimizado' | 'minimo' | 'manual';
export type Porte = 'MEI' | 'ME' | 'EPP';

export interface CustoPj {
  nome: string;
  valor: number;
  periodicidade: Periodicidade;
  mei: boolean;
}

export interface EntradaPj {
  valorMensal: number;
  diasFerias: number;
  feriasRemuneradas: boolean;
  bonusAnual: number;
  regime: Regime;
  atividadePermiteMei: boolean;
  modoProLabore: ModoProLabore;
  proLaboreManual: number;
  aliquotaIss: number;
  dependentes: number;
  planoSaudeContratante: number;
  outrosBeneficiosContratante: number;
  custos: CustoPj[];
}

export interface CenarioPj {
  regime: 'mei' | 'simples' | 'presumido';
  proLaboreMensal: number;
}

export interface ImpostoEmpresa {
  nome: string;
  valor: number;
}

export interface ResultadoPj {
  cenario: CenarioPj;
  descricao: string;
  porte: Porte;
  invalido: string | null;
  mesesFaturados: number;
  faturamentoAnual: number;
  anexo: 'III' | 'V' | null;
  fatorR: number | null;
  aliquotaEfetiva: number;
  impostosEmpresa: ImpostoEmpresa[];
  impostosEmpresaAnual: number;
  inssPatronalAnual: number;
  custosAnual: number;
  custosDetalhados: { nome: string; anual: number }[];
  proLabore: {
    bruto: number;
    inss: number;
    irrf: number;
    liquido: number;
  };
  lucroDistribuivelAnual: number;
  lucroIsentoAnual: number;
  irpfAnual: number;
  retencaoDividendosAnual: number;
  dividendosLiquidosAnual: number;
  beneficiosAnual: number;
  anual: {
    dinheiroLiquido: number;
    beneficios: number;
    total: number;
    impostosTotais: number;
  };
  mediaMensal: number;
  alertas: string[];
}

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = (valor: number) => formatoMoeda.format(valor);

export function custoAnual(custo: CustoPj): number {
  return custo.periodicidade === 'mensal' ? custo.valor * 12 : custo.valor;
}

export function mesesFaturados(e: EntradaPj): number {
  const semRemuneracao = e.feriasRemuneradas ? 0 : Math.min(Math.max(e.diasFerias, 0), 365) / 30;
  return Math.max(0, 12 - semRemuneracao);
}

export function faturamentoAnual(e: EntradaPj): number {
  return arred(Math.max(e.valorMensal, 0) * mesesFaturados(e) + Math.max(e.bonusAnual, 0));
}

export function dasMeiMensal(tabela: TabelaAno): number {
  return arred(tabela.salarioMinimo * tabela.mei.aliquotaInssSalarioMinimo + tabela.mei.issMensal);
}

function detalharCustos(e: EntradaPj, apenasMei: boolean) {
  const custosDetalhados = e.custos
    .filter((c) => c.valor > 0 && (!apenasMei || c.mei))
    .map((c) => ({ nome: c.nome || 'Custo sem nome', anual: arred(custoAnual(c)) }));
  return { custosDetalhados, custosAnual: arred(custosDetalhados.reduce((s, c) => s + c.anual, 0)) };
}

function beneficiosAnuais(e: EntradaPj): number {
  return arred((e.planoSaudeContratante + e.outrosBeneficiosContratante) * 12);
}

function calcularMei(e: EntradaPj, tabela: TabelaAno): ResultadoPj {
  const m = tabela.mei;
  const alertas: string[] = [];
  const faturamento = faturamentoAnual(e);
  const limiteTolerado = m.limiteAnual * (1 + m.toleranciaExcesso);
  const emComparacao = e.regime === 'melhor';
  let invalido: string | null = null;

  if (faturamento > limiteTolerado) invalido = `Faturamento acima de ${brl(limiteTolerado)}/ano`;
  else if (emComparacao && !e.atividadePermiteMei) invalido = 'Fora da comparação: atividade não marcada';

  const impostosEmpresa: ImpostoEmpresa[] = [{ nome: 'DAS MEI (INSS + ISS)', valor: arred(dasMeiMensal(tabela) * 12) }];
  const excesso = Math.max(0, faturamento - m.limiteAnual);
  if (excesso > 0) {
    const aliquota = tabela.simples.anexoIII[0]?.aliquota ?? 0;
    impostosEmpresa.push({ nome: 'DAS complementar sobre o excesso', valor: arred(excesso * aliquota) });
    alertas.push(
      faturamento > limiteTolerado
        ? `Com ${brl(faturamento)}/ano o MEI não é possível: o limite é ${brl(m.limiteAnual)}/ano, com tolerância até ${brl(limiteTolerado)}. Acima disso o CNPJ perde o MEI desde o início do ano e passa a ser ME.`
        : `Faturamento acima do limite de ${brl(m.limiteAnual)}/ano: paga DAS complementar sobre o excesso e vira ME no ano seguinte.`,
    );
  }

  const impostosEmpresaAnual = arred(impostosEmpresa.reduce((s, i) => s + i.valor, 0));
  const { custosDetalhados, custosAnual } = detalharCustos(e, true);
  const lucroBruto = faturamento - impostosEmpresaAnual - custosAnual;
  const lucro = arred(Math.max(0, lucroBruto));
  if (lucroBruto < 0) alertas.push('O faturamento não cobre o DAS e os custos. A empresa fica no prejuízo.');

  const lucroIsentoAnual = arred(Math.min(lucro, faturamento * m.percentualLucroIsento));
  const tributavel = arred(lucro - lucroIsentoAnual);
  const ir = irpfAnual(tributavel, e.dependentes, tabela).imposto;
  const beneficiosAnual = beneficiosAnuais(e);
  const dinheiroLiquido = arred(lucro - ir);
  const total = arred(dinheiroLiquido + beneficiosAnual);

  return {
    cenario: { regime: 'mei', proLaboreMensal: 0 },
    descricao: 'MEI',
    porte: 'MEI',
    invalido,
    mesesFaturados: mesesFaturados(e),
    faturamentoAnual: faturamento,
    anexo: null,
    fatorR: null,
    aliquotaEfetiva: faturamento > 0 ? impostosEmpresaAnual / faturamento : 0,
    impostosEmpresa,
    impostosEmpresaAnual,
    inssPatronalAnual: 0,
    custosAnual,
    custosDetalhados,
    proLabore: { bruto: 0, inss: 0, irrf: 0, liquido: 0 },
    lucroDistribuivelAnual: lucro,
    lucroIsentoAnual,
    irpfAnual: ir,
    retencaoDividendosAnual: 0,
    dividendosLiquidosAnual: dinheiroLiquido,
    beneficiosAnual,
    anual: { dinheiroLiquido, beneficios: beneficiosAnual, total, impostosTotais: arred(impostosEmpresaAnual + ir) },
    mediaMensal: arred(total / 12),
    alertas,
  };
}

export function calcularCenarioPj(e: EntradaPj, cenario: CenarioPj, tabela: TabelaAno): ResultadoPj {
  if (cenario.regime === 'mei') return calcularMei(e, tabela);

  const alertas: string[] = [];
  const meses = mesesFaturados(e);
  const faturamento = faturamentoAnual(e);
  const proLaboreMensal = arred(Math.max(cenario.proLaboreMensal, 0));
  const proLaboreAnual = proLaboreMensal * 12;
  const porte: Porte = faturamento <= tabela.simples.limiteMe ? 'ME' : 'EPP';

  const impostosEmpresa: ImpostoEmpresa[] = [];
  let anexo: 'III' | 'V' | null = null;
  let fatorR: number | null = null;
  let inssPatronalAnual = 0;
  let invalido: string | null = null;

  if (cenario.regime === 'simples') {
    fatorR = faturamento > 0 ? proLaboreAnual / faturamento : 0;
    anexo = fatorR >= tabela.simples.fatorR - 1e-9 ? 'III' : 'V';
    const faixas = anexo === 'III' ? tabela.simples.anexoIII : tabela.simples.anexoV;
    const aliquota = aliquotaEfetivaSimples(faturamento, faixas);
    impostosEmpresa.push({ nome: `DAS Simples Nacional (Anexo ${anexo})`, valor: arred(faturamento * aliquota) });
    if (faturamento > tabela.simples.limiteAnual) {
      invalido = 'Faturamento acima do limite do Simples';
      alertas.push('Faturamento acima do limite do Simples Nacional. Considere o Lucro Presumido.');
    }
  } else {
    const p = tabela.presumido;
    const lucroPresumido = faturamento * p.presuncaoServicos;
    const adicional = Math.max(0, lucroPresumido - p.limiteAdicionalMensal * 12) * p.adicionalIrpj;
    impostosEmpresa.push(
      { nome: 'IRPJ', valor: arred(lucroPresumido * p.irpj + adicional) },
      { nome: 'CSLL', valor: arred(lucroPresumido * p.csll) },
      { nome: 'PIS', valor: arred(faturamento * p.pis) },
      { nome: 'COFINS', valor: arred(faturamento * p.cofins) },
      { nome: 'ISS', valor: arred(faturamento * e.aliquotaIss) },
    );
    inssPatronalAnual = arred(proLaboreAnual * tabela.inss.aliquotaPatronal);
  }

  const impostosEmpresaAnual = arred(impostosEmpresa.reduce((s, i) => s + i.valor, 0));
  const aliquotaEfetiva = faturamento > 0 ? impostosEmpresaAnual / faturamento : 0;
  const { custosDetalhados, custosAnual } = detalharCustos(e, false);

  const inssProLabore = inssContribuinteIndividual(proLaboreMensal, tabela);
  const irProLabore = irrf({ rendimentoBruto: proLaboreMensal, inss: inssProLabore, dependentes: e.dependentes }, tabela).imposto;
  const proLabore = {
    bruto: proLaboreMensal,
    inss: inssProLabore,
    irrf: irProLabore,
    liquido: arred(proLaboreMensal - inssProLabore - irProLabore),
  };

  const lucroBruto = faturamento - impostosEmpresaAnual - inssPatronalAnual - custosAnual - proLaboreAnual;
  const lucroDistribuivelAnual = arred(Math.max(0, lucroBruto));
  if (lucroBruto < 0) {
    alertas.push('O faturamento não cobre impostos, custos e pró-labore. A empresa fica no prejuízo.');
  }

  const dividendoMensal = lucroDistribuivelAnual / 12;
  const retencaoMensal =
    dividendoMensal > tabela.dividendos.limiteMensalIsento ? dividendoMensal * tabela.dividendos.aliquotaRetencao : 0;
  const retencaoDividendosAnual = arred(retencaoMensal * 12);
  if (retencaoMensal > 0) {
    alertas.push(
      `Dividendos acima de ${brl(tabela.dividendos.limiteMensalIsento)}/mês sofrem retenção de ${(tabela.dividendos.aliquotaRetencao * 100).toFixed(0)}% na fonte.`,
    );
  }
  const dividendosLiquidosAnual = arred(lucroDistribuivelAnual - retencaoDividendosAnual);

  const beneficiosAnual = beneficiosAnuais(e);
  const dinheiroLiquido = arred(proLabore.liquido * 12 + dividendosLiquidosAnual);
  const total = arred(dinheiroLiquido + beneficiosAnual);
  const impostosTotais = arred(
    impostosEmpresaAnual + inssPatronalAnual + (proLabore.inss + proLabore.irrf) * 12 + retencaoDividendosAnual,
  );

  const descricao =
    cenario.regime === 'simples'
      ? `${porte} no Simples Nacional, Anexo ${anexo}, pró-labore ${brl(proLaboreMensal)}`
      : `${porte} no Lucro Presumido, pró-labore ${brl(proLaboreMensal)}`;

  return {
    cenario: { ...cenario, proLaboreMensal },
    descricao,
    porte,
    invalido,
    mesesFaturados: meses,
    faturamentoAnual: faturamento,
    anexo,
    fatorR,
    aliquotaEfetiva,
    impostosEmpresa,
    impostosEmpresaAnual,
    inssPatronalAnual,
    custosAnual,
    custosDetalhados,
    proLabore,
    lucroDistribuivelAnual,
    lucroIsentoAnual: lucroDistribuivelAnual,
    irpfAnual: 0,
    retencaoDividendosAnual,
    dividendosLiquidosAnual,
    beneficiosAnual,
    anual: { dinheiroLiquido, beneficios: beneficiosAnual, total, impostosTotais },
    mediaMensal: arred(total / 12),
    alertas,
  };
}

export function proLaboreFatorR(e: EntradaPj, tabela: TabelaAno): number {
  const minimo = Math.max(tabela.salarioMinimo, (faturamentoAnual(e) * tabela.simples.fatorR) / 12);
  return Math.ceil(Number((minimo * 100).toPrecision(12))) / 100;
}

export function cenariosPossiveis(e: EntradaPj, tabela: TabelaAno): CenarioPj[] {
  const minimo = tabela.salarioMinimo;
  const cenarios: CenarioPj[] = [];
  if (e.regime === 'melhor' || e.regime === 'mei') cenarios.push({ regime: 'mei', proLaboreMensal: 0 });
  if (e.regime === 'mei') return cenarios;

  const usaSimples = e.regime === 'melhor' || e.regime === 'simples';
  const usaPresumido = e.regime === 'melhor' || e.regime === 'presumido';

  if (e.modoProLabore === 'manual') {
    const valor = Math.max(e.proLaboreManual, 0);
    if (usaSimples) cenarios.push({ regime: 'simples', proLaboreMensal: valor });
    if (usaPresumido) cenarios.push({ regime: 'presumido', proLaboreMensal: valor });
    return cenarios;
  }
  if (usaSimples) {
    cenarios.push({ regime: 'simples', proLaboreMensal: minimo });
    if (e.modoProLabore === 'otimizado') cenarios.push({ regime: 'simples', proLaboreMensal: proLaboreFatorR(e, tabela) });
  }
  if (usaPresumido) cenarios.push({ regime: 'presumido', proLaboreMensal: minimo });
  return cenarios;
}

export interface ComparativoPj {
  escolhido: ResultadoPj;
  avaliados: ResultadoPj[];
}

export function calcularPj(e: EntradaPj, tabela: TabelaAno): ComparativoPj {
  const avaliados = cenariosPossiveis(e, tabela).map((c) => calcularCenarioPj(e, c, tabela));
  const validos = avaliados.filter((r) => r.invalido === null);
  const candidatos = validos.length ? validos : avaliados;
  const escolhido = candidatos.reduce((melhor, atual) => (atual.anual.total > melhor.anual.total ? atual : melhor));
  return { escolhido, avaliados };
}

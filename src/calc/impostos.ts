import type { FaixaComDeducao, FaixaInss, ReducaoIrrf, TabelaAno } from '../tabelas/tipos';

export function arred(valor: number): number {
  return Math.round(Number((valor * 100).toPrecision(12))) / 100;
}

export function tetoInss(faixas: FaixaInss[]): number {
  return faixas[faixas.length - 1]?.ate ?? 0;
}

export function inssEmpregado(bruto: number, tabela: TabelaAno): number {
  let restante = Math.min(Math.max(bruto, 0), tetoInss(tabela.inss.faixas));
  let piso = 0;
  let total = 0;
  for (const faixa of tabela.inss.faixas) {
    if (restante <= 0) break;
    const largura = faixa.ate - piso;
    const tributavel = Math.min(restante, largura);
    total += tributavel * faixa.aliquota;
    restante -= tributavel;
    piso = faixa.ate;
  }
  return arred(total);
}

export function inssContribuinteIndividual(base: number, tabela: TabelaAno): number {
  const limitado = Math.min(Math.max(base, 0), tetoInss(tabela.inss.faixas));
  return arred(limitado * tabela.inss.aliquotaContribuinteIndividual);
}

export function faixaDe(valor: number, faixas: FaixaComDeducao[]): FaixaComDeducao {
  const faixa = faixas.find((f) => f.ate === null || valor <= f.ate) ?? faixas[faixas.length - 1];
  if (!faixa) throw new Error('Tabela sem faixas');
  return faixa;
}

export function tabelaProgressiva(base: number, faixas: FaixaComDeducao[]): number {
  if (base <= 0) return 0;
  const faixa = faixaDe(base, faixas);
  return arred(Math.max(0, base * faixa.aliquota - faixa.deducao));
}

function aplicarReducao(rendimentoBruto: number, imposto: number, r: ReducaoIrrf): number {
  let reducao = 0;
  if (rendimentoBruto <= r.limiteIsencao) {
    reducao = r.reducaoMaxima;
  } else if (rendimentoBruto <= r.limiteSuperior) {
    reducao = r.constante - r.fator * rendimentoBruto;
  }
  return arred(Math.min(Math.max(reducao, 0), imposto));
}

export function reducaoIrrf(rendimentoBruto: number, imposto: number, tabela: TabelaAno): number {
  return aplicarReducao(rendimentoBruto, imposto, tabela.irrf.reducao);
}

export function irpfAnual(rendimentoTributavel: number, dependentes: number, tabela: TabelaAno): ResultadoIrrf {
  const a = tabela.irpfAnual;
  const rendimento = Math.max(rendimentoTributavel, 0);
  const deducaoLegal = dependentes * a.deducaoDependente;
  const simplificado = Math.min(rendimento * a.descontoSimplificadoPercentual, a.descontoSimplificadoLimite);
  const usouSimplificado = simplificado > deducaoLegal;
  const deducao = usouSimplificado ? simplificado : deducaoLegal;
  const base = arred(Math.max(0, rendimento - deducao));
  const impostoTabela = tabelaProgressiva(base, a.faixas);
  const reducao = aplicarReducao(rendimento, impostoTabela, a.reducao);
  return { base, deducao: arred(deducao), usouSimplificado, impostoTabela, reducao, imposto: arred(impostoTabela - reducao) };
}

export interface EntradaIrrf {
  rendimentoBruto: number;
  inss: number;
  dependentes: number;
  outrasDeducoes?: number;
  permiteSimplificado?: boolean;
}

export interface ResultadoIrrf {
  base: number;
  deducao: number;
  usouSimplificado: boolean;
  impostoTabela: number;
  reducao: number;
  imposto: number;
}

export function irrf(entrada: EntradaIrrf, tabela: TabelaAno): ResultadoIrrf {
  const deducaoLegal =
    entrada.inss + entrada.dependentes * tabela.irrf.deducaoDependente + (entrada.outrasDeducoes ?? 0);
  const permiteSimplificado = entrada.permiteSimplificado ?? true;
  const usouSimplificado = permiteSimplificado && tabela.irrf.descontoSimplificado > deducaoLegal;
  const deducao = usouSimplificado ? tabela.irrf.descontoSimplificado : deducaoLegal;
  const base = arred(Math.max(0, entrada.rendimentoBruto - deducao));
  const impostoTabela = tabelaProgressiva(base, tabela.irrf.faixas);
  const reducao = reducaoIrrf(entrada.rendimentoBruto, impostoTabela, tabela);
  return {
    base,
    deducao: arred(deducao),
    usouSimplificado,
    impostoTabela,
    reducao,
    imposto: arred(impostoTabela - reducao),
  };
}

export function irrfPlr(valor: number, tabela: TabelaAno): number {
  return tabelaProgressiva(valor, tabela.plr.faixas);
}

export function aliquotaEfetivaSimples(receitaAnual: number, faixas: FaixaComDeducao[]): number {
  if (receitaAnual <= 0) return faixas[0]?.aliquota ?? 0;
  const faixa = faixaDe(receitaAnual, faixas);
  return Math.max(0, (receitaAnual * faixa.aliquota - faixa.deducao) / receitaAnual);
}

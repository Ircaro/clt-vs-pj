import type { TabelaAno } from '../tabelas/tipos';
import { arred, inssEmpregado, irrf, irrfPlr } from './impostos';

export interface EntradaClt {
  salarioBruto: number;
  dependentes: number;
  plrAnual: number;
  valeRefeicaoAlimentacao: number;
  valeTransporte: number;
  planoSaudeEmpresa: number;
  outrosBeneficios: number;
  descontoPlanoSaude: number;
  outrosDescontos: number;
  considerarFgts: boolean;
  considerarMultaFgts: boolean;
}

export interface Holerite {
  bruto: number;
  inss: number;
  irrf: number;
  outrosDescontos: number;
  liquido: number;
}

export interface ResultadoClt {
  mensal: Holerite;
  mesFerias: Holerite;
  decimoTerceiro: Holerite;
  plr: Holerite;
  descontoValeTransporte: number;
  fgtsAnual: number;
  multaFgtsAnual: number;
  beneficiosAnual: number;
  descontosBeneficiosAnual: number;
  anual: {
    bruto: number;
    inss: number;
    irrf: number;
    dinheiroLiquido: number;
    fgts: number;
    beneficios: number;
    total: number;
  };
  mediaMensal: number;
  custoEmpresaAnual: number;
}

function holerite(bruto: number, dependentes: number, tabela: TabelaAno, permiteSimplificado = true): Holerite {
  const inss = inssEmpregado(bruto, tabela);
  const ir = irrf({ rendimentoBruto: bruto, inss, dependentes, permiteSimplificado }, tabela).imposto;
  return { bruto: arred(bruto), inss, irrf: ir, outrosDescontos: 0, liquido: arred(bruto - inss - ir) };
}

export function calcularClt(e: EntradaClt, tabela: TabelaAno): ResultadoClt {
  const salario = Math.max(e.salarioBruto, 0);
  const descontoValeTransporte = arred(Math.min(salario * 0.06, e.valeTransporte));
  const descontosMensais = arred(descontoValeTransporte + e.descontoPlanoSaude + e.outrosDescontos);

  const mensal = holerite(salario, e.dependentes, tabela);
  mensal.outrosDescontos = descontosMensais;
  mensal.liquido = arred(mensal.liquido - descontosMensais);

  const mesFerias = holerite(salario * (4 / 3), e.dependentes, tabela);
  mesFerias.outrosDescontos = descontosMensais;
  mesFerias.liquido = arred(mesFerias.liquido - descontosMensais);

  const decimoTerceiro = holerite(salario, e.dependentes, tabela, false);

  const irPlr = irrfPlr(e.plrAnual, tabela);
  const plr: Holerite = {
    bruto: arred(e.plrAnual),
    inss: 0,
    irrf: irPlr,
    outrosDescontos: 0,
    liquido: arred(e.plrAnual - irPlr),
  };

  const baseFgts = salario * 12 + salario / 3 + salario;
  const fgtsDepositado = arred(baseFgts * tabela.fgts.aliquota);
  const fgtsAnual = e.considerarFgts ? fgtsDepositado : 0;
  const multaFgtsAnual = e.considerarFgts && e.considerarMultaFgts ? arred(fgtsDepositado * tabela.fgts.multaRescisoria) : 0;

  const beneficiosAnual = arred((e.valeRefeicaoAlimentacao + e.valeTransporte + e.planoSaudeEmpresa + e.outrosBeneficios) * 12);
  const descontosBeneficiosAnual = arred(descontosMensais * 12);

  const brutoAnual = arred(mensal.bruto * 11 + mesFerias.bruto + decimoTerceiro.bruto + plr.bruto);
  const inssAnual = arred(mensal.inss * 11 + mesFerias.inss + decimoTerceiro.inss);
  const irrfAnual = arred(mensal.irrf * 11 + mesFerias.irrf + decimoTerceiro.irrf + plr.irrf);
  const dinheiroLiquido = arred(mensal.liquido * 11 + mesFerias.liquido + decimoTerceiro.liquido + plr.liquido);
  const fgts = arred(fgtsAnual + multaFgtsAnual);
  const total = arred(dinheiroLiquido + fgts + beneficiosAnual);

  const folhaAnual = salario * 12 + salario / 3 + salario;
  const encargos = tabela.inss.aliquotaPatronal + tabela.inss.aliquotaRatTerceiros;
  const custoEmpresaAnual = arred(
    folhaAnual * (1 + encargos) + fgtsDepositado * (1 + tabela.fgts.multaRescisoria) + beneficiosAnual - descontoValeTransporte * 12 + e.plrAnual,
  );

  return {
    mensal,
    mesFerias,
    decimoTerceiro,
    plr,
    descontoValeTransporte,
    fgtsAnual,
    multaFgtsAnual,
    beneficiosAnual,
    descontosBeneficiosAnual,
    anual: {
      bruto: brutoAnual,
      inss: inssAnual,
      irrf: irrfAnual,
      dinheiroLiquido,
      fgts,
      beneficios: beneficiosAnual,
      total,
    },
    mediaMensal: arred(total / 12),
    custoEmpresaAnual,
  };
}

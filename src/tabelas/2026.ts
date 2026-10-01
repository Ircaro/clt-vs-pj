import type { TabelaAno } from './tipos';

export const tabela2026: TabelaAno = {
  ano: 2026,
  fonte:
    'Portaria Interministerial MPS/MF (INSS jan/2026), Lei 15.191/2025 e Lei 15.270/2025 (IRRF e IRPF anual), LC 123/2006 (Simples Nacional e MEI), Lei 9.249/1995 (Lucro Presumido)',
  salarioMinimo: 1621,
  inss: {
    faixas: [
      { ate: 1621.0, aliquota: 0.075 },
      { ate: 2902.84, aliquota: 0.09 },
      { ate: 4354.27, aliquota: 0.12 },
      { ate: 8475.55, aliquota: 0.14 },
    ],
    aliquotaContribuinteIndividual: 0.11,
    aliquotaPatronal: 0.2,
    aliquotaRatTerceiros: 0.078,
  },
  irrf: {
    faixas: [
      { ate: 2428.8, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
      { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
      { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
      { ate: null, aliquota: 0.275, deducao: 908.73 },
    ],
    deducaoDependente: 189.59,
    descontoSimplificado: 607.2,
    reducao: {
      limiteIsencao: 5000,
      reducaoMaxima: 312.89,
      limiteSuperior: 7350,
      constante: 978.62,
      fator: 0.133145,
    },
  },
  irpfAnual: {
    faixas: [
      { ate: 29145.6, aliquota: 0, deducao: 0 },
      { ate: 33919.8, aliquota: 0.075, deducao: 2185.92 },
      { ate: 45012.6, aliquota: 0.15, deducao: 4729.91 },
      { ate: 55976.16, aliquota: 0.225, deducao: 8105.85 },
      { ate: null, aliquota: 0.275, deducao: 10904.66 },
    ],
    deducaoDependente: 2275.08,
    descontoSimplificadoPercentual: 0.2,
    descontoSimplificadoLimite: 17640,
    reducao: {
      limiteIsencao: 60000,
      reducaoMaxima: 2694.15,
      limiteSuperior: 88200,
      constante: 8429.73,
      fator: 0.095575,
    },
  },
  mei: {
    limiteAnual: 81000,
    toleranciaExcesso: 0.2,
    aliquotaInssSalarioMinimo: 0.05,
    issMensal: 5,
    percentualLucroIsento: 0.32,
  },
  plr: {
    faixas: [
      { ate: 7640.8, aliquota: 0, deducao: 0 },
      { ate: 9922.28, aliquota: 0.075, deducao: 573.06 },
      { ate: 13167.0, aliquota: 0.15, deducao: 1317.23 },
      { ate: 16380.38, aliquota: 0.225, deducao: 2304.76 },
      { ate: null, aliquota: 0.275, deducao: 3123.78 },
    ],
  },
  fgts: {
    aliquota: 0.08,
    multaRescisoria: 0.4,
  },
  simples: {
    anexoIII: [
      { ate: 180000, aliquota: 0.06, deducao: 0 },
      { ate: 360000, aliquota: 0.112, deducao: 9360 },
      { ate: 720000, aliquota: 0.135, deducao: 17640 },
      { ate: 1800000, aliquota: 0.16, deducao: 35640 },
      { ate: 3600000, aliquota: 0.21, deducao: 125640 },
      { ate: 4800000, aliquota: 0.33, deducao: 648000 },
    ],
    anexoV: [
      { ate: 180000, aliquota: 0.155, deducao: 0 },
      { ate: 360000, aliquota: 0.18, deducao: 4500 },
      { ate: 720000, aliquota: 0.195, deducao: 9900 },
      { ate: 1800000, aliquota: 0.205, deducao: 17100 },
      { ate: 3600000, aliquota: 0.23, deducao: 62100 },
      { ate: 4800000, aliquota: 0.305, deducao: 540000 },
    ],
    fatorR: 0.28,
    limiteAnual: 4800000,
    limiteMe: 360000,
  },
  presumido: {
    presuncaoServicos: 0.32,
    irpj: 0.15,
    adicionalIrpj: 0.1,
    limiteAdicionalMensal: 20000,
    csll: 0.09,
    pis: 0.0065,
    cofins: 0.03,
  },
  dividendos: {
    limiteMensalIsento: 50000,
    aliquotaRetencao: 0.1,
  },
};

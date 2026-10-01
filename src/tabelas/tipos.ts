export interface FaixaInss {
  ate: number;
  aliquota: number;
}

export interface FaixaComDeducao {
  ate: number | null;
  aliquota: number;
  deducao: number;
}

export interface ReducaoIrrf {
  limiteIsencao: number;
  reducaoMaxima: number;
  limiteSuperior: number;
  constante: number;
  fator: number;
}

export interface TabelaAno {
  ano: number;
  fonte: string;
  salarioMinimo: number;
  inss: {
    faixas: FaixaInss[];
    aliquotaContribuinteIndividual: number;
    aliquotaPatronal: number;
    aliquotaRatTerceiros: number;
  };
  irrf: {
    faixas: FaixaComDeducao[];
    deducaoDependente: number;
    descontoSimplificado: number;
    reducao: ReducaoIrrf;
  };
  irpfAnual: {
    faixas: FaixaComDeducao[];
    deducaoDependente: number;
    descontoSimplificadoPercentual: number;
    descontoSimplificadoLimite: number;
    reducao: ReducaoIrrf;
  };
  plr: {
    faixas: FaixaComDeducao[];
  };
  mei: {
    limiteAnual: number;
    toleranciaExcesso: number;
    aliquotaInssSalarioMinimo: number;
    issMensal: number;
    percentualLucroIsento: number;
  };
  fgts: {
    aliquota: number;
    multaRescisoria: number;
  };
  simples: {
    anexoIII: FaixaComDeducao[];
    anexoV: FaixaComDeducao[];
    fatorR: number;
    limiteAnual: number;
    limiteMe: number;
  };
  presumido: {
    presuncaoServicos: number;
    irpj: number;
    adicionalIrpj: number;
    limiteAdicionalMensal: number;
    csll: number;
    pis: number;
    cofins: number;
  };
  dividendos: {
    limiteMensalIsento: number;
    aliquotaRetencao: number;
  };
}

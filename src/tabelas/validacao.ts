import type { FaixaComDeducao, FaixaInss } from './tipos';

function ehNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function obter(obj: unknown, caminho: string): unknown {
  return caminho.split('.').reduce<unknown>((atual, chave) => {
    if (atual && typeof atual === 'object') return (atual as Record<string, unknown>)[chave];
    return undefined;
  }, obj);
}

const CAMPOS_NUMERICOS = [
  'ano',
  'salarioMinimo',
  'inss.aliquotaContribuinteIndividual',
  'inss.aliquotaPatronal',
  'inss.aliquotaRatTerceiros',
  'irrf.deducaoDependente',
  'irrf.descontoSimplificado',
  'irrf.reducao.limiteIsencao',
  'irrf.reducao.reducaoMaxima',
  'irrf.reducao.limiteSuperior',
  'irrf.reducao.constante',
  'irrf.reducao.fator',
  'irpfAnual.deducaoDependente',
  'irpfAnual.descontoSimplificadoPercentual',
  'irpfAnual.descontoSimplificadoLimite',
  'irpfAnual.reducao.limiteIsencao',
  'irpfAnual.reducao.reducaoMaxima',
  'irpfAnual.reducao.limiteSuperior',
  'irpfAnual.reducao.constante',
  'irpfAnual.reducao.fator',
  'mei.limiteAnual',
  'mei.toleranciaExcesso',
  'mei.aliquotaInssSalarioMinimo',
  'mei.issMensal',
  'mei.percentualLucroIsento',
  'simples.limiteMe',
  'fgts.aliquota',
  'fgts.multaRescisoria',
  'simples.fatorR',
  'simples.limiteAnual',
  'presumido.presuncaoServicos',
  'presumido.irpj',
  'presumido.adicionalIrpj',
  'presumido.limiteAdicionalMensal',
  'presumido.csll',
  'presumido.pis',
  'presumido.cofins',
  'dividendos.limiteMensalIsento',
  'dividendos.aliquotaRetencao',
];

function validarInss(faixas: unknown, erros: string[]): void {
  if (!Array.isArray(faixas) || faixas.length === 0) {
    erros.push('inss.faixas precisa ter ao menos uma faixa');
    return;
  }
  let anterior = 0;
  (faixas as FaixaInss[]).forEach((f, i) => {
    if (!ehNumero(f?.ate) || !ehNumero(f?.aliquota)) erros.push(`inss.faixas[${i}] inválida`);
    else if (f.ate <= anterior) erros.push(`inss.faixas[${i}]: o limite precisa ser maior que o da faixa anterior`);
    else anterior = f.ate;
  });
}

function validarFaixas(nome: string, faixas: unknown, erros: string[]): void {
  if (!Array.isArray(faixas) || faixas.length === 0) {
    erros.push(`${nome} precisa ter ao menos uma faixa`);
    return;
  }
  let anterior = -Infinity;
  (faixas as FaixaComDeducao[]).forEach((f, i) => {
    const ultima = i === faixas.length - 1;
    if (!ehNumero(f?.aliquota) || !ehNumero(f?.deducao)) {
      erros.push(`${nome}[${i}] inválida`);
      return;
    }
    if (f.ate === null) {
      if (!ultima) erros.push(`${nome}[${i}]: só a última faixa pode ficar sem limite`);
      return;
    }
    if (!ehNumero(f.ate)) erros.push(`${nome}[${i}]: limite inválido`);
    else if (f.ate <= anterior) erros.push(`${nome}[${i}]: o limite precisa ser maior que o da faixa anterior`);
    else anterior = f.ate;
  });
}

export function validarTabela(tabela: unknown): string[] {
  const erros: string[] = [];
  if (!tabela || typeof tabela !== 'object') return ['O arquivo não contém uma tabela'];
  for (const campo of CAMPOS_NUMERICOS) {
    if (!ehNumero(obter(tabela, campo))) erros.push(`Campo ${campo} ausente ou inválido`);
  }
  validarInss(obter(tabela, 'inss.faixas'), erros);
  validarFaixas('irrf.faixas', obter(tabela, 'irrf.faixas'), erros);
  validarFaixas('irpfAnual.faixas', obter(tabela, 'irpfAnual.faixas'), erros);
  validarFaixas('plr.faixas', obter(tabela, 'plr.faixas'), erros);
  validarFaixas('simples.anexoIII', obter(tabela, 'simples.anexoIII'), erros);
  validarFaixas('simples.anexoV', obter(tabela, 'simples.anexoV'), erros);
  return erros;
}

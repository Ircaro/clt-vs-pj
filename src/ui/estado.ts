import type { EntradaClt } from '../calc/clt';
import type { CustoPj, EntradaPj } from '../calc/pj';
import { anoMaisRecente, completarTabela, tabelaOficial, tabelasOficiais } from '../tabelas';
import type { TabelaAno } from '../tabelas/tipos';
import { validarTabela } from '../tabelas/validacao';

export type ModoComparacao = 'comparar' | 'sou-clt' | 'sou-pj';

export interface Estado {
  ano: number;
  modo: ModoComparacao;
  margem: number;
  clt: EntradaClt;
  pj: EntradaPj;
  tabelasPersonalizadas: Record<number, TabelaAno>;
}

const CHAVE = 'clt-vs-pj:v1';

export function cltPadrao(): EntradaClt {
  return {
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
}

export function pjPadrao(): EntradaPj {
  return {
    valorMensal: 14000,
    diasFerias: 30,
    feriasRemuneradas: true,
    bonusAnual: 0,
    regime: 'melhor',
    atividadePermiteMei: false,
    modoProLabore: 'otimizado',
    proLaboreManual: 1621,
    aliquotaIss: 0.03,
    dependentes: 0,
    planoSaudeContratante: 600,
    outrosBeneficiosContratante: 0,
    custos: [
      { nome: 'Contabilidade (Agilize)', valor: 250, periodicidade: 'mensal', mei: false },
      { nome: 'Certificado digital', valor: 200, periodicidade: 'anual', mei: false },
      { nome: 'Escritório virtual', valor: 100, periodicidade: 'mensal', mei: false },
      { nome: 'Alvará e taxas municipais', valor: 300, periodicidade: 'anual', mei: false },
      { nome: 'Tarifa bancária PJ', valor: 0, periodicidade: 'mensal', mei: true },
    ],
  };
}

const CUSTOS_SEM_MEI = /contab|certificado|escrit[oó]rio|alvar[aá]|taxas? municipa/i;

function migrarCusto(custo: CustoPj): CustoPj {
  if (typeof custo.mei === 'boolean') return custo;
  return { ...custo, mei: !CUSTOS_SEM_MEI.test(custo.nome) };
}

export function estadoPadrao(): Estado {
  return { ano: anoMaisRecente, modo: 'comparar', margem: 0.1, clt: cltPadrao(), pj: pjPadrao(), tabelasPersonalizadas: {} };
}

export function carregarEstado(): Estado {
  const padrao = estadoPadrao();
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return padrao;
    const salvo = JSON.parse(bruto) as Partial<Estado>;
    const personalizadas: Record<number, TabelaAno> = {};
    for (const [ano, tabela] of Object.entries(salvo.tabelasPersonalizadas ?? {})) {
      const completa = completarTabela(tabela);
      if (validarTabela(completa).length === 0) personalizadas[Number(ano)] = completa as TabelaAno;
    }
    return {
      ano: typeof salvo.ano === 'number' ? salvo.ano : padrao.ano,
      modo: salvo.modo === 'sou-clt' || salvo.modo === 'sou-pj' ? salvo.modo : 'comparar',
      margem: typeof salvo.margem === 'number' && salvo.margem >= 0 ? salvo.margem : padrao.margem,
      clt: { ...padrao.clt, ...salvo.clt },
      pj: { ...padrao.pj, ...salvo.pj, custos: Array.isArray(salvo.pj?.custos) ? salvo.pj.custos.map(migrarCusto) : padrao.pj.custos },
      tabelasPersonalizadas: personalizadas,
    };
  } catch {
    return padrao;
  }
}

export function salvarEstado(estado: Estado): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    return;
  }
}

export function anosDoEstado(estado: Estado): number[] {
  const anos = new Set<number>([...Object.keys(tabelasOficiais), ...Object.keys(estado.tabelasPersonalizadas)].map(Number));
  return [...anos].sort((a, b) => b - a);
}

export function tabelaAtiva(estado: Estado): TabelaAno {
  return estado.tabelasPersonalizadas[estado.ano] ?? tabelaOficial(estado.ano);
}

export function temOficial(ano: number): boolean {
  return ano in tabelasOficiais;
}

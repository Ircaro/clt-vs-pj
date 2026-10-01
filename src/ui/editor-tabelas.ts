import type { TabelaAno } from '../tabelas/tipos';
import { escapar, paraPercentual } from './formato';
import { formatarMoeda, lerMoeda } from './mascara';

type TipoCampo = 'moeda' | 'pct' | 'fator' | 'numero';

interface CampoTabela {
  caminho: string;
  rotulo: string;
  tipo: TipoCampo;
  ajuda?: string;
}

interface SecaoTabela {
  titulo: string;
  descricao?: string;
  faixas?: { caminho: string; comDeducao: boolean; ultimaAberta: boolean };
  campos?: CampoTabela[];
}

const SECOES: SecaoTabela[] = [
  {
    titulo: 'Geral',
    campos: [{ caminho: 'salarioMinimo', rotulo: 'Salário mínimo', tipo: 'moeda', ajuda: 'Usado como pró-labore mínimo' }],
  },
  {
    titulo: 'INSS do empregado (CLT)',
    descricao: 'Alíquota progressiva por faixa. O limite da última faixa é o teto do INSS.',
    faixas: { caminho: 'inss.faixas', comDeducao: false, ultimaAberta: false },
    campos: [
      { caminho: 'inss.aliquotaContribuinteIndividual', rotulo: 'INSS sobre pró-labore', tipo: 'pct' },
      { caminho: 'inss.aliquotaPatronal', rotulo: 'INSS patronal', tipo: 'pct', ajuda: 'Pago pela empresa no Lucro Presumido e na CLT' },
      { caminho: 'inss.aliquotaRatTerceiros', rotulo: 'RAT + terceiros', tipo: 'pct', ajuda: 'Usado só no custo estimado da empresa CLT' },
    ],
  },
  {
    titulo: 'IRRF mensal',
    descricao: 'Deixe o limite da última faixa em branco para "acima de".',
    faixas: { caminho: 'irrf.faixas', comDeducao: true, ultimaAberta: true },
    campos: [
      { caminho: 'irrf.deducaoDependente', rotulo: 'Dedução por dependente', tipo: 'moeda' },
      { caminho: 'irrf.descontoSimplificado', rotulo: 'Desconto simplificado mensal', tipo: 'moeda' },
    ],
  },
  {
    titulo: 'Redução do IRRF (Lei 15.270/2025)',
    descricao: 'Até o limite de isenção, o imposto é reduzido até a redução máxima. Entre os limites, a redução é constante − fator × rendimento bruto.',
    campos: [
      { caminho: 'irrf.reducao.limiteIsencao', rotulo: 'Limite de isenção', tipo: 'moeda' },
      { caminho: 'irrf.reducao.reducaoMaxima', rotulo: 'Redução máxima', tipo: 'moeda' },
      { caminho: 'irrf.reducao.limiteSuperior', rotulo: 'Limite da redução parcial', tipo: 'moeda' },
      { caminho: 'irrf.reducao.constante', rotulo: 'Constante', tipo: 'moeda' },
      { caminho: 'irrf.reducao.fator', rotulo: 'Fator', tipo: 'fator' },
    ],
  },
  {
    titulo: 'IR anual (declaração)',
    descricao: 'Usado no lucro tributável do MEI. Deixe o limite da última faixa em branco para "acima de".',
    faixas: { caminho: 'irpfAnual.faixas', comDeducao: true, ultimaAberta: true },
    campos: [
      { caminho: 'irpfAnual.deducaoDependente', rotulo: 'Dedução anual por dependente', tipo: 'moeda' },
      { caminho: 'irpfAnual.descontoSimplificadoPercentual', rotulo: 'Desconto simplificado', tipo: 'pct' },
      { caminho: 'irpfAnual.descontoSimplificadoLimite', rotulo: 'Limite do desconto simplificado', tipo: 'moeda' },
      { caminho: 'irpfAnual.reducao.limiteIsencao', rotulo: 'Redução: limite de isenção', tipo: 'moeda' },
      { caminho: 'irpfAnual.reducao.reducaoMaxima', rotulo: 'Redução máxima', tipo: 'moeda' },
      { caminho: 'irpfAnual.reducao.limiteSuperior', rotulo: 'Limite da redução parcial', tipo: 'moeda' },
      { caminho: 'irpfAnual.reducao.constante', rotulo: 'Constante', tipo: 'moeda' },
      { caminho: 'irpfAnual.reducao.fator', rotulo: 'Fator', tipo: 'fator' },
    ],
  },
  {
    titulo: 'MEI',
    descricao: 'DAS mensal = salário mínimo × alíquota do INSS + ISS fixo.',
    campos: [
      { caminho: 'mei.limiteAnual', rotulo: 'Limite de faturamento anual', tipo: 'moeda' },
      { caminho: 'mei.toleranciaExcesso', rotulo: 'Excesso tolerado', tipo: 'pct', ajuda: 'Acima disso o desenquadramento é retroativo' },
      { caminho: 'mei.aliquotaInssSalarioMinimo', rotulo: 'INSS sobre o salário mínimo', tipo: 'pct' },
      { caminho: 'mei.issMensal', rotulo: 'ISS fixo mensal', tipo: 'moeda' },
      { caminho: 'mei.percentualLucroIsento', rotulo: 'Parcela do faturamento isenta de IR', tipo: 'pct', ajuda: '32% para serviços' },
    ],
  },
  {
    titulo: 'IRRF sobre PLR',
    descricao: 'Tabela exclusiva de participação nos lucros.',
    faixas: { caminho: 'plr.faixas', comDeducao: true, ultimaAberta: true },
  },
  {
    titulo: 'FGTS',
    campos: [
      { caminho: 'fgts.aliquota', rotulo: 'Depósito mensal', tipo: 'pct' },
      { caminho: 'fgts.multaRescisoria', rotulo: 'Multa na demissão sem justa causa', tipo: 'pct' },
    ],
  },
  {
    titulo: 'Simples Nacional: Anexo III',
    descricao: 'Faixas pela receita bruta dos últimos 12 meses.',
    faixas: { caminho: 'simples.anexoIII', comDeducao: true, ultimaAberta: false },
    campos: [
      { caminho: 'simples.fatorR', rotulo: 'Fator R mínimo para o Anexo III', tipo: 'pct' },
      { caminho: 'simples.limiteAnual', rotulo: 'Limite anual do Simples', tipo: 'moeda' },
      { caminho: 'simples.limiteMe', rotulo: 'Limite de faturamento da ME', tipo: 'moeda', ajuda: 'Acima disso a empresa é EPP' },
    ],
  },
  {
    titulo: 'Simples Nacional: Anexo V',
    faixas: { caminho: 'simples.anexoV', comDeducao: true, ultimaAberta: false },
  },
  {
    titulo: 'Lucro Presumido (serviços)',
    campos: [
      { caminho: 'presumido.presuncaoServicos', rotulo: 'Presunção de lucro', tipo: 'pct' },
      { caminho: 'presumido.irpj', rotulo: 'IRPJ', tipo: 'pct' },
      { caminho: 'presumido.adicionalIrpj', rotulo: 'Adicional de IRPJ', tipo: 'pct' },
      { caminho: 'presumido.limiteAdicionalMensal', rotulo: 'Lucro mensal isento do adicional', tipo: 'moeda' },
      { caminho: 'presumido.csll', rotulo: 'CSLL', tipo: 'pct' },
      { caminho: 'presumido.pis', rotulo: 'PIS', tipo: 'pct' },
      { caminho: 'presumido.cofins', rotulo: 'COFINS', tipo: 'pct' },
    ],
  },
  {
    titulo: 'Dividendos',
    campos: [
      { caminho: 'dividendos.limiteMensalIsento', rotulo: 'Limite mensal sem retenção', tipo: 'moeda' },
      { caminho: 'dividendos.aliquotaRetencao', rotulo: 'Retenção na fonte acima do limite', tipo: 'pct' },
    ],
  },
];

export function lerCaminho(obj: unknown, caminho: string): unknown {
  return caminho.split('.').reduce<unknown>((atual, chave) => (atual as Record<string, unknown>)?.[chave], obj);
}

export function gravarCaminho(obj: unknown, caminho: string, valor: unknown): void {
  const partes = caminho.split('.');
  const ultima = partes.pop();
  if (!ultima) return;
  const alvo = partes.reduce<unknown>((atual, chave) => (atual as Record<string, unknown>)[chave], obj) as Record<string, unknown>;
  alvo[ultima] = valor;
}

function valorExibido(valor: unknown, tipo: TipoCampo): string {
  if (valor === null || valor === undefined) return '';
  const n = Number(valor);
  return String(tipo === 'pct' ? paraPercentual(n) : n);
}

function inputTabela(caminho: string, tipo: TipoCampo, valor: unknown, rotulo: string, vazioPermitido = false): string {
  if (tipo === 'moeda') {
    const exibido = valor === null || valor === undefined ? '' : formatarMoeda(Number(valor));
    return `<span class="entrada com-prefixo"><span class="prefixo">R$</span><input type="text" inputmode="numeric" autocomplete="off" data-moeda data-tabela="${caminho}" data-tipo="moeda" ${vazioPermitido ? 'data-vazio="1" placeholder="sem limite"' : ''} value="${exibido}" aria-label="${escapar(rotulo)}"></span>`;
  }
  const passo = tipo === 'fator' ? '0.000001' : '0.01';
  const sufixo = tipo === 'pct' ? '<span class="sufixo">%</span>' : '';
  return `<span class="entrada ${sufixo ? 'com-sufixo' : ''}"><input type="number" step="${passo}" inputmode="decimal" data-tabela="${caminho}" data-tipo="${tipo}" value="${valorExibido(valor, tipo)}" aria-label="${escapar(rotulo)}">${sufixo}</span>`;
}

function renderFaixas(tabela: TabelaAno, cfg: NonNullable<SecaoTabela['faixas']>): string {
  const faixas = lerCaminho(tabela, cfg.caminho) as { ate: number | null; aliquota: number; deducao?: number }[];
  const linhas = faixas
    .map((f, i) => {
      const ultima = i === faixas.length - 1;
      const aberta = cfg.ultimaAberta && ultima;
      return `<tr>
        <td class="num">${i + 1}</td>
        <td>${inputTabela(`${cfg.caminho}.${i}.ate`, 'moeda', f.ate, `Faixa ${i + 1}, limite`, aberta)}</td>
        <td>${inputTabela(`${cfg.caminho}.${i}.aliquota`, 'pct', f.aliquota, `Faixa ${i + 1}, alíquota`)}</td>
        ${cfg.comDeducao ? `<td>${inputTabela(`${cfg.caminho}.${i}.deducao`, 'moeda', f.deducao, `Faixa ${i + 1}, parcela a deduzir`)}</td>` : ''}
        <td><button type="button" class="botao-icone" data-remover-faixa="${cfg.caminho}" data-indice="${i}" aria-label="Remover faixa ${i + 1}" ${faixas.length <= 1 ? 'disabled' : ''}>×</button></td>
      </tr>`;
    })
    .join('');
  return `
    <div class="tabela-rolagem">
      <table class="tabela-faixas">
        <thead><tr><th>#</th><th>Até</th><th>Alíquota</th>${cfg.comDeducao ? '<th>Parcela a deduzir</th>' : ''}<th></th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <button type="button" class="botao-secundario pequeno" data-adicionar-faixa="${cfg.caminho}" data-com-deducao="${cfg.comDeducao ? 1 : 0}">+ Adicionar faixa</button>`;
}

export function renderEditor(tabela: TabelaAno): string {
  return SECOES.map((secao) => {
    const campos = (secao.campos ?? [])
      .map(
        (c) => `<label class="campo">
          <span class="campo-rotulo">${escapar(c.rotulo)}</span>
          ${inputTabela(c.caminho, c.tipo, lerCaminho(tabela, c.caminho), c.rotulo)}
          ${c.ajuda ? `<span class="campo-ajuda">${escapar(c.ajuda)}</span>` : ''}
        </label>`,
      )
      .join('');
    return `<section class="cartao secao-tabela">
      <h3>${escapar(secao.titulo)}</h3>
      ${secao.descricao ? `<p class="descricao">${escapar(secao.descricao)}</p>` : ''}
      ${secao.faixas ? renderFaixas(tabela, secao.faixas) : ''}
      ${campos ? `<div class="grade-campos">${campos}</div>` : ''}
    </section>`;
  }).join('');
}

export function lerInputTabela(input: HTMLInputElement): number | null {
  if (input.value.trim() === '') return input.dataset.vazio ? null : 0;
  if (input.dataset.tipo === 'moeda') return lerMoeda(input.value) ?? 0;
  const n = Number(input.value);
  if (!Number.isFinite(n)) return 0;
  return input.dataset.tipo === 'pct' ? n / 100 : n;
}

export function adicionarFaixa(tabela: TabelaAno, caminho: string, comDeducao: boolean): void {
  const faixas = lerCaminho(tabela, caminho) as { ate: number | null; aliquota: number; deducao?: number }[];
  const ultima = faixas[faixas.length - 1];
  const novoLimite = ultima?.ate ? Math.round(ultima.ate * 1.2 * 100) / 100 : 0;
  const nova = comDeducao
    ? { ate: novoLimite, aliquota: ultima?.aliquota ?? 0, deducao: ultima?.deducao ?? 0 }
    : { ate: novoLimite, aliquota: ultima?.aliquota ?? 0 };
  if (comDeducao && ultima && ultima.ate === null) faixas.splice(faixas.length - 1, 0, nova);
  else faixas.push(nova);
}

export function removerFaixa(tabela: TabelaAno, caminho: string, indice: number): void {
  const faixas = lerCaminho(tabela, caminho) as unknown[];
  if (faixas.length > 1) faixas.splice(indice, 1);
}

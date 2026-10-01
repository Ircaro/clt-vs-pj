import './style.css';
import { calcularClt, type ResultadoClt } from './calc/clt';
import { notaPjEquivalente, salarioCltEquivalente, VALOR_MAXIMO_BUSCA } from './calc/equivalencia';
import { calcularPj, type ComparativoPj, type CustoPj, type ResultadoPj } from './calc/pj';
import { completarTabela, tabelaOficial } from './tabelas';
import type { TabelaAno } from './tabelas/tipos';
import { validarTabela } from './tabelas/validacao';
import { adicionarFaixa, gravarCaminho, lerInputTabela, removerFaixa, renderEditor } from './ui/editor-tabelas';
import { anosDoEstado, carregarEstado, cltPadrao, pjPadrao, salvarEstado, tabelaAtiva, temOficial, type Estado } from './ui/estado';
import { aprimorarSelects } from './ui/dropdown';
import { brl, escapar, paraPercentual, pct } from './ui/formato';
import { ativarDicas, barrasEmpilhadas, type Serie } from './ui/grafico';
import { ativarMascaras, formatarMoeda, lerMoeda } from './ui/mascara';
import { montarResumoFixo, type ResumoFixo } from './ui/resumo-fixo';

type TipoEntrada = 'moeda' | 'numero' | 'pct' | 'bool' | 'select';

interface CampoEntrada {
  chave: string;
  rotulo: string;
  tipo: TipoEntrada;
  ajuda?: string;
  opcoes?: { valor: string; rotulo: string }[];
}

interface GrupoEntrada {
  titulo: string;
  campos: CampoEntrada[];
}

const GRUPOS_CLT: GrupoEntrada[] = [
  {
    titulo: 'Salário',
    campos: [
      { chave: 'salarioBruto', rotulo: 'Salário bruto mensal', tipo: 'moeda' },
      { chave: 'dependentes', rotulo: 'Dependentes no IR', tipo: 'numero' },
      { chave: 'plrAnual', rotulo: 'PLR / bônus anual (bruto)', tipo: 'moeda', ajuda: 'Tributado pela tabela exclusiva de PLR' },
    ],
  },
  {
    titulo: 'Benefícios pagos pela empresa (por mês)',
    campos: [
      { chave: 'valeRefeicaoAlimentacao', rotulo: 'VR / VA', tipo: 'moeda' },
      { chave: 'planoSaudeEmpresa', rotulo: 'Plano de saúde (parte da empresa)', tipo: 'moeda' },
      { chave: 'valeTransporte', rotulo: 'Vale-transporte recebido', tipo: 'moeda', ajuda: 'Desconto de até 6% do salário é aplicado sozinho' },
      { chave: 'outrosBeneficios', rotulo: 'Outros (auxílio home office, academia...)', tipo: 'moeda' },
    ],
  },
  {
    titulo: 'Descontos em folha (por mês)',
    campos: [
      { chave: 'descontoPlanoSaude', rotulo: 'Mensalidade / coparticipação do plano', tipo: 'moeda' },
      { chave: 'outrosDescontos', rotulo: 'Outros descontos', tipo: 'moeda' },
    ],
  },
  {
    titulo: 'FGTS',
    campos: [
      { chave: 'considerarFgts', rotulo: 'Contar o FGTS como dinheiro seu', tipo: 'bool' },
      { chave: 'considerarMultaFgts', rotulo: 'Somar a multa de 40% (demissão sem justa causa)', tipo: 'bool' },
    ],
  },
];

const GRUPOS_PJ: GrupoEntrada[] = [
  {
    titulo: 'Contrato',
    campos: [
      { chave: 'valorMensal', rotulo: 'Valor mensal da nota', tipo: 'moeda' },
      { chave: 'bonusAnual', rotulo: 'Bônus / "13º" pago pelo contratante (ano)', tipo: 'moeda' },
      { chave: 'diasFerias', rotulo: 'Dias de férias por ano', tipo: 'numero' },
      { chave: 'feriasRemuneradas', rotulo: 'Recebo a nota normalmente nas férias', tipo: 'bool', ajuda: 'Sem o 1/3 adicional da CLT' },
    ],
  },
  {
    titulo: 'Empresa',
    campos: [
      {
        chave: 'regime',
        rotulo: 'Regime tributário',
        tipo: 'select',
        opcoes: [
          { valor: 'melhor', rotulo: 'Escolher o mais vantajoso' },
          { valor: 'mei', rotulo: 'MEI' },
          { valor: 'simples', rotulo: 'ME no Simples Nacional' },
          { valor: 'presumido', rotulo: 'ME no Lucro Presumido' },
        ],
      },
      {
        chave: 'atividadePermiteMei',
        rotulo: 'Incluir MEI na comparação',
        tipo: 'bool',
        ajuda: 'Marque só se a sua atividade puder ser MEI. Programação e consultoria, por exemplo, não podem. A lista oficial fica no Portal do Empreendedor',
      },
      {
        chave: 'modoProLabore',
        rotulo: 'Pró-labore',
        tipo: 'select',
        opcoes: [
          { valor: 'otimizado', rotulo: 'Otimizar pelo Fator R' },
          { valor: 'minimo', rotulo: 'Salário mínimo' },
          { valor: 'manual', rotulo: 'Valor fixo' },
        ],
      },
      { chave: 'proLaboreManual', rotulo: 'Pró-labore mensal', tipo: 'moeda' },
      { chave: 'aliquotaIss', rotulo: 'ISS do município', tipo: 'pct', ajuda: 'Só no Lucro Presumido. No Simples o ISS já está no DAS' },
      { chave: 'dependentes', rotulo: 'Dependentes no IR', tipo: 'numero' },
    ],
  },
  {
    titulo: 'Benefícios pagos pelo contratante (por mês)',
    campos: [
      { chave: 'planoSaudeContratante', rotulo: 'Plano de saúde', tipo: 'moeda' },
      { chave: 'outrosBeneficiosContratante', rotulo: 'Outros benefícios', tipo: 'moeda' },
    ],
  },
];

const SERIES: Serie[] = [
  { nome: 'Dinheiro líquido', cor: '--serie-1' },
  { nome: 'FGTS', cor: '--serie-2' },
  { nome: 'Benefícios', cor: '--serie-3' },
  { nome: 'Impostos', cor: '--serie-4' },
  { nome: 'Descontos e custos', cor: '--serie-5' },
];

let estado: Estado = carregarEstado();

const $ = <T extends HTMLElement>(seletor: string): T => {
  const el = document.querySelector<T>(seletor);
  if (!el) throw new Error(`Elemento ${seletor} não encontrado`);
  return el;
};

function valorCampo(lado: 'clt' | 'pj', chave: string): unknown {
  return (estado[lado] as unknown as Record<string, unknown>)[chave];
}

function renderCampo(lado: 'clt' | 'pj', campo: CampoEntrada): string {
  const id = `${lado}-${campo.chave}`;
  const valor = valorCampo(lado, campo.chave);
  const ajuda = campo.ajuda ? `<span class="campo-ajuda">${escapar(campo.ajuda)}</span>` : '';
  const bind = `data-lado="${lado}" data-chave="${campo.chave}" data-tipo="${campo.tipo}"`;
  if (campo.tipo === 'bool') {
    return `<label class="campo campo-check" data-campo="${id}">
      <input type="checkbox" id="${id}" ${bind} ${valor ? 'checked' : ''}>
      <span><span class="campo-rotulo">${escapar(campo.rotulo)}</span>${ajuda}</span>
    </label>`;
  }
  if (campo.tipo === 'select') {
    const opcoes = (campo.opcoes ?? [])
      .map((o) => `<option value="${o.valor}" ${o.valor === valor ? 'selected' : ''}>${escapar(o.rotulo)}</option>`)
      .join('');
    return `<div class="campo" data-campo="${id}">
      <span class="campo-rotulo">${escapar(campo.rotulo)}</span>
      <select id="${id}" ${bind}>${opcoes}</select>${ajuda}
    </div>`;
  }
  if (campo.tipo === 'moeda') {
    const calculado = campoCalculado() === id;
    return `<label class="campo ${calculado ? 'campo-calculado' : ''}" data-campo="${id}" for="${id}">
      <span class="campo-rotulo">${escapar(campo.rotulo)}${calculado ? ' <span class="selo">calculado</span>' : ''}</span>
      <span class="entrada com-prefixo"><span class="prefixo">R$</span><input type="text" id="${id}" inputmode="numeric" autocomplete="off" data-moeda ${bind} value="${formatarMoeda(Number(valor))}" ${calculado ? 'readonly aria-readonly="true" tabindex="-1"' : ''}></span>
      ${calculado ? '<span class="campo-ajuda">Esse é o valor a pedir, calculado pelo que você preencheu</span>' : ajuda}
    </label>`;
  }
  const exibido = campo.tipo === 'pct' ? paraPercentual(Number(valor)) : Number(valor);
  const sufixo = campo.tipo === 'pct' ? '<span class="sufixo">%</span>' : '';
  const passo = campo.tipo === 'numero' ? '1' : '0.01';
  return `<label class="campo" data-campo="${id}" for="${id}">
    <span class="campo-rotulo">${escapar(campo.rotulo)}</span>
    <span class="entrada ${sufixo ? 'com-sufixo' : ''}"><input type="number" id="${id}" min="0" step="${passo}" inputmode="decimal" ${bind} value="${exibido}">${sufixo}</span>
    ${ajuda}
  </label>`;
}

function renderGrupos(lado: 'clt' | 'pj', grupos: GrupoEntrada[]): string {
  return grupos
    .map(
      (g) => `<fieldset class="grupo"><legend>${escapar(g.titulo)}</legend><div class="grade-campos">${g.campos
        .map((c) => renderCampo(lado, c))
        .join('')}</div></fieldset>`,
    )
    .join('');
}

function renderCustos(): string {
  const linhas = estado.pj.custos
    .map(
      (c, i) => `<div class="custo-linha">
        <input type="text" class="custo-nome" value="${escapar(c.nome)}" data-custo="${i}" data-campo-custo="nome" aria-label="Nome do custo ${i + 1}">
        <span class="entrada com-prefixo"><span class="prefixo">R$</span><input type="text" inputmode="numeric" autocomplete="off" data-moeda value="${formatarMoeda(c.valor)}" data-custo="${i}" data-campo-custo="valor" aria-label="Valor de ${escapar(c.nome)}"></span>
        <select data-custo="${i}" data-campo-custo="periodicidade" data-variante="compacto" aria-label="Periodicidade de ${escapar(c.nome)}">
          <option value="mensal" ${c.periodicidade === 'mensal' ? 'selected' : ''}>/mês</option>
          <option value="anual" ${c.periodicidade === 'anual' ? 'selected' : ''}>/ano</option>
        </select>
        <label class="custo-mei" title="Clique para alternar: esse custo existe só na ME ou também se você for MEI?">
          <input type="checkbox" role="switch" data-custo="${i}" data-campo-custo="mei" ${c.mei ? 'checked' : ''} aria-label="${escapar(c.nome)} também existe no MEI">
          <span class="custo-mei-nao">Só ME</span><span class="custo-mei-sim">ME e MEI</span>
        </label>
        <button type="button" class="botao-icone" data-remover-custo="${i}" aria-label="Remover ${escapar(c.nome)}">×</button>
      </div>`,
    )
    .join('');
  return `<fieldset class="grupo">
    <legend>Impostos da empresa</legend>
    <p class="descricao">Calculados sozinhos pelo faturamento e pelo regime.</p>
    <div class="impostos-pj" id="impostos-pj" aria-live="polite"></div>
  </fieldset>
  <fieldset class="grupo">
    <legend>Custos de manter o CNPJ</legend>
    <p class="descricao">Contabilidade, certificado digital, escritório virtual, taxas... A coluna <strong>Vale para</strong> diz se o custo continua existindo caso você seja MEI. O MEI não precisa de contador, certificado nem escritório virtual, por isso eles vêm como <strong>Só ME</strong>. Clique para alternar.</p>
    <div class="custos">
      <div class="custo-linha custo-cabecalho" aria-hidden="true"><span>Custo</span><span>Valor</span><span>Frequência</span><span>Vale para</span><span></span></div>
      ${linhas}
    </div>
    <button type="button" class="botao-secundario pequeno" id="adicionar-custo">+ Adicionar custo</button>
  </fieldset>`;
}

function renderEntradas(): void {
  $('#entradas-clt').innerHTML = renderGrupos('clt', GRUPOS_CLT);
  $('#entradas-pj').innerHTML = renderGrupos('pj', GRUPOS_PJ) + renderCustos();
  aprimorarSelects($('#painel-entradas'));
  atualizarVisibilidade();
}

function atualizarVisibilidade(): void {
  const soMei = estado.pj.regime === 'mei';
  const esconder = (campo: string, oculto: boolean) => {
    const el = document.querySelector<HTMLElement>(`[data-campo="pj-${campo}"]`);
    if (el) el.hidden = oculto;
  };
  esconder('modoProLabore', soMei);
  esconder('proLaboreManual', soMei || estado.pj.modoProLabore !== 'manual');
  esconder('aliquotaIss', soMei);
  esconder('atividadePermiteMei', estado.pj.regime !== 'melhor');
  const multa = document.querySelector<HTMLElement>('[data-campo="clt-considerarMultaFgts"]');
  if (multa) multa.hidden = !estado.clt.considerarFgts;
}

function linhaTabela(rotulo: string, clt: string, pj: string, diferenca = '', classe = ''): string {
  return `<tr class="${classe}"><th scope="row">${rotulo}</th><td>${clt}</td><td>${pj}</td><td>${diferenca}</td></tr>`;
}

function dif(valor: number): string {
  if (Math.abs(valor) < 0.005) return '<span class="neutro">=</span>';
  const classe = valor > 0 ? 'positivo' : 'negativo';
  return `<span class="${classe}">${valor > 0 ? '+' : '−'}${brl(Math.abs(valor))}</span>`;
}

interface Equivalencias {
  nota: number | null;
  salario: number | null;
}

interface LinhaMeta {
  margem: number;
  valor: number | null;
  totalMensal: number;
  fator: number | null;
}

interface Meta {
  calculado: 'pj' | 'clt';
  hojeMensal: number;
  valorHoje: number;
  empate: number | null;
  alvo: number | null;
  linhas: LinhaMeta[];
}

interface Cenario {
  tabela: TabelaAno;
  clt: ResultadoClt;
  pj: ComparativoPj;
  equivalencias: Equivalencias;
  meta: Meta | null;
}

const MARGENS_SUGERIDAS = [0, 0.1, 0.2, 0.3];

function campoCalculado(): string | null {
  if (estado.modo === 'sou-clt') return 'pj-valorMensal';
  if (estado.modo === 'sou-pj') return 'clt-salarioBruto';
  return null;
}

function montarMeta(calculado: 'pj' | 'clt', totalHoje: number, valorHoje: number, tabela: TabelaAno): Meta {
  const margens = [...new Set([...MARGENS_SUGERIDAS, estado.margem])].sort((a, b) => a - b);
  const buscar = (total: number) =>
    calculado === 'pj' ? notaPjEquivalente(total, estado.pj, tabela) : salarioCltEquivalente(total, estado.clt, tabela);
  const mensalCom = (valor: number) =>
    calculado === 'pj'
      ? calcularPj({ ...estado.pj, valorMensal: valor }, tabela).escolhido.mediaMensal
      : calcularClt({ ...estado.clt, salarioBruto: valor }, tabela).mediaMensal;
  const linhas = margens.map((margem) => {
    const total = totalHoje * (1 + margem);
    const valor = buscar(total);
    return {
      margem,
      valor,
      totalMensal: valor === null || margem === 0 ? total / 12 : mensalCom(valor),
      fator: valor !== null && valorHoje > 0 ? valor / valorHoje : null,
    };
  });
  const achar = (margem: number) => linhas.find((l) => l.margem === margem)?.valor ?? null;
  return { calculado, hojeMensal: totalHoje / 12, valorHoje, empate: achar(0), alvo: achar(estado.margem), linhas };
}

function montarCenario(): Cenario {
  const tabela = tabelaAtiva(estado);
  if (estado.modo === 'sou-clt') {
    const clt = calcularClt(estado.clt, tabela);
    const meta = montarMeta('pj', clt.anual.total, estado.clt.salarioBruto, tabela);
    const pj = calcularPj({ ...estado.pj, valorMensal: meta.alvo ?? estado.pj.valorMensal }, tabela);
    return { tabela, clt, pj, meta, equivalencias: { nota: meta.empate, salario: null } };
  }
  if (estado.modo === 'sou-pj') {
    const pj = calcularPj(estado.pj, tabela);
    const meta = montarMeta('clt', pj.escolhido.anual.total, estado.pj.valorMensal, tabela);
    const clt = calcularClt({ ...estado.clt, salarioBruto: meta.alvo ?? estado.clt.salarioBruto }, tabela);
    return { tabela, clt, pj, meta, equivalencias: { nota: null, salario: meta.empate } };
  }
  const clt = calcularClt(estado.clt, tabela);
  const pj = calcularPj(estado.pj, tabela);
  return {
    tabela,
    clt,
    pj,
    meta: null,
    equivalencias: {
      nota: notaPjEquivalente(clt.anual.total, estado.pj, tabela),
      salario: salarioCltEquivalente(pj.escolhido.anual.total, estado.clt, tabela),
    },
  };
}

function fator(valor: number | null): string {
  return valor === null ? 'n/d' : `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function valorOuForaDoAlcance(valor: number | null): string {
  return valor === null ? 'fora do alcance' : brl(valor);
}

function renderVereditoMeta(c: Cenario, meta: Meta): string {
  const p = c.pj.escolhido;
  const paraPj = meta.calculado === 'pj';
  const outro = paraPj ? 'PJ' : 'CLT';
  const atual = paraPj ? 'CLT' : 'PJ';
  const noAtual = paraPj ? 'na CLT' : 'no PJ';
  const nomeValor = paraPj ? 'Nota' : 'Salário';
  const margem = pct(estado.margem, 0);
  const novoMensal = paraPj ? p.mediaMensal : c.clt.mediaMensal;

  const titulo =
    meta.alvo === null
      ? `Não encontrei ${paraPj ? 'uma nota PJ' : 'um salário CLT'} que chegue lá`
      : paraPj
        ? `Para trocar pela PJ, peça pelo menos ${brl(meta.alvo)}/mês`
        : `Para trocar pela CLT, o salário precisa ser de pelo menos ${brl(meta.alvo)}/mês`;

  let subtitulo: string;
  if (meta.alvo === null) subtitulo = `O valor passaria de ${brl(VALOR_MAXIMO_BUSCA)}/mês. Confira os campos do lado ${outro}.`;
  else if (estado.margem === 0)
    subtitulo = `Esse é o valor que empata com os ${brl(meta.hojeMensal)}/mês que você tem hoje ${noAtual}${paraPj ? `, considerando ${p.descricao}` : ''}.`;
  else
    subtitulo = `Com esse valor você fica com ${brl(novoMensal)}/mês, ${margem} a mais que os ${brl(meta.hojeMensal)}/mês de hoje ${noAtual}${paraPj ? `, considerando ${p.descricao}` : ''}. Só para empatar, seria ${valorOuForaDoAlcance(meta.empate)}.`;

  const alvoLinha = meta.linhas.find((l) => l.margem === estado.margem);
  const alertaInvalido =
    paraPj && p.invalido
      ? `<p class="alerta veredito-alerta">${escapar(p.descricao)} não é possível com esse faturamento. Troque o regime para "Escolher o mais vantajoso" ou ME.</p>`
      : '';

  return `
    <div class="veredito-texto">
      <p class="rotulo-pequeno">Hoje sou ${atual} · tabelas de ${c.tabela.ano}${estado.tabelasPersonalizadas[c.tabela.ano] ? ' (personalizadas)' : ''}</p>
      <h2>${titulo}</h2>
      <p>${subtitulo}</p>
      ${alertaInvalido}
    </div>
    <div class="indicadores">
      <div class="indicador"><span>Hoje ${noAtual} (por mês)</span><strong>${brl(meta.hojeMensal)}</strong></div>
      <div class="indicador"><span>${nomeValor} ${outro} para empatar</span><strong>${valorOuForaDoAlcance(meta.empate)}</strong></div>
      <div class="indicador"><span>${nomeValor} ${outro} com +${margem}</span><strong>${valorOuForaDoAlcance(meta.alvo)}</strong></div>
      <div class="indicador"><span>${paraPj ? 'Nota ÷ salário de hoje' : 'Salário ÷ nota de hoje'}</span><strong>${fator(alvoLinha?.fator ?? null)}</strong></div>
    </div>`;
}

function renderMetas(meta: Meta): string {
  const paraPj = meta.calculado === 'pj';
  const linhas = meta.linhas
    .map(
      (l) => `<tr class="${l.margem === estado.margem ? 'escolhido' : ''}">
        <th scope="row">${l.margem === 0 ? 'Empatar' : `+${pct(l.margem, 0)}`}</th>
        <td>${valorOuForaDoAlcance(l.valor)}</td>
        <td>${fator(l.fator)}</td>
        <td>${brl(l.totalMensal)}</td>
      </tr>`,
    )
    .join('');
  return `
    <h3>Quanto pedir para mudar</h3>
    <p class="descricao">${paraPj ? 'Nota PJ mensal necessária' : 'Salário CLT bruto necessário'} para cada ganho em relação ao que você tem hoje, com as condições que você preencheu do lado ${paraPj ? 'PJ' : 'CLT'}.</p>
    <div class="tabela-rolagem">
      <table class="tabela-comparativo">
        <thead><tr><th>Quero ganhar</th><th>${paraPj ? 'Nota PJ' : 'Salário CLT'}</th><th>${paraPj ? 'Nota ÷ salário' : 'Salário ÷ nota'}</th><th>Fica por mês</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p class="descricao">"Fica por mês" é a média do pacote anual: dinheiro líquido${paraPj ? '' : ', FGTS'} e benefícios.</p>`;
}

function renderVeredito(clt: ResultadoClt, pj: ComparativoPj, tabela: TabelaAno, { nota, salario }: Equivalencias): string {
  const p = pj.escolhido;
  const diferenca = p.anual.total - clt.anual.total;
  const relativo = clt.anual.total > 0 ? diferenca / clt.anual.total : 0;

  let titulo: string;
  if (Math.abs(relativo) < 0.01) titulo = 'Praticamente empate';
  else if (diferenca > 0) titulo = `PJ rende ${brl(diferenca / 12)} a mais por mês`;
  else titulo = `CLT rende ${brl(-diferenca / 12)} a mais por mês`;

  const subtitulo =
    Math.abs(relativo) < 0.01
      ? 'A diferença é menor que 1% do pacote anual. Pese estabilidade, benefícios e flexibilidade.'
      : `${pct(Math.abs(relativo), 1)} de diferença no pacote anual (${brl(Math.abs(diferenca))} no ano), considerando ${p.descricao}.`;

  return `
    <div class="veredito-texto">
      <p class="rotulo-pequeno">Resultado com as tabelas de ${tabela.ano}${estado.tabelasPersonalizadas[tabela.ano] ? ' (personalizadas)' : ''}</p>
      <h2>${titulo}</h2>
      <p>${subtitulo}</p>
      ${p.invalido ? `<p class="alerta veredito-alerta">${escapar(p.descricao)} não é possível com esse faturamento. Troque o regime para "Escolher o mais vantajoso" ou ME para uma comparação real.</p>` : ''}
    </div>
    <div class="indicadores">
      <div class="indicador"><span>CLT por mês (média)</span><strong>${brl(clt.mediaMensal)}</strong></div>
      <div class="indicador"><span>PJ por mês (média)</span><strong>${brl(p.mediaMensal)}</strong></div>
      <div class="indicador"><span>Nota PJ que empata com o CLT</span><strong>${nota === null ? 'fora do alcance' : brl(nota)}</strong></div>
      <div class="indicador"><span>Salário CLT que empata com o PJ</span><strong>${salario === null ? 'fora do alcance' : brl(salario)}</strong></div>
    </div>`;
}

function renderComparativo(clt: ResultadoClt, pj: ComparativoPj): string {
  const p = pj.escolhido;
  const descontosClt = clt.descontosBeneficiosAnual;
  const brutoClt = clt.anual.bruto;
  const impostosClt = clt.anual.inss + clt.anual.irrf;
  const pacoteClt = brutoClt + clt.anual.fgts + clt.anual.beneficios;
  const pacotePj = p.faturamentoAnual + p.anual.beneficios;

  const grafico = barrasEmpilhadas(SERIES, [
    {
      rotulo: 'CLT',
      segmentos: [
        { serie: 'Dinheiro líquido', valor: clt.anual.dinheiroLiquido },
        { serie: 'FGTS', valor: clt.anual.fgts },
        { serie: 'Benefícios', valor: clt.anual.beneficios },
        { serie: 'Impostos', valor: impostosClt },
        { serie: 'Descontos e custos', valor: descontosClt },
      ],
    },
    {
      rotulo: 'PJ',
      segmentos: [
        { serie: 'Dinheiro líquido', valor: p.anual.dinheiroLiquido },
        { serie: 'Benefícios', valor: p.anual.beneficios },
        { serie: 'Impostos', valor: p.anual.impostosTotais },
        { serie: 'Descontos e custos', valor: p.custosAnual },
      ],
    },
  ]);

  const linhas = [
    linhaTabela('Renda bruta', brl(brutoClt), brl(p.faturamentoAnual), dif(p.faturamentoAnual - brutoClt)),
    linhaTabela('Impostos e INSS', `−${brl(impostosClt)}`, `−${brl(p.anual.impostosTotais)}`, dif(impostosClt - p.anual.impostosTotais)),
    linhaTabela('Descontos em folha / custos do CNPJ', `−${brl(descontosClt)}`, `−${brl(p.custosAnual)}`, dif(descontosClt - p.custosAnual)),
    linhaTabela('Dinheiro líquido', brl(clt.anual.dinheiroLiquido), brl(p.anual.dinheiroLiquido), dif(p.anual.dinheiroLiquido - clt.anual.dinheiroLiquido), 'destaque'),
    linhaTabela('FGTS', brl(clt.anual.fgts), brl(0), dif(-clt.anual.fgts)),
    linhaTabela('Benefícios', brl(clt.anual.beneficios), brl(p.anual.beneficios), dif(p.anual.beneficios - clt.anual.beneficios)),
    linhaTabela('Total no ano', brl(clt.anual.total), brl(p.anual.total), dif(p.anual.total - clt.anual.total), 'total'),
    linhaTabela('Média por mês', brl(clt.mediaMensal), brl(p.mediaMensal), dif((p.anual.total - clt.anual.total) / 12)),
    linhaTabela(
      'Carga de impostos',
      pct(pacoteClt > 0 ? impostosClt / pacoteClt : 0, 1),
      pct(pacotePj > 0 ? p.anual.impostosTotais / pacotePj : 0, 1),
    ),
  ].join('');

  return `
    <section class="cartao">
      <h3>Pacote anual e para onde ele vai</h3>
      <p class="descricao">Cada barra é tudo que o regime movimenta por você no ano. Passe o mouse para ver os valores.</p>
      <div class="grafico" id="grafico">${grafico}</div>
    </section>
    <section class="cartao">
      <h3>Comparativo anual</h3>
      <div class="tabela-rolagem">
        <table class="tabela-comparativo">
          <thead><tr><th></th><th>CLT</th><th>PJ</th><th>Vantagem do PJ</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </section>`;
}

function renderDetalheClt(clt: ResultadoClt): string {
  const colunas = [
    { nome: 'Mês normal', h: clt.mensal },
    { nome: 'Mês de férias', h: clt.mesFerias },
    { nome: '13º salário', h: clt.decimoTerceiro },
    ...(clt.plr.bruto > 0 ? [{ nome: 'PLR', h: clt.plr }] : []),
  ];
  const cab = colunas.map((c) => `<th>${c.nome}</th>`).join('');
  const linha = (rotulo: string, fn: (h: (typeof colunas)[number]['h']) => string) =>
    `<tr><th scope="row">${rotulo}</th>${colunas.map((c) => `<td>${fn(c.h)}</td>`).join('')}</tr>`;
  return `
    <details class="cartao detalhe" open>
      <summary><h3>Holerite CLT</h3></summary>
      <div class="tabela-rolagem">
        <table class="tabela-comparativo">
          <thead><tr><th></th>${cab}</tr></thead>
          <tbody>
            ${linha('Bruto', (h) => brl(h.bruto))}
            ${linha('INSS', (h) => `−${brl(h.inss)}`)}
            ${linha('IRRF', (h) => `−${brl(h.irrf)}`)}
            ${linha('Outros descontos', (h) => `−${brl(h.outrosDescontos)}`)}
            ${linha('Líquido', (h) => `<strong>${brl(h.liquido)}</strong>`)}
          </tbody>
        </table>
      </div>
      <ul class="notas">
        <li>11 meses normais + 1 mês de férias com 1/3 + 13º${clt.plr.bruto > 0 ? ' + PLR' : ''}.</li>
        <li>FGTS depositado no ano: ${brl(clt.fgtsAnual)}${clt.multaFgtsAnual > 0 ? ` + ${brl(clt.multaFgtsAnual)} de multa rescisória` : ''}.</li>
        <li>Desconto de vale-transporte: ${brl(clt.descontoValeTransporte)}/mês.</li>
        <li>Custo estimado para a empresa (salários, encargos, FGTS com multa e benefícios): <strong>${brl(clt.custoEmpresaAnual)}/ano</strong>, ou ${brl(clt.custoEmpresaAnual / 12)}/mês. Serve de referência para negociar a nota PJ.</li>
      </ul>
    </details>`;
}

function renderImpostosPj(p: ResultadoPj): string {
  const faturamento = p.faturamentoAnual;
  const linha = (nome: string, anual: number, nota = '') =>
    `<div class="imposto-linha"><span>${escapar(nome)}${nota ? `<small>${escapar(nota)}</small>` : ''}</span><strong>${brl(anual / 12)}<small>/mês</small></strong></div>`;
  const linhas = p.impostosEmpresa.map((i) => linha(i.nome, i.valor, faturamento > 0 ? `${pct(i.valor / faturamento)} do faturamento` : '')).join('');
  const extras: string[] = [];
  if (p.inssPatronalAnual > 0) extras.push(linha('INSS patronal sobre pró-labore', p.inssPatronalAnual));
  if (p.cenario.regime === 'mei') {
    extras.push(
      p.irpfAnual > 0
        ? linha('IR anual sobre o lucro tributável', p.irpfAnual, 'Pago na declaração, média mensal')
        : `<div class="imposto-linha"><span>IR anual sobre o lucro<small>Lucro dentro da parcela isenta e da faixa de isenção</small></span><strong class="positivo">isento</strong></div>`,
    );
  } else {
    extras.push(linha('INSS + IR do pró-labore', (p.proLabore.inss + p.proLabore.irrf) * 12, 'Descontados de você como pessoa física'));
  }
  if (p.retencaoDividendosAnual > 0) extras.push(linha('Retenção de IR sobre dividendos', p.retencaoDividendosAnual));
  return `
    <p class="imposto-regime">${escapar(p.descricao)}</p>
    ${p.alertas.map((a) => `<p class="alerta">${escapar(a)}</p>`).join('')}
    ${linhas}${extras.join('')}
    <div class="imposto-linha imposto-total"><span>Total de impostos</span><strong>${brl(p.anual.impostosTotais / 12)}<small>/mês · ${pct(faturamento > 0 ? p.anual.impostosTotais / faturamento : 0, 1)}</small></strong></div>`;
}

function renderDetalhePj(pj: ComparativoPj, tabela: TabelaAno): string {
  const p = pj.escolhido;
  const ehMei = p.cenario.regime === 'mei';
  const impostos = p.impostosEmpresa.map((i) => `<tr><th scope="row">${escapar(i.nome)}</th><td>−${brl(i.valor)}</td><td>−${brl(i.valor / 12)}</td></tr>`).join('');
  const custos = p.custosDetalhados.map((c) => `<tr><th scope="row">${escapar(c.nome)}</th><td>−${brl(c.anual)}</td><td>−${brl(c.anual / 12)}</td></tr>`).join('');
  const cenarios = pj.avaliados
    .map((c) => {
      const situacao = c === p ? '<span class="selo">melhor</span>' : c.invalido ? `<span class="selo selo-alerta">${escapar(c.invalido)}</span>` : '';
      return `<tr class="${c === p ? 'escolhido' : ''} ${c.invalido ? 'invalido' : ''}"><th scope="row">${escapar(c.descricao)} ${situacao}</th><td>${brl(c.custosAnual)}</td><td>${brl(c.anual.impostosTotais)}</td><td>${brl(c.anual.total)}</td></tr>`;
    })
    .join('');
  const alertas = p.alertas.map((a) => `<li class="alerta">${escapar(a)}</li>`).join('');
  const linhasMei = `
    <tr class="destaque"><th scope="row">Lucro do MEI</th><td>${brl(p.lucroDistribuivelAnual)}</td><td>${brl(p.lucroDistribuivelAnual / 12)}</td></tr>
    <tr><th scope="row">Parcela isenta (${pct(tabela.mei.percentualLucroIsento, 0)} do faturamento)</th><td>${brl(p.lucroIsentoAnual)}</td><td>${brl(p.lucroIsentoAnual / 12)}</td></tr>
    <tr><th scope="row">IR anual sobre o restante</th><td>−${brl(p.irpfAnual)}</td><td>−${brl(p.irpfAnual / 12)}</td></tr>`;
  const linhasMe = `
    <tr><th scope="row">Pró-labore bruto</th><td>−${brl(p.proLabore.bruto * 12)}</td><td>−${brl(p.proLabore.bruto)}</td></tr>
    <tr class="destaque"><th scope="row">Lucro distribuído como dividendos</th><td>${brl(p.lucroDistribuivelAnual)}</td><td>${brl(p.lucroDistribuivelAnual / 12)}</td></tr>
    ${p.retencaoDividendosAnual > 0 ? `<tr><th scope="row">Retenção de IR sobre dividendos</th><td>−${brl(p.retencaoDividendosAnual)}</td><td>−${brl(p.retencaoDividendosAnual / 12)}</td></tr>` : ''}`;
  const proLabore = `
      <h4>Pró-labore (vai para você como pessoa física)</h4>
      <div class="tabela-rolagem">
        <table class="tabela-comparativo">
          <tbody>
            <tr><th scope="row">Bruto</th><td>${brl(p.proLabore.bruto)}</td></tr>
            <tr><th scope="row">INSS (${pct(tabela.inss.aliquotaContribuinteIndividual, 0)})</th><td>−${brl(p.proLabore.inss)}</td></tr>
            <tr><th scope="row">IRRF</th><td>−${brl(p.proLabore.irrf)}</td></tr>
            <tr class="destaque"><th scope="row">Líquido mensal</th><td>${brl(p.proLabore.liquido)}</td></tr>
          </tbody>
        </table>
      </div>`;
  const notaMei = `<p class="descricao">No MEI não há pró-labore: o INSS de ${pct(tabela.mei.aliquotaInssSalarioMinimo, 0)} do salário mínimo já está no DAS e garante aposentadoria por idade no valor do salário mínimo.</p>`;

  return `
    <details class="cartao detalhe" open>
      <summary><h3>Empresa PJ: ${escapar(p.descricao)}</h3></summary>
      ${alertas ? `<ul class="alertas">${alertas}</ul>` : ''}
      <div class="tabela-rolagem">
        <table class="tabela-comparativo">
          <thead><tr><th></th><th>Ano</th><th>Média/mês</th></tr></thead>
          <tbody>
            <tr><th scope="row">Faturamento (${p.mesesFaturados.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} meses${estado.pj.bonusAnual > 0 ? ' + bônus' : ''})</th><td>${brl(p.faturamentoAnual)}</td><td>${brl(p.faturamentoAnual / 12)}</td></tr>
            ${impostos}
            ${p.inssPatronalAnual > 0 ? `<tr><th scope="row">INSS patronal sobre pró-labore</th><td>−${brl(p.inssPatronalAnual)}</td><td>−${brl(p.inssPatronalAnual / 12)}</td></tr>` : ''}
            ${custos}
            ${ehMei ? linhasMei : linhasMe}
          </tbody>
        </table>
      </div>
      ${ehMei ? notaMei : proLabore}
      ${p.fatorR !== null ? `<p class="descricao">Fator R: ${pct(p.fatorR, 1)} (pró-labore ÷ faturamento). A partir de 28% a empresa vai para o Anexo III, que tem alíquota menor.</p>` : ''}
      <h4>MEI x ME: cenários avaliados</h4>
      <div class="tabela-rolagem">
        <table class="tabela-comparativo">
          <thead><tr><th>Cenário</th><th>Custos do CNPJ</th><th>Impostos no ano</th><th>Total no ano</th></tr></thead>
          <tbody>${cenarios}</tbody>
        </table>
      </div>
    </details>`;
}

let resumoFixo: ResumoFixo | null = null;

function atualizarResumoFixo({ clt, pj, meta, equivalencias }: Cenario): void {
  resumoFixo ??= montarResumoFixo($('#resumo-fixo'), $('#veredito'), $('#resultado'));
  const diferenca = pj.escolhido.anual.total - clt.anual.total;
  const alvo = meta
    ? { rotulo: meta.calculado === 'pj' ? 'Nota a pedir' : 'Salário a pedir', valor: meta.alvo }
    : { rotulo: 'Nota que empata', valor: equivalencias.nota };
  const base = meta?.calculado === 'clt' ? pj.escolhido.anual.total : clt.anual.total;
  resumoFixo.atualizar({
    cltMes: clt.mediaMensal,
    pjMes: pj.escolhido.mediaMensal,
    diferencaMes: diferenca / 12,
    relativo: base > 0 ? diferenca / base : 0,
    alvo,
  });
}

function sincronizarCampoCalculado(meta: Meta | null): void {
  const id = campoCalculado();
  if (!id || !meta) return;
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) return;
  input.value = meta.alvo === null ? '' : formatarMoeda(meta.alvo);
  input.placeholder = meta.alvo === null ? 'fora do alcance' : '';
}

const MODOS: Record<Estado['modo'], { descricao: string; tituloClt: string; tituloPj: string; dicaClt: string; dicaPj: string }> = {
  comparar: {
    descricao: 'Preencha as duas propostas e veja qual rende mais.',
    tituloClt: 'Proposta CLT',
    tituloPj: 'Proposta PJ',
    dicaClt: '',
    dicaPj: '',
  },
  'sou-clt': {
    descricao: 'Preencha sua CLT de hoje. A página calcula a nota PJ que você precisa pedir para mudar valer a pena.',
    tituloClt: 'Sua situação hoje (CLT)',
    tituloPj: 'Como seria no PJ',
    dicaClt: '',
    dicaPj: 'A nota é calculada para você. Preencha o que a vaga PJ teria: férias, benefícios, regime e custos do CNPJ.',
  },
  'sou-pj': {
    descricao: 'Preencha seu PJ de hoje. A página calcula o salário CLT que você precisa pedir para mudar valer a pena.',
    tituloClt: 'Como seria na CLT',
    tituloPj: 'Sua situação hoje (PJ)',
    dicaClt: 'O salário é calculado para você. Preencha o que a vaga CLT teria: benefícios, PLR e descontos.',
    dicaPj: '',
  },
};

function renderModo(): void {
  const modo = MODOS[estado.modo];
  document.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b) => {
    const ativo = b.dataset.modo === estado.modo;
    b.setAttribute('aria-checked', String(ativo));
    b.tabIndex = ativo ? 0 : -1;
  });
  $('#modo-descricao').textContent = modo.descricao;
  $('#modo-margem').hidden = estado.modo === 'comparar';
  const margem = $<HTMLInputElement>('#margem');
  if (document.activeElement !== margem) margem.value = String(paraPercentual(estado.margem));
  $('#titulo-clt').textContent = modo.tituloClt;
  $('#titulo-pj').textContent = modo.tituloPj;
  const dicaClt = $('#dica-clt');
  const dicaPj = $('#dica-pj');
  dicaClt.textContent = modo.dicaClt;
  dicaClt.hidden = !modo.dicaClt;
  dicaPj.textContent = modo.dicaPj;
  dicaPj.hidden = !modo.dicaPj;
}

function trocarModo(modo: Estado['modo']): void {
  if (modo === estado.modo) return;
  estado.modo = modo;
  renderModo();
  renderEntradas();
  persistir();
}

function renderResultado(): void {
  const cenario = montarCenario();
  const { tabela, clt, pj, meta, equivalencias } = cenario;
  $('#veredito').innerHTML = meta ? renderVereditoMeta(cenario, meta) : renderVeredito(clt, pj, tabela, equivalencias);
  const metas = $('#metas');
  metas.hidden = !meta;
  metas.innerHTML = meta ? renderMetas(meta) : '';
  sincronizarCampoCalculado(meta);
  atualizarResumoFixo(cenario);
  $('#resultado').innerHTML = renderComparativo(clt, pj) + `<div class="colunas">${renderDetalheClt(clt)}${renderDetalhePj(pj, tabela)}</div>`;
  const impostos = document.querySelector<HTMLElement>('#impostos-pj');
  if (impostos) impostos.innerHTML = renderImpostosPj(pj.escolhido);
}

function renderSeletorAno(): void {
  const anos = anosDoEstado(estado);
  if (!anos.includes(estado.ano)) estado.ano = anos[0] ?? estado.ano;
  $<HTMLSelectElement>('#ano').innerHTML = anos
    .map((a) => {
      const descricao = estado.tabelasPersonalizadas[a] ? 'Personalizada neste navegador' : 'Tabela oficial';
      return `<option value="${a}" data-descricao="${descricao}" ${a === estado.ano ? 'selected' : ''}>${a}</option>`;
    })
    .join('');
}

function renderTabelas(): void {
  const tabela = tabelaAtiva(estado);
  const personalizada = Boolean(estado.tabelasPersonalizadas[estado.ano]);
  const oficial = temOficial(estado.ano);
  $('#tabelas-status').innerHTML = `
    <div>
      <h2>Tabelas de ${tabela.ano}</h2>
      <p class="descricao">${
        personalizada
          ? 'Você está usando uma versão <strong>personalizada</strong>, salva só neste navegador.'
          : 'Valores <strong>oficiais</strong> que vêm com o projeto. Ao editar qualquer campo, uma cópia personalizada é criada.'
      }</p>
      <p class="descricao fonte">Fonte: ${escapar(tabela.fonte)}</p>
    </div>
    <div class="acoes">
      <span class="acao-ano">
        <input type="number" id="novo-ano" min="2000" max="2100" value="${Math.max(...anosDoEstado(estado)) + 1}" aria-label="Ano da nova tabela">
        <button type="button" class="botao-secundario" id="criar-ano">Criar tabela para este ano</button>
      </span>
      <button type="button" class="botao-secundario" id="exportar">Exportar JSON</button>
      <label class="botao-secundario" for="importar">Importar JSON</label>
      <input type="file" id="importar" accept="application/json,.json" hidden>
      ${personalizada && oficial ? '<button type="button" class="botao-perigo" id="restaurar">Restaurar oficial</button>' : ''}
      ${personalizada && !oficial ? '<button type="button" class="botao-perigo" id="excluir">Excluir tabela</button>' : ''}
    </div>
    <p class="mensagem" id="mensagem-tabelas" role="status"></p>`;
  $('#tabelas-editor').innerHTML = renderEditor(tabela);
}

function mensagemTabelas(texto: string, erro = false): void {
  const el = document.querySelector<HTMLElement>('#mensagem-tabelas');
  if (!el) return;
  el.textContent = texto;
  el.classList.toggle('erro', erro);
}

function tabelaEditavel(): TabelaAno {
  if (!estado.tabelasPersonalizadas[estado.ano]) {
    estado.tabelasPersonalizadas[estado.ano] = { ...tabelaOficial(estado.ano), ano: estado.ano, fonte: `Personalizada a partir de ${tabelaOficial(estado.ano).ano}` };
    renderSeletorAno();
    const status = document.querySelector('#tabelas-status .descricao');
    if (status) status.innerHTML = 'Você está usando uma versão <strong>personalizada</strong>, salva só neste navegador.';
  }
  const tabela = estado.tabelasPersonalizadas[estado.ano];
  if (!tabela) throw new Error('Tabela personalizada ausente');
  return tabela;
}

function persistir(): void {
  salvarEstado(estado);
  renderResultado();
}

function aoEditarEntrada(alvo: HTMLInputElement | HTMLSelectElement): void {
  const lado = alvo.dataset.lado as 'clt' | 'pj' | undefined;
  const chave = alvo.dataset.chave;
  if (!lado || !chave || (alvo instanceof HTMLInputElement && alvo.readOnly)) return;
  const tipo = alvo.dataset.tipo as TipoEntrada;
  let valor: unknown;
  if (tipo === 'bool') valor = (alvo as HTMLInputElement).checked;
  else if (tipo === 'select') valor = alvo.value;
  else if (tipo === 'moeda') valor = lerMoeda(alvo.value) ?? 0;
  else {
    const n = Math.max(0, Number(alvo.value) || 0);
    valor = tipo === 'pct' ? n / 100 : n;
  }
  (estado[lado] as unknown as Record<string, unknown>)[chave] = valor;
  atualizarVisibilidade();
  persistir();
}

function aoEditarCusto(alvo: HTMLInputElement | HTMLSelectElement): void {
  const indice = Number(alvo.dataset.custo);
  const campo = alvo.dataset.campoCusto as keyof CustoPj;
  const custo = estado.pj.custos[indice];
  if (!custo) return;
  if (campo === 'valor') custo.valor = lerMoeda(alvo.value) ?? 0;
  else if (campo === 'nome') custo.nome = alvo.value;
  else if (campo === 'mei') custo.mei = (alvo as HTMLInputElement).checked;
  else custo.periodicidade = alvo.value === 'anual' ? 'anual' : 'mensal';
  persistir();
}

function baixarJson(nome: string, dados: unknown): void {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function trocarAba(aba: string): void {
  document.querySelectorAll<HTMLButtonElement>('[data-aba]').forEach((b) => {
    const ativa = b.dataset.aba === aba;
    b.setAttribute('aria-selected', String(ativa));
    b.tabIndex = ativa ? 0 : -1;
  });
  document.querySelectorAll<HTMLElement>('[data-painel]').forEach((p) => {
    p.hidden = p.dataset.painel !== aba;
  });
  resumoFixo?.definirAbaAtiva(aba === 'comparar');
  if (aba === 'tabelas') renderTabelas();
}

function ligarEventos(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-aba]').forEach((b) => b.addEventListener('click', () => trocarAba(b.dataset.aba ?? 'comparar')));

  $<HTMLSelectElement>('#ano').addEventListener('change', (ev) => {
    estado.ano = Number((ev.target as HTMLSelectElement).value);
    salvarEstado(estado);
    renderResultado();
    if (!$('[data-painel="tabelas"]').hidden) renderTabelas();
  });
  $<HTMLSelectElement>('#ano').addEventListener('dropdown-rodape', () => trocarAba('tabelas'));

  const opcoesModo = [...document.querySelectorAll<HTMLButtonElement>('[data-modo]')];
  opcoesModo.forEach((botao, indice) => {
    botao.addEventListener('click', () => trocarModo(botao.dataset.modo as Estado['modo']));
    botao.addEventListener('keydown', (ev) => {
      const passo = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
      if (!passo) return;
      ev.preventDefault();
      const proximo = opcoesModo[(indice + passo + opcoesModo.length) % opcoesModo.length];
      if (!proximo) return;
      trocarModo(proximo.dataset.modo as Estado['modo']);
      proximo.focus();
    });
  });
  $<HTMLInputElement>('#margem').addEventListener('input', (ev) => {
    const valor = Number((ev.target as HTMLInputElement).value);
    estado.margem = Number.isFinite(valor) ? Math.min(Math.max(valor, 0), 300) / 100 : 0;
    persistir();
  });

  const entradas = $('#painel-entradas');
  const aoMudar = (ev: Event) => {
    const alvo = ev.target as HTMLInputElement | HTMLSelectElement;
    if (alvo.dataset.custo !== undefined) aoEditarCusto(alvo);
    else aoEditarEntrada(alvo);
  };
  entradas.addEventListener('input', aoMudar);
  entradas.addEventListener('change', aoMudar);
  entradas.addEventListener('click', (ev) => {
    const alvo = ev.target as HTMLElement;
    if (alvo.id === 'adicionar-custo') {
      estado.pj.custos.push({ nome: 'Novo custo', valor: 0, periodicidade: 'mensal', mei: true });
      renderEntradas();
      persistir();
      document.querySelector<HTMLInputElement>(`[data-custo="${estado.pj.custos.length - 1}"][data-campo-custo="nome"]`)?.select();
    }
    const remover = alvo.closest<HTMLElement>('[data-remover-custo]');
    if (remover) {
      estado.pj.custos.splice(Number(remover.dataset.removerCusto), 1);
      renderEntradas();
      persistir();
    }
  });

  $('#restaurar-entradas').addEventListener('click', () => {
    estado.clt = cltPadrao();
    estado.pj = pjPadrao();
    renderEntradas();
    persistir();
  });

  const editor = $('#tabelas-editor');
  editor.addEventListener('input', (ev) => {
    const alvo = ev.target as HTMLInputElement;
    const caminho = alvo.dataset.tabela;
    if (!caminho) return;
    gravarCaminho(tabelaEditavel(), caminho, lerInputTabela(alvo));
    const erros = validarTabela(tabelaEditavel());
    mensagemTabelas(erros.length ? `Atenção: ${erros[0]}` : 'Alteração salva neste navegador.', erros.length > 0);
    persistir();
  });
  editor.addEventListener('click', (ev) => {
    const alvo = ev.target as HTMLElement;
    const adicionar = alvo.closest<HTMLElement>('[data-adicionar-faixa]');
    const remover = alvo.closest<HTMLElement>('[data-remover-faixa]');
    if (adicionar) adicionarFaixa(tabelaEditavel(), adicionar.dataset.adicionarFaixa ?? '', adicionar.dataset.comDeducao === '1');
    else if (remover) removerFaixa(tabelaEditavel(), remover.dataset.removerFaixa ?? '', Number(remover.dataset.indice));
    else return;
    persistir();
    renderTabelas();
  });

  const status = $('#tabelas-status');
  status.addEventListener('click', (ev) => {
    const alvo = ev.target as HTMLElement;
    if (alvo.id === 'criar-ano') {
      const ano = Number($<HTMLInputElement>('#novo-ano').value);
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        mensagemTabelas('Informe um ano entre 2000 e 2100.', true);
        return;
      }
      const base = structuredClone(tabelaAtiva(estado));
      estado.tabelasPersonalizadas[ano] = { ...base, ano, fonte: `Criada a partir da tabela de ${base.ano}. Atualize com os valores oficiais de ${ano}.` };
      estado.ano = ano;
      salvarEstado(estado);
      renderSeletorAno();
      renderTabelas();
      renderResultado();
      mensagemTabelas(`Tabela de ${ano} criada a partir de ${base.ano}. Ajuste os valores abaixo.`);
    }
    if (alvo.id === 'exportar') baixarJson(`tabelas-clt-pj-${estado.ano}.json`, tabelaAtiva(estado));
    if (alvo.id === 'restaurar' || alvo.id === 'excluir') {
      const acao = alvo.id === 'restaurar' ? 'restaurar os valores oficiais' : 'excluir esta tabela';
      if (!window.confirm(`Tem certeza que deseja ${acao} de ${estado.ano}?`)) return;
      delete estado.tabelasPersonalizadas[estado.ano];
      salvarEstado(estado);
      renderSeletorAno();
      renderTabelas();
      renderResultado();
    }
  });
  status.addEventListener('change', async (ev) => {
    const alvo = ev.target as HTMLInputElement;
    if (alvo.id !== 'importar' || !alvo.files?.[0]) return;
    try {
      const dados = completarTabela(JSON.parse(await alvo.files[0].text())) as TabelaAno;
      const erros = validarTabela(dados);
      if (erros.length) {
        mensagemTabelas(`Arquivo inválido: ${erros.slice(0, 3).join('; ')}`, true);
        return;
      }
      estado.tabelasPersonalizadas[dados.ano] = dados;
      estado.ano = dados.ano;
      salvarEstado(estado);
      renderSeletorAno();
      renderTabelas();
      renderResultado();
      mensagemTabelas(`Tabela de ${dados.ano} importada.`);
    } catch {
      mensagemTabelas('Não consegui ler o arquivo. Ele precisa ser um JSON exportado por esta página.', true);
    }
  });

  ativarDicas($('#resultado'), $('#dica'));
}

ativarMascaras();
renderModo();
renderSeletorAno();
aprimorarSelects($('.topo'));
renderEntradas();
renderResultado();
ligarEventos();

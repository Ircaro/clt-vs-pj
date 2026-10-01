import { brl, pct } from './formato';

export interface DadosResumo {
  cltMes: number;
  pjMes: number;
  diferencaMes: number;
  relativo: number;
  alvo: { rotulo: string; valor: number | null };
}

export interface ResumoFixo {
  atualizar(dados: DadosResumo): void;
  definirAbaAtiva(ativa: boolean): void;
}

export function montarResumoFixo(raiz: HTMLElement, sentinela: HTMLElement, destino: HTMLElement): ResumoFixo {
  raiz.innerHTML = `
    <div class="resumo-fixo-conteudo">
      <div class="resumo-item"><span class="etiqueta etiqueta-clt">CLT</span><strong data-resumo="clt"></strong><span class="resumo-sufixo">/mês</span></div>
      <div class="resumo-item"><span class="etiqueta etiqueta-pj">PJ</span><strong data-resumo="pj"></strong><span class="resumo-sufixo">/mês</span></div>
      <div class="resumo-item resumo-diferenca" data-resumo="diferenca"></div>
      <div class="resumo-item resumo-nota"><span class="resumo-rotulo" data-resumo="rotulo-alvo"></span><strong data-resumo="nota"></strong></div>
      <button type="button" class="botao-secundario pequeno resumo-ir">Ver comparativo ↓</button>
    </div>`;

  const campo = (nome: string) => {
    const el = raiz.querySelector<HTMLElement>(`[data-resumo="${nome}"]`);
    if (!el) throw new Error(`Campo ${nome} do resumo ausente`);
    return el;
  };
  const campos = { clt: campo('clt'), pj: campo('pj'), diferenca: campo('diferenca'), nota: campo('nota'), rotuloAlvo: campo('rotulo-alvo') };

  raiz.querySelector('.resumo-ir')?.addEventListener('click', () => {
    const topo = destino.getBoundingClientRect().top + window.scrollY - raiz.offsetHeight - 12;
    window.scrollTo({ top: topo, behavior: 'smooth' });
  });

  let foraDeVista = false;
  let abaAtiva = true;

  const aplicarVisibilidade = () => {
    const visivel = foraDeVista && abaAtiva;
    raiz.classList.toggle('visivel', visivel);
    raiz.inert = !visivel;
    raiz.setAttribute('aria-hidden', String(!visivel));
  };

  new IntersectionObserver(([entrada]) => {
    foraDeVista = entrada ? !entrada.isIntersecting && entrada.boundingClientRect.top < 0 : false;
    aplicarVisibilidade();
  }).observe(sentinela);

  const escrever = (el: HTMLElement, html: string) => {
    if (el.innerHTML === html) return;
    const primeiraVez = el.innerHTML === '';
    el.innerHTML = html;
    if (primeiraVez) return;
    el.classList.remove('atualizado');
    void el.offsetWidth;
    el.classList.add('atualizado');
  };

  aplicarVisibilidade();

  return {
    atualizar(d) {
      escrever(campos.clt, brl(d.cltMes));
      escrever(campos.pj, brl(d.pjMes));
      campos.rotuloAlvo.textContent = d.alvo.rotulo;
      escrever(campos.nota, d.alvo.valor === null ? 'fora do alcance' : brl(d.alvo.valor));
      let diferenca: string;
      if (Math.abs(d.relativo) < 0.01) diferenca = '<span class="neutro">Praticamente empate</span>';
      else {
        const vencedor = d.diferencaMes > 0 ? 'PJ' : 'CLT';
        diferenca = `<span class="resumo-rotulo">${vencedor} rende</span><strong class="positivo">+${brl(Math.abs(d.diferencaMes))}</strong><span class="resumo-sufixo">/mês (${pct(Math.abs(d.relativo), 1)})</span>`;
      }
      escrever(campos.diferenca, diferenca);
    },
    definirAbaAtiva(ativa) {
      abaAtiva = ativa;
      aplicarVisibilidade();
    },
  };
}

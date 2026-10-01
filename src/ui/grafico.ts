import { brl, brlCurto, escapar, pct } from './formato';

export interface Segmento {
  serie: string;
  valor: number;
}

export interface Barra {
  rotulo: string;
  segmentos: Segmento[];
}

export interface Serie {
  nome: string;
  cor: string;
}

export function barrasEmpilhadas(series: Serie[], barras: Barra[]): string {
  const maximo = Math.max(1, ...barras.map((b) => b.segmentos.reduce((s, seg) => s + Math.max(seg.valor, 0), 0)));
  const legenda = series
    .map((s) => `<li><span class="legenda-marca" style="background:var(${s.cor})"></span>${escapar(s.nome)}</li>`)
    .join('');

  const linhas = barras
    .map((barra) => {
      const total = barra.segmentos.reduce((s, seg) => s + Math.max(seg.valor, 0), 0);
      const visiveis = barra.segmentos.filter((seg) => seg.valor > 0);
      const partes = visiveis
        .map((seg) => {
          const serie = series.find((s) => s.nome === seg.serie);
          const largura = (seg.valor / maximo) * 100;
          const dica = `${seg.serie}: ${brl(seg.valor)} (${pct(seg.valor / total, 1)} do pacote)`;
          return `<span class="segmento" style="flex-basis:${largura}%;background:var(${serie?.cor ?? '--serie-1'})" data-dica="${escapar(`${barra.rotulo} · ${dica}`)}" tabindex="0" aria-label="${escapar(dica)}"></span>`;
        })
        .join('');
      return `
        <div class="barra-linha">
          <div class="barra-rotulo">${escapar(barra.rotulo)}</div>
          <div class="barra-trilho">${partes}<span class="barra-total">${brlCurto(total)}</span></div>
        </div>`;
    })
    .join('');

  return `<ul class="legenda">${legenda}</ul><div class="barras">${linhas}</div>`;
}

export function ativarDicas(raiz: HTMLElement, dica: HTMLElement): void {
  const mostrar = (alvo: HTMLElement, x: number, y: number) => {
    dica.textContent = alvo.dataset.dica ?? '';
    dica.hidden = false;
    const largura = dica.offsetWidth;
    const esquerda = Math.min(Math.max(8, x - largura / 2), window.innerWidth - largura - 8);
    dica.style.left = `${esquerda}px`;
    dica.style.top = `${y - dica.offsetHeight - 12}px`;
  };
  raiz.addEventListener('pointermove', (ev) => {
    const alvo = (ev.target as HTMLElement).closest<HTMLElement>('[data-dica]');
    if (alvo) mostrar(alvo, ev.clientX, ev.clientY);
    else dica.hidden = true;
  });
  raiz.addEventListener('pointerleave', () => {
    dica.hidden = true;
  });
  raiz.addEventListener('focusin', (ev) => {
    const alvo = (ev.target as HTMLElement).closest<HTMLElement>('[data-dica]');
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    mostrar(alvo, r.left + r.width / 2, r.top);
  });
  raiz.addEventListener('focusout', () => {
    dica.hidden = true;
  });
}

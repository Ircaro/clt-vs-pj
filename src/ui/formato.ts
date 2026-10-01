const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moedaCurta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function brl(valor: number): string {
  return moeda.format(valor);
}

export function brlCurto(valor: number): string {
  return moedaCurta.format(valor);
}

export function pct(fracao: number, casas = 2): string {
  return `${(fracao * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function paraPercentual(fracao: number): number {
  return Number((fracao * 100).toPrecision(10));
}

export function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

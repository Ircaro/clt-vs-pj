const formato = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAXIMO_DIGITOS = 12;

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  return formato.format(valor);
}

export function lerMoeda(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return null;
  return Number(digitos.slice(-MAXIMO_DIGITOS)) / 100;
}

function aplicarMascara(input: HTMLInputElement): void {
  const digitos = input.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAXIMO_DIGITOS);
  input.value = digitos ? formatarMoeda(Number(digitos) / 100) : '';
  const fim = input.value.length;
  input.setSelectionRange(fim, fim);
}

function ehCampoMoeda(alvo: EventTarget | null): alvo is HTMLInputElement {
  return alvo instanceof HTMLInputElement && alvo.dataset.moeda !== undefined;
}

export function ativarMascaras(): void {
  document.addEventListener(
    'input',
    (ev) => {
      if (ehCampoMoeda(ev.target)) aplicarMascara(ev.target);
    },
    true,
  );
  document.addEventListener('focusin', (ev) => {
    const alvo = ev.target;
    if (!ehCampoMoeda(alvo)) return;
    requestAnimationFrame(() => {
      const fim = alvo.value.length;
      alvo.setSelectionRange(fim, fim);
    });
  });
  document.addEventListener('focusout', (ev) => {
    const alvo = ev.target;
    if (ehCampoMoeda(alvo) && alvo.value === '' && alvo.dataset.vazio === undefined) alvo.value = formatarMoeda(0);
  });
}

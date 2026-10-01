import { escapar } from './formato';

const CHEVRON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let contador = 0;
let fecharAberto: (() => void) | null = null;

document.addEventListener('pointerdown', (ev) => {
  if (fecharAberto && !(ev.target as HTMLElement).closest('.dropdown.aberto')) fecharAberto();
});

function rotuloDe(select: HTMLSelectElement): string {
  const rotulo = select.closest('label')?.querySelector('.campo-rotulo, .seletor-ano-rotulo')?.textContent;
  return (rotulo ?? select.getAttribute('aria-label') ?? '').trim();
}

function textoOpcao(opcao: HTMLOptionElement): string {
  return opcao.dataset.rotulo ?? opcao.text;
}

function aprimorar(select: HTMLSelectElement): void {
  select.dataset.aprimorado = '1';
  const id = `dropdown-${++contador}`;
  const rotulo = rotuloDe(select);

  const raiz = document.createElement('div');
  raiz.className = `dropdown${select.dataset.variante ? ` dropdown-${select.dataset.variante}` : ''}`;

  const gatilho = document.createElement('button');
  gatilho.type = 'button';
  gatilho.className = 'dropdown-gatilho';
  gatilho.setAttribute('aria-haspopup', 'listbox');
  gatilho.setAttribute('aria-expanded', 'false');
  gatilho.setAttribute('aria-controls', `${id}-lista`);
  const valor = document.createElement('span');
  valor.className = 'dropdown-valor';
  const seta = document.createElement('span');
  seta.className = 'dropdown-seta';
  seta.innerHTML = CHEVRON;
  gatilho.append(valor, seta);

  const painel = document.createElement('div');
  painel.className = 'dropdown-painel';
  painel.hidden = true;
  const lista = document.createElement('ul');
  lista.className = 'dropdown-lista';
  lista.id = `${id}-lista`;
  lista.setAttribute('role', 'listbox');
  lista.tabIndex = -1;
  if (rotulo) lista.setAttribute('aria-label', rotulo);
  painel.append(lista);

  if (select.dataset.rodape) {
    const rodape = document.createElement('button');
    rodape.type = 'button';
    rodape.className = 'dropdown-rodape';
    rodape.textContent = select.dataset.rodape;
    rodape.addEventListener('click', () => {
      fechar();
      select.dispatchEvent(new CustomEvent('dropdown-rodape', { bubbles: true }));
    });
    painel.append(rodape);
  }

  select.before(raiz);
  raiz.append(select, gatilho, painel);
  select.hidden = true;
  select.tabIndex = -1;

  let ativo = -1;
  const itens = () => [...lista.querySelectorAll<HTMLLIElement>('.dropdown-opcao')];

  function renderLista(): void {
    lista.innerHTML = [...select.options]
      .map(
        (o, i) => `<li role="option" id="${id}-op-${i}" class="dropdown-opcao" data-indice="${i}" aria-selected="${o.selected}">
          <span class="dropdown-opcao-texto"><span>${escapar(textoOpcao(o))}</span>${o.dataset.descricao ? `<small>${escapar(o.dataset.descricao)}</small>` : ''}</span>
          <span class="dropdown-check">${CHECK}</span>
        </li>`,
      )
      .join('');
    const atual = select.selectedOptions[0];
    valor.textContent = atual ? textoOpcao(atual) : '';
    gatilho.setAttribute('aria-label', rotulo ? `${rotulo}: ${valor.textContent}` : valor.textContent ?? '');
  }

  function marcarAtivo(indice: number): void {
    const todos = itens();
    if (!todos.length) return;
    ativo = Math.min(Math.max(indice, 0), todos.length - 1);
    todos.forEach((li, i) => li.classList.toggle('ativo', i === ativo));
    const alvo = todos[ativo];
    if (alvo) {
      lista.setAttribute('aria-activedescendant', alvo.id);
      alvo.scrollIntoView({ block: 'nearest' });
    }
  }

  function posicionar(): void {
    painel.classList.remove('a-direita', 'acima');
    const r = painel.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) painel.classList.add('a-direita');
    if (r.bottom > window.innerHeight - 8 && gatilho.getBoundingClientRect().top > r.height + 16) painel.classList.add('acima');
  }

  function abrir(): void {
    fecharAberto?.();
    painel.hidden = false;
    raiz.classList.add('aberto');
    gatilho.setAttribute('aria-expanded', 'true');
    posicionar();
    marcarAtivo(Math.max(select.selectedIndex, 0));
    lista.focus({ preventScroll: true });
    fecharAberto = fechar;
  }

  function fechar(focar = false): void {
    painel.hidden = true;
    raiz.classList.remove('aberto');
    gatilho.setAttribute('aria-expanded', 'false');
    if (fecharAberto === fechar) fecharAberto = null;
    if (focar) gatilho.focus();
  }

  function escolher(indice: number): void {
    if (indice >= 0 && indice !== select.selectedIndex) {
      select.selectedIndex = indice;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    renderLista();
    fechar(true);
  }

  gatilho.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
  gatilho.addEventListener('keydown', (ev) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(ev.key)) {
      ev.preventDefault();
      abrir();
    }
  });

  lista.addEventListener('keydown', (ev) => {
    const teclas: Record<string, () => void> = {
      ArrowDown: () => marcarAtivo(ativo + 1),
      ArrowUp: () => marcarAtivo(ativo - 1),
      Home: () => marcarAtivo(0),
      End: () => marcarAtivo(itens().length - 1),
      Enter: () => escolher(ativo),
      ' ': () => escolher(ativo),
      Escape: () => fechar(true),
    };
    if (ev.key === 'Tab') {
      fechar();
      return;
    }
    const acao = teclas[ev.key];
    if (acao) {
      ev.preventDefault();
      acao();
    }
  });

  lista.addEventListener('click', (ev) => {
    const li = (ev.target as HTMLElement).closest<HTMLLIElement>('.dropdown-opcao');
    if (li) escolher(Number(li.dataset.indice));
  });
  lista.addEventListener('pointermove', (ev) => {
    const li = (ev.target as HTMLElement).closest<HTMLLIElement>('.dropdown-opcao');
    if (li && Number(li.dataset.indice) !== ativo) marcarAtivo(Number(li.dataset.indice));
  });

  select.addEventListener('change', renderLista);
  new MutationObserver(renderLista).observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
  renderLista();
}

export function aprimorarSelects(raiz: ParentNode = document): void {
  raiz.querySelectorAll<HTMLSelectElement>('select:not([data-aprimorado])').forEach(aprimorar);
}

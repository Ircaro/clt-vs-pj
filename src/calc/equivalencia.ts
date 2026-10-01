import type { TabelaAno } from '../tabelas/tipos';
import { calcularClt, type EntradaClt } from './clt';
import { calcularPj, type EntradaPj } from './pj';

export const VALOR_MAXIMO_BUSCA = 400000;
const PRIMEIRO_PONTO = 100;
const PASSO_RELATIVO = 1.02;

function menorValorQueAlcanca(alvo: number, funcao: (x: number) => number, maximo: number): number | null {
  if (alvo <= 0) return 0;
  if (funcao(0) >= alvo) return 0;
  let baixo = 0;
  let encontrado: number | null = null;
  for (let x = PRIMEIRO_PONTO; x < maximo * PASSO_RELATIVO; x *= PASSO_RELATIVO) {
    const ponto = Math.min(x, maximo);
    if (funcao(ponto) >= alvo) {
      encontrado = ponto;
      break;
    }
    baixo = ponto;
  }
  if (encontrado === null) return null;
  let alto: number = encontrado;
  for (let i = 0; i < 50; i++) {
    const meio = (baixo + alto) / 2;
    if (funcao(meio) < alvo) baixo = meio;
    else alto = meio;
  }
  return Math.ceil(Number((alto * 100).toPrecision(12))) / 100;
}

export function notaPjEquivalente(totalAlvo: number, e: EntradaPj, tabela: TabelaAno): number | null {
  return menorValorQueAlcanca(totalAlvo, (valor) => calcularPj({ ...e, valorMensal: valor }, tabela).escolhido.anual.total, VALOR_MAXIMO_BUSCA);
}

export function salarioCltEquivalente(totalAlvo: number, e: EntradaClt, tabela: TabelaAno): number | null {
  return menorValorQueAlcanca(totalAlvo, (valor) => calcularClt({ ...e, salarioBruto: valor }, tabela).anual.total, VALOR_MAXIMO_BUSCA);
}

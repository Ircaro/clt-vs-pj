import { describe, expect, it } from 'vitest';
import { formatarMoeda, lerMoeda } from '../src/ui/mascara';

describe('Máscara de moeda', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatarMoeda(10000)).toBe('10.000,00');
    expect(formatarMoeda(1621)).toBe('1.621,00');
    expect(formatarMoeda(0.5)).toBe('0,50');
  });

  it('lê o valor digitado considerando os centavos', () => {
    expect(lerMoeda('10.000,00')).toBe(10000);
    expect(lerMoeda('1.234,56')).toBe(1234.56);
    expect(lerMoeda('R$ 99,9')).toBe(9.99);
  });

  it('retorna nulo para campo vazio', () => {
    expect(lerMoeda('')).toBeNull();
    expect(formatarMoeda(null)).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { resolveMove, determineWinner, turnOrder } from './rules';
import { colorIndex } from './data';
describe('regras do tabuleiro', () => {
  it('casa prevista seleciona a pergunta antes do movimento', () => {
    expect(resolveMove(7, 3, false).predicted).toBe(10);
    expect(resolveMove(7, 3, false).final).toBe(4);
  });
  it('penalidade aplicada uma única vez', () => {
    expect(resolveMove(7, 3, true)).toMatchObject({ moved: 10, penalty: 2, final: 8 });
  });
  it('não recua abaixo de zero', () => {
    expect(resolveMove(0, 4, false).final).toBe(0);
  });
  it('chegada limita em 30', () => {
    expect(resolveMove(27, 5, true)).toMatchObject({ predicted: 30, final: 30, won: true });
  });
  it('cores das seis faixas seguem PDF', () => {
    expect([1, 6, 11, 16, 21, 26].map(colorIndex)).toEqual([0, 1, 2, 3, 4, 0]);
  });
  it('desempate somente entre líderes', () => {
    expect(determineWinner([4, 6, 6, 1], [0, 1, 2, 3])).toEqual({ winner: null, tied: [1, 2] });
  });
  it('ordem circular começa pelo vencedor', () => {
    expect(turnOrder(2)).toEqual([2, 3, 0, 1]);
  });
});

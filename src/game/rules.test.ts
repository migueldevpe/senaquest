import { describe, it, expect } from 'vitest';
import { resolveMove, determineWinner, turnOrder, SPECIAL_SQUARES } from './rules';
import { colorIndex } from './data';

describe('regras oficiais do tabuleiro', () => {
  it('a cor da casa prevista escolhe a categoria antes do movimento', () => {
    expect(resolveMove(7, 3, false).predicted).toBe(10);
    expect(resolveMove(7, 3, false).final).toBe(4);
    expect(resolveMove(7, 3, false).areaIndex).toBe(colorIndex(10));
  });
  it('eventos são aplicados pelo store, não pela função de movimento', () => {
    expect(resolveMove(7, 3, true)).toMatchObject({ moved: 10, final: 10, penalty: 0 });
  });
  it('não recua abaixo de zero', () => {
    expect(resolveMove(0, 4, false).final).toBe(0);
  });
  it('não avança ao ultrapassar a 30', () => {
    expect(resolveMove(27, 5, true)).toMatchObject({ predicted: 27, final: 27, won: false });
  });
  it('vence somente ao chegar exatamente à 30', () => {
    expect(resolveMove(27, 3, true)).toMatchObject({ predicted: 30, final: 30, won: true });
  });
  it('todas e somente as nove casas previstas têm eventos', () => {
    expect(
      Object.keys(SPECIAL_SQUARES)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([10, 11, 12, 17, 18, 19, 24, 25, 26]);
    expect(SPECIAL_SQUARES[12].destination).toBe(9);
    expect(SPECIAL_SQUARES[24].skipTurns).toBe(2);
  });
  it('cores das cinco categorias seguem as casas', () => {
    expect([1, 6, 11, 16, 21, 26].map(colorIndex)).toEqual([0, 1, 2, 3, 4, 0]);
  });
  it('desempate somente entre líderes no sorteio', () => {
    expect(determineWinner([4, 6, 6, 1], [0, 1, 2, 3])).toEqual({ winner: null, tied: [1, 2] });
  });
  it('ordem circular começa pelo vencedor do sorteio', () => {
    expect(turnOrder(2)).toEqual([2, 3, 0, 1]);
  });
});

import { describe, expect, it } from 'vitest';
import { startingPawnPosition, pawnFloorHeight, boardGridPosition } from './diceMath';

describe('bases quadradas individuais', () => {
  it('posiciona uma base em cada lado da moldura, fora das casas', () => {
    const positions = [0, 1, 2, 3].map(startingPawnPosition);
    expect(new Set(positions.map(([x, , z]) => `${x},${z}`)).size).toBe(4);
    expect(positions[0][2]).toBeGreaterThan(3);
    expect(positions[1][0]).toBeGreaterThan(3);
    expect(positions[2][2]).toBeLessThan(-3);
    expect(positions[3][0]).toBeLessThan(-3);
    const tile = boardGridPosition(1);
    for (const [x, , z] of positions) {
      expect(Math.abs(x - tile[0]) > 0.7 || Math.abs(z - tile[2]) > 0.7).toBe(true);
    }
  });
  it('apoia os pinos na superfície elevada da base', () => {
    expect(pawnFloorHeight(0)).toBeGreaterThan(0.1);
    expect(pawnFloorHeight(0)).toBeLessThan(pawnFloorHeight(1));
  });
});

describe('posições físicas dos jogadores', () => {
  it('Claudinha à direita e Paty ao fundo', () => {
    const claudinha = startingPawnPosition(1);
    const paty = startingPawnPosition(2);
    expect(claudinha[0]).toBeGreaterThan(0);
    expect(claudinha[2]).toBe(0);
    expect(paty[0]).toBe(0);
    expect(paty[2]).toBeLessThan(0);
  });
});

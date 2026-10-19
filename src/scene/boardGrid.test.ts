import { describe, expect, it } from 'vitest';
import { boardGridPosition, TILE_STEP, pawnOffset } from './diceMath';

describe('tabuleiro simétrico', () => {
  it('usa o mesmo passo horizontal e vertical', () => {
    expect(Math.abs(boardGridPosition(2)[0] - boardGridPosition(1)[0])).toBeCloseTo(TILE_STEP);
    expect(Math.abs(boardGridPosition(6)[2] - boardGridPosition(1)[2])).toBeCloseTo(TILE_STEP);
  });
  it('mantém 30 casas distintas, com os múltiplos de 5 na coluna direita', () => {
    const points = Array.from({ length: 30 }, (_, i) => boardGridPosition(i + 1));
    expect(new Set(points.map(([x, , z]) => `${x}:${z}`)).size).toBe(30);
    for (const n of [5, 10, 15, 20, 25, 30])
      expect(boardGridPosition(n)[0]).toBe(boardGridPosition(5)[0]);
  });
  it('reserva o canto do número para não ser coberto por pinos', () => {
    for (let i = 0; i < 4; i++) {
      const [x, z] = pawnOffset(i);
      expect(Math.hypot(x - 0.36, z + 0.32)).toBeGreaterThan(0.19);
    }
  });
});

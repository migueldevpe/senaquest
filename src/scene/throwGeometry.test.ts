import { describe, expect, it } from 'vitest';
import { hasClearedEntry, outsideArena, throwDirection, throwOrigin } from './throwGeometry';

describe('lançamentos dos quatro lados', () => {
  it('todos partem fora da arena, apontando para o centro', () => {
    for (const side of [0, 1, 2, 3] as const) {
      const [x, , z] = throwOrigin(side);
      const [dx, dz] = throwDirection(side);
      expect(x * dx + z * dz).toBeLessThan(0);
      expect(Math.abs(x) + Math.abs(z)).toBeCloseTo(1.99);
      expect(hasClearedEntry(side, x, z)).toBe(false);
      expect(hasClearedEntry(side, 0, 0)).toBe(true);
    }
  });
  it('só fecha a passagem após o dado inteiro entrar', () => {
    expect(hasClearedEntry(0, 0, 1.65)).toBe(false);
    expect(hasClearedEntry(0, 0, 1.5)).toBe(true);
    expect(hasClearedEntry(1, 1.65, 0)).toBe(false);
    expect(hasClearedEntry(1, 1.5, 0)).toBe(true);
    expect(hasClearedEntry(2, 0, -1.65)).toBe(false);
    expect(hasClearedEntry(2, 0, -1.5)).toBe(true);
    expect(hasClearedEntry(3, -1.65, 0)).toBe(false);
    expect(hasClearedEntry(3, -1.5, 0)).toBe(true);
  });
  it('detecta quedas e fugas da arena', () => {
    expect(outsideArena(0, 0, 1.2)).toBe(false);
    expect(outsideArena(2.5, 0, 1.2)).toBe(true);
    expect(outsideArena(0, 0, 0)).toBe(true);
  });
});

describe('posições depois da troca de cadeiras', () => {
  it('Claudinha lança da direita e Paty lança do fundo', () => {
    expect(throwDirection(1)).toEqual([-1, 0]);
    expect(throwDirection(2)).toEqual([0, 1]);
  });
});

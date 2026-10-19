import { describe, expect, it } from 'vitest';
import { DIE_FACE_OPPOSITES, bounceVelocity, isValidDieFace, pawnOffset } from './diceMath';

describe('dado e pinos', () => {
  it('aceita somente as seis faces do dado', () => {
    expect([1, 2, 3, 4, 5, 6].every(isValidDieFace)).toBe(true);
    expect([0, 7, 2.5, NaN].some(isValidDieFace)).toBe(false);
  });
  it('mantém os pares opostos somando sete', () => {
    for (let face = 1; face <= 6; face++) {
      expect(face + DIE_FACE_OPPOSITES[face]).toBe(7);
    }
  });
  it('reduz o impulso após cada quicada e encerra microquicadas', () => {
    expect(bounceVelocity(3)).toBeCloseTo(0.96);
    expect(bounceVelocity(0.2)).toBe(0);
  });
  it('separa quatro pinos na mesma casa', () => {
    expect(new Set([0, 1, 2, 3].map((i) => pawnOffset(i).join(','))).size).toBe(4);
  });
});

/** Coordenadas do tabuleiro: X horizontal, Z profundidade; jogador em +Z. */
export const ARENA_HALF = 1.8;
export const DIE_HALF = 0.17;
export const ENTRY_MARGIN = 0.045;
export const ENTRY_CLEARANCE = ARENA_HALF - DIE_HALF - ENTRY_MARGIN;

export type ThrowSide = 0 | 1 | 2 | 3;

/** O ponto de lançamento fica perto da mão, do lado externo da borda. */
export function throwDirection(side: ThrowSide): [number, number] {
  switch (side) {
    case 1:
      return [-1, 0]; // Claudinha, à direita: lança para -X
    case 2:
      return [0, 1]; // Paty, ao fundo: lança para +Z
    case 3:
      return [1, 0]; // Chico, à esquerda: lança para +X
    default:
      return [0, -1]; // Jogador, à frente: lança para -Z
  }
}

export function throwOrigin(side: ThrowSide): [number, number, number] {
  const [dx, dz] = throwDirection(side);
  return [-dx * 1.99, 1.53, -dz * 1.99];
}

/** Ativa a barreira somente quando TODA a caixa do dado cruzou a entrada. */
export function hasClearedEntry(side: ThrowSide, x: number, z: number) {
  switch (side) {
    case 1:
      return x < ENTRY_CLEARANCE;
    case 2:
      return z > -ENTRY_CLEARANCE;
    case 3:
      return x > -ENTRY_CLEARANCE;
    default:
      return z < ENTRY_CLEARANCE;
  }
}

export function outsideArena(x: number, z: number, y: number) {
  return Math.abs(x) > ARENA_HALF + 0.55 || Math.abs(z) > ARENA_HALF + 0.55 || y < 0.45;
}

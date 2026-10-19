/** Utilitários puros para testes e configuração do dado. */
export const DIE_FACE_OPPOSITES = [0, 6, 5, 4, 3, 2, 1] as const;
export function isValidDieFace(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}
export function bounceVelocity(incomingSpeed: number, restitution = 0.32): number {
  return incomingSpeed > 0.35 ? incomingSpeed * restitution : 0;
}
export function pawnOffset(index: number): [number, number] {
  return [index % 2 === 0 ? -0.27 : 0.05, index < 2 ? -0.05 : 0.25];
}

/** Tabuleiro experimental: 5 colunas x 6 linhas. Casas 5, 10, 15, 20, 25 e 30 na borda direita. */
export const BOARD_COLUMNS = 5;
export const BOARD_ROWS = 6;
export const TILE_STEP = 1.16;
export const BOARD_WIDTH = 7.7;
export const BOARD_DEPTH = 9.0;
export function boardGridPosition(n: number): [number, number, number] {
  if (n === 0) return [0, 0, BOARD_DEPTH / 2 - 0.5];
  const index = Math.max(0, Math.min(29, n - 1));
  const row = Math.floor(index / BOARD_COLUMNS);
  const column = index % BOARD_COLUMNS;
  return [(column - 2) * TILE_STEP, 0, (row - 2.5) * TILE_STEP];
}

/** Quatro bases idênticas, distribuídas ao redor do percurso sem sobrepor casas. */
export function startingPawnPosition(index: number): [number, number, number] {
  const edgeInset = 0.5;
  const x = BOARD_WIDTH / 2 - edgeInset;
  const z = BOARD_DEPTH / 2 - edgeInset;
  return (
    [
      [0, 0, z],
      [x, 0, 0],
      [0, 0, -z],
      [-x, 0, 0],
    ] as const
  )[index] as [number, number, number];
}
/** Base dos pinos encostada à superfície de apoio (tabuleiro ou casa). */
export function pawnFloorHeight(position: number): number {
  return position === 0 ? 0.071 + 0.065 + 0.025 / 2 : 0.14 + 0.17 / 2;
}

import { colorIndex } from './data';
export const clamp = (v: number) => Math.max(0, Math.min(30, v));
/** Casas especiais da planilha aprovada. Não encadeamos eventos. */
export const SPECIAL_SQUARES: Record<
  number,
  {
    kind: 'malefit' | 'benefit';
    destination?: number;
    skipTurns?: number;
    immunity?: boolean;
    swapLast?: boolean;
  }
> = {
  10: { kind: 'malefit', skipTurns: 1 },
  11: { kind: 'benefit', immunity: true },
  12: { kind: 'malefit', destination: 9 },
  17: { kind: 'malefit', swapLast: true },
  18: { kind: 'benefit', destination: 20 },
  19: { kind: 'malefit', destination: 13 },
  24: { kind: 'malefit', skipTurns: 2 },
  25: { kind: 'benefit', destination: 28 },
  26: { kind: 'malefit', destination: 20 },
};
export function resolveMove(position: number, die: number, correct: boolean) {
  const predicted = position + die > 30 ? position : clamp(position + die);
  // Erros mantêm a regra anterior: recuar o valor do dado.
  const moved = correct ? predicted : clamp(position - die);
  return {
    predicted,
    areaIndex: colorIndex(predicted),
    moved,
    penalty: 0,
    final: moved,
    won: correct && moved === 30,
  };
}
export function determineWinner(
  rolls: (number | null)[],
  eligible: number[],
): { winner: number | null; tied: number[] } {
  const maximum = Math.max(...eligible.map((i) => rolls[i] ?? 0));
  const tied = eligible.filter((i) => rolls[i] === maximum);
  return { winner: tied.length === 1 ? tied[0] : null, tied };
}
export function turnOrder(winner: number) {
  return [0, 1, 2, 3].map((offset) => (winner + offset) % 4);
}
export const rollDie = () => Math.floor(Math.random() * 6) + 1;

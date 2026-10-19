import { colorIndex, PENALTIES } from './data';
export const clamp = (v: number) => Math.max(0, Math.min(30, v));
export function resolveMove(position: number, die: number, correct: boolean) {
  const predicted = clamp(position + die);
  const moved = clamp(position + (correct ? die : -die));
  const penalty = PENALTIES[moved] ?? 0;
  const final = clamp(moved - penalty);
  return { predicted, areaIndex: colorIndex(predicted), moved, penalty, final, won: final === 30 };
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

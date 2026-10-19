import { describe, expect, it } from 'vitest';
import { useGame } from './store';

describe('depuração isolada', () => {
  it('força reação sem pontuar', () => {
    useGame.getState().restart();
    const before = useGame.getState().players.map((p) => ({ ...p }));
    useGame.getState().debugSimulateReaction(2, 'correct');
    expect(useGame.getState().players).toEqual(before);
    expect(useGame.getState().debugReaction?.player).toBe(2);
  });
  it('restaura estado anterior depois da vitória simulada', () => {
    useGame.getState().restart();
    const phase = useGame.getState().phase;
    useGame.getState().debugSimulateVictory(3);
    expect(useGame.getState().winner).toBe(3);
    expect(useGame.getState().phase).toBe('finished');
    useGame.getState().debugClear();
    expect(useGame.getState().winner).toBeNull();
    expect(useGame.getState().phase).toBe(phase);
  });
  it('envia o pino para sua base e restaura ao limpar', () => {
    useGame.getState().restart();
    useGame.getState().debugSimulatePenalty(2);
    expect(useGame.getState().players[2].position).toBe(0);
    useGame.getState().debugClear();
    expect(useGame.getState().debugSnapshot).toBeNull();
  });
});

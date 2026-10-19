import { describe, expect, it } from 'vitest';
import { useGame } from './store';

describe('bots equilibrados', () => {
  it('sorteia a mesma faixa de probabilidades para os três bots', () => {
    useGame.getState().startLottery();
    const probabilities = useGame.getState().botAccuracy.slice(1);
    expect(probabilities).toHaveLength(3);
    for (const chance of probabilities) {
      expect(chance).toBeGreaterThanOrEqual(0.7);
      expect(chance).toBeLessThanOrEqual(0.85);
    }
  });

  it('não altera as chances ao trocar de turno', () => {
    useGame.getState().startLottery();
    const chances = useGame.getState().botAccuracy;
    useGame.setState({ phase: 'turn', order: [0, 1, 2, 3], turnIndex: 0 });
    useGame.getState().nextTurn();
    expect(useGame.getState().botAccuracy).toEqual(chances);
  });
});

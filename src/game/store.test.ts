import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

function startHumanTurn() {
  useGame.getState().restart(true);
  useGame.setState({ phase: 'turn', order: [0, 1, 2, 3], turnIndex: 0 });
  useGame.getState().beginTurn();
}

describe('timeout do lançamento e penalidade', () => {
  beforeEach(startHumanTurn);

  it('esgota 15 segundos, bloqueia o lançamento e marca uma única punição', () => {
    for (let i = 0; i < 15; i++) useGame.getState().tickRoll();
    expect(useGame.getState()).toMatchObject({ phase: 'rollTimeout', rollSeconds: 0 });
    expect(useGame.getState().players[0].skip).toBe(true);
    useGame.getState().throwDie();
    expect(useGame.getState().phase).toBe('rollTimeout');
  });

  it('consome a punição sem abrir cronômetro e permite jogar na rodada seguinte', () => {
    for (let i = 0; i < 15; i++) useGame.getState().tickRoll();
    useGame.getState().nextTurn();
    useGame.setState({ phase: 'turn', turnIndex: 0 });
    useGame.getState().beginTurn();
    expect(useGame.getState().phase).toBe('skipped');
    expect(useGame.getState().players[0].skip).toBe(false);
    useGame.getState().nextTurn();
    useGame.setState({ phase: 'turn', turnIndex: 0 });
    useGame.getState().beginTurn();
    expect(useGame.getState().phase).toBe('turn');
    expect(useGame.getState().rollSeconds).toBe(15);
  });
});

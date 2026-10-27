import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

function correctMove(from: number, die: number, others: number[] = [0, 0, 0], immune = false) {
  useGame.getState().restart(true);
  const players = useGame.getState().players.map((player, index) => ({
    ...player,
    position: index === 0 ? from : others[index - 1],
    immune: index === 0 ? immune : player.immune,
  }));
  useGame.setState({
    players,
    order: [0, 1, 2, 3],
    turnIndex: 0,
    phase: 'feedback',
    die,
    outcome: 'correct',
  });
  useGame.getState().finishFeedback();
  return useGame.getState();
}

describe('eventos aprovados e estado dos jogadores', () => {
  beforeEach(() => useGame.getState().restart(true));

  it('casa 10 perde um turno completo', () => {
    const game = correctMove(7, 3);
    expect(game.players[0].position).toBe(10);
    expect(game.players[0].skipTurns).toBe(1);
    expect(game.message).toContain('Obstáculo: ficará 1 turno completo');
    useGame.setState({ phase: 'turn', turnIndex: 0 });
    useGame.getState().beginTurn();
    expect(useGame.getState().phase).toBe('skipped');
    expect(useGame.getState().players[0].skipTurns).toBe(0);
  });
  it('casa 24 perde dois turnos inteiros, um por vez', () => {
    correctMove(22, 2);
    expect(useGame.getState().players[0].skipTurns).toBe(2);
    for (const left of [1, 0]) {
      useGame.setState({ phase: 'turn', turnIndex: 0 });
      useGame.getState().beginTurn();
      expect(useGame.getState().phase).toBe('skipped');
      expect(useGame.getState().players[0].skipTurns).toBe(left);
    }
  });
  it('casa 11 concede somente uma imunidade', () => {
    const game = correctMove(8, 3, [0, 0, 0], true);
    expect(game.players[0]).toMatchObject({ position: 11, immune: true });
  });
  it('imunidade bloqueia o efeito inteiro da casa 24', () => {
    const game = correctMove(22, 2, [0, 0, 0], true);
    expect(game.players[0]).toMatchObject({ position: 24, immune: false, skipTurns: 0 });
  });
  it('imunidade bloqueia retorno à casa 9 e é consumida', () => {
    const game = correctMove(9, 3, [0, 0, 0], true);
    expect(game.players[0]).toMatchObject({ position: 12, immune: false });
  });
  it('casa 12 volta três casas sem disparar novo evento', () => {
    expect(correctMove(9, 3).players[0].position).toBe(9);
  });
  it('casa 18 avança para 20; casa 25 para 28', () => {
    const shortcut = correctMove(15, 3);
    expect(shortcut.players[0].position).toBe(20);
    expect(shortcut.message).toContain('Atalho: avance diretamente à casa 20');
    expect(correctMove(22, 3).players[0].position).toBe(28);
  });
  it('casas 19 e 26 retornam às casas 13 e 20', () => {
    expect(correctMove(16, 3).players[0].position).toBe(13);
    expect(correctMove(23, 3).players[0].position).toBe(20);
  });
  it('portal 17 troca com único último colocado por casa, não pontos', () => {
    const game = correctMove(14, 3, [2, 8, 10]);
    expect(game.players[0].position).toBe(2);
    expect(game.players[1].position).toBe(17);
  });
  it('portal 17 não troca caso haja empate na última posição', () => {
    const game = correctMove(14, 3, [2, 2, 10]);
    expect(game.players[0].position).toBe(17);
    expect(game.players[1].position).toBe(2);
  });
  it('portal 17 não altera posições se o jogador já for último', () => {
    const game = correctMove(14, 3, [20, 22, 25]);
    expect(game.players[0].position).toBe(17);
  });
  it('não reativa evento se ultrapassar a chegada e ficar na mesma casa', () => {
    const game = correctMove(29, 3);
    expect(game.players[0].position).toBe(29);
    expect(game.winner).toBeNull();
  });
  it('chegada exata vence após finalizar animação de movimento', () => {
    const game = correctMove(27, 3);
    expect(game.players[0].position).toBe(30);
    expect(game.winner).toBe(0);
    useGame.getState().finishMovement();
    expect(useGame.getState().phase).toBe('finished');
  });
});

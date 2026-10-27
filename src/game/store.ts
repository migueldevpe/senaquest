import { create } from 'zustand';
import { COURSES, CourseId, NAMES, QUESTION_BANK, BankQuestion, colorIndex } from './data';
import {
  determineWinner,
  resolveMove,
  turnOrder,
  SPECIAL_SQUARES,
  SPECIAL_SQUARE_DESCRIPTIONS,
} from './rules';
import { shuffledPositions, shuffleQuestion } from './quizShuffle';
export type Phase =
  | 'choose'
  | 'confirm'
  | 'intro'
  | 'lottery'
  | 'lotteryResult'
  | 'turn'
  | 'rolling'
  | 'question'
  | 'feedback'
  | 'moving'
  | 'finished'
  | 'bankEmpty'
  | 'rollTimeout'
  | 'skipped'
  | 'lotteryRolling';
type Participant = {
  position: number;
  correct: number;
  wrong: number;
  skip: boolean;
  skipTurns: number;
  immune: boolean;
};
const initialPlayers = (): Participant[] =>
  NAMES.map(() => ({
    position: 0,
    correct: 0,
    wrong: 0,
    skip: false,
    skipTurns: 0,
    immune: false,
  }));

type State = {
  phase: Phase;
  course: CourseId;
  players: Participant[];
  lotteryRolls: (number | null)[];
  eligible: number[];
  lotteryIndex: number;
  lotteryThrower: number | null;
  lotteryDie: number | null;
  lotteryNonce: number;
  starter: number | null;
  order: number[];
  turnIndex: number;
  die: number | null;
  questionIndex: number;
  activeQuestion: BankQuestion | null;
  answerPositions: number[];
  usedQuestionIds: string[];
  seconds: number;
  rollSeconds: number;
  thrower: number | null;
  throwNonce: number;
  answer: number | null;
  outcome: 'correct' | 'wrong' | 'timeout' | null;
  message: string;
  winner: number | null;
  busy: boolean;
  botAccuracy: number[];
  finishReason: string;
  movementFrom: number;
  movementTo: number;
  selectCourse: (c: CourseId) => void;
  confirmCourse: () => void;
  enterBoard: () => void;
  startLottery: () => void;
  lotteryStep: () => void;
  finishLotteryThrow: () => void;
  beginMatch: () => void;
  beginTurn: () => void;
  throwDie: () => void;
  completeThrow: () => void;
  setPhysicalDie: (value: number) => void;
  tickRoll: () => void;
  answerQuestion: (choice: number | null) => void;
  answerBot: (correct: boolean) => void;
  tick: () => void;
  finishFeedback: () => void;
  finishMovement: () => void;
  nextTurn: () => void;
  restart: (choose?: boolean) => void;
  debugReaction: { player: number; kind: 'correct' | 'wrong'; nonce: number } | null;
  debugSnapshot: {
    phase: Phase;
    winner: number | null;
    finishReason: string;
    message: string;
    players: Participant[];
  } | null;
  debugSimulateReaction: (player: number, kind: 'correct' | 'wrong') => void;
  debugSimulateVictory: (player: number) => void;
  debugSimulatePenalty: (player: number) => void;
  debugReplayVictory: () => void;
  debugVictoryNonce: number;
  debugClear: () => void;
};
export const useGame = create<State>((set, get) => ({
  phase: 'choose',
  course: 'ads',
  players: initialPlayers(),
  lotteryRolls: [null, null, null, null],
  eligible: [0, 1, 2, 3],
  lotteryIndex: 0,
  lotteryThrower: null,
  lotteryDie: null,
  lotteryNonce: 0,
  starter: null,
  order: [],
  turnIndex: 0,
  die: null,
  questionIndex: 0,
  activeQuestion: null,
  answerPositions: [],
  usedQuestionIds: [],
  seconds: 20,
  rollSeconds: 15,
  thrower: null,
  throwNonce: 0,
  answer: null,
  outcome: null,
  message: '',
  winner: null,
  busy: false,
  botAccuracy: [0, 0.78, 0.78, 0.78],
  finishReason: '',
  movementFrom: 0,
  movementTo: 0,
  debugReaction: null,
  debugVictoryNonce: 0,
  debugSnapshot: null,
  debugSimulateReaction: (player, kind) =>
    set((s) => ({ debugReaction: { player, kind, nonce: (s.debugReaction?.nonce ?? 0) + 1 } })),
  debugReplayVictory: () =>
    set((s) =>
      s.phase === 'finished' && s.winner !== null
        ? { debugVictoryNonce: s.debugVictoryNonce + 1 }
        : {},
    ),
  debugSimulateVictory: (player) =>
    set((s) => ({
      debugSnapshot: s.debugSnapshot ?? {
        phase: s.phase,
        winner: s.winner,
        finishReason: s.finishReason,
        message: s.message,
        players: s.players.map((p) => ({ ...p })),
      },
      debugVictoryNonce: s.debugVictoryNonce + 1,
      phase: 'finished',
      winner: player,
      finishReason: 'Vitória simulada (depuração)',
      message: `Vitória simulada: ${NAMES[player]}`,
      debugReaction: null,
    })),
  debugSimulatePenalty: (player) =>
    set((s) => ({
      debugSnapshot: s.debugSnapshot ?? {
        phase: s.phase,
        winner: s.winner,
        finishReason: s.finishReason,
        message: s.message,
        players: s.players.map((p) => ({ ...p })),
      },
      players: s.players.map((entry, i) => (i === player ? { ...entry, position: 0 } : entry)),
      debugReaction: null,
    })),
  debugClear: () =>
    set((s) =>
      s.debugSnapshot
        ? { ...s.debugSnapshot, debugSnapshot: null, debugReaction: null }
        : { debugReaction: null },
    ),
  selectCourse: (course) => set({ course, phase: 'confirm' }),
  confirmCourse: () => set({ phase: 'intro' }),
  enterBoard: () => set({ phase: 'choose' }),
  startLottery: () =>
    set({
      botAccuracy: [0, ...Array.from({ length: 3 }, () => 0.7 + Math.random() * 0.15)],
      phase: 'lottery',
      eligible: [0, 1, 2, 3],
      lotteryIndex: 0,
      lotteryRolls: [null, null, null, null],
      lotteryThrower: null,
      lotteryDie: null,
      message: 'Cada participante lançará o dado.',
    }),
  setPhysicalDie: (value) => {
    const s = get();
    if (s.phase === 'lotteryRolling') set({ lotteryDie: value });
    else if (s.phase === 'rolling') set({ die: value });
  },
  lotteryStep: () => {
    const s = get();
    if (s.phase !== 'lottery' || s.busy) return;
    const index = s.eligible[s.lotteryIndex];
    set({
      phase: 'lotteryRolling',
      lotteryThrower: index,
      lotteryDie: null,
      lotteryNonce: s.lotteryNonce + 1,
      message: `${NAMES[index]} está lançando o dado no sorteio...`,
    });
  },
  finishLotteryThrow: () => {
    const s = get();
    if (s.phase !== 'lotteryRolling' || s.lotteryThrower === null) return;
    if (s.lotteryDie === null) return;
    const index = s.lotteryThrower;
    const rolls = [...s.lotteryRolls];
    rolls[index] = s.lotteryDie;
    const next = s.lotteryIndex + 1;
    if (next < s.eligible.length) {
      set({
        phase: 'lottery',
        lotteryRolls: rolls,
        lotteryIndex: next,
        message: `${NAMES[index]} tirou ${rolls[index]}.`,
      });
      return;
    }
    const { winner, tied } = determineWinner(rolls, s.eligible);
    if (winner !== null) {
      set({
        lotteryRolls: rolls,
        starter: winner,
        order: turnOrder(winner),
        phase: 'lotteryResult',
        message: `${NAMES[winner]} começa a partida!`,
      });
    } else {
      set({
        lotteryRolls: rolls,
        eligible: tied,
        lotteryIndex: 0,
        phase: 'lottery',
        message: `Empate entre ${tied.map((i) => NAMES[i]).join(', ')}. Somente eles relançam!`,
      });
    }
  },
  beginMatch: () => {
    const s = get();
    if (s.phase !== 'lotteryResult') return;
    set({
      phase: 'turn',
      turnIndex: 0,
      die: null,
      message: 'O sorteio terminou. Lance novamente para jogar.',
    });
    get().beginTurn();
  },
  beginTurn: () => {
    const s = get();
    if (s.phase !== 'turn') return;
    const id = s.order[s.turnIndex];
    if (s.players[id].skip || s.players[id].skipTurns > 0) {
      const players = s.players.map((p, i) =>
        i === id ? { ...p, skip: false, skipTurns: Math.max(0, p.skipTurns - 1) } : p,
      );
      set({
        phase: 'skipped',
        players,
        message: `${NAMES[id]} está sem jogar nesta rodada.`,
        busy: true,
      });
      return;
    }
    set({
      message: id === 0 ? 'Sua vez. Lance o dado!' : `Vez de ${NAMES[id]}. Lance o dado!`,
      rollSeconds: 15,
      busy: false,
    });
  },
  throwDie: () => {
    const s = get();
    if (s.phase !== 'turn' || s.busy || s.rollSeconds <= 0) return;
    const id = s.order[s.turnIndex];
    if (s.players[id].skip || s.players[id].skipTurns > 0) return;
    set({
      phase: 'rolling',
      busy: true,
      thrower: id,
      throwNonce: s.throwNonce + 1,
      die: null,
      message: `${NAMES[id]} está lançando o dado...`,
    });
  },
  completeThrow: () => {
    const s = get();
    if (s.phase !== 'rolling' || s.die === null) return;
    const id = s.order[s.turnIndex];
    const die = s.die!;
    const predicted =
      s.players[id].position + die > 30 ? s.players[id].position : s.players[id].position + die;
    const area = colorIndex(predicted);
    const remaining = QUESTION_BANK[s.course].filter((q) => !s.usedQuestionIds.includes(q.id));
    const byArea = remaining.filter((q) => q.areaIndex === area);
    const available = byArea.length ? byArea : remaining;
    if (!available.length) {
      const scores = s.players.map((p) => p.correct * 100);
      const top = Math.max(...scores);
      const tied = scores
        .map((score, i) => ({ score, i }))
        .filter((x) => x.score === top)
        .sort((a, b) => s.players[b.i].position - s.players[a.i].position);
      const winner = tied[0].i;
      set({
        phase: 'finished',
        winner,
        finishReason: 'Perguntas inéditas esgotadas',
        message: `Fim das perguntas! ${NAMES[winner]} venceu com ${scores[winner]} pontos.`,
      });
      return;
    }
    const selected = available[Math.floor(Math.random() * available.length)];
    // Consumir a posição apenas ao iniciar uma pergunta; nunca durante o cronômetro.
    const positions = s.answerPositions.length ? [...s.answerPositions] : shuffledPositions();
    const correctPosition = positions.shift()!;
    const question = shuffleQuestion(selected, correctPosition);
    set({
      busy: false,
      die,
      questionIndex: predicted,
      activeQuestion: question,
      answerPositions: positions,
      usedQuestionIds: [...s.usedQuestionIds, question.id],
      seconds: id === 0 ? 20 : 15,
      rollSeconds: 15,
      thrower: null,
      throwNonce: 0,
      answer: null,
      outcome: null,
      phase: 'question',
      message: `${NAMES[id]} tirou ${die}. Pergunta antes de mover!`,
    });
  },
  tickRoll: () => {
    const s = get();
    if (s.phase !== 'turn' || s.order[s.turnIndex] !== 0 || s.players[0].skip) return;
    if (s.rollSeconds <= 1) {
      const players = s.players.map((p, i) => (i === 0 ? { ...p, skip: true } : p));
      set({
        players,
        phase: 'rollTimeout',
        rollSeconds: 0,
        busy: true,
        message: 'Tempo esgotado! Você perdeu esta vez e ficará uma rodada sem jogar.',
      });
    } else set({ rollSeconds: s.rollSeconds - 1 });
  },
  answerQuestion: (choice) => {
    const s = get();
    if (s.phase !== 'question' || s.outcome !== null) return;
    const id = s.order[s.turnIndex];
    if (id !== 0 && choice !== null) return;
    const q = s.activeQuestion!;
    const outcome = choice === null ? 'timeout' : choice === q.correct ? 'correct' : 'wrong';
    const players = s.players.map((p, i) =>
      i !== id
        ? p
        : {
            ...p,
            correct: p.correct + (outcome === 'correct' ? 1 : 0),
            wrong: p.wrong + (outcome === 'wrong' ? 1 : 0),
            skip: outcome === 'timeout' ? true : p.skip,
          },
    );
    set({
      players,
      answer: choice,
      outcome,
      phase: 'feedback',
      message:
        outcome === 'timeout'
          ? 'Tempo esgotado! Sem movimento; perderá a próxima rodada.'
          : outcome === 'correct'
            ? 'Resposta correta!'
            : 'Resposta incorreta!',
    });
  },
  answerBot: (correct) => {
    const s = get();
    if (s.phase !== 'question') return;
    const id = s.order[s.turnIndex];
    if (id === 0) return;
    const question = s.activeQuestion!;
    const choice = correct
      ? question.correct
      : (question.correct + 1 + Math.floor(Math.random() * 3)) % 4;
    const outcome = correct ? 'correct' : 'wrong';
    set({
      phase: 'feedback',
      outcome,
      answer: choice,
      players: s.players.map((player, index) =>
        index === id
          ? {
              ...player,
              correct: player.correct + Number(correct),
              wrong: player.wrong + Number(!correct),
            }
          : player,
      ),
      message: `${NAMES[id]} ${correct ? 'acertou' : 'errou'}!`,
    });
  },
  tick: () => {
    const s = get();
    if (s.phase !== 'question' || s.order[s.turnIndex] !== 0) return;
    if (s.seconds <= 1) {
      get().answerQuestion(null);
    } else set({ seconds: s.seconds - 1 });
  },
  finishFeedback: () => {
    const s = get();
    if (s.phase !== 'feedback') return;
    if (s.outcome === 'timeout') {
      set({ phase: 'turn', die: null });
      get().nextTurn();
      return;
    }
    const id = s.order[s.turnIndex];
    const p = s.players[id];
    const result = resolveMove(p.position, s.die!, s.outcome === 'correct');
    const correct = s.outcome === 'correct';
    // Eventos só ativam ao chegar a uma nova casa por resposta correta.
    // Se o dado ultrapassar a casa 30, o peão fica parado e não reativa a casa atual.
    const event =
      correct && result.moved !== p.position ? SPECIAL_SQUARES[result.moved] : undefined;
    const immuneBlocked = !!event && event.kind === 'malefit' && p.immune;
    const target =
      event && !immuneBlocked && event.destination !== undefined ? event.destination : result.final;
    let players = s.players.map((entry, i) =>
      i === id
        ? {
            ...entry,
            position: target,
            immune: immuneBlocked ? false : event?.immunity ? true : entry.immune,
            skipTurns:
              event && !immuneBlocked ? entry.skipTurns + (event.skipTurns ?? 0) : entry.skipTurns,
          }
        : { ...entry },
    );
    let eventMessage = event
      ? ` CASA ${result.moved} — ${SPECIAL_SQUARE_DESCRIPTIONS[result.moved]}`
      : '';
    if (event?.swapLast && !immuneBlocked) {
      const minimum = Math.min(...players.map((entry) => entry.position));
      const last = players
        .map((entry, i) => ({ i, position: entry.position }))
        .filter((entry) => entry.position === minimum);
      if (last.length === 1 && last[0].i !== id) {
        const other = last[0].i;
        players[other].position = result.moved;
        players[id].position = minimum;
        eventMessage = ` CASA 17 — Portal do azar: trocou de posição com ${NAMES[other]}.`;
      } else
        eventMessage =
          ' CASA 17 — Portal do azar: sem troca por empate na última posição ou porque você já está em último.';
    }
    if (immuneBlocked)
      eventMessage = ` CASA ${result.moved} — Imunidade consumida: malefício anulado integralmente.`;
    set({
      players,
      phase: 'moving',
      movementFrom: p.position,
      movementTo: players[id].position,
      winner: result.won ? id : null,
      message: `${NAMES[id]}: ${p.position} → ${players[id].position}.${eventMessage}`,
    });
  },
  finishMovement: () => {
    const s = get();
    if (s.phase !== 'moving') return;
    if (s.winner !== null) {
      set({
        phase: 'finished',
        finishReason: 'Chegada à casa 30',
        message: `Parabéns, ${NAMES[s.winner]} venceu!`,
      });
    } else {
      set({ phase: 'turn', die: null });
      get().nextTurn();
    }
  },
  nextTurn: () => {
    const s = get();
    if (!['turn', 'rollTimeout', 'skipped'].includes(s.phase)) return;
    set({ phase: 'turn' });
    set({ turnIndex: (s.turnIndex + 1) % 4, die: null, busy: false, rollSeconds: 15 });
    get().beginTurn();
  },
  restart: (choose = false) =>
    set({
      phase: choose ? 'choose' : 'intro',
      players: initialPlayers(),
      lotteryRolls: [null, null, null, null],
      eligible: [0, 1, 2, 3],
      lotteryIndex: 0,
      lotteryThrower: null,
      lotteryDie: null,
      lotteryNonce: 0,
      starter: null,
      order: [],
      turnIndex: 0,
      die: null,
      questionIndex: 0,
      activeQuestion: null,
      answerPositions: [],
      usedQuestionIds: [],
      seconds: 20,
      rollSeconds: 15,
      thrower: null,
      throwNonce: 0,
      answer: null,
      outcome: null,
      message: '',
      winner: null,
      busy: false,
      botAccuracy: [0, 0.78, 0.78, 0.78],
      finishReason: '',
      movementFrom: 0,
      movementTo: 0,
      debugReaction: null,
      debugSnapshot: null,
    }),
}));
export const currentPlayer = (s: State) => s.order[s.turnIndex] ?? 0;
export const currentQuestion = (s: State) =>
  s.activeQuestion ?? QUESTION_BANK[s.course][colorIndex(s.questionIndex) * 4];
export const currentArea = (s: State) => COURSES[s.course].areas[colorIndex(s.questionIndex)];

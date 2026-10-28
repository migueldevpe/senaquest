import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SmoothTimer } from './components/SmoothTimer';
import { World, xrStore, PAWN_COLORS } from './scene/World';
import { useGame, currentArea, currentPlayer, currentQuestion } from './game/store';
import { COURSES, COURSE_IDS, NAMES } from './game/data';
import './style.css';
import { StartupLoading } from './scene/StartupLoading';
import { playSound, setSoundVolume } from './game/sounds';
import {
  setBackgroundMusic,
  setBackgroundMusicDucked,
  setBackgroundMusicMuted,
  unlockBackgroundMusic,
  disposeBackgroundMusic,
  isBackgroundMusicBlocked,
  musicContextForPhase,
} from './game/backgroundMusic';
import { useDiceTuning } from './scene/diceTuning';
import { DesktopTutorial } from './scene/DesktopTutorial';
import { useTutorial } from './scene/tutorialState';
import { isTutorialComplete } from './scene/tutorialFlow';
import { isBelowMinimumViewport, MINIMUM_VIEWPORT } from './minimumViewport';

type AutoPhase =
  | 'intro'
  | 'lottery'
  | 'lotteryRolling'
  | 'lotteryResult'
  | 'rolling'
  | 'feedback'
  | 'moving'
  | 'rollTimeout'
  | 'skipped';
const AUTO_TIMES: Record<AutoPhase, number> = {
  intro: 6,
  lottery: 1.2,
  lotteryRolling: 3.2,
  lotteryResult: 5,
  rolling: 5.2,
  feedback: 7,
  moving: 4,
  rollTimeout: 3,
  skipped: 3,
};

const VICTORY_SECONDS = 45;
const HUMAN_QUESTION_SECONDS = 20;
const BOT_QUESTION_SECONDS = 15;

const SCOREBOARD_ANIMATION = {
  durationMs: 460,
  minimumMovementPx: 1,
  easing: 'cubic-bezier(.2,.8,.2,1)',
} as const;

// FLIP: anima apenas quando a classificacao muda. Nenhuma atualizacao por quadro no React.
function AnimatedScoreboard({ game }: { game: ReturnType<typeof useGame.getState> }) {
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const lastRects = useRef(new Map<number, DOMRect>());
  const previousRanking = useRef<string | null>(null);
  const running = useRef(new Map<number, Animation>());
  const ranking = [...NAMES.keys()].sort(
    (a, b) =>
      game.players[b].correct - game.players[a].correct ||
      game.players[b].position - game.players[a].position ||
      a - b,
  );
  const rankingKey = ranking.join(',');
  // Sorteio e partida consultam o mesmo jogador em destaque.
  const highlightedPlayer =
    game.phase === 'lottery'
      ? game.eligible[game.lotteryIndex]
      : game.phase === 'lotteryRolling'
        ? game.lotteryThrower
        : game.order.length === NAMES.length
          ? game.order[game.turnIndex]
          : null;

  useLayoutEffect(() => {
    const reordered = previousRanking.current !== null && previousRanking.current !== rankingKey;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextRects = new Map<number, DOMRect>();
    for (const [id, node] of rowRefs.current) {
      running.current.get(id)?.cancel();
      running.current.delete(id);
      nextRects.set(id, node.getBoundingClientRect());
    }
    if (reordered && !reduceMotion) {
      for (const [id, node] of rowRefs.current) {
        const before = lastRects.current.get(id);
        const after = nextRects.get(id);
        if (!before || !after) continue;
        const delta = before.top - after.top;
        if (Math.abs(delta) < SCOREBOARD_ANIMATION.minimumMovementPx) continue;
        const animation = node.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: SCOREBOARD_ANIMATION.durationMs, easing: SCOREBOARD_ANIMATION.easing },
        );
        running.current.set(id, animation);
        animation.addEventListener(
          'finish',
          () => {
            if (running.current.get(id) === animation) running.current.delete(id);
          },
          { once: true },
        );
      }
    }
    lastRects.current = nextRects;
    previousRanking.current = rankingKey;
  }, [rankingKey]);

  useEffect(
    () => () => {
      for (const animation of running.current.values()) animation.cancel();
      running.current.clear();
    },
    [],
  );

  return (
    <>
      <div className="score-head">
        <span>POS.</span>
        <span>JOGADOR</span>
        <span>ORDEM</span>
        <span>PTS</span>
        <span>CASA</span>
      </div>
      {ranking.map((index, rank) => (
        <div
          ref={(node) => {
            if (node) rowRefs.current.set(index, node);
            else rowRefs.current.delete(index);
          }}
          className={`score score-grid ${highlightedPlayer === index ? 'score-active' : ''}`}
          key={index}
        >
          <span className="score-position">{rank + 1}º</span>
          <span className="score-name">
            {highlightedPlayer === index ? (
              <span
                className="score-now"
                style={{ backgroundColor: PAWN_COLORS[index] }}
                title="Jogador da vez"
                aria-label="Jogador da vez"
              />
            ) : null}
            {NAMES[index]}
          </span>
          <span className="score-order">
            {game.order.length === NAMES.length ? `${game.order.indexOf(index) + 1}º` : '—'}
          </span>
          <b className="score-points">{game.players[index].correct * 100}</b>
          <span className="score-house">{game.players[index].position}/30</span>
        </div>
      ))}
    </>
  );
}

const StableWorld = memo(World);

function GameApp({
  onSceneReady,
  sceneReady,
  debugToolsReady,
}: {
  onSceneReady: () => void;
  sceneReady: boolean;
  debugToolsReady: boolean;
}) {
  const game = useGame();
  const startTutorial = useTutorial((s) => s.start);
  const offeredDesktopTutorial = useRef(false);
  useEffect(() => {
    if (!debugToolsReady || game.phase !== 'choose' || offeredDesktopTutorial.current) return;
    offeredDesktopTutorial.current = true;
    // Quest Browser opens the hand tutorial inside the headset, not behind XR.
    if (
      !/OculusBrowser|Quest/i.test(navigator.userAgent) &&
      !isTutorialComplete('desktop') &&
      !useTutorial.getState().mode
    )
      startTutorial('desktop');
  }, [debugToolsReady, game.phase, startTutorial]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(isBackgroundMusicBlocked);
  useEffect(() => {
    const onBlocked = (event: Event) => setAudioBlocked((event as CustomEvent<boolean>).detail);
    window.addEventListener('senaquest:audio-blocked', onBlocked);
    setAudioBlocked(isBackgroundMusicBlocked());
    return () => window.removeEventListener('senaquest:audio-blocked', onBlocked);
  }, []);
  const [debugPlayer, setDebugPlayer] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [soundLevel, setSoundLevel] = useState(0.35);
  const lastAudibleLevel = useRef(0.35);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setDebugOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDebugOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);
  const toggleSound = () => {
    if (soundOn) {
      if (soundLevel > 0) lastAudibleLevel.current = soundLevel;
      setSoundLevel(0);
      setSoundVolume(0);
      setBackgroundMusicMuted(true);
      setSoundOn(false);
    } else {
      const next = lastAudibleLevel.current || 0.35;
      setSoundLevel(next);
      setSoundVolume(next);
      setBackgroundMusicMuted(false);
      setSoundOn(true);
    }
  };
  const updateVolume = (next: number) => {
    setSoundLevel(next);
    setSoundVolume(next);
    setBackgroundMusicMuted(next <= 0);
    setSoundOn(next > 0);
    if (next > 0) lastAudibleLevel.current = next;
  };
  const uiClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button:not(:disabled)') && soundOn)
      playSound('select');
  };
  const uiHover = (event: React.MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest('button:not(:disabled)');
    if (button && !button.contains(event.relatedTarget as Node) && soundOn) playSound('hover');
  };
  const impulse = useDiceTuning((s) => s.impulse);
  const torque = useDiceTuning((s) => s.torque);
  const showColliders = useDiceTuning((s) => s.showColliders);
  const setImpulse = useDiceTuning((s) => s.setImpulse);
  const setTorque = useDiceTuning((s) => s.setTorque);
  const setShowColliders = useDiceTuning((s) => s.setShowColliders);
  const player = currentPlayer(game);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [victoryRemaining, setVictoryRemaining] = useState(VICTORY_SECONDS);
  const [victoryDeadline, setVictoryDeadline] = useState<number | null>(null);
  // A vitória dura no máximo 45 s; o botão existente 'Trocar curso' continua funcionando.
  useEffect(() => {
    if (game.phase !== 'finished') {
      setVictoryRemaining(VICTORY_SECONDS);
      setVictoryDeadline(null);
      return;
    }
    const deadline = performance.now() + VICTORY_SECONDS * 1000;
    setVictoryDeadline(deadline);
    const interval = window.setInterval(() => {
      setVictoryRemaining(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    }, 250);
    const timeout = window.setTimeout(() => {
      if (useGame.getState().phase === 'finished') useGame.getState().restart(true);
    }, VICTORY_SECONDS * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [game.phase]);

  // Um só controlador escolhe a trilha da fase; bots mantêm a música de gameplay.
  const musicContext = musicContextForPhase(
    sceneReady,
    game.phase,
    currentPlayer(game),
    game.winner,
  );
  useEffect(() => {
    setBackgroundMusic(musicContext);
  }, [musicContext]);
  // Encerra de forma síncrona com a troca de fase do Zustand (inclusive
  // timeout / perdeu a vez), antes mesmo do próximo render do React.
  useEffect(
    () =>
      useGame.subscribe((next, previous) => {
        if (previous.phase !== 'question' || next.phase === 'question') return;
        if (currentPlayer(previous) !== 0 || !sceneReady) return;
        setBackgroundMusic(
          next.phase === 'feedback'
            ? 'afterQuestionary'
            : next.phase === 'finished'
              ? next.winner === null
                ? null
                : 'win'
              : 'gameplay',
        );
      }),
    [sceneReady],
  );
  useEffect(() => {
    const unlock = () => unlockBackgroundMusic();
    window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    window.addEventListener('touchend', unlock, { passive: true, capture: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('keydown', unlock);
      disposeBackgroundMusic();
    };
  }, []);
  const [questionRemaining, setQuestionRemaining] = useState(HUMAN_QUESTION_SECONDS);
  const [rollRemaining, setRollRemaining] = useState(15);
  const [timerDeadline, setTimerDeadline] = useState<{
    key: string;
    deadline: number;
    duration: number;
  } | null>(null);
  const lotteryLock = useRef(false);
  const lotteryStepOnce = () => {
    if (lotteryLock.current || useGame.getState().phase !== 'lottery') return;
    lotteryLock.current = true;
    useGame.getState().lotteryStep();
  };
  useEffect(() => {
    lotteryLock.current = false;
  }, [game.phase, game.lotteryIndex, game.lotteryNonce]);
  useEffect(() => {
    if (game.phase === 'rolling') playSound('roll');
    if (game.phase === 'lotteryRolling') playSound('reveal');
    if (game.phase === 'turn') playSound('turn');
    if (game.phase === 'question') playSound('select');
    if (game.phase === 'finished') playSound('victory');
  }, [game.phase, game.outcome]);
  useEffect(() => {
    if (game.phase !== 'feedback' || (game.outcome !== 'correct' && game.outcome !== 'wrong')) {
      setBackgroundMusicDucked(false);
      return;
    }
    playSound(game.outcome);
    setBackgroundMusicDucked(true);
    const timeout = window.setTimeout(() => setBackgroundMusicDucked(false), 600);
    return () => {
      window.clearTimeout(timeout);
      setBackgroundMusicDucked(false);
    };
  }, [game.phase, game.outcome]);

  // Todas as transições são temporizadas e usam o mesmo relógio visual.
  // Cada alteração de fase cancela a transição anterior, evitando ações duplicadas.
  useEffect(() => {
    const phase = game.phase;
    if (!(phase in AUTO_TIMES)) {
      setRemaining(null);
      setTimerDeadline(null);
      return;
    }
    // O jogador tem dez segundos para lançar; após isso, o sorteio avança sozinho.
    const duration =
      phase === 'lottery'
        ? game.eligible[game.lotteryIndex] === 0
          ? 10
          : 1.2
        : phase === 'moving'
          ? Math.max(4, Math.abs(game.movementTo - game.movementFrom) * 0.3 + 1.1)
          : AUTO_TIMES[phase as AutoPhase];
    const started = performance.now();
    const deadline = started + duration * 1000;
    const clockKey = `${phase}-${game.turnIndex}-${game.lotteryIndex}-${game.lotteryNonce}-${game.throwNonce}-${game.activeQuestion?.id ?? ''}`;
    setTimerDeadline({ key: clockKey, deadline, duration });
    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    }, 1000);
    setRemaining(Math.ceil(duration));
    const timeout = window.setTimeout(
      () => {
        const state = useGame.getState();
        if (state.phase !== phase) return;
        switch (phase) {
          case 'intro':
            state.startLottery();
            break;
          case 'lottery':
            lotteryStepOnce();
            break;
          case 'lotteryRolling':
            if (state.lotteryDie !== null) state.finishLotteryThrow();
            break;
          case 'lotteryResult':
            state.beginMatch();
            break;
          case 'rolling':
            if (state.die !== null) state.completeThrow();
            break;
          case 'feedback':
            state.finishFeedback();
            break;
          case 'moving':
            state.finishMovement();
            break;
          case 'rollTimeout':
          case 'skipped':
            state.nextTurn();
            break;
        }
      },
      phase === 'rolling' || phase === 'lotteryRolling' ? 60000 : duration * 1000,
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [
    game.phase,
    game.lotteryIndex,
    game.lotteryNonce,
    game.throwNonce,
    game.turnIndex,
    game.movementFrom,
    game.movementTo,
  ]);

  useEffect(() => {
    if (game.phase !== 'lotteryRolling' && game.phase !== 'rolling') return;
    const value = game.phase === 'lotteryRolling' ? game.lotteryDie : game.die;
    if (value === null) return;
    const timeout = window.setTimeout(() => {
      const state = useGame.getState();
      if (state.phase === 'lotteryRolling' && state.lotteryDie !== null) state.finishLotteryThrow();
      else if (state.phase === 'rolling' && state.die !== null) state.completeThrow();
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [game.phase, game.lotteryDie, game.die, game.lotteryNonce, game.throwNonce]);

  useEffect(() => {
    if (game.phase !== 'turn') {
      setRollRemaining(15);
      return;
    }
    const started = performance.now();
    const duration = player === 0 ? 15 : 2.8;
    setRollRemaining(Math.ceil(duration));
    setTimerDeadline({
      key: `turn-${game.turnIndex}`,
      deadline: started + duration * 1000,
      duration,
    });
    const interval = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil(duration - (performance.now() - started) / 1000));
      setRollRemaining(seconds);
    }, 1000);
    const timeout = window.setTimeout(() => {
      const state = useGame.getState();
      if (state.phase !== 'turn') return;
      if (player === 0) {
        // Uma única transição para a punição. A próxima rodada bloqueada não abre cronômetro.
        useGame.setState({ rollSeconds: 1 });
        useGame.getState().tickRoll();
      } else {
        state.throwDie();
      }
    }, duration * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [game.phase, game.turnIndex, player]);

  useEffect(() => {
    if (game.phase !== 'question') {
      setQuestionRemaining(HUMAN_QUESTION_SECONDS);
      return;
    }
    const started = performance.now();
    const duration = player === 0 ? HUMAN_QUESTION_SECONDS : BOT_QUESTION_SECONDS;
    // Os bots respondem em cerca de 5,5–9 s; prazo máximo exibido de 15 s.
    const botDelay = 5.5 + Math.random() * 3.5;
    setQuestionRemaining(duration);
    setTimerDeadline({
      key: `question-${game.turnIndex}-${game.activeQuestion?.id ?? ''}`,
      deadline: started + duration * 1000,
      duration,
    });
    const interval = window.setInterval(() => {
      setQuestionRemaining(Math.max(0, Math.ceil(duration - (performance.now() - started) / 1000)));
    }, 1000);
    const timeout = window.setTimeout(
      () => {
        const state = useGame.getState();
        if (state.phase !== 'question') return;
        if (player === 0) state.answerQuestion(null);
        else state.answerBot(Math.random() < state.botAccuracy[player]);
      },
      (player === 0 ? HUMAN_QUESTION_SECONDS : botDelay) * 1000,
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [game.phase, game.turnIndex, game.activeQuestion?.id, player]);

  const time =
    game.phase === 'finished'
      ? victoryRemaining
      : remaining !== null
        ? remaining
        : game.phase === 'question'
          ? questionRemaining
          : game.phase === 'turn'
            ? rollRemaining
            : null;
  // Apenas a contagem numérica atualiza o React. A barra é animada pelo
  // compositor CSS, sem setState por quadro nem rerenderização da cena 3D.
  const timerDuration =
    game.phase === 'finished'
      ? VICTORY_SECONDS
      : game.phase === 'lottery'
        ? game.eligible[game.lotteryIndex] === 0
          ? 10
          : 1.2
        : game.phase === 'question'
          ? player === 0
            ? HUMAN_QUESTION_SECONDS
            : BOT_QUESTION_SECONDS
          : game.phase === 'turn'
            ? player === 0
              ? 15
              : 2.8
            : game.phase === 'moving'
              ? Math.max(4, Math.abs(game.movementTo - game.movementFrom) * 0.3 + 1.1)
              : game.phase in AUTO_TIMES
                ? AUTO_TIMES[game.phase as AutoPhase]
                : 0;
  const timerKey = `${game.phase}-${game.turnIndex}-${game.lotteryIndex}-${game.lotteryNonce}-${game.throwNonce}-${game.activeQuestion?.id ?? ''}`;
  // The VR tablet reads the exact same clock as the desktop HUD.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('senaquest:clock', {
        detail: {
          phase: game.phase,
          seconds: time,
          duration: timerDuration,
          deadline:
            game.phase === 'finished' ? (victoryDeadline ?? undefined) : timerDeadline?.deadline,
        },
      }),
    );
  }, [game.phase, time, timerDuration, timerDeadline?.deadline, victoryDeadline]);

  return (
    <div className="app" onClickCapture={uiClick} onMouseOver={uiHover}>
      <div className="world">
        <StableWorld onSceneReady={onSceneReady} showDevTools={debugToolsReady} />
      </div>
      <div className="game-top-overlay" aria-hidden="true" />
      {audioBlocked && (
        <button
          type="button"
          className="audio-unlock"
          onClick={unlockBackgroundMusic}
          aria-label="Ativar música do SENAQUEST"
        >
          <span aria-hidden="true">🔊</span> Ativar música — o navegador bloqueou o início
          automático
        </button>
      )}
      <header className="header">
        <div className="brand-lockup">
          <img className="brand-logo" src="/branding/senaquest-logo-outline.webp" alt="SenaQuest" />
          <small>Desafio dos Cursos VR</small>
        </div>
      </header>
      <div className="debug-panel" ref={menuRef}>
        <button
          type="button"
          className="settings-toggle"
          aria-label="Configurações"
          aria-haspopup="true"
          onClick={() => setDebugOpen((v) => !v)}
          aria-expanded={debugOpen}
        >
          ⚙ <span>Configurações</span>
        </button>
        {debugOpen && (
          <div className="settings-menu">
            <div className="settings-quick-actions">
              {(game.phase === 'choose' || game.phase === 'confirm') && (
                <button
                  type="button"
                  onClick={() => {
                    setDebugOpen(false);
                    startTutorial('desktop');
                  }}
                >
                  ◈ Como jogar · Tutorial
                </button>
              )}
              <button
                type="button"
                className="vr"
                onClick={() => {
                  setDebugOpen(false);
                  void xrStore.enterVR().catch((error: unknown) => {
                    console.error('[SENAQUEST] Falha ao iniciar a sessão WebXR:', error);
                    alert('VR indisponível. Use HTTPS no navegador do Meta Quest 3S.');
                  });
                }}
              >
                ◉ Entrar em VR
              </button>
              <button
                type="button"
                className="settings-mute"
                aria-pressed={!soundOn}
                aria-label={
                  soundOn ? 'Silenciar todo o áudio do site' : 'Ativar todo o áudio do site'
                }
                onClick={toggleSound}
              >
                {soundOn ? '🔊 Silenciar site' : '🔇 Ativar áudio'}
              </button>
            </div>
            <div className="settings-volume-controls">
              <label className="sound-volume-label" htmlFor="sound-volume">
                Volume dos sons <output>{Math.round(soundLevel * 100)}%</output>
              </label>
              <input
                id="sound-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundLevel}
                onChange={(event) => updateVolume(Number(event.target.value))}
                aria-label="Volume dos sons"
              />
            </div>
            <details className="debug-details">
              <summary>Depuração</summary>
              <div className="debug-body">
                <label>
                  Impulso: {impulse.toFixed(3)}{' '}
                  <input
                    aria-label="Impulso do dado"
                    type="range"
                    min="0.02"
                    max="0.12"
                    step="0.001"
                    value={impulse}
                    onChange={(e) => setImpulse(Number(e.target.value))}
                  />
                </label>
                <label>
                  Torque: {torque.toFixed(3)}{' '}
                  <input
                    aria-label="Torque do dado"
                    type="range"
                    min="0"
                    max="0.04"
                    step="0.001"
                    value={torque}
                    onChange={(e) => setTorque(Number(e.target.value))}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showColliders}
                    onChange={(e) => setShowColliders(e.target.checked)}
                  />{' '}
                  Mostrar colisores
                </label>
                <fieldset className="debug-simulations">
                  <legend>Testes de jogadores (DEV)</legend>
                  <label htmlFor="debug-player">Jogador</label>
                  <select
                    id="debug-player"
                    value={debugPlayer}
                    onChange={(e) => setDebugPlayer(Number(e.target.value))}
                  >
                    {NAMES.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => useGame.getState().debugSimulateReaction(debugPlayer, 'correct')}
                  >
                    ✓ Forçar acerto
                  </button>
                  <button
                    type="button"
                    onClick={() => useGame.getState().debugSimulateReaction(debugPlayer, 'wrong')}
                  >
                    ✕ Forçar erro
                  </button>
                  <button
                    type="button"
                    onClick={() => useGame.getState().debugSimulateVictory(debugPlayer)}
                  >
                    🏆 Forçar vitória
                  </button>
                  <button
                    type="button"
                    disabled={game.phase !== 'finished' || game.winner === null}
                    onClick={() => useGame.getState().debugReplayVictory()}
                  >
                    ↻ Repetir comemoração de vitória
                  </button>
                  <button
                    type="button"
                    onClick={() => useGame.getState().debugSimulatePenalty(debugPlayer)}
                  >
                    ↩ Testar penalidade à casa 0
                  </button>
                  <button type="button" onClick={() => useGame.getState().debugClear()}>
                    Limpar teste
                  </button>
                </fieldset>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reiniciar a partida atual?'))
                      useGame.getState().restart(false);
                  }}
                >
                  ↻ Reiniciar partida
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const state = useGame.getState();
                    switch (state.phase) {
                      case 'intro':
                        state.startLottery();
                        break;
                      case 'lottery':
                        state.lotteryStep();
                        break;
                      case 'lotteryRolling':
                        if (state.lotteryDie !== null) state.finishLotteryThrow();
                        break;
                      case 'lotteryResult':
                        state.beginMatch();
                        break;
                      case 'turn':
                        state.throwDie();
                        break;
                      case 'rolling':
                        if (state.die !== null) state.completeThrow();
                        break;
                      case 'feedback':
                        state.finishFeedback();
                        break;
                      case 'moving':
                        state.finishMovement();
                        break;
                      case 'skipped':
                      case 'rollTimeout':
                        state.nextTurn();
                        break;
                      default:
                        break;
                    }
                  }}
                >
                  ⏭ Avançar etapa
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
      <aside className="hud">
        <div className="eyebrow">CURSO</div>
        <strong>{COURSES[game.course].name}</strong>
        <div className="eyebrow scoreboard-label">PLACAR · CLASSIFICAÇÃO</div>
        <div className="score-explainer">Mais pontos primeiro; desempate pela casa alcançada.</div>
        <AnimatedScoreboard game={game} />
        <div className="score-footnote">Ordem = sequência sorteada de jogadas</div>
      </aside>
      <section
        className={`panel ${game.phase === 'question' ? 'quiz-panel' : ''} ${game.phase === 'feedback' ? 'feedback-panel' : ''}`}
      >
        {time !== null && Number.isFinite(timerDuration) && timerDuration > 0 && (
          <SmoothTimer
            timerKey={timerKey}
            duration={timerDuration}
            seconds={time}
            deadline={
              game.phase === 'finished'
                ? (victoryDeadline ?? undefined)
                : timerDeadline?.key === timerKey ||
                    (game.phase === 'turn' && timerDeadline?.key === `turn-${game.turnIndex}`) ||
                    (game.phase === 'question' &&
                      timerDeadline?.key ===
                        `question-${game.turnIndex}-${game.activeQuestion?.id ?? ''}`)
                  ? timerDeadline?.deadline
                  : undefined
            }
            caption={
              game.phase === 'question'
                ? 'Tempo para responder'
                : game.phase === 'turn'
                  ? 'Tempo para lançar'
                  : 'Avanço automático'
            }
          />
        )}
        {game.phase === 'choose' && (
          <>
            <h1>Bem-vindo ao SENAQUEST!</h1>
            <p>Escolha o curso da sua preferência.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => startTutorial('desktop')}
              style={{ marginBottom: 18 }}
            >
              ◈ Como jogar · Tutorial
            </button>
            <div className="courses">
              {COURSE_IDS.map((course) => (
                <button key={course} onClick={() => game.selectCourse(course)}>
                  {COURSES[course].name}
                </button>
              ))}
            </div>
          </>
        )}
        {game.phase === 'confirm' && (
          <>
            <h1>Confirmar curso</h1>
            <h2>{COURSES[game.course].name}</h2>
            <p>Subáreas: {COURSES[game.course].areas.join(' • ')}</p>
            <button onClick={game.confirmCourse}>Confirmar e entrar</button>
            <button className="secondary" onClick={game.enterBoard}>
              Voltar
            </button>
          </>
        )}
        {game.phase === 'intro' && (
          <>
            <h2>Vamos descobrir quem começa?</h2>
            <p>Cada participante lançará o dado. Quem tirar o maior número começa a partida.</p>
            <button onClick={game.startLottery}>Iniciar sorteio agora</button>
          </>
        )}
        {['lottery', 'lotteryRolling'].includes(game.phase) && (
          <>
            <h2>Sorteio inicial</h2>
            <p>{game.message}</p>
            <div className="rolls">
              {NAMES.map((name, index) => (
                <span
                  className={
                    game.phase === 'lottery' && game.eligible[game.lotteryIndex] === index
                      ? 'lottery-active'
                      : ''
                  }
                  key={name}
                >
                  {name}: <b>{game.lotteryRolls[index] ?? '—'}</b>
                </span>
              ))}
            </div>
            {game.phase === 'lotteryRolling' && game.lotteryDie !== null && (
              <p className="die-result-text">
                {NAMES[game.lotteryThrower ?? 0]} tirou {game.lotteryDie}!
              </p>
            )}
            {game.phase === 'lottery' && game.eligible[game.lotteryIndex] === 0 && (
              <>
                <p>Se não lançar, o jogo lança automaticamente.</p>
                <button onClick={lotteryStepOnce}>🎲 Lançar dado</button>
              </>
            )}
            {game.phase === 'lottery' && game.eligible[game.lotteryIndex] !== 0 && (
              <p>{NAMES[game.eligible[game.lotteryIndex]]} vai lançar automaticamente…</p>
            )}
          </>
        )}
        {game.phase === 'lotteryResult' && (
          <>
            <h2>{game.message}</h2>
            <p>O sorteio não movimentou os marcadores.</p>
            <button onClick={game.beginMatch}>Começar partida</button>
          </>
        )}
        {game.phase === 'turn' && (
          <>
            <h2>{player === 0 ? 'Sua vez' : `Vez de ${NAMES[player]}`}</h2>
            <p>
              {player === 0
                ? 'Você está pronto para lançar?'
                : `${NAMES[player]} está preparando o dado...`}
            </p>
            {player === 0 && (
              <button disabled={rollRemaining <= 0} onClick={game.throwDie}>
                🎲 Lançar dado
              </button>
            )}
          </>
        )}
        {game.phase === 'rolling' && (
          <>
            <h2>
              🎲 {game.die === null ? 'Dado em movimento' : `${NAMES[player]} tirou ${game.die}!`}
            </h2>
            <p>
              {game.die === null
                ? 'Aguarde a face superior estabilizar.'
                : 'Resultado confirmado pela física do dado.'}
            </p>
          </>
        )}
        {game.phase === 'question' && (
          <div className="quiz">
            <div className="quiz-top">
              <span className="quiz-area">{currentArea(game)}</span>
              <span className="quiz-destination">
                {game.questionIndex === 30
                  ? 'Se acertar, vai para → CHEGADA!'
                  : `Se acertar, avança para → CASA ${game.questionIndex}`}
              </span>
            </div>
            <h2 className="quiz-prompt">{currentQuestion(game).prompt}</h2>
            {player === 0 ? (
              <div className="kahoot-answers">
                {currentQuestion(game).options.map((option, index) => (
                  <button
                    className={`kahoot-answer answer-${index}`}
                    key={index}
                    onClick={() => game.answerQuestion(index)}
                  >
                    <span className="answer-symbol">{['▲', '◆', '●', '■'][index]}</span>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bot-thinking">
                {NAMES[player]} está analisando a pergunta. O prazo total é de 15 segundos.
              </div>
            )}
          </div>
        )}
        {game.phase === 'feedback' && (
          <div className="quiz-feedback">
            <div className={`feedback-icon ${game.outcome}`}>
              {game.outcome === 'correct' ? '✓' : game.outcome === 'wrong' ? '✕' : '⌛'}
            </div>
            <h2>{game.message}</h2>
            <p className="pedagogical-label">📚 {currentArea(game)}</p>
            <div className="answer-explanation">
              <span>RESPOSTA CORRETA</span>
              <strong>{currentQuestion(game).options[currentQuestion(game).correct]}</strong>
              <p>{currentQuestion(game).explanation}</p>
            </div>
            <button onClick={game.finishFeedback}>Entendi, continuar →</button>
          </div>
        )}
        {game.phase === 'moving' && (
          <>
            <h2>Movimentação</h2>
            <p>{game.message}</p>
            <button onClick={game.finishMovement}>Próximo turno</button>
          </>
        )}
        {game.phase === 'skipped' && (
          <>
            <h2>Rodada perdida</h2>
            <p>{game.message}</p>
          </>
        )}
        {game.phase === 'rollTimeout' && (
          <>
            <h2>Tempo esgotado!</h2>
            <p>{game.message}</p>
          </>
        )}
        {game.phase === 'bankEmpty' && (
          <>
            <h2>Banco de questões esgotado</h2>
            <p>
              Não repetiremos perguntas nesta partida. Acrescente questões novas para continuar.
            </p>
            <button onClick={() => game.restart(false)}>Reiniciar partida</button>
          </>
        )}
        {game.phase === 'finished' && (
          <>
            <h1>🏆 Classificação final</h1>
            <h2>👑 {NAMES[game.winner ?? 0]} 👑</h2>
            <p>{game.finishReason} · 🎉 Parabéns!</p>
            {[0, 1, 2, 3]
              .sort(
                (a, b) =>
                  game.players[b].correct - game.players[a].correct ||
                  game.players[b].position - game.players[a].position,
              )
              .map((index, rank) => (
                <p key={index}>
                  {rank + 1}º {NAMES[index]}: {game.players[index].correct * 100} PONTOS · CASA{' '}
                  {game.players[index].position} · {game.players[index].correct} ACERTOS ·{' '}
                  {game.players[index].wrong} ERROS
                </p>
              ))}
            <button onClick={() => game.restart(false)}>Jogar novamente</button>
            <button className="secondary" onClick={() => game.restart(true)}>
              Trocar curso
            </button>
          </>
        )}
      </section>
      <footer>
        Versão demonstrativa • Questões sujeitas à revisão pedagógica • Controles VR em
        desenvolvimento
      </footer>
      <DesktopTutorial />
    </div>
  );
}

function App() {
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [assetsReady, setAssetsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const markAssetsReady = useCallback(() => setAssetsReady(true), []);
  const markSceneReady = useCallback(() => setSceneReady(true), []);
  useEffect(() => {
    const updateViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);
  useEffect(() => {
    if (!assetsReady || sceneReady) return;
    const timeout = window.setTimeout(() => {
      setSceneError('A cena 3D não ficou pronta. Verifique se WebGL está disponível.');
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [assetsReady, sceneReady]);
  useEffect(() => {
    if (!assetsReady || !sceneReady) return;
    setSceneError(null);
    // Só inicia o fade quando a primeira imagem da cena já foi desenhada.
    const frame = requestAnimationFrame(() => setFading(true));
    return () => cancelAnimationFrame(frame);
  }, [assetsReady, sceneReady]);
  const belowMinimum = isBelowMinimumViewport(viewport.width, viewport.height);
  if (belowMinimum) {
    return (
      <main className="resolution-blocker" role="alertdialog" aria-labelledby="resolution-title">
        <section className="resolution-card">
          <img
            className="startup-logo"
            src="/branding/senaquest-logo-outline.webp"
            alt="SenaQuest"
          />
          <h1 id="resolution-title">Tela menor que a recomendada</h1>
          <p>
            O SENAQUEST precisa de mais espaço para exibir os controles e o conteúdo corretamente.
          </p>
          <p>
            Aumente a janela ou use tela cheia. A área mínima recomendada é{' '}
            <strong>
              {MINIMUM_VIEWPORT.width} × {MINIMUM_VIEWPORT.height} px
            </strong>
            ; sua janela está em{' '}
            <strong>
              {viewport.width} × {viewport.height} px
            </strong>
            .
          </p>
        </section>
      </main>
    );
  }
  return (
    <>
      {assetsReady && (
        <GameApp
          onSceneReady={markSceneReady}
          sceneReady={sceneReady}
          debugToolsReady={coverRemoved}
        />
      )}
      {!coverRemoved && (
        <StartupLoading
          onReady={markAssetsReady}
          sceneReady={sceneReady}
          sceneError={sceneError}
          fading={fading}
          onFadeEnd={() => setCoverRemoved(true)}
        />
      )}
    </>
  );
}

export default App;

import { loadPoppinsCanvas } from './poppins';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURSES, COURSE_IDS, NAMES } from '../game/data';
import { playSound } from '../game/sounds';
import { currentTutorialStep, useTutorial } from './tutorialState';
import { useThree } from '@react-three/fiber';
import { currentArea, currentPlayer, currentQuestion, useGame } from '../game/store';
import {
  TABLET,
  tabletActions,
  tabletEllipsis,
  tabletGrid,
  tabletRectToWorld,
  tabletTimerRects,
  tabletWrap,
  type Rect,
} from './tabletLayout';

const W = 1200,
  H = 740;
type Hit = { x: number; y: number; w: number; h: number; action: () => void; color: string };
type Clock = { phase: string; seconds: number | null; duration: number; deadline?: number };
const ANSWER_COLORS = ['#e84141', '#2488e8', '#e5ac21', '#24a568'] as const;
const orange = '#ff981a';
const timerRects = tabletTimerRects();
const timerWorld = tabletRectToWorld(timerRects.fill);

/** Retângulo 3D arredondado: acompanha o contorno da trilha, sem bordas quadradas.
 * O desenho é criado uma única vez e sua escala varia, sem upload de textura. */
function roundedTimerGeometry(w: number, h: number): THREE.ShapeGeometry {
  const r = Math.min(h / 2, w / 2);
  const l = -w / 2;
  const b = -h / 2;
  const right = w / 2;
  const top = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(l + r, b);
  shape.lineTo(right - r, b);
  shape.quadraticCurveTo(right, b, right, b + r);
  shape.lineTo(right, top - r);
  shape.quadraticCurveTo(right, top, right - r, top);
  shape.lineTo(l + r, top);
  shape.quadraticCurveTo(l, top, l, top - r);
  shape.lineTo(l, b + r);
  shape.quadraticCurveTo(l, b, l + r, b);
  return new THREE.ShapeGeometry(shape, 6);
}
function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function write(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size = 29,
  color = '#fff',
  bold = false,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = `${bold ? '700' : '500'} ${size}px Poppins, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
/** Centraliza o contorno visível do símbolo (✓/×), e não a largura abstrata
 * do caractere, que varia muito entre fontes/visores WebXR. */
function centeredFeedbackGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  centerX: number,
  centerY: number,
  color: string,
) {
  ctx.save();
  ctx.font = '700 72px Poppins, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(glyph);
  const horizontalOffset = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2;
  const verticalOffset = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  ctx.fillText(glyph, centerX - horizontalOffset, centerY + verticalOffset);
  ctx.restore();
}

function lines(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  max: number,
  size = 27,
  color = '#fff',
  bold = false,
  align: CanvasTextAlign = 'left',
  maxLines = 5,
) {
  ctx.font = `${bold ? '700' : '500'} ${size}px Poppins, sans-serif`;
  const measure = (value: string) => ctx.measureText(value).width;
  const wrapped = tabletWrap(s, measure, max);
  const visible = wrapped.slice(0, maxLines);
  if (wrapped.length > maxLines) {
    const last = visible.length - 1;
    visible[last] = tabletEllipsis(`${visible[last]}…`, measure, max);
  }
  const lineHeight = size * 1.35;
  visible.forEach((value, i) => {
    const yy =
      y + (align === 'center' ? (i - (visible.length - 1) / 2) * lineHeight : i * lineHeight);
    write(ctx, tabletEllipsis(value, measure, max), x, yy, size, color, bold, align);
  });
  return visible.length;
}

export function VRTabletScreen() {
  const game = useGame();
  const { gl } = useThree();
  const tutorialMode = useTutorial((s) => s.mode);
  const tutorialIndex = useTutorial((s) => s.index);
  const trainingTablet =
    tutorialMode === 'vr' && currentTutorialStep('vr', tutorialIndex) === 'tablet';
  const [trainingError, setTrainingError] = useState(false);
  useEffect(() => setTrainingError(false), [tutorialMode, tutorialIndex]);
  const [page, setPage] = useState(0);
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadPoppinsCanvas()
      .then(() => {
        if (alive) setFontReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => setPage(0), [game.phase, game.questionIndex]);
  const lastActivation = useRef(0);
  const [hovered, setHovered] = useState(-1);
  const hoverOwner = useRef<number | null>(null);
  const lastHoverAt = useRef(0);
  const pointerLastSeen = useRef(0);
  const clockRef = useRef<Clock>({ phase: '', seconds: null, duration: 0 });
  const timerBar = useRef<THREE.Mesh>(null);
  const timerGeometry = useMemo(() => roundedTimerGeometry(timerWorld.w, timerWorld.h), []);
  useEffect(() => () => timerGeometry.dispose(), [timerGeometry]);
  const [pressed, setPressed] = useState(-1);
  const pressStartedAt = useRef(0);
  const [clock, setClock] = useState<Clock>({ phase: '', seconds: null, duration: 0 });
  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<Clock>).detail;
      clockRef.current = next;
      setClock(next);
    };
    window.addEventListener('senaquest:clock', handler);
    return () => window.removeEventListener('senaquest:clock', handler);
  }, []);
  const hoveredRef = useRef(-1);
  const pressedRef = useRef(-1);
  const setHover = (index: number) => {
    if (hoveredRef.current === index) return;
    if (index >= 0 && performance.now() - lastHoverAt.current > 180) {
      playSound('hover');
      lastHoverAt.current = performance.now();
    }
    hoveredRef.current = index;
    setHovered(index);
  };
  const setPress = (index: number) => {
    if (pressedRef.current === index) return;
    pressedRef.current = index;
    pressStartedAt.current = index >= 0 ? performance.now() : 0;
    setPressed(index);
  };

  // O canvas e a textura GPU persistem por toda a vida do tablet.
  // O redesenho ocorre apenas quando a fase, os dados, o relógio ou o hover mudam.
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, []);
  // Persist hit regions with the texture: a new render must not erase them.
  const hitsRef = useRef<Hit[]>([]);
  useLayoutEffect(() => {
    const ctx = surface.canvas.getContext('2d');
    if (!ctx) return;
    const hits: Hit[] = [];
    const C = {
      surface: '#103f69',
      card: '#20577e',
      cardDark: '#18496e',
      inset: '#285e80',
      secondary: '#2879be',
      cream: '#fff',
      muted: '#c4d8e8',
      accent: '#ffb05a',
      divider: '#5882a0',
    };
    const M = TABLET;
    const right = M.width - M.inset;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(24, 18, W - 48, H - 36);
    ctx.clip();

    const text = (
      value: string,
      x: number,
      y: number,
      size = 27,
      color = C.cream,
      bold = false,
      align: CanvasTextAlign = 'left',
    ) => write(ctx, value, x, y, size, color, bold, align);
    const paragraph = (
      value: string,
      x: number,
      y: number,
      w: number,
      size = 27,
      color = C.cream,
      bold = false,
      align: CanvasTextAlign = 'left',
      maxLines = 3,
    ) => lines(ctx, value, x, y, w, size, color, bold, align, maxLines);
    const panel = (rect: Rect, fill = C.card, outline?: string, radius = 16) =>
      round(ctx, rect.x, rect.y, rect.w, rect.h, radius, fill, outline);
    const rule = (y: number) => {
      ctx.strokeStyle = C.divider;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(M.inset, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    };
    const sectionTitle = (value: string, y: number = M.header.titleY, size: number = 36) =>
      paragraph(value, M.inset, y, M.width - 2 * M.inset, size, C.accent, true, 'left', 2);
    const sectionMessage = (value: string, y: number = M.header.messageY, size: number = 27) =>
      paragraph(value, M.inset, y, M.width - 2 * M.inset, size, C.cream, false, 'left', 2);

    const button = (
      label: string,
      rect: Rect,
      action: () => void,
      primary = true,
      fontSize = 26,
      override?: string,
    ) => {
      const index = hits.length;
      const base = override ?? (primary ? orange : C.secondary);
      const baseColor = new THREE.Color(base);
      const selected = hovered === index;
      const active = pressed === index;
      const face = selected
        ? baseColor
            .clone()
            .lerp(new THREE.Color('#ffffff'), active ? 0.12 : 0.16)
            .getStyle()
        : active
          ? baseColor.clone().multiplyScalar(0.7).getStyle()
          : base;
      panel({ ...rect, y: rect.y + 5 }, baseColor.clone().multiplyScalar(0.55).getStyle());
      panel(
        { ...rect, y: rect.y + (active ? 4 : selected ? -2 : 0), h: rect.h - (active ? 4 : 0) },
        face,
        selected ? '#fff' : baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.27).getStyle(),
      );
      // Clipping individual: uma opção longa nunca invade outra opção.
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x + 12, rect.y + 2, rect.w - 24, rect.h - 4);
      ctx.clip();
      paragraph(
        label,
        rect.x + rect.w / 2,
        rect.y + rect.h / 2 + (active ? 3 : 0),
        rect.w - 34,
        fontSize,
        override ? C.cream : primary ? '#09243b' : C.cream,
        true,
        'center',
        3,
      );
      ctx.restore();
      hits.push({ ...rect, action, color: base });
    };
    const actionRow = (
      items: { label: string; action: () => void; primary?: boolean; width: number }[],
      y: number = M.footer.y,
      height: number = M.footer.h,
    ) => {
      tabletActions(
        items.map((item) => item.width),
        y,
        height,
      ).forEach((rect, i) => {
        button(items[i].label, rect, items[i].action, items[i].primary !== false);
      });
    };
    const timer = (label: string) => {
      panel(M.timer, C.inset);
      text(
        `◷ ${label}`,
        M.timer.x + M.timerText.inset,
        M.timer.y + M.timerText.centerY,
        23,
        C.cream,
        true,
      );
      if (clock.phase === game.phase && clock.seconds !== null)
        text(
          `${Math.max(0, Math.ceil(clock.seconds))} s`,
          M.timer.x + M.timer.w - M.timerText.inset,
          M.timer.y + M.timerText.centerY,
          31,
          C.accent,
          true,
          'right',
        );
      panel(timerRects.background, '#46748f', undefined, M.timerTrack.radius);
      // A barra alaranjada é uma geometria separada, animada sem upload de textura.
    };
    const scores = (values: (number | null)[], activePlayer: number | undefined) => {
      const cells = tabletGrid(2, NAMES.length, M.inset, 351, M.width - M.inset * 2, 82, M.gap, 18);
      cells.forEach((rect, i) => {
        panel(rect, C.card, i === activePlayer ? orange : undefined, 13);
        text(NAMES[i], rect.x + 22, rect.y + rect.h / 2, 25, C.cream, true);
        text(
          values[i] === null ? '—' : String(values[i]),
          rect.x + rect.w - 22,
          rect.y + rect.h / 2,
          28,
          i === activePlayer ? C.accent : C.cream,
          true,
          'right',
        );
      });
    };
    const footerInfo = (value: string) => {
      panel({ x: M.inset, y: 590, w: M.width - M.inset * 2, h: 92 }, C.cardDark);
      paragraph(value, 600, 636, 1010, 25, C.muted, false, 'center', 2);
    };

    const phase = game.phase;
    if ((phase === 'choose' || phase === 'confirm') && tutorialMode !== 'vr') {
      button(
        '◈ Tutorial VR',
        { x: 949, y: 42, w: 207, h: 56 },
        () => {
          if (gl.xr.isPresenting) useTutorial.getState().start('vr');
        },
        false,
        20,
      );
    }
    const current = currentPlayer(game);
    const human = current === 0;
    const question = phase === 'question' || phase === 'feedback' ? currentQuestion(game) : null;
    if (trainingTablet) {
      sectionTitle('Treinamento · Tablet VR', 105, 43);
      sectionMessage('Qual é a última casa do tabuleiro?', 185, 31);
      panel({ x: M.inset, y: 256, w: M.width - M.inset * 2, h: 99 }, C.cardDark);
      text(
        'Esta é uma pergunta de demonstração. Não altera a partida.',
        600,
        305,
        24,
        C.muted,
        false,
        'center',
      );
      const options = ['A) 10', 'B) 30', 'C) 20', 'D) 40'];
      const cells = tabletGrid(
        2,
        options.length,
        M.inset,
        399,
        M.width - M.inset * 2,
        93,
        M.gap,
        22,
      );
      options.forEach((option, i) =>
        button(
          option,
          cells[i],
          () => {
            if (i === 1) useTutorial.getState().next();
            else setTrainingError(true);
          },
          true,
          26,
          ANSWER_COLORS[i],
        ),
      );
      if (trainingError) {
        panel({ x: M.inset, y: 626, w: M.width - M.inset * 2, h: 62 }, C.cardDark);
        text('Tente novamente: a última casa é a 30.', 600, 657, 24, C.accent, true, 'center');
      }
    } else if (phase === 'choose') {
      sectionTitle('Bem-vindo ao SENAQUEST!', 96, 44);
      sectionMessage('Escolha o curso da sua preferência.', 170, 30);
      const cells = tabletGrid(
        2,
        COURSE_IDS.length,
        M.inset,
        245,
        M.width - 2 * M.inset,
        132,
        M.gap,
        26,
      );
      COURSE_IDS.forEach((id, i) =>
        button(COURSES[id].name, cells[i], () => game.selectCourse(id), true, 27),
      );
    } else if (phase === 'confirm') {
      sectionTitle('Confirmar curso', 105, 43);
      sectionTitle(COURSES[game.course].name, 197, 36);
      rule(253);
      panel({ x: M.inset, y: 281, w: M.width - M.inset * 2, h: 235 }, C.cardDark);
      paragraph(
        COURSES[game.course].areas.join('  •  '),
        M.inset + 28,
        328,
        M.width - M.inset * 2 - 56,
        29,
        C.cream,
        false,
        'left',
        4,
      );
      actionRow([
        { label: 'Confirmar e entrar', action: game.confirmCourse, width: 548 },
        { label: 'Voltar', action: game.enterBoard, primary: false, width: 548 },
      ]);
    } else if (phase === 'intro') {
      timer('Avanço automático');
      sectionTitle('Vamos descobrir quem começa?');
      sectionMessage(
        'Cada participante lançará o dado. Quem tirar o maior número começa a partida.',
      );
      actionRow([{ label: 'Iniciar sorteio agora', action: game.startLottery, width: 560 }]);
    } else if (phase === 'lottery' || phase === 'lotteryRolling') {
      timer('Avanço automático');
      sectionTitle('Sorteio inicial');
      sectionMessage(game.message || 'Cada participante lançará o dado.');
      scores(
        NAMES.map((_, i) => game.lotteryRolls[i] ?? null),
        game.eligible[game.lotteryIndex],
      );
      if (phase === 'lottery' && game.eligible[game.lotteryIndex] === 0)
        actionRow([{ label: '🎲 Lançar dado', action: game.lotteryStep, width: 480 }], 585, 88);
    } else if (phase === 'lotteryResult') {
      timer('Avanço automático');
      sectionTitle(game.message || 'Sorteio concluído');
      sectionMessage('O sorteio não movimentou os marcadores.');
      actionRow([{ label: 'Começar partida', action: game.beginMatch, width: 500 }]);
    } else if (phase === 'turn') {
      timer('Avanço automático');
      sectionTitle(human ? 'Sua vez!' : `Vez de ${NAMES[current]}`);
      sectionMessage(
        human
          ? 'Prepare-se para lançar o dado.'
          : `${NAMES[current]} está preparando o lançamento.`,
      );
      if (human) actionRow([{ label: '🎲 Lançar dado', action: game.throwDie, width: 500 }]);
    } else if (phase === 'question' && question) {
      timer('Tempo para responder');
      const category = currentArea(game);
      ctx.font = '700 23px Poppins, sans-serif';
      const badgeWidth = Math.min(780, Math.max(230, ctx.measureText(category).width + 54));
      panel({ x: M.inset, y: 160, w: badgeWidth, h: 49 }, orange, undefined, 23);
      paragraph(
        category,
        M.inset + badgeWidth / 2,
        185,
        badgeWidth - 28,
        22,
        '#09243b',
        true,
        'center',
        1,
      );
      text(`CASA ${game.questionIndex}`, right, 185, 24, C.cream, true, 'right');
      rule(227);
      const questionRect = { x: M.inset, y: 246, w: M.width - M.inset * 2, h: 222 };
      panel(questionRect, C.cardDark);
      ctx.font = '700 32px Poppins, sans-serif';
      const wrapped = tabletWrap(
        question.prompt,
        (value) => ctx.measureText(value).width,
        questionRect.w - 64,
      );
      const chunk = 3;
      const pageCount = Math.max(1, Math.ceil(wrapped.length / chunk));
      const visiblePage = Math.min(page, pageCount - 1);
      const shown = wrapped.slice(visiblePage * chunk, (visiblePage + 1) * chunk).join(' ');
      paragraph(
        shown,
        600,
        pageCount > 1 ? 333 : 357,
        questionRect.w - 70,
        32,
        C.cream,
        true,
        'center',
        chunk,
      );
      if (pageCount > 1)
        button(
          `Enunciado ${visiblePage + 1}/${pageCount} · Próximo`,
          { x: 417, y: 416, w: 366, h: 41 },
          () => setPage((v) => (v + 1) % pageCount),
          false,
          18,
        );
      if (human) {
        const cells = tabletGrid(2, 4, M.inset, 500, M.width - M.inset * 2, 82, M.gap, 18);
        question.options.forEach((option, i) =>
          button(
            `${['▲', '◆', '●', '■'][i]}  ${option}`,
            cells[i],
            () => game.answerQuestion(i),
            true,
            option.length > 66 ? 20 : 23,
            ANSWER_COLORS[i],
          ),
        );
      } else {
        footerInfo(`${NAMES[current]} está analisando a pergunta.`);
      }
    } else if (phase === 'feedback') {
      timer('Avanço automático');
      const good = game.outcome === 'correct';
      panel({ x: 549, y: 157, w: 102, h: 100 }, good ? '#0e9d75' : '#b9554a', undefined, 51);
      centeredFeedbackGlyph(ctx, good ? '✓' : '×', 600, 207, C.cream);
      paragraph(game.message, 600, 318, 1040, 29, C.cream, true, 'center', 2);
      if (question) {
        panel({ x: M.inset, y: 381, w: M.width - M.inset * 2, h: 190 }, C.card);
        text('RESPOSTA CORRETA', M.inset + 25, 408, 23, C.accent, true);
        paragraph(
          question.options[question.correct],
          M.inset + 25,
          448,
          M.width - M.inset * 2 - 50,
          27,
          C.cream,
          true,
          'left',
          2,
        );
        paragraph(
          question.explanation,
          M.inset + 25,
          518,
          M.width - M.inset * 2 - 50,
          21,
          C.muted,
          false,
          'left',
          2,
        );
      }
      actionRow(
        [{ label: 'Entendi, continuar →', action: game.finishFeedback, width: 505 }],
        592,
        84,
      );
    } else if (phase === 'moving') {
      timer('Avanço automático');
      // O evento precisa ser explicado, não apenas receber o título genérico
      // 'EVENTO DA CASA X'. O mesmo texto detalhado é usado no Desktop.
      const special = /CASA (\d+) —/.exec(game.message);
      sectionTitle(special ? `Evento especial · Casa ${special[1]}` : 'Movimentação');
      panel({ x: M.inset, y: 292, w: M.width - M.inset * 2, h: 264 }, C.cardDark);
      paragraph(
        game.message,
        M.width / 2,
        413,
        M.width - 2 * M.inset - 72,
        29,
        C.cream,
        true,
        'center',
        5,
      );
    } else if (phase === 'finished' || phase === 'bankEmpty') {
      if (phase === 'finished') timer('Avanço automático');
      sectionTitle(phase === 'finished' ? '🏆 Classificação final' : 'Banco de questões esgotado');
      sectionMessage(
        phase === 'finished' ? `${NAMES[game.winner ?? 0]} venceu!` : game.message,
        270,
        33,
      );
      actionRow([
        { label: 'Jogar novamente', action: () => game.restart(false), width: 548 },
        { label: 'Trocar curso', action: () => game.restart(true), primary: false, width: 548 },
      ]);
    } else {
      timer('Avanço automático');
      sectionTitle(phase === 'rolling' ? '🎲 Dado em movimento' : game.message || 'Aguarde...');
      sectionMessage(game.message || 'Aguarde a próxima etapa.');
    }
    ctx.restore();
    hitsRef.current = hits;
    surface.texture.needsUpdate = true;
  }, [
    surface,
    game,
    page,
    hovered,
    pressed,
    clock,
    fontReady,
    gl,
    tutorialMode,
    tutorialIndex,
    trainingTablet,
    trainingError,
  ]);
  const texture = surface.texture;
  useEffect(() => () => surface.texture.dispose(), [surface]);
  // Animate the actual geometry each frame, not a CanvasTexture upload.
  // Both eyes in WebXR see the same bar, and the deadline is shared with desktop.
  useFrame(() => {
    // WebXR hand pinches sometimes emit pointerdown without pointerup. A stale
    // pressed state previously overrode the full-face hover with a dark fill.
    if (pressedRef.current >= 0 && performance.now() - pressStartedAt.current > 180) {
      setPress(-1);
    }
    const bar = timerBar.current;
    if (!bar) return;
    const c = clockRef.current;
    const valid = c.phase === game.phase && c.duration > 0 && c.seconds !== null;
    const remaining = valid
      ? c.deadline !== undefined
        ? (c.deadline - performance.now()) / 1000
        : c.seconds!
      : 0;
    const fraction = valid ? Math.max(0, Math.min(1, remaining / c.duration)) : 0;
    bar.scale.x = Math.max(0.0001, fraction);
    // Âncora exata na borda esquerda da área interna da trilha.
    // As coordenadas são convertidas dos mesmos pixels do Canvas, sem offsets mágicos.
    bar.position.x = timerWorld.x - (timerWorld.w / 2) * (1 - fraction);
    bar.visible = valid && fraction > 0;
  });
  if (!texture) return null;
  // XR ray pointers may emit pointerdown/select without a conventional mouse click.
  // Accept either event, but never activate a button twice for one selection.
  const hitIndex = (uv?: THREE.Vector2) => {
    if (!uv) return -1;
    const x = uv.x * W,
      y = (1 - uv.y) * H;
    return hitsRef.current.findIndex(
      (h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h,
    );
  };
  const activate = (e: { stopPropagation: () => void; uv?: THREE.Vector2; pointerId?: number }) => {
    e.stopPropagation();
    // O tablet real nunca deve receber comandos durante exercícios demonstrativos.
    if (
      useTutorial.getState().mode === 'vr' &&
      currentTutorialStep('vr', useTutorial.getState().index) !== 'tablet'
    )
      return;
    if (!e.uv) return;
    if (
      hoverOwner.current !== null &&
      e.pointerId !== undefined &&
      hoverOwner.current !== e.pointerId
    )
      return;
    const hit = hitsRef.current[hitIndex(e.uv)];
    if (!hit) return;
    const now = performance.now();
    if (now - lastActivation.current < 350) return;
    lastActivation.current = now;
    playSound('select');
    // Release visual press immediately; a VR select event may have no pointerup.
    setPress(-1);
    hit.action();
  };
  const onAim = (e: { stopPropagation: () => void; pointerId: number; uv?: THREE.Vector2 }) => {
    e.stopPropagation();
    // First controller owns the focus. The other can take over after exit.
    const now = performance.now();
    if (hoverOwner.current !== null && now - pointerLastSeen.current > 220) {
      hoverOwner.current = null;
      setHover(-1);
      setPress(-1);
    }
    if (hoverOwner.current === null && hitIndex(e.uv) >= 0) hoverOwner.current = e.pointerId;
    if (hoverOwner.current === e.pointerId) {
      pointerLastSeen.current = now;
      const index = hitIndex(e.uv);
      setHover(index);
      if (index < 0) {
        hoverOwner.current = null;
        setPress(-1);
      }
    }
  };
  const onExit = (e: { pointerId: number }) => {
    if (hoverOwner.current === e.pointerId) {
      hoverOwner.current = null;
      setHover(-1);
      setPress(-1);
    }
  };
  return (
    <group position={[0, 0, -0.025]}>
      <mesh
        position={[0, 0, 0.052]}
        renderOrder={15}
        onPointerOver={onAim}
        onPointerMove={onAim}
        onPointerOut={onExit}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (hoverOwner.current === null) hoverOwner.current = e.pointerId;
          if (hoverOwner.current !== e.pointerId) return;
          setHover(hitIndex(e.uv));
          setPress(hitIndex(e.uv));
          activate(e);
        }}
        onPointerUp={(e) => {
          if (hoverOwner.current === e.pointerId) setPress(-1);
        }}
        onClick={activate}
      >
        <planeGeometry args={[1.18, 0.7]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.FrontSide} />
      </mesh>
      <mesh
        ref={timerBar}
        position={[timerWorld.x, timerWorld.y, 0.063]}
        renderOrder={16}
        raycast={() => null}
      >
        <primitive attach="geometry" object={timerGeometry} />
        <meshBasicMaterial
          color={orange}
          toneMapped={false}
          depthTest={true}
          depthWrite={true}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}

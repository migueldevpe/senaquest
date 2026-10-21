import { loadPoppinsCanvas } from './poppins';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURSES, COURSE_IDS, NAMES } from '../game/data';
import { playSound } from '../game/sounds';
import { currentPlayer, currentQuestion, useGame } from '../game/store';

const W = 1200,
  H = 740;
type Hit = { x: number; y: number; w: number; h: number; action: () => void; color: string };
type Clock = { phase: string; seconds: number | null; duration: number; deadline?: number };
const ANSWER_COLORS = ['#e84141', '#2488e8', '#e5ac21', '#24a568'] as const;
const orange = '#ff981a';
const navy = '#103f69';
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
  const words = s.split(/\s+/);
  let line = '',
    list: string[] = [];
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      list.push(line);
      line = word;
    } else line = next;
  }
  if (line) list.push(line);
  const shown = list.slice(0, maxLines).map((value, i) => {
    if (i !== maxLines - 1 || list.length <= maxLines) return value;
    while (value.length > 1 && ctx.measureText(value + '…').width > max) value = value.slice(0, -1);
    return value + '…';
  });
  shown.forEach((v, i) =>
    write(
      ctx,
      v,
      x,
      y + (align === 'center' ? i - (shown.length - 1) / 2 : i) * (size * 1.32),
      size,
      color,
      bold,
      align,
    ),
  );
}
export function VRTabletScreen() {
  const game = useGame();
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

  // Persist hit regions with the texture: a new render must not erase them.
  const hitsRef = useRef<Hit[]>([]);
  const texture = useMemo(() => {
    const hits: Hit[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = navy;
    ctx.fillRect(0, 0, W, H);
    const button = (
      label: string,
      x: number,
      y: number,
      w: number,
      h: number,
      action: () => void,
      primary = true,
      size = 27,
      override?: string,
    ) => {
      const index = hits.length;
      const base = override ?? (primary ? orange : '#2879be');
      const selected = hovered === index;
      const active = pressed === index;
      // All clickable controls share the same hover/press feedback,
      // including colored quiz answers and secondary actions.
      const baseColor = new THREE.Color(base);
      // The whole face must brighten, not only its outline (lottery/feedback/start).
      const face = selected
        ? baseColor
            .clone()
            .lerp(new THREE.Color('#ffffff'), active ? 0.12 : 0.16)
            .getStyle()
        : active
          ? baseColor.clone().multiplyScalar(0.7).getStyle()
          : base;
      round(ctx, x, y + 6, w, h, 16, baseColor.clone().multiplyScalar(0.55).getStyle());
      round(
        ctx,
        x,
        y + (active ? 4 : selected ? -2 : 0),
        w,
        h - (active ? 4 : 0),
        16,
        face,
        selected ? '#ffffff' : baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.27).getStyle(),
      );
      // A borda já é desenhada em round(); evitar contorno duplicado e desproporcional.

      lines(
        ctx,
        label,
        x + w / 2,
        y + h / 2 + (active ? 3 : 0),
        w - 30,
        size,
        override ? '#ffffff' : primary ? '#09243b' : '#fff',
        true,
        'center',
        2,
      );
      hits.push({ x, y, w, h, action, color: base });
    };
    const timer = (label: string) => {
      round(ctx, 32, 25, 1136, 108, 16, '#235679');
      write(ctx, `◷ ${label}`, 53, 57, 22, '#fff', true);
      if (clock.phase === game.phase && clock.seconds !== null)
        write(
          ctx,
          `${Math.max(0, Math.ceil(clock.seconds))} s`,
          1139,
          57,
          34,
          '#ffb05a',
          true,
          'right',
        );
      round(ctx, 52, 101, 1096, 12, 7, '#46748f');
      // The orange fill is drawn on a separate, frequently updated texture.
      // The static interface canvas is only regenerated when its contents change.
    };
    // Canvas flex-like layout: all screens use the same inset, gaps and rows.
    const UI = {
      inset: 42,
      width: 1116,
      gap: 20,
      smallGap: 10,
      timerBottom: 133,
      headingTop: 170,
      bodyTop: 242,
      actionsBottom: 698,
    } as const;
    const row = (
      x: number,
      y: number,
      width: number,
      items: { width: number; draw: (x: number) => void }[],
    ) => {
      // Equivalent to justify-content: space-between.
      const occupied = items.reduce((total, item) => total + item.width, 0);
      const space = items.length > 1 ? (width - occupied) / (items.length - 1) : 0;
      let cursor = x;
      items.forEach((item) => {
        item.draw(cursor);
        cursor += item.width + space;
      });
      void y;
    };
    const heading = (title: string, y: number = UI.headingTop) =>
      lines(ctx, title, UI.inset, y, UI.width, 36, '#ffb05a', true, 'left', 2);
    const message = (value: string, y: number = UI.bodyTop, size: number = 27) =>
      lines(ctx, value, UI.inset, y, UI.width, size, '#fff', false, 'left', 3);
    const actions = (
      buttons: { label: string; action: () => void; primary?: boolean; width: number }[],
      y = 570,
    ) => {
      const left = buttons.length === 1 ? UI.inset : UI.inset;
      row(
        left,
        y,
        UI.width,
        buttons.map((b) => ({
          width: b.width,
          draw: (x) => button(b.label, x, y, b.width, 100, b.action, b.primary !== false, 26),
        })),
      );
    };
    const card = (x: number, y: number, w: number, h: number, text: string, outlined = false) => {
      round(ctx, x, y, w, h, 14, '#215c84', outlined ? orange : undefined);
      lines(ctx, text, x + 20, y + h / 2, w - 40, 25, '#fff', false, 'left', 2);
    };
    // Clip all dynamically composed text and controls to the physical display.
    // Clip every screen state to the display, leaving the bezel untouched.
    ctx.save();
    ctx.beginPath();
    ctx.rect(24, 18, W - 48, H - 36);
    ctx.clip();
    const phase = game.phase;
    const p = currentPlayer(game),
      human = p === 0;
    const question = phase === 'question' || phase === 'feedback' ? currentQuestion(game) : null;
    if (phase === 'choose') {
      write(ctx, 'Bem-vindo ao SENAQUEST!', UI.inset, 88, 44, '#fff', true);
      message('Escolha o curso da sua preferência.', 151, 28);
      COURSE_IDS.forEach((id, i) => {
        const x = UI.inset + (i % 2) * 568;
        const y = 206 + Math.floor(i / 2) * 154;
        button(COURSES[id].name, x, y, 548, 122, () => game.selectCourse(id), true, 24);
      });
    } else if (phase === 'confirm') {
      write(ctx, 'Confirmar curso', UI.inset, 88, 45, '#fff', true);
      lines(
        ctx,
        COURSES[game.course].name,
        UI.inset,
        183,
        UI.width,
        39,
        '#ffb05a',
        true,
        'left',
        2,
      );
      lines(
        ctx,
        COURSES[game.course].areas.join(' • '),
        UI.inset,
        325,
        UI.width,
        27,
        '#fff',
        false,
        'left',
        4,
      );
      actions(
        [
          { label: 'Confirmar e entrar', action: game.confirmCourse, width: 548 },
          { label: 'Voltar', action: game.enterBoard, primary: false, width: 548 },
        ],
        566,
      );
    } else if (phase === 'intro') {
      timer('Avanço automático');
      heading('Vamos descobrir quem começa?');
      message('Cada participante lançará o dado. Quem tirar o maior número começa a partida.');
      actions([{ label: 'Iniciar sorteio agora', action: game.startLottery, width: 548 }], 565);
    } else if (phase === 'lottery' || phase === 'lotteryRolling') {
      timer('Avanço automático');
      heading('Sorteio inicial');
      message(game.message || 'Cada participante lançará o dado.', 246);
      NAMES.forEach((name, i) => {
        const x = UI.inset + (i % 2) * 568;
        const y = 348 + Math.floor(i / 2) * 100;
        card(
          x,
          y,
          548,
          82,
          `${name}: ${game.lotteryRolls[i] ?? '—'}`,
          game.eligible[game.lotteryIndex] === i,
        );
      });
      if (phase === 'lottery' && game.eligible[game.lotteryIndex] === 0)
        actions([{ label: '🎲 Lançar dado', action: game.lotteryStep, width: 420 }], 585);
    } else if (phase === 'lotteryResult') {
      timer('Avanço automático');
      heading(game.message || 'Sorteio concluído');
      message('O sorteio não movimentou os marcadores.');
      actions([{ label: 'Começar partida', action: game.beginMatch, width: 470 }], 565);
    } else if (phase === 'turn') {
      timer('Avanço automático');
      heading(human ? 'Sua vez!' : `Vez de ${NAMES[p]}`);
      message(
        human ? 'Prepare-se para lançar o dado.' : `${NAMES[p]} está preparando o lançamento.`,
      );
      if (human) actions([{ label: '🎲 Lançar dado', action: game.throwDie, width: 460 }], 565);
    } else if (phase === 'question' && question) {
      timer('Tempo para responder');
      round(ctx, UI.inset, 153, 228, 50, 22, orange);
      write(ctx, 'Banco de dados', UI.inset + 114, 178, 23, '#09243b', true, 'center');
      write(ctx, `CASA ${game.questionIndex}`, 1156, 178, 23, '#fff', false, 'right');
      ctx.strokeStyle = '#60809a';
      ctx.beginPath();
      ctx.moveTo(UI.inset, 218);
      ctx.lineTo(1158, 218);
      ctx.stroke();
      const max = 145,
        total = Math.ceil(question.prompt.length / max);
      const fragment = question.prompt.slice(page * max, (page + 1) * max);
      round(ctx, UI.inset, 238, UI.width, 239, 16, '#15486f');
      lines(ctx, fragment, 600, 349, 1030, 33, '#fff', true, 'center', 4);
      if (total > 1)
        button(
          `Enunciado ${page + 1}/${total} · Próximo`,
          375,
          431,
          450,
          46,
          () => setPage((v) => (v + 1) % total),
          false,
          20,
        );
      if (human)
        question.options.forEach((option, i) => {
          const x = UI.inset + (i % 2) * 568,
            y = 510 + Math.floor(i / 2) * 90;
          button(
            `${['▲', '◆', '●', '■'][i]}  ${option}`,
            x,
            y,
            548,
            78,
            () => game.answerQuestion(i),
            true,
            23,
            ANSWER_COLORS[i],
          );
        });
      else {
        round(ctx, UI.inset, 542, UI.width, 112, 15, '#205b83');
        lines(
          ctx,
          `${NAMES[p]} está analisando a pergunta.`,
          600,
          598,
          1020,
          26,
          '#fff',
          false,
          'center',
        );
      }
    } else if (phase === 'feedback') {
      timer('Avanço automático');
      // A flex-column equivalent: timer -> result -> answer card -> action, with consistent gaps.
      const iconY = 202;
      round(ctx, 543, iconY - 54, 114, 108, 57, game.outcome === 'correct' ? '#0e9d75' : '#b9554a');
      write(ctx, game.outcome === 'correct' ? '✓' : '×', 600, iconY, 80, '#fff', true, 'center');
      lines(ctx, game.message, 600, 314, 1040, 29, '#fff', true, 'center', 2);
      if (question) {
        round(ctx, UI.inset, 407, UI.width, 164, 14, '#24577d');
        write(ctx, 'RESPOSTA CORRETA', UI.inset + 23, 434, 23, '#ffb05a', true);
        lines(
          ctx,
          question.options[question.correct],
          UI.inset + 23,
          483,
          UI.width - 46,
          28,
          '#fff',
          true,
          'left',
          2,
        );
        lines(
          ctx,
          question.explanation,
          UI.inset + 23,
          535,
          UI.width - 46,
          21,
          '#fff',
          false,
          'left',
          2,
        );
      }
      button('Entendi, continuar →', 365, 600, 470, 84, game.finishFeedback);
    } else if (phase === 'finished' || phase === 'bankEmpty') {
      if (phase === 'finished') timer('Retorno ao menu');
      heading(phase === 'finished' ? '🏆 Classificação final' : 'Banco de questões esgotado', 180);
      message(phase === 'finished' ? `${NAMES[game.winner ?? 0]} venceu!` : game.message, 255, 36);
      actions(
        [
          { label: 'Jogar novamente', action: () => game.restart(false), width: 548 },
          { label: 'Trocar curso', action: () => game.restart(true), primary: false, width: 548 },
        ],
        565,
      );
    } else {
      timer('Avanço automático');
      heading(phase === 'rolling' ? '🎲 Dado em movimento' : game.message || 'Aguarde...');
      message(game.message || 'Aguarde a próxima etapa.');
    }
    // Text never bleeds past the display; all dynamic elements share a safe inset.
    ctx.restore();
    hitsRef.current = hits;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [game, page, hovered, pressed, clock, fontReady]);
  useEffect(() => () => texture?.dispose(), [texture]);
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
    // Keep the left edge fixed as the plane shrinks.
    bar.position.x = -0.539 + 0.539 * fraction;
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
      <mesh ref={timerBar} position={[0, 0.247, 0.063]} renderOrder={16} raycast={() => null}>
        <planeGeometry args={[1.078, 0.011]} />
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

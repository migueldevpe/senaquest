/**
 * Tutorial XR 3D independente da partida: um único painel CanvasTexture interativo.
 * Acompanha a cabeça somente depois de uma virada grande e sustentada (sem roll).
 * O botão de recentralização só aparece quando o painel sai do campo de visão.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { playSound } from '../game/sounds';
import { loadPoppinsCanvas } from './poppins';
import { currentTutorialStep, useTutorial } from './tutorialState';
import type { TutorialStepId } from './tutorialFlow';
import {
  shouldFollowTutorialPanel,
  stepsFor,
  TUTORIAL_STEPS,
  yawDifference,
  shouldShowTutorialRecenter,
} from './tutorialFlow';

const W = 1100;
const H = 750;
const PANEL_WIDTH = 1.2;
const PANEL_HEIGHT = (PANEL_WIDTH * H) / W;
const DISTANCE = 1.35;
const FOLLOW_WAIT = 0.5;
const EASING = 4.7;
const COLORS = {
  bg: '#103f69',
  dark: '#123756',
  card: '#20577e',
  cardLight: '#2d6589',
  orange: '#ff981a',
  text: '#ffffff',
  muted: '#d0e1ee',
  line: '#5482a1',
};

// Animated WebP somente nas ações de mão/controle do VR; o Desktop não carrega
// nem utiliza esses recursos. A imagem é copiada a 10 Hz para uma textura pequena,
// separada do Canvas principal (1100×750), evitando repintar todo o modal.
const VR_GUIDE_ASSETS: Partial<Record<TutorialStepId, string>> = {
  hands: 'hands-visible',
  click: 'pinch-select',
  hover: 'point-hover',
  tablet: 'tablet-answer',
  pinch: 'two-hand-zoom',
};
const GUIDE_X = 646;
const GUIDE_Y = 333;
const GUIDE_W = 375;
const GUIDE_H = 137;
const GUIDE_SECONDS_PER_FRAME = 0.105;

function AnimatedHandGuide({ name }: { name: string }) {
  const source = useRef<{ image: HTMLImageElement; atlas: boolean } | null>(null);
  const elapsed = useRef(0);
  const frameIndex = useRef(0);
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 180;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { canvas, texture };
  }, []);
  useEffect(() => {
    let active = true;
    let fallback: HTMLImageElement | null = null;
    const img = new Image();
    elapsed.current = GUIDE_SECONDS_PER_FRAME; // Renderiza o primeiro quadro assim que carregar.
    frameIndex.current = 0;
    source.current = null;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    img.onload = () => {
      if (active) {
        source.current = { image: img, atlas: !reducedMotion };
        // Não depender do primeiro frame do render loop para mostrar a demonstração.
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, 480, 180, 0, 0, 480, 180);
          texture.needsUpdate = true;
        }
      }
    };
    img.onerror = () => {
      // Fallback estático quando não há suporte ao atlas WebP ou ocorre erro.
      fallback = new Image();
      fallback.onload = () => {
        if (active && fallback) {
          source.current = { image: fallback, atlas: false };
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(fallback, 0, 0, 480, 180);
            texture.needsUpdate = true;
          }
        }
      };
      fallback.onerror = () => {
        if (active) source.current = null;
      };
      fallback.src = `/tutorial/vr/${name}-still.webp`;
    };
    // O arquivo animado WebP também é incluído no pacote, mas o Canvas 2D
    // desenha apenas o quadro-pôster de imagens animadas, conforme o HTML.
    // Reproduzir um atlas WebP estático evita esse bug no navegador do Quest.
    img.src = reducedMotion ? `/tutorial/vr/${name}-still.webp` : `/tutorial/vr/${name}-sheet.webp`;
    return () => {
      active = false;
      source.current = null;
      img.onload = null;
      img.onerror = null;
      if (fallback) {
        fallback.onload = null;
        fallback.onerror = null;
      }
    };
  }, [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < GUIDE_SECONDS_PER_FRAME) return;
    elapsed.current %= GUIDE_SECONDS_PER_FRAME;
    const src = source.current;
    if (!src || !src.image.complete || !src.image.naturalWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 480, 180);
    if (src.atlas) {
      const frame = frameIndex.current;
      const sx = (frame % 6) * 480;
      const sy = Math.floor(frame / 6) * 180;
      ctx.drawImage(src.image, sx, sy, 480, 180, 0, 0, 480, 180);
      frameIndex.current = (frame + 1) % 18;
    } else {
      ctx.drawImage(src.image, 0, 0, 480, 180);
    }
    texture.needsUpdate = true;
  });
  return (
    <mesh
      name={`senaquest-tutorial-vr-guide-${name}`}
      // A ilustração não captura raios nem cliques: o próprio painel interativo
      // atrás dela continua recebendo eventos, inclusive com as duas mãos.
      raycast={() => {}}
      renderOrder={5}
      position={[
        ((GUIDE_X + GUIDE_W / 2 - W / 2) * PANEL_WIDTH) / W,
        ((H / 2 - GUIDE_Y - GUIDE_H / 2) * PANEL_HEIGHT) / H,
        0.0025,
      ]}
    >
      <planeGeometry args={[(GUIDE_W * PANEL_WIDTH) / W, (GUIDE_H * PANEL_HEIGHT) / H]} />
      {/* O painel principal é transparente; este guia deve ser renderizado DEPOIS
          dele no mesmo passe transparente, ou o fundo oculta completamente o WebP. */}
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        transparent
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

// A moldura do tutorial é desenhada diretamente na CanvasTexture.
// Não renderizar outra borda em 3D: ela ficava duplicada e deslocada na lateral.

type Hit = { x: number; y: number; w: number; h: number; kind: string; run: () => void };
function text(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  size = 27,
  color = COLORS.text,
  bold = false,
  align: CanvasTextAlign = 'left',
) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 700 : 500} ${size}px Poppins, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  radius = 18,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function paragraph(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  width: number,
  font = 26,
  color = COLORS.muted,
  maxLines = 5,
) {
  ctx.font = `500 ${font}px Poppins, sans-serif`;
  const words = value.split(/\s+/);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(trial).width > width) {
      result.push(line);
      line = word;
    } else line = trial;
  }
  if (line) result.push(line);
  const shown = result.slice(0, maxLines);
  if (shown.length < result.length) {
    let last = shown[shown.length - 1] || '';
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    shown[shown.length - 1] = `${last}…`;
  }
  shown.forEach((part, i) => text(ctx, part, x, y + i * (font * 1.44), font, color));
}

/** Autoabre ao entrar no XR, inclusive se o evento de início anteceder a montagem do Canvas. */
export function XRSessionTutorialTrigger() {
  const { gl } = useThree();
  const handledSession = useRef(false);
  useEffect(() => {
    const begin = () => {
      if (handledSession.current) return;
      const phase = useGame.getState().phase;
      if (phase !== 'choose' && phase !== 'confirm') return;
      const state = useTutorial.getState();
      if (state.mode === 'vr') {
        handledSession.current = true;
        return;
      }
      // No emulador WebXR, o tutorial Desktop pode estar aberto na tela
      // normal; o XR precisa trocá-lo pelo treinamento com mãos, sem
      // marcar o tutorial Desktop como concluído.
      if (state.mode === 'desktop') state.end(false);
      handledSession.current = true;
      useTutorial.getState().start('vr');
    };
    const finish = () => {
      handledSession.current = false;
      const state = useTutorial.getState();
      if (state.mode === 'vr') state.end(false);
    };
    gl.xr.addEventListener('sessionstart', begin);
    gl.xr.addEventListener('sessionend', finish);
    if (gl.xr.isPresenting) begin();
    return () => {
      gl.xr.removeEventListener('sessionstart', begin);
      gl.xr.removeEventListener('sessionend', finish);
    };
  }, [gl]);
  useFrame(() => {
    // Fallback para quando o WebXR iniciou antes do listener ser registrado.
    if (!handledSession.current && gl.xr.isPresenting) {
      const phase = useGame.getState().phase;
      if (phase === 'choose' || phase === 'confirm') {
        const state = useTutorial.getState();
        if (state.mode === 'desktop') state.end(false);
        handledSession.current = true;
        if (useTutorial.getState().mode !== 'vr') useTutorial.getState().start('vr');
      }
    }
  });
  return null;
}

function ActiveXRTutorial() {
  const { gl } = useThree();
  const index = useTutorial((s) => s.index);
  const inputKind = useTutorial((s) => s.inputKind);
  const handsDetected = useTutorial((s) => s.handsDetected);
  const pinchDetected = useTutorial((s) => s.pinchDetected);
  const recenterNonce = useTutorial((s) => s.recenterNonce);
  const next = useTutorial((s) => s.next);
  const back = useTutorial((s) => s.back);
  const end = useTutorial((s) => s.end);
  const recenter = useTutorial((s) => s.recenter);
  const stepId = currentTutorialStep('vr', index);
  const step = TUTORIAL_STEPS[stepId];
  const [hover, setHover] = useState(-1);
  const hoverRef = useRef(-1);
  const hoverOwner = useRef<number | null>(null);
  const lastOwnerAt = useRef(0);
  const lastActivation = useRef(0);
  const hoverLocked = useRef(false);
  const panel = useRef<THREE.Group>(null);
  const helper = useRef<THREE.Group>(null);
  const panelYaw = useRef(0);
  const targetYaw = useRef(0);
  const targetPos = useRef(new THREE.Vector3());
  const didPlace = useRef(false);
  const turnedFor = useRef(0);
  const cameraPos = useRef(new THREE.Vector3());
  const cameraQuat = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const headFacing = useRef(new THREE.Quaternion());
  const hudOffset = useRef(new THREE.Vector3());
  const lastHeadPos = useRef(new THREE.Vector3());
  const headMovement = useRef(new THREE.Vector3());
  const panelDirection = useRef(new THREE.Vector3());
  const viewDirection = useRef(new THREE.Vector3());
  const haveHeadPos = useRef(false);
  const handPoll = useRef(0);
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    return { canvas, texture };
  }, []);
  const helperTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      rounded(ctx, 4, 4, 504, 104, COLORS.dark, 22, COLORS.orange);
      text(ctx, '↻  Recentrar tutorial', 256, 56, 34, COLORS.text, true, 'center');
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(
    () => () => {
      surface.texture.dispose();
      helperTexture.dispose();
    },
    [surface, helperTexture],
  );
  useEffect(() => {
    let mounted = true;
    void loadPoppinsCanvas().then(() => {
      if (mounted) surface.texture.needsUpdate = true;
    });
    return () => {
      mounted = false;
    };
  }, [surface]);
  useEffect(() => {
    setHover(-1);
    hoverRef.current = -1;
    hoverOwner.current = null;
    hoverLocked.current = false;
  }, [index]);
  useEffect(() => {
    didPlace.current = false;
    turnedFor.current = 0;
  }, [recenterNonce]);

  // Poster estático desenhado no próprio painel: mesmo que a textura animada
  // ainda não esteja pronta, a demonstração nunca fica como um retângulo vazio.
  const [guidePoster, setGuidePoster] = useState<{
    id: TutorialStepId;
    image: HTMLImageElement;
  } | null>(null);
  const [brandLogo, setBrandLogo] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let mounted = true;
    const logo = new Image();
    logo.onload = () => {
      if (mounted) setBrandLogo(logo);
    };
    logo.src = '/branding/senaquest-logo-outline.webp';
    return () => {
      mounted = false;
      logo.onload = null;
    };
  }, []);
  useEffect(() => {
    const asset = VR_GUIDE_ASSETS[stepId];
    if (!asset) {
      setGuidePoster(null);
      return;
    }
    let mounted = true;
    const poster = new Image();
    poster.onload = () => {
      if (mounted) setGuidePoster({ id: stepId, image: poster });
    };
    poster.onerror = () => {
      if (mounted) setGuidePoster(null);
    };
    poster.src = `/tutorial/vr/${asset}-still.webp`;
    return () => {
      mounted = false;
      poster.onload = null;
      poster.onerror = null;
    };
  }, [stepId]);

  const hitsRef = useRef<Hit[]>([]);
  useLayoutEffect(() => {
    const ctx = surface.canvas.getContext('2d');
    if (!ctx) return;
    const hits: Hit[] = [];
    const button = (
      label: string,
      x: number,
      y: number,
      w: number,
      h: number,
      run: () => void,
      kind = 'button',
      primary = false,
      enabled = true,
    ) => {
      const id = hits.length;
      rounded(ctx, x, y + 4, w, h, '#103047', 13);
      rounded(
        ctx,
        x,
        y,
        w,
        h,
        !enabled
          ? '#35566b'
          : hover === id
            ? '#ffb354'
            : primary
              ? COLORS.orange
              : COLORS.cardLight,
        13,
        hover === id && enabled ? '#ffffff' : '#4c82a6',
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 8, y, w - 16, h);
      ctx.clip();
      text(
        ctx,
        label,
        x + w / 2,
        y + h / 2,
        kind === 'test' ? 27 : 22,
        primary ? '#10293c' : '#ffffff',
        true,
        'center',
      );
      ctx.restore();
      hits.push({ x, y, w, h, kind, run: enabled ? run : () => {} });
    };
    // Cantos realmente transparentes: o retângulo de fundo anterior ultrapassava
    // a borda laranja arredondada e aparecia como uma segunda moldura quadrada.
    ctx.clearRect(0, 0, W, H);
    rounded(ctx, 16, 16, W - 32, H - 32, COLORS.bg, 22, COLORS.orange);
    rounded(ctx, 42, 42, W - 84, 75, '#235576', 12);
    if (brandLogo) {
      ctx.drawImage(brandLogo, 55, 45, 180, 68);
      text(ctx, 'TUTORIAL VR', 255, 80, 23, COLORS.orange, true);
    } else {
      text(ctx, 'TUTORIAL VR · SENAQUEST', 67, 80, 23, COLORS.orange, true);
    }
    text(
      ctx,
      `Etapa ${index + 1} / ${stepsFor('vr').length}`,
      W - 66,
      80,
      23,
      COLORS.muted,
      true,
      'right',
    );
    const segments = stepsFor('vr');
    // Distribuição proporcional: as 11 etapas cabem sempre DENTRO da moldura.
    const progressX = 50;
    const progressWidth = W - 100;
    const progressGap = 9;
    const progressSegment = (progressWidth - progressGap * (segments.length - 1)) / segments.length;
    segments.forEach((_, i) =>
      rounded(
        ctx,
        progressX + i * (progressSegment + progressGap),
        132,
        progressSegment,
        6,
        i <= index ? COLORS.orange : '#3c7295',
        4,
      ),
    );
    text(ctx, step.title, 60, 200, 41, COLORS.orange, true);
    paragraph(ctx, step.description, 62, 246, 968, 29, COLORS.text, 2);
    rounded(ctx, 55, 315, 990, 278, COLORS.dark, 18);
    const hasAnimatedGuide = Boolean(VR_GUIDE_ASSETS[stepId]);
    paragraph(
      ctx,
      step.detail,
      79,
      349,
      hasAnimatedGuide ? 505 : 940,
      24,
      COLORS.muted,
      hasAnimatedGuide ? 4 : 4,
    );
    if (hasAnimatedGuide) {
      // Os próprios WebPs já têm quadro e bordas arredondadas.
      // Não desenhar uma segunda moldura/retângulo por trás deles.
      // O pôster continua sendo a reserva enquanto o atlas animado carrega.
      if (guidePoster?.id === stepId && guidePoster.image.complete) {
        ctx.drawImage(guidePoster.image, GUIDE_X, GUIDE_Y, GUIDE_W, GUIDE_H);
      }
    }

    if (stepId === 'hands') {
      const detected = handsDetected || inputKind === 'controllers';
      rounded(ctx, 78, 496, 944, 64, detected ? '#196d60' : '#2b5577', 12);
      text(
        ctx,
        detected
          ? inputKind === 'controllers'
            ? '✓ Controles detectados'
            : '✓ Duas mãos detectadas'
          : 'Aguardando as mãos ou controles…',
        550,
        528,
        25,
        '#ffffff',
        true,
        'center',
      );
    }
    if (stepId === 'click' || stepId === 'hover') {
      button(
        stepId === 'click' ? 'SELECIONE ESTE BOTÃO' : 'DESTAQUE E SELECIONE',
        285,
        488,
        530,
        74,
        () => {
          if (stepId === 'hover' && !useTutorial.getState().hoverDetected) return;
          next();
        },
        stepId === 'hover' ? 'hover-target' : 'test',
        true,
      );
    }
    if (stepId === 'tablet') {
      rounded(ctx, 77, 496, 944, 64, COLORS.card, 12);
      text(
        ctx,
        '↓  Use o tablet real da mesa. Selecione B) 30.',
        550,
        528,
        24,
        COLORS.text,
        true,
        'center',
      );
    }
    if (stepId === 'pinch') {
      // Folga real entre explicação/animação e confirmação (antes: 7 px).
      rounded(ctx, 78, 496, 944, 64, pinchDetected ? '#196d60' : '#2b5577', 12);
      text(
        ctx,
        pinchDetected ? '✓ Pinça simultânea reconhecida' : 'Aguardando a pinça nas duas mãos…',
        550,
        528,
        25,
        '#ffffff',
        true,
        'center',
      );
    }
    button('Voltar', 48, 638, 195, 68, back, 'button', false, index > 0);
    button('Pular tutorial', 256, 638, 244, 68, () => end(true));
    const exercise =
      stepId === 'hands' ||
      stepId === 'click' ||
      stepId === 'hover' ||
      stepId === 'tablet' ||
      stepId === 'pinch';
    const passed =
      stepId === 'hands'
        ? handsDetected || inputKind === 'controllers'
        : stepId === 'pinch'
          ? pinchDetected
          : !exercise;
    if ((stepId === 'hands' || stepId === 'pinch') && !passed) {
      button('Pular exercício', 682, 638, 366, 68, next);
    } else if (stepId === 'click' || stepId === 'hover' || stepId === 'tablet') {
      button('Pular exercício', 682, 638, 366, 68, next);
    } else {
      button(
        index === segments.length - 1 ? 'Concluir' : 'Continuar →',
        682,
        638,
        366,
        68,
        next,
        'button',
        true,
      );
    }
    hitsRef.current = hits;
    surface.texture.needsUpdate = true;
  }, [
    surface,
    index,
    step,
    stepId,
    hover,
    handsDetected,
    inputKind,
    pinchDetected,
    back,
    next,
    end,
    guidePoster,
    brandLogo,
  ]);

  useFrame((_, delta, frame) => {
    if (!gl.xr.isPresenting || !panel.current) return;
    const headset = gl.xr.getCamera();
    headset.updateWorldMatrix(true, false);
    headset.getWorldPosition(cameraPos.current);
    headset.getWorldQuaternion(cameraQuat.current);
    // O zoom por pinça desloca o rig XR. Aplicar o mesmo deslocamento ao
    // modal e ao alvo ANTES da interpolação mantém a distância de 1,35 m.
    // Isto segue apenas translação, não inclinação/roll da cabeça.
    if (haveHeadPos.current && didPlace.current) {
      headMovement.current.subVectors(cameraPos.current, lastHeadPos.current);
      if (headMovement.current.lengthSq() < 9) {
        panel.current.position.add(headMovement.current);
        targetPos.current.add(headMovement.current);
      } else {
        // Recalibração de tracking: não arrastar o painel através da sala.
        didPlace.current = false;
      }
    }
    lastHeadPos.current.copy(cameraPos.current);
    haveHeadPos.current = true;
    euler.current.setFromQuaternion(cameraQuat.current, 'YXZ');
    const yaw = euler.current.y;
    headFacing.current.setFromEuler(euler.current.set(euler.current.x, yaw, 0, 'YXZ'));
    const place = () => {
      targetYaw.current = yaw;
      targetPos.current
        .copy(cameraPos.current)
        .add(new THREE.Vector3(-Math.sin(yaw) * DISTANCE, -0.1, -Math.cos(yaw) * DISTANCE));
    };
    if (!didPlace.current) {
      place();
      panel.current.position.copy(targetPos.current);
      panel.current.rotation.set(0, yaw, 0);
      panelYaw.current = yaw;
      didPlace.current = true;
    }
    // When the pointer is over a button, keep the panel still for reliable selection.
    if (!hoverLocked.current && shouldFollowTutorialPanel(yaw, panelYaw.current)) {
      turnedFor.current += Math.min(delta, 0.05);
      if (turnedFor.current > FOLLOW_WAIT) {
        place();
        turnedFor.current = 0;
      }
    } else turnedFor.current = 0;
    const smoothing = 1 - Math.exp(-EASING * Math.min(delta, 0.05));
    panel.current.position.lerp(targetPos.current, smoothing);
    panelYaw.current += yawDifference(targetYaw.current, panelYaw.current) * smoothing;
    panel.current.rotation.set(0, panelYaw.current, 0);

    // Só exibe 'Recentrar' quando o painel está fora do campo de visão.
    // Histerese evita a oscilação do botão no limite do ângulo.
    if (helper.current) {
      panelDirection.current.subVectors(panel.current.position, cameraPos.current).normalize();
      viewDirection.current.set(0, 0, -1).applyQuaternion(cameraQuat.current).normalize();
      const angle = Math.acos(
        THREE.MathUtils.clamp(panelDirection.current.dot(viewDirection.current), -1, 1),
      );
      const show = shouldShowTutorialRecenter(angle, helper.current.visible);
      helper.current.visible = show;
      if (show) {
        helper.current.quaternion.copy(headFacing.current);
        hudOffset.current.set(-0.45, -0.39, -1.02).applyQuaternion(headFacing.current);
        helper.current.position.copy(cameraPos.current).add(hudOffset.current);
      }
    }
    handPoll.current += delta;
    if (handPoll.current < 0.11) return;
    handPoll.current = 0;
    const sources = gl.xr.getSession()?.inputSources;
    if (!sources) return;
    const hands = [...sources].filter((source) => source.hand);
    const kind = hands.length ? 'hands' : sources.length ? 'controllers' : 'unknown';
    useTutorial.getState().setInput(kind, hands.length >= 2);
    if (stepId !== 'pinch' || !frame || hands.length < 2) return;
    const referenceSpace = gl.xr.getReferenceSpace();
    if (!referenceSpace) return;
    const simultaneous = hands.some((hand) => {
      if (hand.handedness !== 'left') return false;
      return hands.some(
        (other) =>
          other.handedness === 'right' &&
          [hand, other].every((input) => {
            const thumb = input.hand?.get('thumb-tip');
            const index = input.hand?.get('index-finger-tip');
            if (!thumb || !index) return false;
            const a = frame.getJointPose?.(thumb, referenceSpace)?.transform.position;
            const b = frame.getJointPose?.(index, referenceSpace)?.transform.position;
            return !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.035;
          }),
      );
    });
    if (simultaneous) useTutorial.getState().markPinch();
  });

  const indexAt = (uv?: THREE.Vector2) => {
    if (!uv) return -1;
    const x = uv.x * W,
      y = (1 - uv.y) * H;
    return hitsRef.current.findIndex(
      (hit) => x >= hit.x && y >= hit.y && x <= hit.x + hit.w && y <= hit.y + hit.h,
    );
  };
  const point = (e: { uv?: THREE.Vector2; pointerId?: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    const now = performance.now();
    const hit = indexAt(e.uv);
    // Avoid flickering when both XR hands/controllers aim at different buttons.
    if (hoverOwner.current !== null && now - lastOwnerAt.current > 300) hoverOwner.current = null;
    if (hoverOwner.current === null && hit >= 0 && e.pointerId !== undefined)
      hoverOwner.current = e.pointerId;
    if (hoverOwner.current !== null && e.pointerId !== hoverOwner.current) return;
    lastOwnerAt.current = now;
    if (hoverRef.current !== hit) {
      hoverRef.current = hit;
      setHover(hit);
      if (hit >= 0) playSound('hover');
    }
    hoverLocked.current = hit >= 0;
    if (hit < 0) hoverOwner.current = null;
    if (stepId === 'hover' && hitsRef.current[hit]?.kind === 'hover-target')
      useTutorial.getState().markHover();
  };
  const activate = (e: { uv?: THREE.Vector2; pointerId?: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    if (
      hoverOwner.current !== null &&
      e.pointerId !== undefined &&
      hoverOwner.current !== e.pointerId
    )
      return;
    const hit = hitsRef.current[indexAt(e.uv)];
    if (!hit) return;
    const now = performance.now();
    if (now - lastActivation.current < 320) return;
    lastActivation.current = now;
    playSound('select');
    hit.run();
  };
  return (
    <>
      <group ref={panel} name="senaquest-vr-tutorial-panel">
        <mesh
          onPointerOver={point}
          onPointerMove={point}
          onPointerOut={(e) => {
            e.stopPropagation();
            if (hoverOwner.current !== null && hoverOwner.current !== e.pointerId) return;
            hoverOwner.current = null;
            hoverLocked.current = false;
            hoverRef.current = -1;
            setHover(-1);
          }}
          onPointerDown={activate}
          onClick={activate}
        >
          <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
          <meshBasicMaterial
            map={surface.texture}
            toneMapped={false}
            side={THREE.FrontSide}
            transparent
            alphaTest={0.025}
            depthTest
            depthWrite
          />
        </mesh>
        {VR_GUIDE_ASSETS[stepId] && (
          <AnimatedHandGuide key={stepId} name={VR_GUIDE_ASSETS[stepId]!} />
        )}
      </group>
      <group ref={helper} name="senaquest-vr-tutorial-recenter">
        <mesh
          renderOrder={2200}
          onPointerDown={(e) => {
            e.stopPropagation();
            const now = performance.now();
            if (now - lastActivation.current < 320) return;
            lastActivation.current = now;
            recenter();
          }}
          onClick={(e) => {
            e.stopPropagation();
            const now = performance.now();
            if (now - lastActivation.current < 320) return;
            lastActivation.current = now;
            recenter();
          }}
        >
          <planeGeometry args={[0.39, 0.085]} />
          <meshBasicMaterial
            map={helperTexture}
            transparent
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}

export function XRTutorial() {
  const mode = useTutorial((s) => s.mode);
  return mode === 'vr' ? <ActiveXRTutorial /> : null;
}

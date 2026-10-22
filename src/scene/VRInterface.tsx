import { loadPoppinsCanvas } from './poppins';
import { POPPINS_3D } from './poppins';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { COURSES, NAMES } from '../game/data';
import { VRTabletScreen } from './VRTabletScreen';
import { useGame, currentPlayer } from '../game/store';

// Um único deslocamento local para os três tablets dos bots.
// Z negativo aproxima os tablets da mesa, sem afetar o jogador principal.
const BOT_TABLET_EDGE_OFFSET = -0.075;

/** HUD rendered once as a transparent, head-locked WebXR surface.
 * All visual components share one canvas to avoid text z-fighting and scene occlusion.
 * The invisible settings hit target is the only interactive element on this surface. */
const HUD_W = 2048;
const HUD_H = 1152;
const HUD_PLANE_W = 2.72;
const HUD_PLANE_H = (HUD_PLANE_W * HUD_H) / HUD_W;
const HUD_DISTANCE = 1.45;
// Atraso angular discreto: sensação de profundidade sem atualizar React a cada frame.
const SCORE_PARALLAX_SMOOTHING = 9;
const SCORE_MAX_TILT_RAD = THREE.MathUtils.degToRad(5);

function HudArtwork({
  ranking,
  players,
  course,
  active,
  order,
}: {
  ranking: number[];
  players: { correct: number; position: number }[];
  course: string;
  active: number | null;
  order: number[];
}) {
  // Keep one GPU texture; update the existing canvas only when data changes or
  // while the ranking rows are moving. This restores animated classification.
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = HUD_W;
    canvas.height = HUD_H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, []);
  const positions = useRef<number[]>([0, 1, 2, 3]);
  useEffect(() => {
    let alive = true;
    void loadPoppinsCanvas()
      .then(() => {
        if (alive) dirty.current = true;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const previousRanking = useRef<number[]>([]);
  const dirty = useRef(true);
  useEffect(() => {
    dirty.current = true;
  }, [ranking.join(','), players, course, active, order.join(',')]);
  useEffect(() => () => surface.texture.dispose(), [surface]);
  useFrame((_, dt) => {
    const ctx = surface.canvas.getContext('2d');
    if (!ctx) return;
    if (previousRanking.current.length === 0) {
      ranking.forEach((id, index) => {
        positions.current[id] = index;
      });
      previousRanking.current = [...ranking];
      dirty.current = true;
    }
    let moving = false;
    for (let i = 0; i < ranking.length; i++) {
      const id = ranking[i];
      const current = positions.current[id] ?? i;
      const next = THREE.MathUtils.damp(current, i, 9, Math.min(dt, 0.05));
      positions.current[id] = Math.abs(next - i) < 0.002 ? i : next;
      if (positions.current[id] !== i) moving = true;
    }
    if (!moving && !dirty.current) return;
    dirty.current = false;
    ctx.clearRect(0, 0, HUD_W, HUD_H);
    const rounded = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };
    const text = (label: string, x: number, y: number, font: string, color: string) => {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(label, x, y);
    };
    const wrap = (value: string, maxWidth: number, font: string) => {
      ctx.font = font;
      const lines: string[] = [];
      let current = '';
      for (const word of value.split(' ')) {
        const next = current ? `${current} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else current = next;
      }
      if (current) lines.push(current);
      return lines.slice(0, 2);
    };
    // Keep Biluteteia's exact scoreboard coordinates and styling.
    const x = 1505,
      y = 676,
      w = 514,
      h = 445;
    rounded(x, y, w, h, 22);
    ctx.fillStyle = '#ff981a';
    ctx.fill();
    rounded(x + 2.5, y + 2.5, w - 5, h - 5, 19);
    ctx.fillStyle = '#103f69';
    ctx.fill();
    text('CURSO', x + 25, y + 35, 'bold 17px Poppins, sans-serif', '#ffb05a');
    wrap(course, w - 52, 'bold 20px Poppins, sans-serif').forEach((line, i) =>
      text(line, x + 25, y + 65 + i * 24, 'bold 20px Poppins, sans-serif', '#ffffff'),
    );
    text('PLACAR · CLASSIFICAÇÃO', x + 25, y + 115, 'bold 17px Poppins, sans-serif', '#ffb05a');
    text(
      'Mais pontos primeiro; desempate pela casa.',
      x + 25,
      y + 145,
      '16px Poppins, sans-serif',
      '#c8dfef',
    );
    const columns = [x + 28, x + 97, x + 286, x + 371, x + 449];
    ['POS.', 'JOGADOR', 'ORDEM', 'PTS', 'CASA'].forEach((v, i) =>
      text(v, columns[i], y + 195, 'bold 14px Poppins, sans-serif', '#b4d0e4'),
    );
    // Render in visual order to preserve the active outline during crossing.
    ranking.forEach((id, i) => {
      const py = y + 232.5 + (positions.current[id] ?? i) * 44;
      if (id === active) {
        rounded(x + 13, py - 20, w - 26, 40, 9);
        ctx.fillStyle = '#174e79';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff981a';
        ctx.stroke();
      }
      const sequence = order.indexOf(id);
      const values = [
        `${i + 1}º`,
        NAMES[id],
        sequence < 0 ? '—' : `${sequence + 1}º`,
        String(players[id].correct * 100),
        `${players[id].position}/30`,
      ];
      values.forEach((value, j) =>
        text(
          value,
          columns[j],
          py,
          `${j === 1 || j === 3 ? 'bold ' : ''}17px Poppins, sans-serif`,
          j === 3 ? '#ffb05a' : '#ffffff',
        ),
      );
    });
    text(
      'Ordem = sequência sorteada de jogadas',
      x + 25,
      y + 412.5,
      '15px Poppins, sans-serif',
      '#c8dfef',
    );
    surface.texture.needsUpdate = true;
  });
  return (
    <mesh renderOrder={2000} raycast={() => null}>
      <planeGeometry args={[HUD_PLANE_W, HUD_PLANE_H]} />
      <meshBasicMaterial
        map={surface.texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function VisorHUD({
  ranking,
  players,
  course,
  active,
  order,
}: {
  ranking: number[];
  players: { correct: number; position: number }[];
  course: string;
  active: number | null;
  order: number[];
}) {
  const root = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const p = useRef(new THREE.Vector3());
  const q = useRef(new THREE.Quaternion());
  const rotatedOffset = useRef(new THREE.Vector3());
  const smoothedOrientation = useRef(new THREE.Quaternion());
  const relative = useRef(new THREE.Quaternion());
  const relativeEuler = useRef(new THREE.Euler());
  const limited = useRef(new THREE.Quaternion());
  const initialized = useRef(false);
  const adaptiveScale = useRef(1);
  const lastProjection = useRef(0);
  const hudInset = useRef(new THREE.Vector2(0, 0));
  const localInset = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    if (!root.current || !gl.xr.isPresenting) return;
    const headset = gl.xr.getCamera();
    headset.updateWorldMatrix(true, false);
    // Use the narrower eye's horizontal/vertical FOV to keep the scoreboard
    // inside a conservative readable area across different headsets.
    if (lastProjection.current++ % 45 === 0) {
      const eyes = headset.cameras.length ? headset.cameras : [headset];
      const bounds = eyes
        .map((eye) => {
          const e = eye.projectionMatrix.elements;
          return [2 * Math.atan(1 / Math.abs(e[0])), 2 * Math.atan(1 / Math.abs(e[5]))];
        })
        .filter(
          ([horizontal, vertical]) => Number.isFinite(horizontal) && Number.isFinite(vertical),
        );
      if (bounds.length) {
        const horizontal = Math.min(...bounds.map((b) => b[0]));
        const vertical = Math.min(...bounds.map((b) => b[1]));
        // The score panel occupies only the lower-right region of the artwork.
        // Align that region, not the empty canvas, with the safe visible margins.
        const safeRight = HUD_DISTANCE * Math.tan(horizontal / 2) * 0.88;
        const safeBottom = -HUD_DISTANCE * Math.tan(vertical / 2) * 0.85;
        const rightEdge = (2019 / HUD_W - 0.5) * HUD_PLANE_W;
        const bottomEdge = (0.5 - 1121 / HUD_H) * HUD_PLANE_H;
        const fit = Math.min(1, safeRight / rightEdge, safeBottom / bottomEdge);
        adaptiveScale.current = THREE.MathUtils.clamp(fit, 0.58, 1);
        hudInset.current.set(
          safeRight - rightEdge * adaptiveScale.current,
          safeBottom - bottomEdge * adaptiveScale.current,
        );
      }
    }
    root.current.scale.setScalar(
      THREE.MathUtils.damp(root.current.scale.x, adaptiveScale.current, 5, Math.min(delta, 0.05)),
    );
    headset.getWorldPosition(p.current);
    headset.getWorldQuaternion(q.current);
    rotatedOffset.current.set(0, 0, -HUD_DISTANCE).applyQuaternion(q.current);
    root.current.position.copy(p.current).add(rotatedOffset.current);
    localInset.current.set(hudInset.current.x, hudInset.current.y, 0).applyQuaternion(q.current);
    root.current.position.add(localInset.current);
    if (!initialized.current) {
      smoothedOrientation.current.copy(q.current);
      initialized.current = true;
    }
    smoothedOrientation.current.slerp(
      q.current,
      1 - Math.exp(-SCORE_PARALLAX_SMOOTHING * Math.min(delta, 0.05)),
    );
    relative.current.copy(q.current).invert().multiply(smoothedOrientation.current);
    relativeEuler.current.setFromQuaternion(relative.current, 'YXZ');
    relativeEuler.current.x = THREE.MathUtils.clamp(
      -relativeEuler.current.x,
      -SCORE_MAX_TILT_RAD,
      SCORE_MAX_TILT_RAD,
    );
    relativeEuler.current.y = THREE.MathUtils.clamp(
      -relativeEuler.current.y,
      -SCORE_MAX_TILT_RAD,
      SCORE_MAX_TILT_RAD,
    );
    relativeEuler.current.z = 0;
    limited.current.setFromEuler(relativeEuler.current);
    root.current.quaternion.copy(q.current).multiply(limited.current);
  });
  return (
    <group ref={root}>
      <HudArtwork
        ranking={ranking}
        players={players}
        course={course}
        active={active}
        order={order}
      />
    </group>
  );
}

/**
 * A slim edge-mounted terminal. The table top is y=1.0215 and its outside
 * edges are x/z=+/-2.5. The tilted tablet remains outside the wood below
 * the table surface; only its upper half projects over the top.
 */
function TableEdgeTablet({
  position,
  yaw,
  children,
  decorative = false,
  showClamp = true,
}: {
  position: [number, number, number];
  yaw: number;
  children?: ReactNode;
  decorative?: boolean;
  showClamp?: boolean;
}) {
  return (
    <group
      name={decorative ? undefined : 'zoom-blocker-tablet'}
      position={position}
      rotation={[0, yaw, 0]}
    >
      <group position={[0, 0, decorative ? BOT_TABLET_EDGE_OFFSET : 0]}>
        {showClamp && (
          <>
            {/* Small rounded C-clamp: the upper and lower jaws grip the table edge. */}

            {/* Short stem and pivot sit behind the screen, never over the artwork. */}

            <mesh position={[0, -0.015, -0.00085]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.032, 0.032, 0.12, 20]} />
              <meshStandardMaterial color="#667e8c" metalness={0.46} roughness={0.42} />
            </mesh>
          </>
        )}
        {/* Tablet local +Y is screen up; its top tilts towards the board. */}
        <group rotation={[-0.8, 0, 0]} position={[0, 0.06, 0]}>
          <RoundedBox args={[1.27, 0.79, 0.048]} radius={0.034} smoothness={3}>
            <meshStandardMaterial color="#142f48" roughness={0.58} />
          </RoundedBox>

          {children}
        </group>
      </group>
    </group>
  );
}

function BotScreen({ name }: { name: string }) {
  return (
    <group position={[0, 0, -0.025]} rotation={[0, Math.PI, 0]}>
      <Text
        font={POPPINS_3D}
        position={[0, 0.235, 0]}
        fontSize={0.063}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        color="#ffffff"
      >
        {name}
      </Text>
      <Text
        font={POPPINS_3D}
        position={[0, 0.142, 0]}
        fontSize={0.058}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        color="#ffb34c"
      >
        SENAQUEST
      </Text>
      <Text
        font={POPPINS_3D}
        position={[0, 0.072, 0]}
        fontSize={0.028}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        color="#a9d4e9"
      >
        Terminal individual
      </Text>
    </group>
  );
}

export function VRInterface() {
  const gl = useThree((s) => s.gl);
  const [presenting, setPresenting] = useState(gl.xr.isPresenting);
  const game = useGame();
  useEffect(() => {
    const update = () => setPresenting(gl.xr.isPresenting);
    gl.xr.addEventListener('sessionstart', update);
    gl.xr.addEventListener('sessionend', update);
    return () => {
      gl.xr.removeEventListener('sessionstart', update);
      gl.xr.removeEventListener('sessionend', update);
    };
  }, [gl]);
  if (!presenting) return null;
  const ranking = [0, 1, 2, 3].sort(
    (a, b) =>
      game.players[b].correct - game.players[a].correct ||
      game.players[b].position - game.players[a].position,
  );
  return (
    <>
      {/* The front table edge is at z~2; place the screen outside the board, centered on each seat. */}
      {/* Smaller edge-mounted display: preserve board sightline and clear the chair volume. */}
      <group scale={0.87} position={[0, 0.3, 0.38]}>
        <TableEdgeTablet position={[0, 1.075, 2.55]} yaw={0} showClamp={false}>
          <VRTabletScreen />
        </TableEdgeTablet>
      </group>
      <TableEdgeTablet position={[-2.49, 1.04, 0]} yaw={-Math.PI / 2} decorative>
        <BotScreen name="Chico" />
      </TableEdgeTablet>
      <TableEdgeTablet position={[0, 1.04, -2.49]} yaw={Math.PI} decorative>
        <BotScreen name="Paty" />
      </TableEdgeTablet>
      <TableEdgeTablet position={[2.49, 1.04, 0]} yaw={Math.PI / 2} decorative>
        <BotScreen name="Claudinha" />
      </TableEdgeTablet>
      <VisorHUD
        ranking={ranking}
        players={game.players}
        course={COURSES[game.course].name}
        active={
          game.phase === 'lottery' || game.phase === 'lotteryRolling'
            ? (game.lotteryThrower ?? game.eligible[game.lotteryIndex] ?? null)
            : game.order.length && game.phase !== 'finished' && game.phase !== 'bankEmpty'
              ? currentPlayer(game)
              : null
        }
        order={game.order}
      />
    </>
  );
}

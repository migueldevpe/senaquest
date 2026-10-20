import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { COURSES, NAMES } from '../game/data';
import { VRTabletScreen } from './VRTabletScreen';
import { useGame, currentPlayer, currentQuestion } from '../game/store';

const NAVY = '#003b6a';
const ORANGE = '#ff981a';

/** HUD rendered once as a transparent, head-locked WebXR surface.
 * All visual components share one canvas to avoid text z-fighting and scene occlusion.
 * The invisible settings hit target is the only interactive element on this surface. */
const HUD_W = 2048;
const HUD_H = 1152;
const HUD_PLANE_W = 2.72;
const HUD_PLANE_H = (HUD_PLANE_W * HUD_H) / HUD_W;
const HUD_DISTANCE = 1.45;

function HudArtwork({
  ranking,
  players,
  course,
  gradient,
  showScore,
  active,
  order,
}: {
  ranking: number[];
  players: { correct: number; position: number }[];
  course: string;
  gradient: boolean;
  showScore: boolean;
  active: number | null;
  order: number[];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = HUD_W;
    canvas.height = HUD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const rounded = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };
    const text = (
      label: string,
      x: number,
      y: number,
      font: string,
      color: string,
      align: CanvasTextAlign = 'left',
    ) => {
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(label, x, y);
    };
    const wrap = (value: string, maxWidth: number, font: string, maxLines = 2) => {
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
      return lines.slice(0, maxLines);
    };
    // Edge-aligned header, fading into the scene without a visible rectangle.
    if (gradient) {
      const g = ctx.createLinearGradient(0, 0, 0, 160);
      g.addColorStop(0, 'rgba(5,39,64,0.87)');
      g.addColorStop(0.42, 'rgba(5,39,64,0.47)');
      g.addColorStop(1, 'rgba(5,39,64,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, HUD_W, 160);
    }
    text('SENA', 28, 43, 'bold 37px Arial, sans-serif', '#ffffff');
    text('QUEST', 137, 43, 'bold 37px Arial, sans-serif', '#ff981a');
    text('Desafio dos Cursos VR', 29, 86, '19px Arial, sans-serif', '#d8e6f1');

    // Botão do HUD: grupo ícone + texto centralizado como uma única unidade.
    // O Canvas usa a mesma geometria para repouso/hover; nenhum estado muda a tipografia.
    const bx = 1795,
      by = 16,
      bw = 224,
      bh = 66;
    rounded(bx, by + 3, bw, bh, 18);
    ctx.fillStyle = '#082b4a';
    ctx.fill();
    rounded(bx, by, bw, bh, 18);
    ctx.fillStyle = '#2d6d9f';
    ctx.fill();
    rounded(bx + 2, by + 2, bw - 4, bh - 4, 16);
    ctx.fillStyle = '#003b6a';
    ctx.fill();
    const label = 'Configurações';
    ctx.font = 'bold 22px Arial, sans-serif';
    const metrics = ctx.measureText(label);
    const iconSize = 27,
      gap = 10;
    const totalWidth = iconSize + gap + metrics.width;
    const groupLeft = bx + (bw - totalWidth) / 2;
    const cy = by + bh / 2;
    const cx = groupLeft + iconSize / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2.7;
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.fillRect(-2, -14, 4, 6);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Center glyphs using the same vertical middle as the gear, with a tiny optical correction.
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const ascent = metrics.actualBoundingBoxAscent || 16;
    const descent = metrics.actualBoundingBoxDescent || 5;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, groupLeft + iconSize + gap, cy + (ascent - descent) / 2 + 9);

    if (showScore) {
      // Right/bottom inset mirrors desktop's 12px margin; larger VR-safe text.
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
      text('CURSO', x + 25, y + 35, 'bold 17px Arial, sans-serif', '#ffb05a');
      wrap(course, w - 52, 'bold 20px Arial, sans-serif').forEach((line, i) =>
        text(line, x + 25, y + 65 + i * 24, 'bold 20px Arial, sans-serif', '#ffffff'),
      );
      text('PLACAR · CLASSIFICAÇÃO', x + 25, y + 115, 'bold 17px Arial, sans-serif', '#ffb05a');
      text(
        'Mais pontos primeiro; desempate pela casa.',
        x + 25,
        y + 145,
        '16px Arial, sans-serif',
        '#c8dfef',
      );
      const columns = [x + 28, x + 97, x + 286, x + 371, x + 449];
      ['POS.', 'JOGADOR', 'ORDEM', 'PTS', 'CASA'].forEach((v, i) =>
        text(v, columns[i], y + 195, 'bold 14px Arial, sans-serif', '#b4d0e4'),
      );
      ranking.forEach((id, i) => {
        const py = y + 232.5 + i * 44;
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
            `${j === 1 || j === 3 ? 'bold ' : ''}17px Arial, sans-serif`,
            j === 3 ? '#ffb05a' : '#ffffff',
          ),
        );
      });
      text(
        'Ordem = sequência sorteada de jogadas',
        x + 25,
        y + 412.5,
        '15px Arial, sans-serif',
        '#c8dfef',
      );
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [
    ranking.join(','),
    players.map((p) => `${p.correct}:${p.position}`).join(','),
    course,
    gradient,
    showScore,
    active,
    order.join(','),
  ]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <mesh renderOrder={2000} raycast={() => null}>
      <planeGeometry args={[HUD_PLANE_W, HUD_PLANE_H]} />
      <meshBasicMaterial
        map={texture}
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showScore, setShowScore] = useState(true);
  const [showGradient, setShowGradient] = useState(true);
  const p = useRef(new THREE.Vector3());
  const q = useRef(new THREE.Quaternion());
  const rotatedOffset = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!root.current || !gl.xr.isPresenting) return;
    const headset = gl.xr.getCamera();
    headset.updateWorldMatrix(true, false);
    headset.getWorldPosition(p.current);
    headset.getWorldQuaternion(q.current);
    rotatedOffset.current.set(0, 0, -HUD_DISTANCE).applyQuaternion(q.current);
    root.current.position.copy(p.current).add(rotatedOffset.current);
    root.current.quaternion.copy(q.current);
  });
  // The hit target exactly matches the settings artwork coordinates in canvas pixels.
  const settingsX = ((1795 + 224 / 2) / HUD_W - 0.5) * HUD_PLANE_W;
  const settingsY = (0.5 - (16 + 66 / 2) / HUD_H) * HUD_PLANE_H;
  return (
    <group ref={root}>
      <HudArtwork
        ranking={ranking}
        players={players}
        course={course}
        gradient={showGradient}
        showScore={showScore}
        active={active}
        order={order}
      />
      <mesh
        position={[settingsX, settingsY, 0.012]}
        renderOrder={2002}
        onPointerOver={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setSettingsOpen((v) => !v);
        }}
      >
        <planeGeometry args={[(224 / HUD_W) * HUD_PLANE_W, (66 / HUD_H) * HUD_PLANE_H]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />
      </mesh>
      {settingsOpen && (
        <group position={[0.76, 0.37, 0.12]} renderOrder={2100}>
          <Panel width={0.83} height={0.36} />
          <VRLabel y={0.115} size={0.039} width={0.75}>
            Configurações VR
          </VRLabel>
          <VRButton
            label={showScore ? 'Ocultar placar' : 'Mostrar placar'}
            y={0.025}
            width={0.7}
            height={0.073}
            size={0.031}
            onClick={() => setShowScore((v) => !v)}
          />
          <VRButton
            label={showGradient ? 'Ocultar degradê' : 'Mostrar degradê'}
            y={-0.063}
            width={0.7}
            height={0.073}
            size={0.031}
            onClick={() => setShowGradient((v) => !v)}
          />
          <VRButton
            label="Fechar"
            y={-0.143}
            width={0.7}
            height={0.063}
            size={0.029}
            onClick={() => setSettingsOpen(false)}
          />
        </group>
      )}
    </group>
  );
}

function Panel({ width, height }: { width: number; height: number }) {
  return (
    <group renderOrder={2001}>
      <RoundedBox args={[width, height, 0.026]} radius={0.028} smoothness={3}>
        <meshBasicMaterial
          color={ORANGE}
          transparent
          opacity={0.99}
          depthTest={false}
          depthWrite={false}
        />
      </RoundedBox>
      <RoundedBox
        args={[width - 0.014, height - 0.014, 0.027]}
        radius={0.024}
        smoothness={3}
        position={[0, 0, 0.017]}
      >
        <meshBasicMaterial color={NAVY} depthTest={false} depthWrite={false} />
      </RoundedBox>
    </group>
  );
}

function VRLabel({
  children,
  y,
  x = 0,
  size = 0.048,
  width = 1.05,
  color = '#ffffff',
}: {
  children: string;
  y: number;
  x?: number;
  size?: number;
  width?: number;
  color?: string;
}) {
  return (
    <Text
      position={[x, y, 0.11]}
      renderOrder={2102}
      material-depthTest={false}
      material-depthWrite={false}
      fontSize={size}
      maxWidth={width}
      lineHeight={1.12}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      color={color}
      raycast={() => null}
    >
      {children}
    </Text>
  );
}
function VRButton({
  label,
  onClick,
  y,
  x = 0,
  width = 1.1,
  height = 0.115,
  size = 0.042,
  color = '#2277b9',
}: {
  label: string;
  onClick: () => void;
  y: number;
  x?: number;
  width?: number;
  height?: number;
  size?: number;
  color?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={[x, y, 0.055]}>
      <RoundedBox
        args={[width, height, 0.025]}
        radius={0.018}
        smoothness={3}
        renderOrder={2101}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <meshBasicMaterial
          color={hovered ? '#358aca' : color}
          depthTest={false}
          depthWrite={false}
        />
      </RoundedBox>
      <Text
        position={[0, 0, 0.09]}
        renderOrder={2103}
        material-depthTest={false}
        material-depthWrite={false}
        fontSize={size}
        maxWidth={width - 0.045}
        lineHeight={1.05}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        color="#ffffff"
        raycast={() => null}
      >
        {label}
      </Text>
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
}: {
  position: [number, number, number];
  yaw: number;
  children?: ReactNode;
  decorative?: boolean;
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Small rounded C-clamp: the upper and lower jaws grip the table edge. */}
      <RoundedBox
        args={[0.2, 0.03, 0.25]}
        radius={0.012}
        smoothness={3}
        position={[0, -0.1, -0.115]}
      >
        <meshStandardMaterial color="#314b60" metalness={0.32} roughness={0.53} />
      </RoundedBox>
      <RoundedBox
        args={[0.2, 0.03, 0.25]}
        radius={0.012}
        smoothness={3}
        position={[0, -0.34, -0.115]}
      >
        <meshStandardMaterial color="#314b60" metalness={0.32} roughness={0.53} />
      </RoundedBox>
      <RoundedBox
        args={[0.19, 0.26, 0.032]}
        radius={0.013}
        smoothness={3}
        position={[0, -0.22, -0.225]}
      >
        <meshStandardMaterial color="#314b60" metalness={0.32} roughness={0.53} />
      </RoundedBox>
      {/* Short stem and pivot sit behind the screen, never over the artwork. */}
      <RoundedBox
        args={[0.09, 0.115, 0.048]}
        radius={0.018}
        smoothness={3}
        position={[0, -0.08, -0.08]}
      >
        <meshStandardMaterial color="#405a6e" metalness={0.28} roughness={0.52} />
      </RoundedBox>
      <mesh position={[0, -0.015, -0.065]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.032, 0.12, 20]} />
        <meshStandardMaterial color="#667e8c" metalness={0.46} roughness={0.42} />
      </mesh>
      {/* Tablet local +Y is screen up; its top tilts towards the board. */}
      <group rotation={[-0.8, 0, 0]} position={[0, 0.06, 0]}>
        <RoundedBox args={[1.27, 0.79, 0.048]} radius={0.034} smoothness={3}>
          <meshStandardMaterial color="#142f48" roughness={0.58} />
        </RoundedBox>
        <RoundedBox
          args={[1.215, 0.735, 0.008]}
          radius={0.02}
          smoothness={3}
          position={[0, 0, 0.034]}
        >
          <meshBasicMaterial color={decorative ? '#082b49' : NAVY} />
        </RoundedBox>
        {children}
      </group>
    </group>
  );
}

function BotScreen({ name }: { name: string }) {
  return (
    <group position={[0, 0, -0.049]} rotation={[0, Math.PI, 0]}>
      <Text
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
      <group scale={0.87} position={[0, 0.205, 0.6]}>
        <TableEdgeTablet position={[0, 1.075, 2.55]} yaw={0}>
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

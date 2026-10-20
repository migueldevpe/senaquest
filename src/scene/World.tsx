import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { CharacterName } from './CharacterName';
import { XR, XROrigin, createXRStore } from '@react-three/xr';
import { VRInterface } from './VRInterface';
import * as THREE from 'three';
import { COLORS, NAMES, colorIndex } from '../game/data';
import { PLAYER_COLORS } from '../game/playerVisual';
import { useGame } from '../game/store';
import { DicePhysics } from './Dice';
import { FBXChico } from './characters/Chico';
import { FBXPaty } from './characters/Paty';
import { VictoryEffects, Crown, CROWN_TOP_OFFSET } from './VictoryEffects';
import { championEnvelope } from './characterAnimation';
import {
  pawnOffset,
  boardGridPosition,
  startingPawnPosition,
  pawnFloorHeight,
  BOARD_WIDTH,
  BOARD_DEPTH,
} from './diceMath';
import { playSound } from '../game/sounds';
// Ajustes visuais do tabuleiro e dos pinos. Não alterar as posições aprovadas dos números.
const BOARD_VISUAL = {
  tileHeight: 0.14,
  tileSize: [1.03, 0.17, 0.95] as [number, number, number],
  tileRadius: 0.038,
  badgePosition: [0.255, 0.085, -0.255] as [number, number, number],
  numberPosition: [0.255, 0.095, -0.255] as [number, number, number],
  numberSize: 0.205,
  numberOutline: 0.012,
  tileRoughness: 0.74,
  activePawnOpacity: 0.72,
  pawnFadeSpeed: 11,
  pawnStepSeconds: 0.3,
  pawnHopHeight: 0.39,
} as const;
export const PAWN_COLORS = PLAYER_COLORS;
// Geometrias dos pinos compartilhadas entre os jogadores.
const PAWN_BASE = new THREE.CylinderGeometry(0.145, 0.17, 0.13, 20);
const PAWN_BODY = new THREE.CylinderGeometry(0.07, 0.115, 0.23, 20);
const PAWN_HEAD = new THREE.SphereGeometry(0.1, 16, 12);

// Etiqueta plana com cantos arredondados, sem espessura nem sombra 3D.
const NUMBER_BADGE = (() => {
  const w = 0.43,
    h = 0.34,
    r = 0.038;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ShapeGeometry(shape, 4);
})();
// Materiais das casas reutilizados: evita criar 30 materiais equivalentes.
const TILE_MATERIALS = new Map<string, THREE.MeshStandardMaterial>();
function tileMaterial(color: string) {
  let material = TILE_MATERIALS.get(color);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness: BOARD_VISUAL.tileRoughness });
    TILE_MATERIALS.set(color, material);
  }
  return material;
}
const NUMBER_BADGE_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#102d4c',
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
  depthTest: true,
  depthWrite: false,
});

export const xrStore = createXRStore({
  controller: { rayPointer: true, grabPointer: false },
  hand: { rayPointer: true, grabPointer: false },
});
// Coordenadas locais do tabuleiro. O grupo inteiro é escalado e colocado sobre a mesa.
export const boardPosition = boardGridPosition;
function Tile({ n, onTextReady }: { n: number; onTextReady: (key: string) => void }) {
  const [x, , z] = boardPosition(n);
  const color = n === 30 ? '#16a58b' : COLORS[colorIndex(n)];
  const isEvent = n % 5 === 0;
  return (
    <group position={[x, BOARD_VISUAL.tileHeight, z]}>
      <RoundedBox
        args={BOARD_VISUAL.tileSize}
        radius={BOARD_VISUAL.tileRadius}
        smoothness={2}
        castShadow
        receiveShadow
      >
        <primitive object={tileMaterial(color)} attach="material" />
      </RoundedBox>
      {/* Numeracao plana sobre a superficie (topo local da casa y=.085). */}
      <mesh
        name="number-badge"
        renderOrder={30}
        position={BOARD_VISUAL.badgePosition}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <primitive object={NUMBER_BADGE} attach="geometry" />
        <primitive object={NUMBER_BADGE_MATERIAL} attach="material" />
      </mesh>
      <Text
        onSync={() => onTextReady(`number-${n}`)}
        renderOrder={31}
        material-depthWrite={false}
        material-polygonOffset={true}
        material-polygonOffsetFactor={-5}
        material-polygonOffsetUnits={-5}
        position={BOARD_VISUAL.numberPosition}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={BOARD_VISUAL.numberSize}
        color="#ffffff"
        outlineColor="#07192b"
        outlineWidth={BOARD_VISUAL.numberOutline}
        anchorX="center"
        anchorY="middle"
      >
        {n}
      </Text>
      {isEvent && (
        <Text
          onSync={() => onTextReady(`event-${n}`)}
          position={[-0.355, 0.086, -0.355]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.25}
          color="#102d4c"
          anchorX="center"
          anchorY="middle"
        >
          !
        </Text>
      )}
      {(n === 1 || n === 30) && (
        <Text
          onSync={() => onTextReady(`endpoint-${n}`)}
          position={[0, 0.086, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={n === 30 ? 0.148 : 0.18}
          color="#102d4c"
          anchorX="center"
          anchorY="middle"
        >
          {n === 1 ? 'INÍCIO' : 'CHEGADA'}
        </Text>
      )}
    </group>
  );
}
function Token({ index, boardFade }: { index: number; boardFade: React.RefObject<number> }) {
  const position = useGame((state) => state.players[index].position);
  const active = useGame(
    (state) =>
      state.order[state.turnIndex] === index &&
      ['turn', 'rolling', 'question', 'feedback'].includes(state.phase),
  );
  const ref = useRef<THREE.Group>(null);
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  const alpha = useRef(1);
  const current = useRef(position);
  const destination = useRef(position);
  const step = useRef(0);
  const from = useRef(position);
  const [offsetX, offsetZ] = pawnOffset(index);
  const floor = pawnFloorHeight(position);
  useEffect(() => {
    destination.current = position;
  }, [position]);
  useFrame((_, delta) => {
    // A new course/restart must not animate hidden tokens back through every tile.
    if (boardFade.current < 0.05 && destination.current === 0 && current.current !== 0) {
      current.current = 0;
      from.current = 0;
      step.current = 0;
    }
    const target = active ? BOARD_VISUAL.activePawnOpacity : 1;
    alpha.current = THREE.MathUtils.damp(alpha.current, target, BOARD_VISUAL.pawnFadeSpeed, delta);
    if (Math.abs(alpha.current - target) < 0.001) alpha.current = target;
    const visibleAlpha = alpha.current * boardFade.current;
    for (const material of materials.current) {
      if (!material) continue;
      material.opacity = visibleAlpha;
      material.depthWrite = visibleAlpha >= 0.999;
    }
    if (!ref.current) return;
    if (current.current !== destination.current) {
      step.current = Math.min(1, step.current + delta / BOARD_VISUAL.pawnStepSeconds);
      const next = from.current + Math.sign(destination.current - from.current);
      const a = from.current === 0 ? startingPawnPosition(index) : boardPosition(from.current);
      const b = next === 0 ? startingPawnPosition(index) : boardPosition(next);
      const t = step.current;
      const height =
        pawnFloorHeight(from.current) + (pawnFloorHeight(next) - pawnFloorHeight(from.current)) * t;
      ref.current.position.set(
        a[0] + (b[0] + (next === 0 ? 0 : offsetX) - a[0]) * t,
        height + Math.sin(t * Math.PI) * BOARD_VISUAL.pawnHopHeight,
        a[2] + (b[2] + (next === 0 ? 0 : offsetZ) - a[2]) * t,
      );
      if (t >= 1) {
        current.current = next;
        from.current = next;
        step.current = 0;
        if (boardFade.current > 0.5 && destination.current !== 0) playSound('step');
      }
    } else {
      const b =
        current.current === 0 ? startingPawnPosition(index) : boardPosition(current.current);
      ref.current.position.set(
        b[0] + (current.current === 0 ? 0 : offsetX),
        pawnFloorHeight(current.current),
        b[2] + (current.current === 0 ? 0 : offsetZ),
      );
    }
  });
  const start = position === 0 ? startingPawnPosition(index) : boardPosition(position);
  return (
    <group
      ref={ref}
      position={[
        start[0] + (position === 0 ? 0 : offsetX),
        floor,
        start[2] + (position === 0 ? 0 : offsetZ),
      ]}
    >
      {/* Sombra de contato difusa escura; não é anel nem destaque de seleção. */}
      <StaticContactShadow position={[0, -0.006, 0]} size={[0.42, 0.34]} opacity={0.16} />
      <mesh castShadow position={[0, 0.065, 0]}>
        <primitive object={PAWN_BASE} attach="geometry" />
        <meshStandardMaterial
          ref={(m) => {
            if (m) materials.current[0] = m;
          }}
          color={PAWN_COLORS[index]}
          roughness={0.38}
          transparent
          opacity={1}
          depthWrite
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh castShadow position={[0, 0.22, 0]}>
        <primitive object={PAWN_BODY} attach="geometry" />
        <meshStandardMaterial
          ref={(m) => {
            if (m) materials.current[1] = m;
          }}
          color={PAWN_COLORS[index]}
          roughness={0.38}
          transparent
          opacity={1}
          depthWrite
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh castShadow position={[0, 0.365, 0]}>
        <primitive object={PAWN_HEAD} attach="geometry" />
        <meshStandardMaterial
          ref={(m) => {
            if (m) materials.current[2] = m;
          }}
          color={PAWN_COLORS[index]}
          roughness={0.38}
          transparent
          opacity={1}
          depthWrite
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}
function Board() {
  const phase = useGame((s) => s.phase);
  const root = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const lastFade = useRef(-1);
  const readyTexts = useRef(new Set<string>());
  const [textsReady, setTextsReady] = useState(false);
  const cachedMeshes = useRef<Array<{ mesh: THREE.Mesh; layer: number; isText: boolean }>>([]);
  const cachedMaterials = useRef<THREE.Material[]>([]);
  // 30 numeros + 6 marcadores de evento + INICIO e CHEGADA.
  const onTextReady = useCallback((key: string) => {
    if (readyTexts.current.has(key)) return;
    readyTexts.current.add(key);
    if (readyTexts.current.size === 38) setTextsReady(true);
  }, []);
  // Construir a lista uma única vez: antes, cada frame atravessava toda a
  // hierarquia e procurava ancestrais para cada mesh durante o fade.
  useEffect(() => {
    if (!textsReady || !root.current) return;
    const board = root.current;
    const entries: typeof cachedMeshes.current = [];
    const materials = new Set<THREE.Material>();
    board.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      let ancestor: THREE.Object3D | null = mesh;
      let isToken = false;
      let layer = 0;
      while (ancestor && ancestor !== board) {
        if (ancestor.name === 'board-tokens') isToken = true;
        if (ancestor.name === 'board-tiles') layer = 20;
        ancestor = ancestor.parent;
      }
      if (isToken) return;
      const isText = Boolean((mesh as THREE.Mesh & { isTroikaText?: boolean }).isTroikaText);
      if (isText) layer += 10;
      entries.push({ mesh, layer, isText });
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material);
      }
    });
    cachedMeshes.current = entries;
    cachedMaterials.current = [...materials];
    // Nunca tornar o tabuleiro visível para pré-compilar: isso causava
    // um quadro isolado de tabuleiro durante a tela inicial.
  }, [textsReady]);
  // Guarda a opacidade ORIGINAL por material, inclusive textos carregados depois.
  // Não clonamos nem descartamos materiais: evita o bug do StrictMode em que
  // a segunda montagem guardava opacidade=0 como se fosse a original.
  const originals = useRef(
    new WeakMap<
      THREE.Material,
      { opacity: number; transparent: boolean; depthWrite: boolean; alphaHash: boolean }
    >(),
  );
  const revealed = !['choose', 'confirm', 'intro'].includes(phase);
  const canReveal = revealed && textsReady;

  useFrame((_, dt) => {
    const group = root.current;
    if (!group) return;
    const target = canReveal ? 1 : 0;
    progress.current = THREE.MathUtils.damp(progress.current, target, 5.2, Math.min(dt, 0.05));
    if (Math.abs(progress.current - target) < 0.001) progress.current = target;
    const t = progress.current;
    const eased = t * t * (3 - 2 * t);
    // O tabuleiro estático não precisa percorrer dezenas de meshes em todo frame.
    // A passagem final ainda restaura a escrita de profundidade dos materiais.
    const settled = t === target && (t === 0 || t === 1);
    if (settled && lastFade.current === t) return;
    lastFade.current = t;
    // A escala continua, mas a cor-base dos materiais nunca muda.
    group.scale.setScalar(0.4 * (0.94 + 0.06 * eased));
    // Invisível durante seleção; visível assim que o sorteio começa.
    group.visible = canReveal || t > 0.001;
    for (const { mesh, layer, isText } of cachedMeshes.current) {
      // Preservar as posições e as prioridades das placas e números.
      if (mesh.name === 'number-badge') mesh.renderOrder = 30;
      else if (isText) mesh.renderOrder = 31;
      else mesh.renderOrder = t >= 0.999 ? 0 : layer;
    }
    // Materiais compartilhados entre várias casas são atualizados uma única vez.
    for (const material of cachedMaterials.current) {
      if (!originals.current.has(material)) {
        originals.current.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
          alphaHash: material.alphaHash,
        });
      }
      const original = originals.current.get(material)!;
      const fading = t < 0.999;
      // Sem alphaHash, e sem deixar o tabuleiro permanentemente transparente.
      if (
        material.transparent !== (fading || original.transparent) ||
        material.depthWrite !== (fading ? false : original.depthWrite) ||
        material.alphaHash
      ) {
        material.transparent = fading || original.transparent;
        material.depthWrite = fading ? false : original.depthWrite;
        material.alphaHash = false;
        material.needsUpdate = true;
      }
      material.opacity = original.opacity * (fading ? eased : 1);
    }
  });
  return (
    <group ref={root} position={[0, 1.04, 0]} scale={0.4} visible={false}>
      {/* Estrutura contínua: moldura inferior, friso fino e superfície superior. */}
      <RoundedBox
        args={[BOARD_WIDTH + 0.24, 0.2, BOARD_DEPTH + 0.24]}
        radius={0.1}
        position={[0, -0.12, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#9b744e" roughness={0.68} />
      </RoundedBox>
      {/* Friso interno de madeira: sem criar um novo plano acima das casas. */}
      <RoundedBox
        args={[BOARD_WIDTH + 0.17, 0.095, BOARD_DEPTH + 0.17]}
        radius={0.075}
        position={[0, -0.045, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#69472f" roughness={0.78} />
      </RoundedBox>
      <RoundedBox
        args={[BOARD_WIDTH + 0.1, 0.07, BOARD_DEPTH + 0.1]}
        radius={0.065}
        position={[0, -0.004, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#205a80" roughness={0.58} />
      </RoundedBox>
      <RoundedBox
        args={[BOARD_WIDTH, 0.055, BOARD_DEPTH]}
        radius={0.055}
        position={[0, 0.05, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#102d4c" roughness={0.86} />
      </RoundedBox>
      {NAMES.map((_, i) => {
        const [x, , z] = startingPawnPosition(i);
        return (
          <group key={`base-${i}`} position={[x, 0.071, z]}>
            <RoundedBox args={[0.68, 0.095, 0.68]} radius={0.055} castShadow receiveShadow>
              <meshStandardMaterial color="#8a5c34" roughness={0.78} />
            </RoundedBox>
            <RoundedBox
              args={[0.59, 0.025, 0.59]}
              radius={0.035}
              position={[0, 0.06, 0]}
              receiveShadow
            >
              <meshStandardMaterial color="#d5ad77" roughness={0.83} />
            </RoundedBox>
            <mesh position={[0, 0.074, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.45, 0.45]} />
              <meshStandardMaterial
                color={PAWN_COLORS[i]}
                transparent
                opacity={0.23}
                roughness={0.85}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
      <group name="board-tiles">
        {Array.from({ length: 30 }, (_, n) => (
          <Tile key={n + 1} n={n + 1} onTextReady={onTextReady} />
        ))}
      </group>
      <group name="board-tokens">
        {NAMES.map((_, i) => (
          <Token key={i} index={i} boardFade={progress} />
        ))}
      </group>
    </group>
  );
}
// Sombra de contato precomputada: textura radial compartilhada, sem shadow maps.
const CONTACT_SHADOW_TEXTURE = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,.85)');
    g.addColorStop(0.45, 'rgba(0,0,0,.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function StaticContactShadow({
  position,
  size,
  opacity = 0.22,
}: {
  position: [number, number, number];
  size: [number, number];
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={CONTACT_SHADOW_TEXTURE}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}
function Desk() {
  return (
    <group>
      <StaticContactShadow position={[0, 0.005, 0]} size={[5.7, 5.7]} opacity={0.19} />
      {/* Tampão sólido, friso discreto e estrutura interna sem pernas suspensas. */}
      <RoundedBox
        args={[5.0, 0.17, 5.0]}
        radius={0.055}
        position={[0, 0.895, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#916944" roughness={0.68} />
      </RoundedBox>
      <RoundedBox args={[4.88, 0.045, 4.88]} radius={0.026} position={[0, 0.999, 0]} receiveShadow>
        <meshStandardMaterial color="#c69b6e" roughness={0.77} />
      </RoundedBox>
      {[-2.2, 2.2].flatMap((x) =>
        [-2.2, 2.2].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0.41, z]}>
            <RoundedBox args={[0.19, 0.82, 0.19]} radius={0.025} castShadow>
              <meshStandardMaterial color="#465766" metalness={0.22} roughness={0.62} />
            </RoundedBox>
            <mesh position={[0, -0.39, 0]}>
              <boxGeometry args={[0.25, 0.035, 0.25]} />
              <meshStandardMaterial color="#2c3740" />
            </mesh>
          </group>
        )),
      )}
      {[-2.19, 2.19].map((z) => (
        <mesh key={z} position={[0, 0.72, z]}>
          <boxGeometry args={[4.42, 0.17, 0.11]} />
          <meshStandardMaterial color="#66503d" roughness={0.7} />
        </mesh>
      ))}
      {[-2.19, 2.19].map((x) => (
        <mesh key={x} position={[x, 0.72, 0]}>
          <boxGeometry args={[0.11, 0.17, 4.42]} />
          <meshStandardMaterial color="#66503d" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
const themes = [
  { skin: '#e3ae8e', hair: '#392d34', pants: '#343e60' },
  { skin: '#b97658', hair: '#211b24', pants: '#353b4d' },
  { skin: '#b98a6a', hair: '#30211a', pants: '#2a3242' },
];
function Chair({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <StaticContactShadow position={[0, 0.008, 0]} size={[1.55, 1.5]} opacity={0.27} />
      <RoundedBox args={[1.15, 0.15, 1.07]} radius={0.09} position={[0, 0.73, 0]} castShadow>
        <meshStandardMaterial color="#304e68" roughness={0.87} />
      </RoundedBox>
      <RoundedBox args={[1.11, 1.03, 0.13]} radius={0.075} position={[0, 1.36, -0.48]} castShadow>
        <meshStandardMaterial color="#304e68" roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.19, 12]} />
        <meshStandardMaterial color="#556574" metalness={0.25} />
      </mesh>
      {[-0.42, 0.42].flatMap((x) =>
        [-0.39, 0.39].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.31, z]} castShadow>
            <boxGeometry args={[0.075, 0.62, 0.075]} />
            <meshStandardMaterial color="#465766" metalness={0.24} roughness={0.66} />
          </mesh>
        )),
      )}
    </group>
  );
}
// Personagem sentado no eixo +Z. As articulações ficam em grupos separados para futura troca por GLB rigado.
function SeatedTeacher({
  index,
  position,
  rotation,
}: {
  index: number;
  position: [number, number, number];
  rotation: number;
}) {
  const left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null);
  const p = themes[index - 1];
  const winner = useGame((st) => st.winner);
  const debugReaction = useGame((st) => st.debugReaction);
  const victoryNonce = useGame((st) => st.debugVictoryNonce);
  const lastDebugNonce = useRef(0);
  const phase = useGame((st) => st.phase),
    active = useGame((st) => st.order[st.turnIndex]),
    dice = useGame((st) => st.die),
    outcome = useGame((st) => st.outcome);
  const throwStart = useRef(-100),
    lastPhase = useRef(phase),
    shakeStart = useRef(-100),
    prepareStart = useRef(-100),
    lastPreparing = useRef(false),
    championStart = useRef(-100),
    wasChampion = useRef(false),
    lastVictoryNonce = useRef(victoryNonce);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + index * 2;
    if (debugReaction?.player === index && debugReaction.nonce !== lastDebugNonce.current) {
      if (debugReaction.kind === 'wrong') shakeStart.current = clock.elapsedTime;
      else throwStart.current = clock.elapsedTime;
      lastDebugNonce.current = debugReaction.nonce;
    }
    const championNow = phase === 'finished' && winner === index;
    if (championNow && (!wasChampion.current || lastVictoryNonce.current !== victoryNonce))
      championStart.current = clock.elapsedTime;
    lastVictoryNonce.current = victoryNonce;
    wasChampion.current = championNow;
    const champion = championNow ? championEnvelope(clock.elapsedTime - championStart.current) : 0;
    const state = useGame.getState();
    const preparing =
      (phase === 'turn' && active === index) ||
      (phase === 'lottery' && state.eligible[state.lotteryIndex] === index);
    if (preparing && !lastPreparing.current) prepareStart.current = clock.elapsedTime;
    lastPreparing.current = preparing;
    const prepTime = clock.elapsedTime - prepareStart.current;
    const prepShake = preparing
      ? Math.sin(prepTime * 20) * 0.19 * THREE.MathUtils.smoothstep(prepTime, 0, 0.15)
      : 0;
    if (lastPhase.current !== phase) {
      if (phase === 'rolling' && active === index) throwStart.current = clock.elapsedTime;
      if (phase === 'feedback' && active === index && outcome !== 'correct')
        shakeStart.current = clock.elapsedTime;
      lastPhase.current = phase;
    }
    if (left.current) {
      left.current.rotation.x = -0.32 + Math.sin(t * 1.3) * 0.13 - champion * 2.1;
      left.current.rotation.z = -champion * 0.12;
    }
    if (right.current) {
      const elapsed = clock.elapsedTime - throwStart.current;
      const throwing = active === index && dice !== null && elapsed >= 0 && elapsed < 1.3;
      const pulse = throwing ? Math.sin((elapsed / 1.3) * Math.PI) * 1.05 : 0;
      right.current.rotation.x =
        -0.32 + Math.sin(t * 1.1) * 0.16 - pulse + prepShake - champion * 2.1;
      right.current.rotation.z = champion
        ? champion * 0.12
        : throwing
          ? -0.22
          : preparing
            ? -0.11
            : 0;
    }
    if (head.current) {
      const sh = clock.elapsedTime - shakeStart.current;
      const shake =
        sh >= 0 && sh < 1.2 ? Math.sin(sh * 14) * Math.sin((Math.PI * sh) / 1.2) * 0.3 : 0;
      head.current.rotation.y = Math.sin(t * 0.7) * 0.18 + Math.sin(t * 0.23) * 0.05 + shake;
      head.current.rotation.z = Math.sin(t * 0.9) * 0.035;
      head.current.rotation.x = Math.sin(t * 0.61) * 0.035 + Math.abs(shake) * 0.14;
    }
    if (eyes.current) eyes.current.scale.y = t % 4.5 < 0.14 ? 0.08 : 1;
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Chair position={[0, 0, -0.1]} />
      <mesh position={[0, 1.12, 0]} castShadow>
        <capsuleGeometry args={[0.33, 0.46, 4, 12]} />
        <meshStandardMaterial color="#142d51" />
      </mesh>
      <mesh position={[0, 1.08, 0.325]}>
        <boxGeometry args={[0.33, 0.13, 0.025]} />
        <meshStandardMaterial color="#f5f7ff" />
      </mesh>
      <Text position={[0, 1.08, 0.342]} fontSize={0.1} color="#173a67">
        Senac
      </Text>
      <mesh position={[0, 0.79, 0.03]}>
        <boxGeometry args={[0.59, 0.24, 0.49]} />
        <meshStandardMaterial color={p.pants} />
      </mesh>
      {[-0.18, 0.18].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.67, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.14, 0.5, 4, 10]} />
            <meshStandardMaterial color={p.pants} />
          </mesh>
          <mesh position={[x, 0.36, 0.67]}>
            <capsuleGeometry args={[0.13, 0.42, 4, 10]} />
            <meshStandardMaterial color={p.pants} />
          </mesh>
          <mesh position={[x, 0.13, 0.78]}>
            <boxGeometry args={[0.27, 0.14, 0.44]} />
            <meshStandardMaterial color="#283343" />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} ref={side === -1 ? left : right} position={[side * 0.37, 1.39, 0.02]}>
          <mesh position={[side * 0.09, -0.23, 0.08]} rotation={[0.3, 0, side * 0.15]}>
            <capsuleGeometry args={[0.1, 0.42, 4, 10]} />
            <meshStandardMaterial color={p.skin} />
          </mesh>
          <mesh position={[side * 0.05, -0.06, 0]}>
            <capsuleGeometry args={[0.14, 0.13, 4, 10]} />
            <meshStandardMaterial color="#142d51" />
          </mesh>
          <mesh position={[side * 0.12, -0.48, 0.22]}>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color={p.skin} />
          </mesh>
        </group>
      ))}
      <group ref={head} position={[0, 1.77, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.29, 18, 14]} />
          <meshStandardMaterial color={p.skin} />
        </mesh>
        <mesh position={[0, 0.17, -0.08]} scale={[1, 0.62, 0.86]}>
          <sphereGeometry args={[0.31, 14, 12]} />
          <meshStandardMaterial color={p.hair} />
        </mesh>
        <group ref={eyes}>
          {[-0.105, 0.105].map((x) => (
            <mesh key={x} position={[x, 0.025, 0.273]}>
              <sphereGeometry args={[0.027, 8, 8]} />
              <meshStandardMaterial color="#172436" />
            </mesh>
          ))}
        </group>
        <mesh position={[0, -0.13, 0.275]} scale={[1, 0.2, 1]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#884c51" />
        </mesh>
      </group>
      <CharacterName
        name={NAMES[index]}
        height={
          phase === 'finished' && winner === index
            ? 2.28 + CROWN_TOP_OFFSET * 0.92 + (2.3 - 2.13)
            : 2.3
        }
        color={PAWN_COLORS[index]}
      />
      {phase === 'finished' && winner === index && <Crown position={[0, 2.28, 0]} scale={0.92} />}
    </group>
  );
}
function Shelf({
  position,
  rotation = 0,
  boxes = false,
}: {
  position: [number, number, number];
  rotation?: number;
  boxes?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1.1, -0.35, 0.4, 1.15].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[2.3, 0.09, 0.48]} />
          <meshStandardMaterial color="#a98560" />
        </mesh>
      ))}
      {[-1.08, 1.08].map((x) => (
        <mesh key={x}>
          <mesh position={[x, 0, 0]}>
            <boxGeometry args={[0.1, 2.55, 0.5]} />
            <meshStandardMaterial color="#5c6e77" />
          </mesh>
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.78 + (i % 3) * 0.77, -0.76 + Math.floor(i / 3) * 0.75, 0.03]}>
          <boxGeometry args={[boxes ? 0.51 : 0.15, boxes ? 0.42 : 0.42, 0.31]} />
          <meshStandardMaterial
            color={
              boxes
                ? ['#c69c6d', '#b88754', '#d4b082'][i % 3]
                : ['#318fba', '#de9c51', '#5e9f8e'][i % 3]
            }
          />
        </mesh>
      ))}
    </group>
  );
}
function WallPanel({
  position,
  rotation = 0,
  title,
  subtitle,
  color,
}: {
  position: [number, number, number];
  rotation?: number;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[4.5, 1.35, 0.1]} radius={0.08}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      <Text
        position={[0, 0.24, 0.075]}
        fontSize={0.27}
        maxWidth={4.0}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        lineHeight={1.15}
        color="white"
      >
        {title === 'TECNOLOGIA DA INFORMAÇÃO' ? 'TECNOLOGIA DA\nINFORMAÇÃO' : title}
      </Text>
      <Text
        position={[0, -0.43, 0.075]}
        fontSize={0.15}
        maxWidth={4.1}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#f1f5f9"
      >
        {subtitle}
      </Text>
    </group>
  );
}
function Computer({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.95, 0.62, 0.09]} />
        <meshStandardMaterial color="#24344b" />
      </mesh>
      <mesh position={[0, 0.55, 0.055]}>
        <planeGeometry args={[0.82, 0.49]} />
        <meshBasicMaterial color="#126f83" />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.07, 0.27, 0.08]} />
        <meshStandardMaterial color="#667b8d" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.48, 0.05, 0.3]} />
        <meshStandardMaterial color="#667b8d" />
      </mesh>
    </group>
  );
}
function NetworkRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 0.62]} />
        <meshStandardMaterial color="#1b2c42" />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[0, 0.27 + i * 0.21, 0.33]}>
          <mesh>
            <boxGeometry args={[0.8, 0.14, 0.04]} />
            <meshStandardMaterial color="#405b71" />
          </mesh>
          <mesh position={[0.26, 0, 0.03]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color={i % 2 ? '#F7941D' : '#3cdb8e'} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function WallDecor() {
  return (
    <>
      {/* Quatro painéis alinhados às paredes; sem placas sobrepostas. */}
      <WallPanel
        position={[0, 3.35, -7.8]}
        title="TECNOLOGIA DA INFORMAÇÃO"
        subtitle="Programação • Redes • Suporte"
        color="#1b5c87"
      />
      <WallPanel
        position={[0, 3.35, 7.8]}
        rotation={Math.PI}
        title="SAÚDE ADMINISTRATIVA"
        subtitle="Atendimento • Agendamento"
        color="#238779"
      />
      <WallPanel
        position={[-7.8, 3.35, 0]}
        rotation={Math.PI / 2}
        title="ADMINISTRAÇÃO"
        subtitle="Gestão • RH • Finanças"
        color="#8559a0"
      />
      <WallPanel
        position={[7.8, 3.35, 0]}
        rotation={-Math.PI / 2}
        title="LOGÍSTICA E VENDAS"
        subtitle="Estoque • Transporte • Comércio"
        color="#bb7136"
      />
      <Shelf position={[-4.5, 1.3, -7.15]} />
      <Shelf position={[4.5, 1.3, 7.15]} rotation={Math.PI} boxes />
      <Shelf position={[7.12, 1.3, 4.5]} rotation={-Math.PI / 2} boxes />
      <NetworkRack position={[5.9, 0.12, -7.15]} />
      <mesh position={[0, 1.32, -7.3]}>
        <boxGeometry args={[4.8, 0.13, 0.8]} />
        <meshStandardMaterial color="#8295a4" />
      </mesh>
      {[-1.5, 0, 1.5].map((x) => (
        <Computer key={x} position={[x, 1.45, -7.15]} />
      ))}
    </>
  );
}
function FixedSeatCamera() {
  const { camera, gl } = useThree();
  const yaw = useRef(0),
    pitch = useRef(-0.28),
    drag = useRef(false),
    last = useRef([0, 0]);
  const targetZoom = useRef(65);
  const smoothZoom = useRef(65);
  useEffect(() => {
    camera.position.set(0, 1.91, 3.32);
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = true;
      last.current = [e.clientX, e.clientY];
    };
    const up = () => {
      drag.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      yaw.current = THREE.MathUtils.clamp(
        yaw.current - (e.clientX - last.current[0]) * 0.004,
        -Math.PI,
        Math.PI,
      );
      pitch.current = Math.max(
        -1.2,
        Math.min(1.2, pitch.current - (e.clientY - last.current[1]) * 0.004),
      );
      last.current = [e.clientX, e.clientY];
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoom.current = Math.max(36, Math.min(65, targetZoom.current + e.deltaY * 0.035));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
    };
  }, [camera, gl]);
  useFrame(({ gl }, delta) => {
    if (gl.xr.isPresenting) return;
    camera.position.set(0, 1.91, 3.32);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);
    // Amortecimento exponencial independente de FPS; atualiza a projeção só quando necessário.
    const smoothing = 1 - Math.exp(-9 * Math.min(delta, 0.1));
    smoothZoom.current += (targetZoom.current - smoothZoom.current) * smoothing;
    if (Math.abs(targetZoom.current - smoothZoom.current) < 0.005)
      smoothZoom.current = targetZoom.current;
    if (
      camera instanceof THREE.PerspectiveCamera &&
      Math.abs(camera.fov - smoothZoom.current) > 0.0001
    ) {
      camera.fov = smoothZoom.current;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
function Classroom() {
  return (
    <>
      <color attach="background" args={['#e4e8e7']} />
      <ambientLight intensity={0.66} />
      <hemisphereLight args={['#fff3dc', '#819bb0', 0.88]} />
      <directionalLight position={[3, 9, 5]} intensity={2.25} color="#ffe5bc" />
      <directionalLight position={[-4, 5, -3]} intensity={0.55} color="#b4d5ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#d8e0dd" />
      </mesh>
      <mesh position={[0, 2.6, -8]}>
        <boxGeometry args={[16, 5.2, 0.18]} />
        <meshStandardMaterial color="#e6edf0" />
      </mesh>
      <mesh position={[0, 2.6, 8]}>
        <boxGeometry args={[16, 5.2, 0.18]} />
        <meshStandardMaterial color="#e6edf0" />
      </mesh>
      <mesh position={[-8, 2.6, 0]}>
        <boxGeometry args={[0.18, 5.2, 16]} />
        <meshStandardMaterial color="#f0eae0" />
      </mesh>
      <mesh position={[8, 2.6, 0]}>
        <boxGeometry args={[0.18, 5.2, 16]} />
        <meshStandardMaterial color="#f0eae0" />
      </mesh>
      <mesh position={[0, 5.23, 0]}>
        <boxGeometry args={[16, 0.15, 16]} />
        <meshStandardMaterial color="#f6f5ef" />
      </mesh>
      {[
        [-4, -4],
        [4, -4],
        [-4, 4],
        [4, 4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 5.09, z]}>
          <boxGeometry args={[1.6, 0.04, 0.5]} />
          <meshBasicMaterial color="#fff5db" />
        </mesh>
      ))}
      {/* Rodapés finos, embutidos no perímetro, sem placas novas. */}
      {[-7.88, 7.88].map((z) => (
        <mesh key={z} position={[0, 0.095, z]}>
          <boxGeometry args={[15.8, 0.18, 0.065]} />
          <meshStandardMaterial color="#a3b1b7" roughness={0.85} />
        </mesh>
      ))}
      {[-7.88, 7.88].map((x) => (
        <mesh key={x} position={[x, 0.095, 0]}>
          <boxGeometry args={[0.065, 0.18, 15.8]} />
          <meshStandardMaterial color="#a3b1b7" roughness={0.85} />
        </mesh>
      ))}
      <WallDecor />
      <Desk />
      <DicePhysics />
      <VictoryEffects />
      <Chair position={[0, 0, -3.18]} rotation={0} />
      <FBXPaty position={[0, 0, -3.18]} rotation={0} />
      <SeatedTeacher index={1} position={[3.18, 0, 0]} rotation={-Math.PI / 2} />
      <Chair position={[-3.18, 0, 0]} rotation={Math.PI / 2} />
      <FBXChico position={[-3.18, 0, 0]} rotation={Math.PI / 2} />
      <Chair position={[0, 0, 3.18]} rotation={Math.PI} />
    </>
  );
}
export function World() {
  const mobileXR =
    typeof navigator !== 'undefined' && /OculusBrowser|Quest|Android/i.test(navigator.userAgent);
  const quality = mobileXR ? 1 : 1.5;
  return (
    <>
      <Canvas
        dpr={[1, quality]}
        shadows={false}
        camera={{ position: [0, 1.91, 3.32], fov: 65 }}
        gl={{ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false }}
      >
        <XR store={xrStore}>
          <XROrigin position={[0, 0.28, 3.32]} />
          <VRInterface />
          <Classroom />
          <Board />
        </XR>
        <FixedSeatCamera />
      </Canvas>
    </>
  );
}

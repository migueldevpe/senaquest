import { POPPINS_3D } from './poppins';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { XR, XROrigin, createXRStore } from '@react-three/xr';
import { VRInterface } from './VRInterface';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { COLORS, NAMES, colorIndex } from '../game/data';
import { PLAYER_COLORS } from '../game/playerVisual';
import { useGame } from '../game/store';
import { DicePhysics } from './Dice';
import { FBXChico } from './characters/Chico';
import { FBXPaty } from './characters/Paty';
import { FBXClaudinha } from './characters/Claudinha';
import { VictoryEffects } from './VictoryEffects';
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
  pawnFadeSpeed: 3.5,
  pawnStepSeconds: 0.3,
  pawnHopHeight: 0.39,
} as const;
export const PAWN_COLORS = PLAYER_COLORS;
// O visual do Peão de Jornada vem do FBX; a lógica de movimento permanece neste arquivo.

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
  toneMapped: false, // cor exata do HUD da casa, sem ajuste pela iluminacao do ambiente
});
// Destaque somente na plaquinha do numero; a cor pedagogica da casa nao muda.
const BENEFIT_BADGE_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#168449',
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
  depthTest: true,
  depthWrite: false,
  toneMapped: false,
});
const PENALTY_BADGE_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#bd3434',
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
  depthTest: true,
  depthWrite: false,
  toneMapped: false,
});
const BENEFIT_HOUSES = new Set([11, 18, 25]);
const PENALTY_HOUSES = new Set([10, 12, 17, 19, 24, 26]);

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
        <primitive
          object={
            BENEFIT_HOUSES.has(n)
              ? BENEFIT_BADGE_MATERIAL
              : PENALTY_HOUSES.has(n)
                ? PENALTY_BADGE_MATERIAL
                : NUMBER_BADGE_MATERIAL
          }
          attach="material"
        />
      </mesh>
      <Text
        font={POPPINS_3D}
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
          font={POPPINS_3D}
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
          font={POPPINS_3D}
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
/** Peão de Jornada: uma instância colorida por personagem, sem alterar regras ou movimento. */
function JourneyPawn({
  index,
  materials,
}: {
  index: number;
  materials: React.RefObject<THREE.MeshStandardMaterial[]>;
}) {
  const source = useLoader(FBXLoader, '/models/pawn/pawn.fbx');
  const model = useMemo(() => {
    const instance = source.clone(true);
    // Normaliza a altura e apoia a base no chão, independentemente das unidades do FBX.
    instance.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(instance);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 0.47 / Math.max(size.y, 0.0001);
    instance.scale.multiplyScalar(scale);
    instance.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(instance);
    instance.position.y -= scaled.min.y;
    const center = scaled.getCenter(new THREE.Vector3());
    instance.position.x -= center.x;
    instance.position.z -= center.z;
    const ownMaterials: THREE.MeshStandardMaterial[] = [];
    instance.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      // Material próprio por jogador para preservar cor e transparência independentes.
      const original = Array.isArray(object.material) ? object.material : [object.material];
      const colored = original.map(() => {
        const material = new THREE.MeshStandardMaterial({
          color: PLAYER_COLORS[index],
          roughness: 0.38,
          metalness: 0.08,
          transparent: true,
          opacity: 1,
          depthWrite: true,
          side: THREE.FrontSide,
        });
        ownMaterials.push(material);
        return material;
      });
      object.material = Array.isArray(object.material) ? colored : colored[0];
    });
    return { instance, ownMaterials };
  }, [source, index]);
  useEffect(() => {
    materials.current = model.ownMaterials;
    return () => {
      if (materials.current === model.ownMaterials) materials.current = [];
      model.ownMaterials.forEach((material) => material.dispose());
    };
  }, [materials, model]);
  return <primitive object={model.instance} />;
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
    if (Math.abs(alpha.current - target) < 0.0005) alpha.current = target;
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
      <JourneyPawn index={index} materials={materials} />
    </group>
  );
}
function Board() {
  const phase = useGame((s) => s.phase);
  const root = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const readyTexts = useRef(new Set<string>());
  const [textsReady, setTextsReady] = useState(false);
  // O tabuleiro não modifica materiais compartilhados nem o estado do renderer.
  // Isso elimina a mutação de shaders/transparência no instante do sorteio.
  const onTextReady = useCallback((key: string) => {
    if (readyTexts.current.has(key)) return;
    readyTexts.current.add(key);
    if (readyTexts.current.size === 38) setTextsReady(true);
  }, []);
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
    // Entrada por escala apenas. Nunca tocar em opacity, transparent,
    // depthWrite, alphaHash ou renderOrder de materiais da cena.
    group.scale.setScalar(0.4 * (0.94 + 0.06 * eased));
    group.visible = canReveal || t > 0.001;
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
    <group name="zoom-blocker-table">
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
// Cadeira FBX compartilhada pelos quatro lugares; ajustes globais.
const TEST_CHAIR = {
  height: 1.9, // altura total da cadeira em metros no mundo virtual
  offset: [0, 0, 0] as [number, number, number], // X, Y, Z locais
  yaw: 0, // rotação adicional local em radianos
};
// Ajustes exclusivos da cadeira do jogador principal (+Z).
const PLAYER_CHAIR = {
  height: 1.9,
  offset: [0, 0, -0.25] as [number, number, number],
  yaw: 0,
};
function TestFBXChair({
  position,
  rotation = 0,
  player = false,
}: {
  position: [number, number, number];
  rotation?: number;
  player?: boolean;
}) {
  const config = player ? PLAYER_CHAIR : TEST_CHAIR;
  const source = useLoader(FBXLoader, '/models/main_chair/main_chair.fbx');
  const chairTexture = useLoader(THREE.TextureLoader, '/models/main_chair/main_chair-color.webp');
  chairTexture.colorSpace = THREE.SRGBColorSpace;
  chairTexture.flipY = true;
  const { model, scale, centerX, minY, centerZ } = useMemo(() => {
    const model = source.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = true;
        // Material independente por instância: preserva o FBX e permite ajustar o acabamento.
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const adjusted = materials.map((original) => {
          const material = original.clone();
          if (material instanceof THREE.MeshStandardMaterial) {
            if (node.geometry.getAttribute('uv')) material.map = chairTexture;
            material.color.set('#ffffff');
            material.roughness = 1;
            material.metalness = 0;
            material.transparent = false;
            material.opacity = 1;
            material.needsUpdate = true;
          } else if (material instanceof THREE.MeshPhongMaterial) {
            if (node.geometry.getAttribute('uv')) material.map = chairTexture;
            material.color.set('#ffffff');
            material.specular.set('#000000');
            material.shininess = 0;
            material.transparent = false;
            material.opacity = 1;
            material.needsUpdate = true;
          }
          return material;
        });
        node.material = Array.isArray(node.material) ? adjusted : adjusted[0];
      }
    });
    return {
      model,
      scale: config.height / Math.max(size.y, 0.001),
      centerX: center.x,
      minY: bounds.min.y,
      centerZ: center.z,
    };
  }, [source, chairTexture, config.height]);
  return (
    <group
      name={player ? 'zoom-blocker-chair' : undefined}
      position={position}
      rotation={[0, rotation, 0]}
    >
      <group position={config.offset} rotation={[0, config.yaw, 0]}>
        <group scale={scale}>
          <primitive object={model} position={[-centerX, -minY, -centerZ]} />
        </group>
      </group>
    </group>
  );
}
// Personagem sentado no eixo +Z. As articulações ficam em grupos separados para futura troca por GLB rigado.
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
        font={POPPINS_3D}
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
        font={POPPINS_3D}
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
const DESKTOP_CAMERA_HEIGHT_BONUS = 0.2;
const VR_CAMERA_HEIGHT_BONUS = 0.5;
const VR_TARGET_INITIAL_EYE_HEIGHT = 1.8;
const VR_MAX_CALIBRATION_ADJUSTMENT = 0.2;

// Calibra apenas uma vez por sessão, mantendo os movimentos reais da cabeça.
function CalibratedXROrigin() {
  const { gl } = useThree();
  const origin = useRef<THREE.Group>(null);
  const frames = useRef(0);
  const calibrated = useRef(false);
  useEffect(() => {
    const reset = () => {
      frames.current = 0;
      calibrated.current = false;
      if (origin.current) origin.current.position.y = VR_CAMERA_HEIGHT_BONUS;
    };
    gl.xr.addEventListener('sessionstart', reset);
    gl.xr.addEventListener('sessionend', reset);
    return () => {
      gl.xr.removeEventListener('sessionstart', reset);
      gl.xr.removeEventListener('sessionend', reset);
    };
  }, [gl]);
  useFrame(() => {
    if (!gl.xr.isPresenting || calibrated.current || !origin.current) return;
    if (++frames.current < 20) return;
    const headset = gl.xr.getCamera();
    headset.updateWorldMatrix(true, false);
    const measuredHeight = headset.getWorldPosition(new THREE.Vector3()).y;
    if (!Number.isFinite(measuredHeight) || measuredHeight < 0.3) return;
    const adjustment = THREE.MathUtils.clamp(
      VR_TARGET_INITIAL_EYE_HEIGHT - measuredHeight,
      -VR_MAX_CALIBRATION_ADJUSTMENT,
      VR_MAX_CALIBRATION_ADJUSTMENT,
    );
    origin.current.position.y = VR_CAMERA_HEIGHT_BONUS + adjustment;
    calibrated.current = true;
  });
  return (
    <group ref={origin} position={[0, VR_CAMERA_HEIGHT_BONUS, 0]}>
      <VRPinchCameraRig />
    </group>
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
    camera.position.set(0, 1.91 + DESKTOP_CAMERA_HEIGHT_BONUS, 3.32);
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
    camera.position.set(0, 1.91 + DESKTOP_CAMERA_HEIGHT_BONUS, 3.32);
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
/**
 * Iluminacao da sala, isolada do provider WebXR e das mudancas de fase.
 * Ha uma unica instancia de cada luz em toda a sessao, criada acima de XR.
 * Os valores sao os mesmos da versao anterior; nenhum ajuste estetico aqui.
 */
const STABLE_LIGHTS = {
  ambient: { intensity: 0.66, color: '#ffffff' },
  hemisphere: { intensity: 0.65, sky: '#ffffff', ground: '#b8c2c9' },
  directional: {
    intensity: 1.1,
    color: '#ffffff',
    position: [3, 9, 5] as [number, number, number],
  },
} as const;
const STABLE_LIGHT_NAMES = new Set([
  'senaquest-light-ambient',
  'senaquest-light-hemisphere',
  'senaquest-light-directional',
]);
function StableRoomLighting() {
  const { scene } = useThree();
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const phase = useGame((state) => state.phase);
  const lastPhase = useRef<string | null>(null);
  const sampling = useRef(0);
  const warned = useRef(new Set<string>());

  useFrame((state, delta) => {
    const ambient = ambientRef.current;
    const hemisphere = hemisphereRef.current;
    const directional = directionalRef.current;
    if (!ambient || !hemisphere || !directional) return;
    // Repõe o contrato luminoso se alguma biblioteca mudar as luzes existentes.
    ambient.intensity = STABLE_LIGHTS.ambient.intensity;
    hemisphere.intensity = STABLE_LIGHTS.hemisphere.intensity;
    directional.intensity = STABLE_LIGHTS.directional.intensity;
    ambient.color.set(STABLE_LIGHTS.ambient.color);
    hemisphere.color.set(STABLE_LIGHTS.hemisphere.sky);
    hemisphere.groundColor.set(STABLE_LIGHTS.hemisphere.ground);
    directional.color.set(STABLE_LIGHTS.directional.color);
    directional.position.set(...STABLE_LIGHTS.directional.position);
    ambient.visible = hemisphere.visible = directional.visible = true;

    // Inspecionar outras fontes de luz no inicio de cada fase e a cada 0,5s;
    // atravessar a cena a cada quadro prejudicaria o desempenho do Quest.
    sampling.current += delta;
    const changedPhase = lastPhase.current !== phase;
    if (!changedPhase && sampling.current < 0.5) return;
    sampling.current = 0;
    lastPhase.current = phase;
    const lights: THREE.Light[] = [];
    scene.traverse((object) => {
      // `isLight` tambem identifica objetos de outra copia de Three.js.
      if ((object as unknown as THREE.Light).isLight) {
        lights.push(object as unknown as THREE.Light);
      }
    });
    const rogue = lights.filter((light) => !STABLE_LIGHT_NAMES.has(light.name));
    // So ha 3 luzes autorizadas em todo o projeto. Luzes extras sao
    // desativadas preventivamente para nao alterar o brilho na entrada.
    // `isLight` acima cobre tambem instancias de Three.js distintas.
    for (const light of rogue) light.visible = false;
    if (rogue.length && import.meta.env.DEV) {
      for (const light of rogue) {
        if (warned.current.has(light.uuid)) continue;
        warned.current.add(light.uuid);
        console.warn('[SENAQUEST] Luz externa detectada; possivel causa de alteracao de brilho:', {
          name: light.name,
          type: light.type,
          intensity: light.intensity,
          uuid: light.uuid,
        });
      }
    }
    if (changedPhase && import.meta.env.DEV) {
      const summary = lights.map((light) => ({
        name: light.name || '(sem nome)',
        type: light.type,
        intensity: Number(light.intensity.toFixed(3)),
        visible: light.visible,
        color: '#' + light.color.getHexString(),
        position: light.position.toArray().map((n) => Number(n.toFixed(3))),
      }));
      // String serializada no momento da medicao: o DevTools nao mostrara
      // o estado posterior de um objeto por referencia.
      console.info(
        '[SENAQUEST] LUZES FIXAS / fase=' +
          phase +
          ' ' +
          JSON.stringify({
            count: lights.length,
            lights: summary,
            xr: state.gl.xr.isPresenting,
            colorManagement: THREE.ColorManagement.enabled,
            renderer: {
              toneMapping: state.gl.toneMapping,
              exposure: state.gl.toneMappingExposure,
              colorSpace: state.gl.outputColorSpace,
            },
          }),
      );
    }
  }, -101);
  return (
    <>
      <ambientLight
        ref={ambientRef}
        name="senaquest-light-ambient"
        color={STABLE_LIGHTS.ambient.color}
        intensity={STABLE_LIGHTS.ambient.intensity}
      />
      <hemisphereLight
        ref={hemisphereRef}
        name="senaquest-light-hemisphere"
        args={[
          STABLE_LIGHTS.hemisphere.sky,
          STABLE_LIGHTS.hemisphere.ground,
          STABLE_LIGHTS.hemisphere.intensity,
        ]}
      />
      <directionalLight
        ref={directionalRef}
        name="senaquest-light-directional"
        position={STABLE_LIGHTS.directional.position}
        color={STABLE_LIGHTS.directional.color}
        intensity={STABLE_LIGHTS.directional.intensity}
      />
    </>
  );
}

function Classroom() {
  return (
    <>
      <color attach="background" args={['#e4e8e7']} />
      {/* Luzes transferidas para StableRoomLighting, FORA do XR.
          Não renderizar uma segunda fonte de luz dentro de Classroom. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#d8e0dd" />
      </mesh>
      <mesh name="room-wall-back" position={[0, 2.6, -8]}>
        <boxGeometry args={[16, 5.2, 0.18]} />
        <meshStandardMaterial color="#e6edf0" />
      </mesh>
      <mesh name="room-wall-front" position={[0, 2.6, 8]}>
        <boxGeometry args={[16, 5.2, 0.18]} />
        <meshStandardMaterial color="#e6edf0" />
      </mesh>
      <mesh name="room-wall-left" position={[-8, 2.6, 0]}>
        <boxGeometry args={[0.18, 5.2, 16]} />
        <meshStandardMaterial color="#f0eae0" />
      </mesh>
      <mesh name="room-wall-right" position={[8, 2.6, 0]}>
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
      <TestFBXChair position={[0, 0, -3.18]} rotation={0} />
      <FBXPaty position={[0, 0, -3.18]} rotation={0} />
      <TestFBXChair position={[3.18, 0, 0]} rotation={-Math.PI / 2} />
      <FBXClaudinha position={[3.18, 0, 0]} rotation={-Math.PI / 2} />
      <TestFBXChair position={[-3.18, 0, 0]} rotation={Math.PI / 2} />
      <FBXChico position={[-3.18, 0, 0]} rotation={Math.PI / 2} />
      <TestFBXChair position={[0, 0, 3.18]} rotation={Math.PI} player />
    </>
  );
}
// Zoom VR por deslocamento do rig, sem alterar a escala do mundo nem o FOV do headset.
// O FOV do desktop (65 -> 36) determina a aproximação equivalente em um plano
// de referência a 2,5 m; não existe equivalência perfeita para todas as profundidades.
const VR_ZOOM_REFERENCE_DISTANCE = 2.5;
const VR_ZOOM_FACTOR =
  Math.tan(THREE.MathUtils.degToRad(65 / 2)) / Math.tan(THREE.MathUtils.degToRad(36 / 2));
const VR_ZOOM_DISTANCE = VR_ZOOM_REFERENCE_DISTANCE * (1 - 1 / VR_ZOOM_FACTOR);
const HAND_PINCH_START = 0.035;
const HAND_PINCH_END = 0.05;

function VRPinchCameraRig() {
  const rig = useRef<THREE.Group>(null);
  const { gl, scene } = useThree();
  const amount = useRef(0);
  const collisionBounds = useRef<THREE.Box3[]>([]);
  const HEAD_RADIUS = 0.16;
  const COLLISION_SKIN = 0.025;
  const eye = useRef(new THREE.Vector3());
  const originPoint = useRef(new THREE.Vector3());
  const probe = useRef(new THREE.Vector3());
  const refreshBlockers = () => {
    scene.updateMatrixWorld(true);
    const boxes: THREE.Box3[] = [];
    scene.traverse((node) => {
      if (!['zoom-blocker-chair', 'zoom-blocker-tablet', 'zoom-blocker-table'].includes(node.name))
        return;
      if (node.name === 'zoom-blocker-table') {
        // Tampão e estrutura da mesa; não transformar o volume em um cubo sólido gigante.
        node.traverse((child) => {
          if (!(child instanceof THREE.Mesh) || !child.visible) return;
          const box = new THREE.Box3().setFromObject(child);
          if (!box.isEmpty()) boxes.push(box.expandByScalar(HEAD_RADIUS + COLLISION_SKIN));
        });
      } else {
        const box = new THREE.Box3().setFromObject(node);
        if (!box.isEmpty()) boxes.push(box.expandByScalar(HEAD_RADIUS + COLLISION_SKIN));
      }
    });
    collisionBounds.current = boxes;
  };
  // Distância assinada à caixa expandida: negativa dentro, positiva fora.
  // Isso permite sair de uma sobreposição inicial, mas impede aprofundá-la.
  const clearance = (point: THREE.Vector3, box: THREE.Box3) => {
    const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x);
    const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y);
    const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);
    if (dx || dy || dz) return Math.hypot(dx, dy, dz);
    return -Math.min(
      point.x - box.min.x,
      box.max.x - point.x,
      point.y - box.min.y,
      box.max.y - point.y,
      point.z - box.min.z,
      box.max.z - point.z,
    );
  };
  const pinching = useRef<[boolean, boolean]>([false, false]);
  const wasBoth = useRef(false);
  const direction = useRef(new THREE.Vector3(0, 0, -1));
  const forward = useRef(new THREE.Vector3());

  useEffect(() => {
    const reset = () => {
      amount.current = 0;
      wasBoth.current = false;
      pinching.current = [false, false];
      rig.current?.position.set(0, 0, 0);
      collisionBounds.current = [];
    };
    gl.xr.addEventListener('sessionstart', reset);
    gl.xr.addEventListener('sessionend', reset);
    return () => {
      gl.xr.removeEventListener('sessionstart', reset);
      gl.xr.removeEventListener('sessionend', reset);
    };
  }, [gl]);

  useFrame((_, delta, frame) => {
    const root = rig.current;
    if (!root || !gl.xr.isPresenting) return;
    let both = false;
    if (frame) {
      const session = gl.xr.getSession();
      const space = gl.xr.getReferenceSpace();
      if (session && space) {
        // Handedness fixa: a ordem dos inputSources pode variar durante a sessão.
        const hands = [...session.inputSources].filter((source) => !!source.hand);
        const readPinch = (handedness: XRHandedness, i: number) => {
          const source = hands.find((hand) => hand.handedness === handedness);
          const thumb = source?.hand?.get('thumb-tip');
          const index = source?.hand?.get('index-finger-tip');
          const a = thumb && frame.getJointPose?.(thumb, space);
          const b = index && frame.getJointPose?.(index, space);
          if (!a || !b) {
            pinching.current[i] = false;
            return false;
          }
          const pa = a.transform.position;
          const pb = b.transform.position;
          const distance = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
          const active = distance < (pinching.current[i] ? HAND_PINCH_END : HAND_PINCH_START);
          pinching.current[i] = active;
          return active;
        };
        const left = readPinch('left', 0);
        const right = readPinch('right', 1);
        both = left && right;
      }
    }
    if (both && !wasBoth.current) {
      // Captura a direção do olhar no início do gesto para evitar desvio
      // ou aceleração lateral enquanto a pessoa movimenta a cabeça.
      const headset = gl.xr.getCamera();
      headset.getWorldDirection(forward.current);
      direction.current.copy(forward.current).normalize();
      refreshBlockers();
    }
    wasBoth.current = both;
    const target = both ? VR_ZOOM_DISTANCE : 0;
    const next = THREE.MathUtils.damp(
      amount.current,
      target,
      both ? 3.2 : 5.5,
      Math.min(delta, 0.05),
    );
    let allowed = next;
    if (both && next > amount.current && collisionBounds.current.length) {
      const headset = gl.xr.getCamera();
      headset.updateWorldMatrix(true, false);
      headset.getWorldPosition(eye.current);
      // Coordenada da cabeça sem o deslocamento aplicado ao rig.
      originPoint.current.copy(eye.current).sub(root.position);
      const start = amount.current;
      const end = next;
      const steps = Math.max(1, Math.ceil((end - start) / 0.02));
      const startClearances = collisionBounds.current.map((box) => {
        probe.current.copy(originPoint.current).addScaledVector(direction.current, start);
        return clearance(probe.current, box);
      });
      // Varredura volumétrica contínua por passos de até 2 cm, sem tunneling.
      // Se a cabeça já começar dentro de uma caixa, só pode reduzir a penetração.
      let last = start;
      for (let i = 1; i <= steps; i++) {
        const candidate = start + ((end - start) * i) / steps;
        probe.current.copy(originPoint.current).addScaledVector(direction.current, candidate);
        let blocked = false;
        for (let j = 0; j < collisionBounds.current.length; j++) {
          const c = clearance(probe.current, collisionBounds.current[j]);
          const initial = startClearances[j];
          if ((initial >= 0 && c < 0) || (initial < 0 && c < initial - 0.001)) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
        last = candidate;
      }
      allowed = last;
    }
    amount.current = both ? Math.min(allowed, target) : next;
    if (!both && amount.current < 0.0005) amount.current = 0;
    // Apenas translada o XR Origin. Cenário, física e UI não são escalados.
    root.position.copy(direction.current).multiplyScalar(amount.current);
  });
  return (
    <group ref={rig}>
      <XROrigin position={[0, 0.28, 3.32]} />
    </group>
  );
}

/**
 * Contrato visual do renderizador.
 * IMPORTANTE: `toneMapping` NAO e uma propriedade de <Canvas>. Passa-la
 * diretamente ao Canvas encaminha a prop para um elemento HTML (erro React).
 * A configuracao deve ser aplicada ao WebGLRenderer real via onCreated.
 */
const RENDER_COLOR = {
  toneMapping: THREE.ACESFilmicToneMapping,
  exposure: 1,
  colorSpace: THREE.SRGBColorSpace,
} as const;

function enforceRendererColor(gl: THREE.WebGLRenderer, warn = false) {
  const changed =
    gl.toneMapping !== RENDER_COLOR.toneMapping ||
    Math.abs(gl.toneMappingExposure - RENDER_COLOR.exposure) > 0.0001 ||
    gl.outputColorSpace !== RENDER_COLOR.colorSpace;
  if (!changed) return;
  if (warn && import.meta.env.DEV) {
    console.warn('[SENAQUEST] Configuracao de cor do WebGLRenderer alterada; restaurando.', {
      toneMapping: gl.toneMapping,
      exposure: gl.toneMappingExposure,
      outputColorSpace: gl.outputColorSpace,
    });
  }
  gl.toneMapping = RENDER_COLOR.toneMapping;
  gl.toneMappingExposure = RENDER_COLOR.exposure;
  gl.outputColorSpace = RENDER_COLOR.colorSpace;
}

/**
 * Verifica se uma biblioteca altera o renderizador durante a partida.
 * Faz o registro SOMENTE nas trocas de fase, para podermos diagnosticar
 * mudancas reais em luz, material ou renderer, sem logs por quadro.
 * O FPS so paga tres comparacoes de propriedades simples por quadro.
 */
function RenderingConsistencyGuard() {
  const { gl, scene, camera } = useThree();
  const phase = useGame((state) => state.phase);
  const lastPhase = useRef<string | null>(null);
  useFrame(() => {
    enforceRendererColor(gl, true);
    if (!import.meta.env.DEV || lastPhase.current === phase) return;
    lastPhase.current = phase;
    const lights: Array<{
      name: string;
      type: string;
      intensity: number;
      visible: boolean;
      color: string;
    }> = [];
    scene.traverse((node) => {
      if (!(node instanceof THREE.Light)) return;
      lights.push({
        name: node.name || '(sem nome)',
        type: node.type,
        intensity: node.intensity,
        visible: node.visible,
        color: `#${node.color.getHexString()}`,
      });
    });
    const walls = ['back', 'front', 'left', 'right'].map((side) => {
      const object = scene.getObjectByName(`room-wall-${side}`) as THREE.Mesh | undefined;
      const material = object?.material;
      return {
        side,
        color:
          material instanceof THREE.MeshStandardMaterial
            ? `#${material.color.getHexString()}`
            : '(nao encontrado)',
      };
    });
    console.info('[SENAQUEST] Diagnostico de iluminacao / fase:', {
      phase,
      toneMapping: gl.toneMapping,
      exposure: gl.toneMappingExposure,
      outputColorSpace: gl.outputColorSpace,
      cameraPosition: camera.position.toArray(),
      cameraRotation: camera.rotation.toArray(),
      lights,
      walls,
    });
  }, -100);
  return null;
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
        flat={false}
        onCreated={({ gl }) => enforceRendererColor(gl)}
        camera={{ position: [0, 1.91 + DESKTOP_CAMERA_HEIGHT_BONUS, 3.32], fov: 65 }}
        gl={{ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false }}
      >
        {/* Luzes fora do XR: o spawn do tabuleiro nao pode remontar o rig luminoso. */}
        <StableRoomLighting />
        <XR store={xrStore}>
          <RenderingConsistencyGuard />
          <CalibratedXROrigin />
          <VRInterface />
          <Classroom />
          <Board />
        </XR>
        <FixedSeatCamera />
      </Canvas>
    </>
  );
}

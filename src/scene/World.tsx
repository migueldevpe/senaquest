import { POPPINS_3D } from './poppins';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { XR, XROrigin, createXRStore } from '@react-three/xr';
import { VRInterface } from './VRInterface';
import { XRTutorial, XRSessionTutorialTrigger } from './XRTutorial';
import { XRMusicUnlock } from './XRMusicUnlock';
import { VRRollDebugPanel } from './VRRollDebugPanel';
import { HealthSectorModels } from './HealthSectorModels';
import { MedicalDeskModels } from './MedicalDeskModels';
import { LogisticsShelfModel } from './LogisticsShelfModel';
import { SectorTableCopies } from './SectorTableCopies';
import { AdministrationPrinterAndImac } from './AdministrationPrinterAndImac';
import { AdministrationDeskItems } from './AdministrationDeskItems';
import { LogisticsCashRegisterModel } from './LogisticsCashRegisterModel';
import { LogisticsPaymentTerminal } from './LogisticsPaymentTerminal';
import { LogisticsBoxesModel } from './LogisticsBoxesModel';
import { SectorWhiteboards } from './SectorWhiteboards';
import {
  ROOM_INNER_FACE,
  ROOM_WALL,
  wallPanelDistance,
  FLOOR_Y,
  BASEBOARD_HEIGHT,
  BASEBOARD_CENTER_Y,
} from './roomWallPlacement';
import { MODEL_PLACEMENTS } from './modelPlacements';
import { CeilingLightFixtures } from './CeilingLightFixtures';
import { TechnologyExhibits } from './technology';
// SENAQUEST_TEMP_DECOR_IMPORT_BEGIN
import { AdministrationWallDecor } from './SectorDecor';
// SENAQUEST_TEMP_DECOR_IMPORT_END
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { COLORS, NAMES, colorIndex } from '../game/data';
import { PLAYER_COLORS } from '../game/playerVisual';
import { useGame } from '../game/store';
import { FBXChico } from './characters/Chico';
import { FBXPaty } from './characters/Paty';
import { FBXClaudinha } from './characters/Claudinha';
import { VictoryEffects } from './VictoryEffects';
import { isRoomMounted } from './sceneReadiness';
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
const LazyDicePhysics = lazy(() =>
  import('./Dice').then(({ DicePhysics }) => ({ default: DicePhysics })),
);
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
const BOARD_READY_TEXT_COUNT = 32;

export const xrStore = createXRStore({
  controller: { rayPointer: true, grabPointer: false },
  hand: { rayPointer: true, grabPointer: false },
});
// Coordenadas locais do tabuleiro. O grupo inteiro é escalado e colocado sobre a mesa.
export const boardPosition = boardGridPosition;
function Tile({ n, onTextReady }: { n: number; onTextReady: (key: string) => void }) {
  const [x, , z] = boardPosition(n);
  const color = n === 30 ? '#16a58b' : COLORS[colorIndex(n)];
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
  const source = useLoader(FBXLoader, '/models/pawn.fbx');
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
    if (readyTexts.current.size >= BOARD_READY_TEXT_COUNT) setTextsReady(true);
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
  height = TEST_CHAIR.height,
}: {
  position: [number, number, number];
  rotation?: number;
  player?: boolean;
  height?: number;
}) {
  const config = player ? PLAYER_CHAIR : { ...TEST_CHAIR, height };
  const source = useLoader(FBXLoader, '/models/main_chair.fbx');
  const chairTexture = useLoader(THREE.TextureLoader, '/models/main_chair-color.webp');
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
// SENAQUEST_TEMP_DECOR_FLAG_BEGIN
// 'off' deixa as estantes vazias, 'legacy' mostra as antigas caixas simples.
// Tudo deste recurso temporário pode ser removido com um único comando.
const TEMP_SECTOR_DECOR_MODE = (() => {
  if (typeof window === 'undefined') return 'placeholders';
  const decor = new URLSearchParams(window.location.search).get('decor');
  return decor === 'off' || decor === 'legacy' ? decor : 'placeholders';
})();
// SENAQUEST_TEMP_DECOR_FLAG_END

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
function WallDecor() {
  // Placas de 10 cm: costas 5 mm à frente da face interna da parede.
  const panelDistance = wallPanelDistance(0.1);
  return (
    <>
      {/* Quatro painéis alinhados às paredes; sem placas sobrepostas. */}
      <WallPanel
        position={[0, 3.35, -panelDistance]}
        title="TECNOLOGIA DA INFORMAÇÃO"
        subtitle="Programação • Redes • Suporte"
        color="#1b5c87"
      />
      <WallPanel
        position={[0, 3.35, panelDistance]}
        rotation={Math.PI}
        title="SAÚDE ADMINISTRATIVA"
        subtitle="Atendimento • Agendamento"
        color="#238779"
      />
      <WallPanel
        position={[-panelDistance, 3.35, 0]}
        rotation={Math.PI / 2}
        title="ADMINISTRAÇÃO"
        subtitle="Gestão • RH • Finanças"
        color="#8559a0"
      />
      <WallPanel
        position={[panelDistance, 3.35, 0]}
        rotation={-Math.PI / 2}
        title="LOGÍSTICA E VENDAS"
        subtitle="Estoque • Transporte • Comércio"
        color="#bb7136"
      />
      <TechnologyExhibits />
      {/* Modelos fornecidos pelo usuário: permanentes e independentes dos placeholders. */}
      <HealthSectorModels />
      <MedicalDeskModels />
      <SectorTableCopies />
      <AdministrationPrinterAndImac />
      <AdministrationDeskItems />
      <LogisticsCashRegisterModel />
      <LogisticsPaymentTerminal />
      <LogisticsBoxesModel />
      <SectorWhiteboards />
      <TestFBXChair
        position={MODEL_PLACEMENTS.cadeira_mesa_saude.position}
        rotation={MODEL_PLACEMENTS.cadeira_mesa_saude.rotationY}
      />
      <TestFBXChair
        position={MODEL_PLACEMENTS.administration_chair.position}
        rotation={MODEL_PLACEMENTS.administration_chair.rotationY}
        height={MODEL_PLACEMENTS.administration_chair.maxDimensions[1]}
      />
      {/* Estante definitiva de Logística e Vendas — substitui a estante antiga
          e seus placeholders; configuração em modelPlacements.ts. */}
      <LogisticsShelfModel />
      {/* SENAQUEST_TEMP_DECOR_WALL_BEGIN */}
      {TEMP_SECTOR_DECOR_MODE === 'placeholders' && <AdministrationWallDecor />}
      {/* SENAQUEST_TEMP_DECOR_WALL_END */}
      <mesh position={[0, 1.32, -ROOM_INNER_FACE + 0.4 + ROOM_WALL.clearance]}>
        <boxGeometry args={[4.8, 0.13, 0.8]} />
        <meshStandardMaterial color="#8295a4" />
      </mesh>
    </>
  );
}
const DESKTOP_CAMERA_HEIGHT_BONUS = 0.2;
const VR_CAMERA_HEIGHT_BONUS = 0.6;
const VR_TARGET_INITIAL_EYE_HEIGHT = 1.9;
const VR_MAX_CALIBRATION_ADJUSTMENT = 0.2;
const XR_UI_WARMUP_FRAMES = 12;

// Let the immersive framebuffer render the room before mounting CanvasTexture-based overlays.
function XRSessionWarmup({ children }: { children: React.ReactNode }) {
  const { gl } = useThree();
  const [ready, setReady] = useState(!gl.xr.isPresenting);
  const frames = useRef(0);

  useEffect(() => {
    const start = () => {
      frames.current = 0;
      setReady(false);
    };
    const end = () => {
      frames.current = 0;
      setReady(true);
    };
    gl.xr.addEventListener('sessionstart', start);
    gl.xr.addEventListener('sessionend', end);
    if (gl.xr.isPresenting) start();
    return () => {
      gl.xr.removeEventListener('sessionstart', start);
      gl.xr.removeEventListener('sessionend', end);
    };
  }, [gl]);

  useFrame(() => {
    if (ready || !gl.xr.isPresenting) return;
    if (++frames.current >= XR_UI_WARMUP_FRAMES) setReady(true);
  });

  return ready ? children : null;
}

// Calibra apenas uma vez por sessão, mantendo os movimentos reais da cabeça.
function CalibratedXROrigin({
  rollDegrees = 0,
  onRollProbe,
}: {
  rollDegrees?: number;
  onRollProbe?: (status: string) => void;
}) {
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
      <VRPinchCameraRig rollDegrees={rollDegrees} onRollProbe={onRollProbe} />
    </group>
  );
}

function FixedSeatCamera({ rollDegrees = 0 }: { rollDegrees?: number }) {
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
    camera.rotation.set(pitch.current, yaw.current, THREE.MathUtils.degToRad(rollDegrees));
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
    // Inspecionar outras fontes de luz no inicio de cada fase e a cada 0,5s;
    // atravessar a cena a cada quadro prejudicaria o desempenho do Quest.
    sampling.current += delta;
    const changedPhase = lastPhase.current !== phase;
    if (!changedPhase && sampling.current < 0.5) return;
    sampling.current = 0;
    lastPhase.current = phase;
    ambient.intensity = STABLE_LIGHTS.ambient.intensity;
    hemisphere.intensity = STABLE_LIGHTS.hemisphere.intensity;
    directional.intensity = STABLE_LIGHTS.directional.intensity;
    ambient.color.set(STABLE_LIGHTS.ambient.color);
    hemisphere.color.set(STABLE_LIGHTS.hemisphere.sky);
    hemisphere.groundColor.set(STABLE_LIGHTS.hemisphere.ground);
    directional.color.set(STABLE_LIGHTS.directional.color);
    directional.position.set(...STABLE_LIGHTS.directional.position);
    ambient.visible = hemisphere.visible = directional.visible = true;
    const lights: THREE.Light[] = [];
    scene.traverse((object) => {
      // `isLight` tambem identifica objetos de outra copia de Three.js.
      if ((object as unknown as THREE.Light).isLight) lights.push(object as unknown as THREE.Light);
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#d8e0dd" />
      </mesh>
      <mesh name="room-wall-back" position={[0, 2.6, -ROOM_WALL.halfExtent]}>
        <boxGeometry args={[16, 5.2, ROOM_WALL.thickness]} />
        <meshStandardMaterial color="#e6edf0" />
      </mesh>
      <mesh name="room-wall-front" position={[0, 2.6, ROOM_WALL.halfExtent]}>
        <boxGeometry args={[16, 5.2, ROOM_WALL.thickness]} />
        <meshStandardMaterial color="#e6edf0" />
      </mesh>
      <mesh name="room-wall-left" position={[-ROOM_WALL.halfExtent, 2.6, 0]}>
        <boxGeometry args={[ROOM_WALL.thickness, 5.2, 16]} />
        <meshStandardMaterial color="#f0eae0" />
      </mesh>
      <mesh name="room-wall-right" position={[ROOM_WALL.halfExtent, 2.6, 0]}>
        <boxGeometry args={[ROOM_WALL.thickness, 5.2, 16]} />
        <meshStandardMaterial color="#f0eae0" />
      </mesh>
      <mesh position={[0, 5.23, 0]}>
        <boxGeometry args={[16, 0.15, 16]} />
        <meshStandardMaterial color="#f6f5ef" />
      </mesh>
      {/* GLB retangular definitivo + feixe triangular desvanecendo para baixo.
          Nenhuma fonte de luz adicional: preserve StableRoomLighting. */}
      <CeilingLightFixtures />
      {/* Rodapés finos, embutidos no perímetro, sem placas novas. */}
      {[-7.88, 7.88].map((z) => (
        <mesh key={z} position={[0, BASEBOARD_CENTER_Y, z]}>
          <boxGeometry args={[15.8, BASEBOARD_HEIGHT, 0.065]} />
          <meshStandardMaterial color="#a3b1b7" roughness={0.85} />
        </mesh>
      ))}
      {[-7.88, 7.88].map((x) => (
        <mesh key={x} position={[x, BASEBOARD_CENTER_Y, 0]}>
          <boxGeometry args={[0.065, BASEBOARD_HEIGHT, 15.8]} />
          <meshStandardMaterial color="#a3b1b7" roughness={0.85} />
        </mesh>
      ))}
      <WallDecor />
      <Desk />
      <Suspense fallback={null}>
        <LazyDicePhysics />
      </Suspense>
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

function VRPinchCameraRig({
  rollDegrees = 0,
  onRollProbe,
}: {
  rollDegrees?: number;
  onRollProbe?: (status: string) => void;
}) {
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
        let leftHand: XRInputSource | undefined;
        let rightHand: XRInputSource | undefined;
        for (const source of session.inputSources) {
          if (!source.hand) continue;
          if (source.handedness === 'left') leftHand = source;
          else if (source.handedness === 'right') rightHand = source;
        }
        const readPinch = (source: XRInputSource | undefined, i: number) => {
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
        const left = readPinch(leftHand, 0);
        const right = readPinch(rightHand, 1);
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
      {onRollProbe ? (
        <XRHeadRollTestPivot degrees={rollDegrees} onProbe={onRollProbe}>
          <XROrigin position={[0, 0.28, 3.32]} />
        </XRHeadRollTestPivot>
      ) : (
        <XROrigin position={[0, 0.28, 3.32]} />
      )}
    </group>
  );
}

/**
 * Apenas teste de desenvolvimento. A rotação acontece no eixo óptico do
 * headset e usa como pivô a posição atual dos olhos, sem teletransportá-los.
 * Calculamos sempre a partir do rig sem roll para evitar acumulação de ângulos.
 * Não altera as câmeras nem os controles quando degrees=0.
 */
function XRHeadRollTestPivot({
  degrees,
  onProbe,
  children,
}: {
  degrees: number;
  onProbe?: (status: string) => void;
  children: React.ReactNode;
}) {
  const pivot = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const eyeWorld = useRef(new THREE.Vector3());
  const eyeInParent = useRef(new THREE.Vector3());
  const rotatedEye = useRef(new THREE.Vector3());
  const eyeQuat = useRef(new THREE.Quaternion());
  const parentQuat = useRef(new THREE.Quaternion());
  const invertedEyeQuat = useRef(new THREE.Quaternion());
  const rollQuat = useRef(new THREE.Quaternion());
  const worldRotation = useRef(new THREE.Quaternion());
  const zAxis = useRef(new THREE.Vector3(0, 0, 1));
  const actualQuat = useRef(new THREE.Quaternion());
  const actualEye = useRef(new THREE.Vector3());
  const lastReport = useRef('');
  const framesSinceReport = useRef(0);

  useFrame(() => {
    const group = pivot.current;
    if (!group) return;
    group.position.set(0, 0, 0);
    group.quaternion.identity();
    group.updateWorldMatrix(true, true);
    if (!gl.xr.isPresenting || degrees === 0 || !group.parent) {
      const message = gl.xr.isPresenting
        ? 'XR ativo · posição neutra (0°)'
        : 'Desktop · rotação da câmera ativa';
      if (onProbe && lastReport.current !== message) {
        lastReport.current = message;
        onProbe(message);
      }
      return;
    }
    const headset = gl.xr.getCamera();
    headset.updateWorldMatrix(true, false);
    headset.getWorldPosition(eyeWorld.current);
    headset.getWorldQuaternion(eyeQuat.current);
    group.parent.updateWorldMatrix(true, false);
    eyeInParent.current.copy(eyeWorld.current);
    group.parent.worldToLocal(eyeInParent.current);
    group.parent.getWorldQuaternion(parentQuat.current);
    rollQuat.current.setFromAxisAngle(zAxis.current, THREE.MathUtils.degToRad(degrees));
    // Rotação global no eixo frontal do próprio headset; converte ao espaço do pai.
    worldRotation.current
      .copy(eyeQuat.current)
      .multiply(rollQuat.current)
      .multiply(invertedEyeQuat.current.copy(eyeQuat.current).invert());
    group.quaternion
      .copy(parentQuat.current)
      .invert()
      .multiply(worldRotation.current)
      .multiply(parentQuat.current);
    // Posição do olho invariável durante o roll.
    rotatedEye.current.copy(eyeInParent.current).applyQuaternion(group.quaternion);
    group.position.copy(eyeInParent.current).sub(rotatedEye.current);
    group.updateWorldMatrix(true, true);
    // Confirma se o objeto de câmera XR realmente recebeu a rotação.
    // A extensão pode sobrescrever a pose em renderizações futuras: validar visualmente.
    if (onProbe && ++framesSinceReport.current % 30 === 0) {
      headset.getWorldQuaternion(actualQuat.current);
      headset.getWorldPosition(actualEye.current);
      const measuredDegrees = THREE.MathUtils.radToDeg(eyeQuat.current.angleTo(actualQuat.current));
      const drift = eyeWorld.current.distanceTo(actualEye.current);
      const works = Math.abs(measuredDegrees - Math.abs(degrees)) < 2 && drift < 0.015;
      const message = works
        ? `XR: inclinação aplicada (${Math.round(measuredDegrees)}°; deslocamento ${Math.round(drift * 1000)} mm)`
        : `ATENÇÃO: pose XR não acompanhou o teste (${Math.round(measuredDegrees)}°; deslocamento ${Math.round(drift * 1000)} mm)`;
      if (message !== lastReport.current) {
        lastReport.current = message;
        onProbe(message);
      }
    }
  }, -1);
  return <group ref={pivot}>{children}</group>;
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

function enforceRendererColor(gl: THREE.WebGLRenderer) {
  const changed =
    gl.toneMapping !== RENDER_COLOR.toneMapping ||
    Math.abs(gl.toneMappingExposure - RENDER_COLOR.exposure) > 0.0001 ||
    gl.outputColorSpace !== RENDER_COLOR.colorSpace;
  if (!changed) return;
  gl.toneMapping = RENDER_COLOR.toneMapping;
  gl.toneMappingExposure = RENDER_COLOR.exposure;
  gl.outputColorSpace = RENDER_COLOR.colorSpace;
}

/**
 * Registra o estado visual somente nas trocas de fase durante o diagnóstico.
 */
function RenderingPhaseDiagnostics() {
  const { gl, scene, camera } = useThree();
  const phase = useGame((state) => state.phase);
  const lastPhase = useRef<string | null>(null);
  useFrame(() => {
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

/** Aguarda a sala, os modelos permanentes e alguns quadros do renderer.
 * A tela de loading só começa seu fade após a cena de verdade estar montada.
 */
function SceneReadyProbe({ onReady }: { onReady: () => void }) {
  const { scene } = useThree();
  const frames = useRef(0);
  const reported = useRef(false);
  useFrame(() => {
    if (reported.current) return;
    if (!isRoomMounted(scene)) {
      frames.current = 0;
      return;
    }
    if (++frames.current < 3) return;
    reported.current = true;
    // useFrame roda ANTES de gl.render(); este callback ocorre após o frame.
    window.setTimeout(onReady, 0);
  });
  return null;
}

export function World({
  onSceneReady,
  showDevTools = false,
}: {
  onSceneReady: () => void;
  showDevTools?: boolean;
}) {
  const showRollDebug =
    showDevTools &&
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('xr-roll-test') === '1';
  const [rollDegrees, setRollDegrees] = useState(0);
  const [rollProbe, setRollProbe] = useState('Aguardando câmera');
  const effectiveRoll = showRollDebug ? rollDegrees : 0;
  useEffect(() => {
    if (!showRollDebug) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.key === '[') setRollDegrees((d) => Math.max(-90, d - 15));
      else if (event.key === ']') setRollDegrees((d) => Math.min(90, d + 15));
      else if (event.key === '\\') setRollDegrees(0);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showRollDebug]);
  const mobileXR =
    typeof navigator !== 'undefined' && /OculusBrowser|Quest|Android/i.test(navigator.userAgent);
  const quality = mobileXR ? 1 : 1.5;
  return (
    <>
      {showRollDebug && (
        <VRRollDebugPanel degrees={rollDegrees} setDegrees={setRollDegrees} status={rollProbe} />
      )}
      <Canvas
        dpr={[1, quality]}
        shadows={false}
        flat={false}
        onCreated={({ gl }) => enforceRendererColor(gl)}
        camera={{ position: [0, 1.91 + DESKTOP_CAMERA_HEIGHT_BONUS, 3.32], fov: 65 }}
        gl={{
          antialias: !mobileXR,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: false,
        }}
      >
        {/* Luzes fora do XR: o spawn do tabuleiro nao pode remontar o rig luminoso. */}
        <StableRoomLighting />
        <XR store={xrStore}>
          <RenderingPhaseDiagnostics />
          <CalibratedXROrigin
            rollDegrees={effectiveRoll}
            onRollProbe={showRollDebug ? setRollProbe : undefined}
          />
          <XRMusicUnlock />
          <XRSessionTutorialTrigger />
          <XRSessionWarmup>
            <XRTutorial />
            <VRInterface />
          </XRSessionWarmup>
          <Classroom />
          <Board />
        </XR>
        <FixedSeatCamera rollDegrees={effectiveRoll} />
        <SceneReadyProbe onReady={onSceneReady} />
      </Canvas>
    </>
  );
}

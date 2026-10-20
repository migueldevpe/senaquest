import { useEffect, useRef, useState } from 'react';
import { RoundedBox, Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
  type RapierCollider,
} from '@react-three/rapier';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { useDiceTuning } from './diceTuning';
import {
  hasClearedEntry,
  outsideArena,
  throwDirection,
  throwOrigin,
  type ThrowSide,
} from './throwGeometry';

// Parâmetros de ajuste visual e físico. Mantenha estes valores agrupados para testes.
const DICE_SIDE = 0.34;
const TOOLTIP = {
  width: 0.54,
  height: 0.39,
  cornerRadius: 0.085,
  pointerDepth: 0.1,
  outlineScale: 1.025,
  outlineSegments: 12,
  fillColor: '#003b6a',
  outlineColor: '#ff981a',
  fillOpacity: 0.95294,
  outlineOpacity: 0.95,
  fadeSpeed: 22,
  enterRise: 0.04,
  enterScale: 0.97,
  visibleThreshold: 0.004,
  resultHoldMs: 180,
  heightAboveDie: 0.53,
} as const;
const DICE_FADE = { enterSpeed: 24, exitSpeed: 18, depthWriteThreshold: 0.95 } as const;

const { RESULT_BUBBLE, RESULT_BUBBLE_OUTLINE } = (() => {
  const s = new THREE.Shape();
  const w = TOOLTIP.width,
    h = TOOLTIP.height,
    r = TOOLTIP.cornerRadius;
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(-0.075, -h / 2);
  s.lineTo(0, -h / 2 - TOOLTIP.pointerDepth);
  s.lineTo(0.075, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  // A borda é um anel vazado: nenhuma superfície laranja fica atrás do fundo translúcido.
  // A escala externa de 1.025 mantém a espessura visual aprovada.
  const contour = s.getPoints(TOOLTIP.outlineSegments);
  const outer = new THREE.Shape();
  contour.forEach((point, i) => {
    if (i === 0) outer.moveTo(point.x * TOOLTIP.outlineScale, point.y * TOOLTIP.outlineScale);
    else outer.lineTo(point.x * TOOLTIP.outlineScale, point.y * TOOLTIP.outlineScale);
  });
  outer.closePath();
  const hole = new THREE.Path();
  [...contour].reverse().forEach((point, i) => {
    if (i === 0) hole.moveTo(point.x, point.y);
    else hole.lineTo(point.x, point.y);
  });
  hole.closePath();
  outer.holes.push(hole);
  return {
    RESULT_BUBBLE: new THREE.ShapeGeometry(s),
    RESULT_BUBBLE_OUTLINE: new THREE.ShapeGeometry(outer),
  };
})();

// Geometria e material compartilhados entre os pontos de todas as faces.
// Evita dezenas de buffers e materiais equivalentes para um único dado.
const PIP_GEOMETRY = new THREE.CircleGeometry(0.025, 16);
const PIP_MATERIAL = new THREE.MeshStandardMaterial({ color: '#111b29', roughness: 0.88 });
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.07, -0.07],
    [0.07, 0.07],
  ],
  3: [
    [-0.07, -0.07],
    [0, 0],
    [0.07, 0.07],
  ],
  4: [
    [-0.07, -0.07],
    [0.07, -0.07],
    [-0.07, 0.07],
    [0.07, 0.07],
  ],
  5: [
    [-0.07, -0.07],
    [0.07, -0.07],
    [0, 0],
    [-0.07, 0.07],
    [0.07, 0.07],
  ],
  6: [
    [-0.07, -0.085],
    [0.07, -0.085],
    [-0.07, 0],
    [0.07, 0],
    [-0.07, 0.085],
    [0.07, 0.085],
  ],
};

// As faces opostas somam sete. A face superior é lida da orientação física.
const FACE_NORMALS: [number, THREE.Vector3][] = [
  [1, new THREE.Vector3(0, 1, 0)],
  [6, new THREE.Vector3(0, -1, 0)],
  [2, new THREE.Vector3(1, 0, 0)],
  [5, new THREE.Vector3(-1, 0, 0)],
  [3, new THREE.Vector3(0, 0, 1)],
  [4, new THREE.Vector3(0, 0, -1)],
];

export function faceOnTop(quaternion: THREE.Quaternion) {
  let best = 1;
  let highest = -Infinity;
  for (const [value, normal] of FACE_NORMALS) {
    const height = normal.clone().applyQuaternion(quaternion).y;
    if (height > highest) {
      highest = height;
      best = value;
    }
  }
  return { value: best, confidence: highest };
}

function PipFace({
  value,
  position,
  rotation,
}: {
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {PIPS[value].map(([x, y], index) => (
        <mesh key={index} position={[x, y, 0.003]}>
          <primitive object={PIP_GEOMETRY} attach="geometry" />
          <primitive object={PIP_MATERIAL} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** Uma borda de entrada fica desativada enquanto o dado atravessa a partir da mão. */
function DieBody({
  lottery,
  nonce,
  thrower,
  entryCollider,
  visible,
}: {
  lottery: boolean;
  nonce: number;
  thrower: number | null;
  entryCollider: React.RefObject<RapierCollider | null>;
  visible: boolean;
}) {
  const body = useRef<RapierRigidBody>(null);
  const badge = useRef<THREE.Group>(null);
  const badgeVisual = useRef<THREE.Group>(null);
  const bubbleFill = useRef<THREE.MeshBasicMaterial>(null);
  const bubbleBorder = useRef<THREE.MeshBasicMaterial>(null);
  const dieVisual = useRef<THREE.Group>(null);
  const dieMaterials = useRef<THREE.Material[]>([]);
  const badgeMaterials = useRef<THREE.Material[]>([]);
  const fade = useRef(0);
  const badgeFade = useRef(0);
  // Progresso de entrada separado do fade: saída não move nem redimensiona.
  const badgeEnter = useRef(0);
  const badgeWasVisible = useRef(false);
  const impulse = useDiceTuning((state) => state.impulse);
  const torque = useDiceTuning((state) => state.torque);
  const saved = useRef(false);
  const entered = useRef(false);
  const launchedAt = useRef<number | null>(null);
  const stableSince = useRef<number | null>(null);
  const retries = useRef(0);
  const setPhysicalDie = useGame((state) => state.setPhysicalDie);
  const shownValue = useGame((state) => (lottery ? state.lotteryDie : state.die));
  const [displayedValue, setDisplayedValue] = useState<number | null>(null);
  // Materiais estáticos do dado não precisam ser redescobertos a cada frame.
  useEffect(() => {
    const collect = (group: THREE.Group | null) => {
      const materials = new Set<THREE.Material>();
      group?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
        }
      });
      return [...materials];
    };
    dieMaterials.current = collect(dieVisual.current);
    badgeMaterials.current = collect(badge.current).filter(
      (material) => material !== bubbleFill.current && material !== bubbleBorder.current,
    );
  }, [displayedValue]);
  useEffect(() => {
    if (shownValue !== null) {
      setDisplayedValue(shownValue);
      return;
    }
    const timeout = window.setTimeout(() => setDisplayedValue(null), 180);
    return () => window.clearTimeout(timeout);
  }, [shownValue]);
  const side = (thrower ?? 0) as ThrowSide;
  const [dx, dz] = throwDirection(side);
  const origin = throwOrigin(side);
  const debug = useDiceTuning((state) => state.showColliders);

  const launch = (retry: boolean) => {
    const rigid = body.current;
    if (!rigid) return;
    saved.current = false;
    entered.current = false;
    stableSince.current = null;
    launchedAt.current = null;
    entryCollider.current?.setEnabled(false);
    const offset = retry ? 0.02 : 0;
    rigid.setTranslation({ x: origin[0], y: origin[1] + offset, z: origin[2] }, true);
    rigid.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    rigid.setLinvel({ x: dx * 1.88, y: 1.3, z: dz * 1.88 }, true);
    rigid.setAngvel({ x: 0, y: 0, z: 0 }, true);
    // Impulso moderado, originado do lado correto, com pequena variação por lançamento.
    const drift = (Math.random() - 0.5) * 0.13;
    const strength = impulse * (0.9 + Math.random() * 0.2);
    rigid.applyImpulse(
      {
        x: dx * strength + (dz !== 0 ? drift * strength : 0),
        y: strength * (0.25 + Math.random() * 0.09),
        z: dz * strength + (dx !== 0 ? drift * strength : 0),
      },
      true,
    );
    rigid.applyTorqueImpulse(
      {
        x: torque * (Math.random() * 1.2 - 0.6),
        y: torque * (Math.random() * 1.4 - 0.7),
        z: torque * (Math.random() * 1.2 - 0.6),
      },
      true,
    );
  };

  useEffect(() => {
    retries.current = 0;
    launch(false);
    // Somente quando o lançamento muda: alterações no painel não reiniciam o dado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, side]);

  useFrame(({ clock }, delta) => {
    // 150ms entrada, 200ms saída. Somente opacidade visual: física preservada.
    fade.current = THREE.MathUtils.damp(
      fade.current,
      visible ? 1 : 0,
      visible ? DICE_FADE.enterSpeed : DICE_FADE.exitSpeed,
      delta,
    );
    badgeFade.current = THREE.MathUtils.damp(
      badgeFade.current,
      visible && shownValue !== null ? 1 : 0,
      TOOLTIP.fadeSpeed,
      delta,
    );
    for (const material of dieMaterials.current) {
      if (!material.transparent) {
        material.transparent = true;
        material.needsUpdate = true;
      }
      material.opacity = fade.current;
      const depthWrite = fade.current > DICE_FADE.depthWriteThreshold;
      if (material.depthWrite !== depthWrite) {
        material.depthWrite = depthWrite;
        material.needsUpdate = true;
      }
    }
    // Opacidade da bolha 3D independente da do número e do dado.
    // Preserva o fundo translúcido também depois de o fade terminar.
    if (bubbleFill.current) bubbleFill.current.opacity = badgeFade.current * TOOLTIP.fillOpacity;
    if (bubbleBorder.current)
      bubbleBorder.current.opacity = badgeFade.current * TOOLTIP.outlineOpacity;
    const badgeTargetVisible = visible && shownValue !== null;
    if (badgeTargetVisible && !badgeWasVisible.current) badgeEnter.current = 0;
    if (badgeTargetVisible) {
      badgeEnter.current = THREE.MathUtils.damp(badgeEnter.current, 1, TOOLTIP.fadeSpeed, delta);
    } else {
      // Na saída, somente o fade diminui: posição e escala ficam no estado final.
      badgeEnter.current = 1;
    }
    badgeWasVisible.current = badgeTargetVisible;
    if (badgeVisual.current) {
      const progress = badgeEnter.current;
      badgeVisual.current.scale.setScalar(TOOLTIP.enterScale + (1 - TOOLTIP.enterScale) * progress);
      badgeVisual.current.position.y = -TOOLTIP.enterRise * (1 - progress);
      badgeVisual.current.visible = badgeFade.current > TOOLTIP.visibleThreshold;
    }
    for (const material of badgeMaterials.current) {
      if (!material.transparent || material.depthWrite) {
        material.transparent = true;
        material.depthWrite = false;
        material.needsUpdate = true;
      }
      material.opacity = badgeFade.current;
    }
    const rigid = body.current;
    if (!rigid) return;
    // O balão é montado após o resultado: sincronize a posição MESMO quando a física já parou.
    const badgePosition = rigid.translation();
    if (badge.current)
      badge.current.position.set(
        badgePosition.x,
        badgePosition.y + TOOLTIP.heightAboveDie,
        badgePosition.z,
      );
    if (saved.current) return;
    const now = clock.elapsedTime;
    if (launchedAt.current === null) launchedAt.current = now;
    const elapsed = now - launchedAt.current;
    const position = rigid.translation();

    if (!entered.current && hasClearedEntry(side, position.x, position.z)) {
      entered.current = true;
      entryCollider.current?.setEnabled(true);
    }
    const velocity = rigid.linvel();
    const angular = rigid.angvel();
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    const spin = Math.hypot(angular.x, angular.y, angular.z);
    const rotation = rigid.rotation();
    const { value, confidence } = faceOnTop(
      new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
    );
    const stable = entered.current && speed < 0.12 && spin < 0.19 && confidence > 0.89;
    if (stable) {
      if (stableSince.current === null) stableSince.current = now;
      if (now - stableSince.current > 0.25 && elapsed > (lottery ? 0.7 : 1.1)) {
        saved.current = true;
        setPhysicalDie(value);
        return;
      }
    } else {
      stableSince.current = null;
    }
    // Sem travar o turno: até duas novas tentativas físicas quando o dado escapa
    // ou para inclinado. Não corrigimos a orientação por teleporte no repouso.
    const invalid = outsideArena(position.x, position.z, position.y);
    if ((invalid && elapsed > 0.35) || elapsed > (lottery ? 2.35 : 4.1)) {
      if (retries.current < 2) {
        retries.current += 1;
        launch(true);
      } else {
        saved.current = true;
        setPhysicalDie(value);
      }
    }
  });

  return (
    <>
      <RigidBody
        ref={body}
        position={origin}
        colliders={false}
        ccd
        canSleep
        restitution={0.23}
        friction={0.83}
        linearDamping={0.38}
        angularDamping={0.68}
      >
        <CuboidCollider
          args={[DICE_SIDE / 2 - 0.006, DICE_SIDE / 2 - 0.006, DICE_SIDE / 2 - 0.006]}
        />
        <group ref={dieVisual}>
          <RoundedBox
            args={[DICE_SIDE, DICE_SIDE, DICE_SIDE]}
            radius={0.026}
            smoothness={4}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#fff9ed" roughness={0.55} />
          </RoundedBox>
          <PipFace value={1} position={[0, 0.172, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <PipFace value={6} position={[0, -0.172, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <PipFace value={2} position={[0.172, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
          <PipFace value={5} position={[-0.172, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
          <PipFace value={3} position={[0, 0, 0.172]} rotation={[0, 0, 0]} />
          <PipFace value={4} position={[0, 0, -0.172]} rotation={[0, Math.PI, 0]} />
        </group>
      </RigidBody>
      {displayedValue !== null && (
        <group ref={badge} position={[origin[0], origin[1] + 0.53, origin[2]]}>
          <Billboard follow>
            <group ref={badgeVisual}>
              {/* Contorno no mesmo formato do balão, sem alterar sua posição no mundo. */}
              <mesh geometry={RESULT_BUBBLE_OUTLINE} renderOrder={9998} position={[0, 0, 0.001]}>
                <meshBasicMaterial
                  ref={bubbleBorder}
                  color={TOOLTIP.outlineColor}
                  transparent
                  opacity={0}
                  depthTest={false}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
              <mesh geometry={RESULT_BUBBLE} renderOrder={9999}>
                <meshBasicMaterial
                  ref={bubbleFill}
                  color={TOOLTIP.fillColor}
                  transparent
                  opacity={0}
                  depthTest={false}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
              <Text
                renderOrder={10000}
                position={[0, 0, 0.012]}
                fontSize={0.28}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                material-depthTest={false}
                material-depthWrite={false}
              >
                {displayedValue}
              </Text>
            </group>
          </Billboard>
        </group>
      )}
      {debug && (
        <mesh position={origin}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#22dd77" />
        </mesh>
      )}
    </>
  );
}

function ArenaContents() {
  const phase = useGame((state) => state.phase);
  const nonce = useGame((state) =>
    state.phase === 'lotteryRolling' ? state.lotteryNonce : state.throwNonce,
  );
  const thrower = useGame((state) =>
    state.phase === 'lotteryRolling' ? state.lotteryThrower : state.thrower,
  );
  const lottery = phase === 'lotteryRolling';
  const side = (thrower ?? 0) as ThrowSide;
  // Índices dos jogadores: 0 frente, 1 direita (Claudinha), 2 fundo (Paty), 3 esquerda.
  const gates = [
    useRef<RapierCollider>(null),
    useRef<RapierCollider>(null),
    useRef<RapierCollider>(null),
    useRef<RapierCollider>(null),
  ];
  const showColliders = useDiceTuning((state) => state.showColliders);
  const active = phase === 'rolling' || lottery;
  const [rendered, setRendered] = useState<{
    lottery: boolean;
    nonce: number;
    thrower: number | null;
  } | null>(null);
  useEffect(() => {
    if (active) {
      setRendered({ lottery, nonce, thrower });
      return;
    }
    const timeout = window.setTimeout(() => setRendered(null), 220);
    return () => window.clearTimeout(timeout);
  }, [active, lottery, nonce, thrower]);

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {/* Superfície física coincide com a madeira; prolongada até a origem da mão. */}
        <CuboidCollider
          position={[0, 1.099, 0]}
          args={[2.35, 0.04, 2.35]}
          friction={0.9}
          restitution={0.12}
        />
        <CuboidCollider
          ref={gates[3]}
          position={[-1.8, 1.25, 0]}
          args={[0.035, 0.19, 1.8]}
          restitution={0.1}
        />
        <CuboidCollider
          ref={gates[1]}
          position={[1.8, 1.25, 0]}
          args={[0.035, 0.19, 1.8]}
          restitution={0.1}
        />
        <CuboidCollider
          ref={gates[2]}
          position={[0, 1.25, -1.8]}
          args={[1.8, 0.19, 0.035]}
          restitution={0.1}
        />
        <CuboidCollider
          ref={gates[0]}
          position={[0, 1.25, 1.8]}
          args={[1.8, 0.19, 0.035]}
          restitution={0.1}
        />
      </RigidBody>
      {rendered && (
        <DieBody
          key={`${rendered.lottery}-${rendered.nonce}`}
          lottery={rendered.lottery}
          nonce={rendered.nonce}
          thrower={rendered.thrower}
          entryCollider={gates[(rendered.thrower ?? 0) as ThrowSide]}
          visible={active}
        />
      )}
      {showColliders && (
        <group>
          <mesh position={[0, 1.25, 1.8]}>
            <boxGeometry args={[3.6, 0.38, 0.07]} />
            <meshBasicMaterial color="#f7941d" transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <mesh position={[0, 1.25, -1.8]}>
            <boxGeometry args={[3.6, 0.38, 0.07]} />
            <meshBasicMaterial color="#f7941d" transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <mesh position={[1.8, 1.25, 0]}>
            <boxGeometry args={[0.07, 0.38, 3.6]} />
            <meshBasicMaterial color="#f7941d" transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <mesh position={[-1.8, 1.25, 0]}>
            <boxGeometry args={[0.07, 0.38, 3.6]} />
            <meshBasicMaterial color="#f7941d" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      )}
    </>
  );
}

export function DicePhysics() {
  return (
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate>
      <ArenaContents />
    </Physics>
  );
}

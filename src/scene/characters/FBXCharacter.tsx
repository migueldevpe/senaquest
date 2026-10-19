import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { CharacterName } from '../CharacterName';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { useGame } from '../../game/store';
import { victoryPunchEnvelope, victoryPunchSway } from '../characterAnimation';
import { PLAYER_COLORS } from '../../game/playerVisual';

import { CHARACTER_CONFIG, type CharacterSettings } from './characterConfig';
import { Crown, CROWN_TOP_OFFSET } from '../VictoryEffects';
import { championEnvelope } from '../characterAnimation';

type RigJoint = { bone: THREE.Bone; rest: THREE.Quaternion };

/** Teste FBX: postura sentada com direção dos ossos, em vez de ângulos arbitrários
 * nos eixos locais (que causavam a T-pose com apenas uma mão mexendo).
 */
export function FBXCharacter({
  position,
  rotation,
  playerId,
  name,
  color,
  source,
  uvTexture,
  settings,
}: {
  position: [number, number, number];
  rotation: number;
  playerId: number;
  name: string;
  color: string;
  source: THREE.Group;
  uvTexture?: THREE.Texture;
  settings: CharacterSettings;
}) {
  const texturedMaterial = useMemo(() => {
    if (!uvTexture) return null;
    uvTexture.colorSpace = THREE.SRGBColorSpace;
    uvTexture.anisotropy = CHARACTER_CONFIG.textureAnisotropy;
    uvTexture.generateMipmaps = true;
    return new THREE.MeshStandardMaterial({
      map: uvTexture,
      color: '#ffffff',
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }, [uvTexture]);
  const model = useMemo(() => clone(source), [source]);
  const rig = useMemo(() => {
    const joints = new Map<string, RigJoint>();
    model.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = object as THREE.SkinnedMesh;
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        // Textura UV original fornecida pelo usuário, preservando o skinning do FBX.
        if (texturedMaterial) mesh.material = texturedMaterial;
        else {
          // Mantém os materiais originais da Paty; não reutiliza os do Chico.
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mesh.material =
            materials.length === 1
              ? materials[0].clone()
              : materials.map((material) => material.clone());
        }
      }
      if ((object as THREE.Bone).isBone) {
        const bone = object as THREE.Bone;
        joints.set(bone.name.replace(/^mixamorig[:_]?/i, ''), {
          bone,
          rest: bone.quaternion.clone(),
        });
      }
    });
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // Escala do personagem definida pelo jogo, não pelo Blender.
    const scale =
      Number.isFinite(size.y) && size.y > 1e-5
        ? THREE.MathUtils.clamp(settings.targetHeight / size.y, 0.001, 10000)
        : 1;
    const hip = joints.get('Hips')?.bone;
    const hipPosition = new THREE.Vector3();
    hip?.getWorldPosition(hipPosition);
    // Assento: centro em y=.72, superfície em y=.805.
    // O quadril precisa ficar ACIMA da superfície, não dentro da almofada.
    const seatTop = settings.seatTop;
    const offset: [number, number, number] = [
      -(hip ? hipPosition.x : center.x) * scale,
      hip ? seatTop + settings.hipClearance - hipPosition.y * scale : -bounds.min.y * scale,
      -(hip ? hipPosition.z : center.z) * scale - settings.seatDepthOffset,
    ];
    return { joints, scale, offset };
  }, [model, texturedMaterial, settings]);

  const phase = useGame((s) => s.phase);
  const thrower = useGame((s) => (s.phase === 'lotteryRolling' ? s.lotteryThrower : s.thrower));
  const nonce = useGame((s) => (s.phase === 'lotteryRolling' ? s.lotteryNonce : s.throwNonce));
  const outcome = useGame((s) => s.outcome);
  const debugReaction = useGame((s) => s.debugReaction);
  const winner = useGame((s) => (s.phase === 'finished' ? s.winner : null));
  const isChampion = winner === playerId;
  const victoryNonce = useGame((s) => s.debugVictoryNonce);
  const activePlayer = useGame((s) => s.order[s.turnIndex]);
  const started = useRef(-100);
  const prepareStarted = useRef(-100);
  const preparingLast = useRef(false);
  const previous = useRef('');
  useEffect(() => {
    const key = `${phase}:${thrower}:${nonce}`;
    if (
      key !== previous.current &&
      (phase === 'rolling' || phase === 'lotteryRolling') &&
      thrower === playerId
    )
      started.current = -1;
    previous.current = key;
  }, [phase, thrower, nonce]);

  const crownAnchor = useRef<THREE.Group>(null);
  const headRestPosition = useRef<THREE.Vector3 | null>(null);
  const sitting = useRef(0);
  const shakeStart = useRef(-100);
  const punchStart = useRef(-100);
  const lastFeedback = useRef('');
  const lastDebugNonce = useRef(0);
  const championStart = useRef(-100);
  const wasChampion = useRef(false);
  const lastVictoryNonce = useRef(victoryNonce);
  // Pequenas variações em torno da pose sentada; não alteram a direção dos membros.
  const idleQ = useMemo(() => new THREE.Quaternion(), []);
  const idleEuler = useMemo(() => new THREE.Euler(), []);
  const scratch = useMemo(
    () => ({
      parentQ: new THREE.Quaternion(),
      worldQ: new THREE.Quaternion(),
      current: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      delta: new THREE.Quaternion(),
      desired: new THREE.Quaternion(),
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );
  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime;
    if (isChampion && (!wasChampion.current || lastVictoryNonce.current !== victoryNonce))
      championStart.current = now;
    lastVictoryNonce.current = victoryNonce;
    wasChampion.current = isChampion;
    const champion = isChampion ? championEnvelope(now - championStart.current) : 0;
    if (started.current === -1) started.current = now;
    const elapsed = now - started.current;
    const preparing =
      (phase === 'turn' && activePlayer === playerId) ||
      (phase === 'lottery' &&
        useGame.getState().eligible[useGame.getState().lotteryIndex] === playerId);
    if (preparing && !preparingLast.current) prepareStarted.current = now;
    preparingLast.current = preparing;
    const prepElapsed = now - prepareStarted.current;
    // Duas oscilações curtas do antebraço, antes de lançar, com mão fechada.
    const prepEnvelope = preparing ? THREE.MathUtils.smoothstep(prepElapsed, 0, 0.16) : 0;
    const prepShake = preparing ? Math.sin(prepElapsed * Math.PI * 6.7) * 0.15 * prepEnvelope : 0;
    const feedbackKey = `${phase}:${activePlayer}:${outcome}`;
    if (
      phase === 'feedback' &&
      activePlayer === playerId &&
      outcome !== 'correct' &&
      lastFeedback.current !== feedbackKey
    ) {
      shakeStart.current = now;
    }
    if (
      phase === 'feedback' &&
      activePlayer === playerId &&
      outcome === 'correct' &&
      lastFeedback.current !== feedbackKey
    ) {
      punchStart.current = now;
    }
    lastFeedback.current = feedbackKey;
    if (debugReaction?.player === playerId && debugReaction.nonce !== lastDebugNonce.current) {
      if (debugReaction.kind === 'correct') punchStart.current = now;
      else shakeStart.current = now;
      lastDebugNonce.current = debugReaction.nonce;
    }
    // Preparação rápida, impulso curto e recuperação suave.
    const throwDuration = 0.62;
    const throwMotion =
      elapsed >= 0 && elapsed < throwDuration
        ? Math.sin((Math.PI * elapsed) / throwDuration) ** 2
        : 0;
    sitting.current = THREE.MathUtils.damp(sitting.current, 1, 3.5, dt);
    const { joints } = rig;
    for (const joint of joints.values()) joint.bone.quaternion.copy(joint.rest);
    model.updateMatrixWorld(true);

    // Determina a frente do próprio FBX, em vez de assumir que ela é +Z.
    // Em T-pose, a linha entre os quadris fornece o eixo lateral.
    const leftHip = joints.get('LeftUpLeg')?.bone;
    const rightHip = joints.get('RightUpLeg')?.bone;
    if (leftHip && rightHip) {
      leftHip.getWorldPosition(scratch.from);
      rightHip.getWorldPosition(scratch.to);
      scratch.right.subVectors(scratch.to, scratch.from).normalize();
    } else scratch.right.set(1, 0, 0);
    scratch.forward.crossVectors(scratch.right, scratch.up).normalize();
    // Pés do FBX indicam qual dos dois sentidos é a frente do personagem.
    const hips = joints.get('Hips')?.bone;
    const toe = joints.get('LeftToeBase')?.bone ?? joints.get('LeftFoot')?.bone;
    if (hips && toe) {
      hips.getWorldPosition(scratch.from);
      toe.getWorldPosition(scratch.to);
      scratch.to.sub(scratch.from).setY(0);
      if (scratch.to.lengthSq() > 1e-6 && scratch.forward.dot(scratch.to) < 0)
        scratch.forward.negate();
    }

    // Aponta um osso para um destino, limitando o giro para impedir membros invertidos.
    // Calcula a direção com a pose atualizada e converte a rotação para o pai.
    const aim = (
      name: string,
      child: string,
      direction: THREE.Vector3,
      maxAngle: number,
      weight = 1,
    ) => {
      const joint = joints.get(name),
        next = joints.get(child);
      if (!joint || !next) return;
      joint.bone.updateWorldMatrix(true, true);
      joint.bone.getWorldPosition(scratch.from);
      next.bone.getWorldPosition(scratch.to);
      scratch.current.subVectors(scratch.to, scratch.from);
      if (scratch.current.lengthSq() < 1e-9) return;
      scratch.current.normalize();
      scratch.delta.setFromUnitVectors(scratch.current, direction.clone().normalize());
      // Nunca girar além do limite anatômico configurado.
      scratch.delta.rotateTowards(
        new THREE.Quaternion(),
        Math.max(0, scratch.delta.angleTo(new THREE.Quaternion()) - maxAngle),
      );
      joint.bone.getWorldQuaternion(scratch.worldQ);
      scratch.desired.copy(scratch.delta).multiply(scratch.worldQ);
      joint.bone.parent?.getWorldQuaternion(scratch.parentQ);
      scratch.desired.premultiply(scratch.parentQ.invert());
      joint.bone.quaternion.slerp(scratch.desired, sitting.current * weight);
      joint.bone.updateWorldMatrix(true, true);
    };
    const f = scratch.forward,
      r = scratch.right,
      up = scratch.up;
    // Coxas à frente, joelhos flexionados, canelas descendo para o chão.
    aim(
      'LeftUpLeg',
      'LeftLeg',
      f.clone().multiplyScalar(0.96).addScaledVector(up, -0.25).addScaledVector(r, -0.09),
      1.3,
    );
    aim(
      'RightUpLeg',
      'RightLeg',
      f.clone().multiplyScalar(0.96).addScaledVector(up, -0.25).addScaledVector(r, 0.09),
      1.3,
    );
    aim('LeftLeg', 'LeftFoot', up.clone().negate().addScaledVector(f, 0.12), 1.35);
    aim('RightLeg', 'RightFoot', up.clone().negate().addScaledVector(f, 0.12), 1.35);
    // Soquinho de vitória: cotovelo flexionado junto ao corpo, punho sobe na altura do ombro.
    // O braço esquerdo permanece na pose sentada; sem cruzamento de braços.
    const punchElapsed = now - punchStart.current;
    const punch = isChampion ? 0 : victoryPunchEnvelope(punchElapsed);
    const punchSway = victoryPunchSway(punchElapsed);
    // Na vitória, ambos os braços se elevam de verdade (rotação > 90 graus).
    // Cotovelos perto da linha dos ombros, antebraços quase verticais.
    // O soquinho de acerto permanece exatamente como aprovado.
    const armLeft = up
      .clone()
      .multiplyScalar(-0.93 + champion * 1.91)
      .addScaledVector(r, -0.16 - champion * 0.24)
      .addScaledVector(f, 0.25 - champion * 0.12);
    const armRight = up
      .clone()
      .multiplyScalar(
        -0.93 + throwMotion * 0.386 + prepShake * 0.55 + punch * 0.36 + champion * 1.91,
      )
      .addScaledVector(r, 0.16 + punch * 0.025 + champion * 0.24)
      .addScaledVector(f, 0.25 + throwMotion * 0.38 + prepShake - punch * 0.04 - champion * 0.12);
    aim('LeftArm', 'LeftForeArm', armLeft, 2.85);
    aim('RightArm', 'RightForeArm', armRight, 2.85);
    aim(
      'LeftForeArm',
      'LeftHand',
      f
        .clone()
        .multiplyScalar(0.88 - champion * 0.8)
        .addScaledVector(up, -0.23 + champion * 1.22)
        .addScaledVector(r, -champion * 0.035),
      2.75,
    );
    aim(
      'RightForeArm',
      'RightHand',
      f
        .clone()
        .multiplyScalar(0.88 + throwMotion * 0.38 - punch * 0.33 - champion * 0.8)
        .addScaledVector(
          up,
          -0.23 +
            throwMotion * 0.385 +
            prepShake * 0.65 +
            punch * (0.48 + punchSway) +
            champion * 1.22,
        )
        .addScaledVector(r, punch * 0.025 + champion * 0.035),
      2.75,
    );

    // Fecha os dedos durante a preparação e os abre na soltura.
    // Apenas ossos presentes no FBX são animados, sem criar geometria solta.
    // O FBX usa nomes como RightHandIndex1, não RightIndex1.
    // A preparação fecha a mão; na soltura os dedos abrem rapidamente.
    // O punho ja comeca fechado no primeiro frame; abre durante a soltura.
    const grip =
      champion > 0.01 || punch > 0.01
        ? 1
        : preparing
          ? 1
          : elapsed >= 0 && elapsed < throwDuration
            ? 1 - THREE.MathUtils.smoothstep(elapsed, 0.2, 0.36)
            : 0;
    for (const [name, joint] of joints) {
      const finger = /^(Right|Left)Hand(Thumb|Index|Middle|Ring|Pinky|Little)([1-4])$/i.exec(name);
      if (!finger) continue;
      const segment = Number(finger[3]);
      if (segment === 4) continue; // ponta, não uma articulação flexível
      const thumb = finger[2].toLowerCase() === 'thumb';
      if (finger[1] === 'Left' && champion <= 0.01) continue;
      const amount = (thumb ? 0.36 : 0.7) * (segment === 1 ? 1 : 0.82) * grip;
      // Ossos Mixamo: flexão na articulação local Z; polegar recebe eixo Y.
      idleEuler.set(
        0,
        thumb ? -amount : 0,
        thumb ? amount * 0.35 : finger[1] === 'Left' ? amount : -amount,
      );
      idleQ.setFromEuler(idleEuler);
      joint.bone.quaternion.multiply(idleQ);
    }

    // Idle orgânico: frequências desencontradas para evitar movimento robótico.
    // Os ângulos são locais e pequenos; preservamos a pose sentada aprovada.
    const breathe = Math.sin(now * 1.85) * 0.022 + Math.sin(now * 0.81) * 0.007;
    const glance = Math.sin(now * 0.49) * 0.105 + Math.sin(now * 0.23 + 1.2) * 0.055;
    const tilt = Math.sin(now * 0.73 + 0.5) * 0.022;
    const applyIdle = (name: string, x: number, y: number, z: number) => {
      const joint = joints.get(name);
      if (!joint) return;
      idleEuler.set(x, y, z);
      idleQ.setFromEuler(idleEuler);
      joint.bone.quaternion.multiply(idleQ);
    };
    applyIdle('Spine', breathe * 0.48, Math.sin(now * 0.37) * 0.013, 0);
    applyIdle('Spine1', breathe * 0.65, Math.sin(now * 0.43 + 0.8) * 0.018, 0);
    applyIdle('Spine2', breathe * 0.45, Math.sin(now * 0.57) * 0.012, 0);
    applyIdle('Neck', tilt * 0.45, glance * 0.25, 0);
    const shakeTime = now - shakeStart.current;
    const disappointed =
      shakeTime >= 0 && shakeTime < 1.2
        ? Math.sin(shakeTime * 14) * Math.sin((Math.PI * shakeTime) / 1.2) * 0.31
        : 0;
    applyIdle(
      'Head',
      tilt + Math.abs(disappointed) * 0.1,
      glance * 0.75 + disappointed,
      Math.sin(now * 0.38) * 0.015,
    );
    // Ossos oculares NÃO são animados. Piscada exigirá pálpebras próprias.
    // Ajustes mínimos nos ombros, sem reabrir a T-pose.
    applyIdle('LeftShoulder', 0, 0, Math.sin(now * 0.66) * 0.012);
    applyIdle('RightShoulder', 0, 0, -Math.sin(now * 0.72 + 0.4) * 0.012);
    // A coroa e o nome seguem o movimento real da cabeça (respiração e olhar).
    // O deslocamento é relativo à pose de repouso, preservando o ajuste individual.
    const head = joints.get('Head')?.bone;
    if (head && crownAnchor.current) {
      head.updateWorldMatrix(true, false);
      head.getWorldPosition(scratch.to);
      // Coordenadas mundiais -> locais do grupo do personagem.
      crownAnchor.current.parent?.updateWorldMatrix(true, false);
      crownAnchor.current.parent?.worldToLocal(scratch.to);
      // Usamos somente a variação do osso da cabeça, não sua posição absoluta,
      // pois a coroa foi calibrada individualmente no espaço da cadeira.
      if (!headRestPosition.current) headRestPosition.current = scratch.to.clone();
      crownAnchor.current.position.set(
        scratch.to.x - headRestPosition.current.x,
        scratch.to.y - headRestPosition.current.y,
        scratch.to.z - headRestPosition.current.z,
      );
    }
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Nome visível acima da cabeça, sempre voltado para a câmera. */}
      <group ref={crownAnchor}>
        <CharacterName
          name={name}
          color={color}
          height={
            isChampion
              ? settings.crownHeight +
                CROWN_TOP_OFFSET * settings.crownScale +
                (settings.nameHeight - 2.35)
              : settings.nameHeight
          }
        />
        {isChampion && (
          <Crown position={[0, settings.crownHeight, 0]} scale={settings.crownScale} />
        )}
      </group>
      <group position={rig.offset} scale={rig.scale}>
        <primitive object={model} />
      </group>
    </group>
  );
}

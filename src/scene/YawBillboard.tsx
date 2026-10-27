import { useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Nome legado mantido para não quebrar os imports. Agora acompanha yaw e pitch,
 * mas NÃO herda roll do headset: o eixo vertical da sala define o 'up'.
 * Posição continua presa ao personagem/dado e não à câmera.
 */
export function YawBillboard({
  position,
  children,
}: {
  position?: [number, number, number];
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const { gl, camera } = useThree();
  const viewer = useRef(new THREE.Vector3());
  const center = useRef(new THREE.Vector3());
  const parentWorld = useRef(new THREE.Quaternion());
  const target = useRef(new THREE.Object3D());

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const eye = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
    eye.getWorldPosition(viewer.current);
    group.getWorldPosition(center.current);
    if (viewer.current.distanceToSquared(center.current) < 0.00001) return;
    // lookAt com up=Y do MUNDO. Nunca extrair quaternion direto do HMD (Roll).
    target.current.position.copy(center.current);
    target.current.up.set(0, 1, 0);
    target.current.lookAt(viewer.current);
    if (group.parent) {
      group.parent.getWorldQuaternion(parentWorld.current);
      group.quaternion.copy(parentWorld.current.invert().multiply(target.current.quaternion));
    } else group.quaternion.copy(target.current.quaternion);
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

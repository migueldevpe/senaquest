import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';

/** Coroa FBX compartilhada, normalizada pela caixa do modelo.
 * Os offsets individuais dos personagens continuam no FBXCharacter. */
export const CROWN_TOP_OFFSET = 0.25;
const CROWN_TARGET_WIDTH = 0.39;
export function Crown({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const source = useLoader(FBXLoader, '/models/crownwin/crownwin.fbx');
  // FBX não garante a associação automática dos mapas externos exportados do Blender.
  // Texturas mantidas separadas em WebP para ajustes futuros.
  const [colorMap, normalMap] = useLoader(THREE.TextureLoader, [
    '/models/crown-texture_crown.webp',
    '/models/crown-normal_map.webp',
  ]);
  const crownMaterial = useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    // Texturas externas do FBX usam a orientação convencional do TextureLoader.
    colorMap.flipY = true;
    normalMap.flipY = true;
    colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    colorMap.needsUpdate = true;
    normalMap.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap,
      color: '#ffffff',
      metalness: 0.35,
      roughness: 0.58,
      side: THREE.DoubleSide,
    });
  }, [colorMap, normalMap]);
  const { model, factor, origin } = useMemo(() => {
    const model = source.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      // Material único preserva o atlas UV sem depender dos materiais FBX originais.
      obj.material = crownMaterial;
    });
    return {
      model,
      factor: CROWN_TARGET_WIDTH / Math.max(size.x, size.z, 0.001),
      origin: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [source, crownMaterial]);
  return (
    <group position={position} scale={scale}>
      <group scale={factor}>
        <primitive object={model} position={origin} />
      </group>
    </group>
  );
}
useLoader.preload(FBXLoader, '/models/crownwin/crownwin.fbx');

// A câmera do jogador é em primeira pessoa: uma coroa ancorada nela
// invadia a visão e virava um polígono gigante ao olhar para cima.
// O jogador recebe a coroa no painel de vitória, não na câmera.

/** Confetes contínuos: um único buffer reciclado, sem alocação por quadro. */
function Confetti({ winner }: { winner: number }) {
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.067,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    [],
  );
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 320;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ['#F7941D', '#004A8D', '#f6d14b', '#30bca0', '#b376dd'];
    // O jogador humano vê a mesa à frente: a festa deve acontecer no campo de visão,
    // não atrás da câmera, onde os confetes anteriores ficavam invisíveis.
    const center =
      winner === 1 ? [3.18, 0] : winner === 2 ? [0, -3.18] : winner === 3 ? [-3.18, 0] : [0, 2.35];
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963;
      const radius = 0.45 + Math.sqrt(((i * 37) % 100) / 100) * 1.45;
      positions[i * 3] = center[0] + Math.cos(a) * radius;
      positions[i * 3 + 1] = 2.5 + (((i * 29) % 100) / 100) * 2.0;
      positions[i * 3 + 2] = center[1] + Math.sin(a) * radius;
      const color = new THREE.Color(palette[i % palette.length]);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [winner]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame((_, delta) => {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < positions.count; i++) {
      const y = i * 3 + 1;
      array[y] -= dt * (0.32 + (i % 7) * 0.065);
      if (array[y] < 1.1) array[y] = 3.2 + (((i * 29) % 100) / 100) * 0.8;
    }
    positions.needsUpdate = true;
  });
  return <points geometry={geometry} material={material} />;
}

export function VictoryEffects() {
  const phase = useGame((state) => state.phase);
  const winner = useGame((state) => state.winner);
  const replay = useGame((state) => state.debugVictoryNonce);
  if (phase !== 'finished' || winner === null) return null;
  return (
    <>
      <Confetti key={`${winner}:${replay}`} winner={winner} />
    </>
  );
}

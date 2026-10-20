import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';

/** Coroa baixa, com aro contínuo e cinco recortes discretos.
 * A geometria é compartilhada entre personagens e não depende da câmera.
 * O topo fica aproximadamente 0,19 unidade acima da posição do acessório.
 */
const crownGold = new THREE.MeshStandardMaterial({
  color: '#dba72f',
  metalness: 0.55,
  roughness: 0.34,
});
const crownRim = new THREE.MeshStandardMaterial({
  color: '#f5d47c',
  metalness: 0.5,
  roughness: 0.3,
});
const crownGem = new THREE.MeshStandardMaterial({
  color: '#166ab2',
  metalness: 0.15,
  roughness: 0.25,
});
const crownBand = new THREE.CylinderGeometry(0.2, 0.205, 0.105, 32, 1, true);
const crownLip = new THREE.TorusGeometry(0.203, 0.014, 7, 32);
const crownTip = new THREE.SphereGeometry(0.028, 10, 8);
const crownJewel = new THREE.OctahedronGeometry(0.034, 0);
export const CROWN_TOP_OFFSET = 0.12;
export function Crown({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh geometry={crownBand} material={crownGold} />
      <mesh
        geometry={crownLip}
        material={crownRim}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
      />
      <mesh
        geometry={crownLip}
        material={crownRim}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      />
      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 5;
        return (
          <group key={i} position={[Math.sin(angle) * 0.18, 0.073, Math.cos(angle) * 0.18]}>
            <mesh geometry={crownTip} material={crownGold} scale={[0.95, 1.55, 0.95]} />
          </group>
        );
      })}
      <mesh geometry={crownJewel} material={crownGem} position={[0, 0.012, 0.207]} />
    </group>
  );
}

// A câmera do jogador é em primeira pessoa: uma coroa ancorada nela
// invadia a visão e virava um polígono gigante ao olhar para cima.
// O jogador recebe a coroa no painel de vitória, não na câmera.

/** Confetes contínuos: um único buffer reciclado, sem alocação por quadro. */
function Confetti({ winner }: { winner: number }) {
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.095,
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

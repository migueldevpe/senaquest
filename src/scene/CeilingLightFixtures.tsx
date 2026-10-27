/**
 * Luminárias retangulares definitivas e feixes volumétricos simulados.
 * Mantém os materiais cromado/emissivo do GLB, sem criar luzes reais:
 * StableRoomLighting continua sendo a única fonte de iluminação da sala.
 *
 * Todas as posições e dimensões são editáveis em modelPlacements.ts.
 * Os feixes são prismas piramidais com opacidade decrescente em direção ao chão.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';

const CEILING_GLTF = '/models/ceiling/ceiling_lights_low_poly.glb';
const CEILING_IDS = [
  'ceiling_light_1',
  'ceiling_light_2',
  'ceiling_light_3',
  'ceiling_light_4',
] as const;
type CeilingId = (typeof CEILING_IDS)[number];

// Feixe largo e triangular (pirâmide retangular), sem fog/pós-processamento.
// Opacidade deliberadamente baixa para o Meta Quest.
export const CEILING_BEAM = {
  height: 2.85,
  // O feixe nasce exatamente com a largura/profundidade da luminária.
  // Sua abertura aumenta de forma uniforme até a extremidade inferior.
  spreadWidth: 0.75,
  spreadDepth: 0.9,
  opacity: 0.16,
  tint: '#fff5da',
} as const;

let fixturePromise: Promise<THREE.Group> | undefined;
export function preloadCeilingFixtures(): Promise<THREE.Group> {
  fixturePromise ??= new GLTFLoader()
    .loadAsync(CEILING_GLTF)
    .then(({ scene }) => {
      if (!scene.children.length) throw new Error('Luminária GLB vazia');
      // No GLB, "Cromo" usa metalness=1.0; sem environment map esse material
      // reflete o vazio e parece PRETO mesmo sob as luzes da sala. Preservamos
      // exatamente a cor base e a rugosidade do arquivo e diminuímos apenas a
      // metalicidade para que a iluminação estabilizada revele seu tom prateado.
      // O material "Emission" continua intacto (inclusive sua intensidade).
      const materialFixes = new Map<THREE.Material, THREE.Material>();
      scene.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const adjust = (source: THREE.Material): THREE.Material => {
          if (
            !(source instanceof THREE.MeshStandardMaterial) ||
            source.name.trim().toLowerCase() !== 'cromo'
          )
            return source;
          const cached = materialFixes.get(source);
          if (cached) return cached;
          const chrome = source.clone();
          chrome.metalness = 0.26;
          // Discreto brilho de preenchimento no acabamento cromado; não é luz
          // real e não modifica o ambiente nem o material da face emissiva.
          chrome.emissive.copy(chrome.color);
          chrome.emissiveIntensity = 0.06;
          chrome.needsUpdate = true;
          materialFixes.set(source, chrome);
          return chrome;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(adjust)
          : adjust(mesh.material);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
      });
      return scene;
    })
    .catch((error: unknown) => {
      fixturePromise = undefined; // Permite nova tentativa após falha no loading.
      throw error;
    });
  return fixturePromise;
}

/** Feixe piramidal aberto: o topo coincide com as bordas X/Z da luminária. */
function createBeamGeometry(topWidth: number, topDepth: number): THREE.BufferGeometry {
  const { height, spreadWidth, spreadDepth } = CEILING_BEAM;
  const bottomWidth = topWidth + 2 * spreadWidth;
  const bottomDepth = topDepth + 2 * spreadDepth;
  const top = [
    [-topWidth / 2, 0, -topDepth / 2],
    [topWidth / 2, 0, -topDepth / 2],
    [topWidth / 2, 0, topDepth / 2],
    [-topWidth / 2, 0, topDepth / 2],
  ];
  const bottom = [
    [-bottomWidth / 2, -height, -bottomDepth / 2],
    [bottomWidth / 2, -height, -bottomDepth / 2],
    [bottomWidth / 2, -height, bottomDepth / 2],
    [-bottomWidth / 2, -height, bottomDepth / 2],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    const a = top[side]!;
    const b = top[next]!;
    const c = bottom[next]!;
    const d = bottom[side]!;
    for (const [point, u, v] of [
      [a, 0, 0],
      [b, 1, 0],
      [c, 1, 1],
      [a, 0, 0],
      [c, 1, 1],
      [d, 0, 1],
    ] as [number[], number, number][]) {
      positions.push(...point);
      uvs.push(u, v);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

// Um único material compartilhado; dimensões do feixe independentes por luminária.
const BEAM_MATERIAL = new THREE.ShaderMaterial({
  name: 'SENAQUEST_CeilingSoftPyramidalBeam',
  uniforms: {
    uColor: { value: new THREE.Color(CEILING_BEAM.tint) },
    uOpacity: { value: CEILING_BEAM.opacity },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      // vUv.y = 0 no teto; vUv.y = 1 na extremidade inferior do feixe.
      float vertical = pow(1.0 - smoothstep(0.0, 1.0, vUv.y), 1.25);
      float horizontal = pow(max(0.0, 1.0 - abs(vUv.x * 2.0 - 1.0)), 0.50);
      float alpha = uOpacity * vertical * (0.20 + 0.80 * horizontal);
      if (alpha < 0.001) discard;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

function CeilingFixture({ id, source }: { id: CeilingId; source: THREE.Group }) {
  const cfg = MODEL_PLACEMENTS[id];
  const fitted = useMemo(() => {
    // O GLB já traz sua face luminosa voltada para -Y (o piso). Aplicar
    // -90° no X girava essa face para a parede, deixando o corpo de lado.
    // Mantemos a orientação ORIGINAL; rotationY continua editável no cadastro.
    const model = source.clone(true);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) return null;
    const size = bounds.getSize(new THREE.Vector3());
    // As luminárias são peças arquitetônicas modulares. Neste caso os valores
    // configurados representam dimensões EXATAS X/Y/Z, não só limites máximos:
    // o topo do feixe deve coincidir com a geometria visível após o fitting.
    const scale: [number, number, number] = cfg.maxDimensions.map(
      (length, axis) => length / Math.max(size.getComponent(axis), 0.00001),
    ) as [number, number, number];
    const center = bounds.getCenter(new THREE.Vector3());
    return {
      model,
      scale,
      // Alinha o topo ao teto e centraliza X/Z antes do escalonamento.
      offset: [-center.x, -bounds.max.y, -center.z] as [number, number, number],
      // Começa logo abaixo da face inferior, sem atravessar o corpo metálico.
      beamStart: cfg.maxDimensions[1] + 0.004,
    };
  }, [source, cfg.maxDimensions]);
  const beamGeometry = useMemo(
    () => createBeamGeometry(cfg.maxDimensions[0], cfg.maxDimensions[2]),
    [cfg.maxDimensions],
  );
  useEffect(() => () => beamGeometry.dispose(), [beamGeometry]);
  return (
    <group name={id} position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      {fitted && (
        <group scale={fitted.scale}>
          <group position={fitted.offset}>
            <primitive object={fitted.model} />
          </group>
        </group>
      )}
      {fitted && (
        <mesh
          name={`${id}-triangular-soft-beam`}
          position={[0, -fitted.beamStart, 0]}
          geometry={beamGeometry}
          material={BEAM_MATERIAL}
          frustumCulled
        />
      )}
    </group>
  );
}

export function CeilingLightFixtures() {
  const [source, setSource] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let active = true;
    void preloadCeilingFixtures()
      .then((model) => {
        if (active) setSource(model);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Luminárias não carregadas:', error));
    return () => {
      active = false;
    };
  }, []);
  if (!source) return null;
  return (
    <group name="senaquest-ceiling-light-fixtures">
      {CEILING_IDS.map((id) => (
        <CeilingFixture key={id} id={id} source={source} />
      ))}
    </group>
  );
}

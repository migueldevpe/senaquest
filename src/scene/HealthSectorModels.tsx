/**
 * Modelos definitivos do setor Saúde.
 * Inclui os três modelos principais do conjunto original (mesa, maca, trolley)
 * e acessórios adicionais configuráveis (iv pole, trash, glove box, defibrillator).
 *
 * Todos os materiais externos novos são convertidos para WebP e aplicados em tempo
 * de carregamento. Quando um FBX aponta para caminhos internos quebrados/absolutos,
 * o loader recebe uma textura neutra e em seguida substituímos os materiais por uma
 * configuração local, evitando 404s, warnings e custo desnecessário no Quest.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HEALTH_MODEL_PLACEMENTS, type HealthModelId, type Vec3 } from './modelPlacements';

// Compatibilidade com imports anteriores; a fonte editável é modelPlacements.ts.
export { HEALTH_MODEL_PLACEMENTS, MODEL_PLACEMENTS } from './modelPlacements';
export type { HealthModelId } from './modelPlacements';

const ROOT = '/models/health-final';
const ACCESSORY_ROOT = `${ROOT}/accessories`;
const FALLBACK_TEXTURE = `${ROOT}/medicine/neutral.webp`;
const HEALTH_MODEL_IDS = [
  'mesa',
  'maca',
  'trolley',
  'iv_pole',
  'trash',
  'glove_box',
  'defibrillator',
  'medical_kit',
] as const satisfies readonly HealthModelId[];
const ACCESSORY_IDS = new Set<HealthModelId>([
  'iv_pole',
  'trash',
  'glove_box',
  'defibrillator',
  'medical_kit',
]);
const macaTextures = {
  Bed: '1ec9ef3242efb42e8c1df03713541fc40a9d5032.webp',
  Handel_bar:
    'texture-light-blue-leather-as-background-texture-light-blue-leather-as-background-closeup-174579953.webp',
  pillow: 'istockphoto-513872130-170667a.webp',
  Blanket:
    'texture-map-d-programms-white-seamless-texture-can-be-used-as-diffuse-bump-reflection-map-white-fabric-seamless-texture-110044316.webp',
} as const;
const macaFilenames = new Set<string>(Object.values(macaTextures));
const modelCache = new Map<HealthModelId, Promise<THREE.Group | null>>();
const textureCache = new Map<string, THREE.Texture>();
const texturePending = new Map<string, Promise<void>>();

function modelRoot(id: HealthModelId): string {
  return ACCESSORY_IDS.has(id) ? `${ACCESSORY_ROOT}/${id}` : `${ROOT}/${id}`;
}

function modelUrl(id: HealthModelId): string {
  return id === 'iv_pole' ? `${modelRoot(id)}/${id}.glb` : `${modelRoot(id)}/${id}.fbx`;
}

function localTexture(id: HealthModelId, filename: string, srgb = false): THREE.Texture {
  const url = `${modelRoot(id)}/${filename}`;
  const key = `${url}:${srgb ? 'srgb' : 'linear'}`;
  let texture = textureCache.get(key);
  if (!texture) {
    let resolveLoaded!: () => void;
    let rejectLoaded!: (error: Error) => void;
    texturePending.set(
      key,
      new Promise<void>((resolve, reject) => {
        resolveLoaded = resolve;
        rejectLoaded = reject;
      }),
    );
    texture = new THREE.TextureLoader().load(
      url,
      () => resolveLoaded(),
      undefined,
      () => rejectLoaded(new Error(`Textura de saúde indisponível: ${url}`)),
    );
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 2; // Evita custo excessivo no Quest.
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    textureCache.set(key, texture);
  }
  return texture;
}

/** Reconecta as referências .jpg do FBX da maca às imagens .webp locais. */
function healthLoadingManager(id: HealthModelId): THREE.LoadingManager {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url === modelUrl(id) || url.endsWith('.fbx') || url.endsWith('.glb')) return url;
    if (id === 'maca') {
      const basename = url
        .replaceAll('\\', '/')
        .split('/')
        .pop()
        ?.replace(/\.jpe?g$/i, '.webp');
      return basename && macaFilenames.has(basename)
        ? `${ROOT}/maca/${basename}`
        : FALLBACK_TEXTURE;
    }
    return FALLBACK_TEXTURE;
  });
  return manager;
}

function cloneSourceMaterial(
  source: THREE.Material,
  fallbackColor = '#ffffff',
): THREE.MeshStandardMaterial {
  const standard = source as THREE.MeshStandardMaterial;
  const color =
    'color' in standard && standard.color instanceof THREE.Color
      ? standard.color.clone()
      : new THREE.Color(fallbackColor);
  return new THREE.MeshStandardMaterial({
    name: source.name,
    color,
    metalness: Number.isFinite(standard.metalness) ? standard.metalness : 0.04,
    roughness: Number.isFinite(standard.roughness) ? standard.roughness : 0.78,
    transparent: standard.transparent,
    opacity: standard.opacity,
    side: source.side,
  });
}

function standardMaterials(
  id: HealthModelId,
): (material: THREE.Material, meshName?: string) => THREE.Material {
  const cache = new Map<string, THREE.Material>();
  return (source, meshName = '') => {
    const baseName = `${source.name || meshName || 'default'}:${id}`;
    const key = baseName.trim().toLowerCase();
    const existing = cache.get(key);
    if (existing) return existing;
    let material: THREE.Material;
    if (id === 'trolley') {
      const prefix = 'TexSheet8_low_DefaultMaterial_';
      const ao = localTexture('trolley', `${prefix}AO.webp`);
      ao.channel = 0; // Usa o primeiro conjunto de UVs, presente no FBX.
      material = new THREE.MeshStandardMaterial({
        name: source.name,
        color: '#ffffff',
        roughness: 1,
        metalness: 1,
        map: localTexture('trolley', `${prefix}BaseColor.webp`, true),
        normalMap: localTexture('trolley', `${prefix}Normal.webp`),
        metalnessMap: localTexture('trolley', `${prefix}Metallic.webp`),
        roughnessMap: localTexture('trolley', `${prefix}Roughness.webp`),
        aoMap: ao,
        aoMapIntensity: 0.65,
      });
    } else if (id === 'mesa') {
      // MaskMap veio sem alpha: R=metalicidade, G=oclusão.
      const ao = localTexture('mesa', 'table_mat_AOFromMask.webp');
      ao.channel = 0;
      material = new THREE.MeshStandardMaterial({
        name: source.name,
        color: '#ffffff',
        roughness: 0.72,
        metalness: 1,
        map: localTexture('mesa', 'table_mat_BaseMap.webp', true),
        normalMap: localTexture('mesa', 'table_mat_Normal.webp'),
        metalnessMap: localTexture('mesa', 'table_mat_MetallicFromMask.webp'),
        aoMap: ao,
        aoMapIntensity: 0.5,
      });
    } else if (
      key.startsWith('bed:maca') ||
      key.startsWith('handel_bar:maca') ||
      key.startsWith('pillow:maca') ||
      key.startsWith('blanket:maca')
    ) {
      const filename = macaTextures[source.name as keyof typeof macaTextures];
      material = new THREE.MeshStandardMaterial({
        name: source.name,
        color: '#ffffff',
        metalness: 0,
        roughness: 0.83,
        map: localTexture('maca', filename, true),
      });
    } else if (id === 'trash') {
      // O pacote enviado trouxe BaseMap + Normal + MaskMap do lixo médico/bin.
      // Mantemos um único conjunto PBR leve e coerente para todas as partes do objeto.
      const ao = localTexture('trash', 'Trolley_table_Dbin_mat_MaskMap.webp');
      ao.channel = 0;
      material = new THREE.MeshStandardMaterial({
        name: source.name || 'trash',
        color: '#ffffff',
        roughness: 0.76,
        metalness: 0.92,
        map: localTexture('trash', 'Trolley_table_Dbin_mat_BaseMap.webp', true),
        normalMap: localTexture('trash', 'Trolley_table_Dbin_mat_Normal.webp'),
        metalnessMap: localTexture('trash', 'Trolley_table_Dbin_mat_MaskMap.webp'),
        aoMap: ao,
        aoMapIntensity: 0.55,
      });
    } else if (id === 'medical_kit') {
      // O FBX possui um único material UV (Medical_Cit). A textura diffuse
      // identifica a cruz vermelha e os rótulos; usar um material compartilhado
      // evita criar materiais diferentes e misturar mapas em UVs incompatíveis.
      // Glossiness/metallic/height/IOR/reflection enviados eram mapas uniformes:
      // representamos esses fatores por constantes para economizar VRAM e draw work.
      material = new THREE.MeshStandardMaterial({
        name: source.name || 'Medical_Cit',
        color: '#ffffff',
        map: localTexture('medical_kit', 'medical_kit_base.webp', true),
        normalMap: localTexture('medical_kit', 'medical_kit_normal.webp'),
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.51,
        metalness: 0,
      });
    } else if (id === 'glove_box') {
      material = new THREE.MeshStandardMaterial({
        name: source.name || 'glove_box',
        color: '#ffffff',
        map: localTexture('glove_box', 'glove_box_base.webp', true),
        normalMap: localTexture('glove_box', 'glove_box_normal.webp'),
        normalScale: new THREE.Vector2(0.38, 0.38),
        roughness: 0.88,
        metalness: 0.02,
      });
    } else if (id === 'defibrillator') {
      if (key.includes('screen') || key.includes('display')) {
        material = new THREE.MeshStandardMaterial({
          name: source.name,
          color: '#0f1720',
          emissive: '#141c27',
          emissiveIntensity: 0.08,
          roughness: 0.52,
          metalness: 0.05,
        });
      } else if (key.includes('button') || key.includes('pad') || key.includes('cable')) {
        material = cloneSourceMaterial(source, '#d4d6da');
        const standard = material as THREE.MeshStandardMaterial;
        standard.roughness = 0.74;
        standard.metalness = 0.08;
      } else {
        material = cloneSourceMaterial(source, '#d94645');
        const standard = material as THREE.MeshStandardMaterial;
        standard.roughness = 0.68;
        standard.metalness = 0.1;
      }
    } else {
      // Conserva cores e parâmetros do FBX nos metais, rodas e suportes.
      material = source.clone();
    }
    cache.set(key, material);
    return material;
  };
}

function postProcessModel(id: HealthModelId, scene: THREE.Group): THREE.Group {
  // Mantém integralmente os materiais PBR e as texturas embutidas do novo IV Pole.
  // Recriar os materiais aqui removeria os mapas, a transparência e a transmissão.
  if (id === 'iv_pole') {
    scene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
    });
    return scene;
  }
  const mapMaterial = standardMaterials(id);
  scene.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => mapMaterial(material, mesh.name))
      : mapMaterial(mesh.material, mesh.name);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
  });
  return scene;
}

function loadHealthModel(id: HealthModelId): Promise<THREE.Group | null> {
  const previous = modelCache.get(id);
  if (previous) return previous;
  const result = new Promise<THREE.Group | null>((resolve) => {
    if (id === 'iv_pole') {
      // O GLB já contém os mapas WebP embutidos. Não aplicar o URLModifier
      // usado pelos FBX: ele pode trocar URLs blob: internas pelo fallback.
      const loader = new GLTFLoader();
      loader.load(
        modelUrl(id),
        (gltf) => {
          resolve(postProcessModel(id, gltf.scene));
        },
        undefined,
        (error) => {
          console.warn(`[SENAQUEST] Não foi possível carregar ${id}.glb`, error);
          resolve(null);
        },
      );
      return;
    }
    const loader = new FBXLoader(healthLoadingManager(id));
    loader.load(
      modelUrl(id),
      (scene) => {
        resolve(postProcessModel(id, scene));
      },
      undefined,
      (error) => {
        console.warn(`[SENAQUEST] Não foi possível carregar ${id}.fbx`, error);
        resolve(null);
      },
    );
  });
  modelCache.set(id, result);
  return result;
}

function HealthModel({ id }: { id: HealthModelId }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let active = true;
    loadHealthModel(id).then((model) => {
      if (active && model) setScene(model);
    });
    return () => {
      active = false;
    };
  }, [id]);
  const cfg = HEALTH_MODEL_PLACEMENTS[id];
  const fit = useMemo(() => {
    if (!scene) return null;
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    if (bounds.isEmpty()) return null;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const factor = Math.min(
      ...cfg.maxDimensions.map((max, index) => max / Math.max(0.00001, size.getComponent(index))),
    );
    if (!Number.isFinite(factor) || factor <= 0) return null;
    return { factor, offset: [-center.x, -bounds.min.y, -center.z] as Vec3 };
  }, [scene, cfg.maxDimensions]);
  return (
    <group
      name={`health-user-model-${id}`}
      position={cfg.position}
      rotation={[0, cfg.rotationY, 0]}
    >
      {scene && fit && (
        <group scale={fit.factor}>
          <group position={fit.offset}>
            <primitive object={scene} />
          </group>
        </group>
      )}
    </group>
  );
}

/** Modelos definitivos do setor Saúde; não dependem do modo decor=off/legacy. */
export function HealthSectorModels() {
  const enabled =
    typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('healthModels') !== 'off';
  if (!enabled) return null;
  return (
    <group name="health-user-models">
      {HEALTH_MODEL_IDS.map((id) => (
        <HealthModel key={id} id={id} />
      ))}
    </group>
  );
}

/** Iniciado pela tela de loading; reutiliza o cache quando o World montar. */
export async function preloadHealthSectorModels(): Promise<void> {
  await Promise.all(
    HEALTH_MODEL_IDS.map(async (id) => {
      if (!(await loadHealthModel(id))) throw new Error(`Modelo da Saúde indisponível: ${id}`);
    }),
  );
  // Aguarda também a decodificação REAL das texturas, não só a leitura do FBX.
  await Promise.all(texturePending.values());
}

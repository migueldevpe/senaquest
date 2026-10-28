/** Boxes de papelão para Logística e Vendas, com texturas locais em WebP. */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';

const ROOT = '/models/logistics';
const STACK_URL = `${ROOT}/boxes/boxes.fbx`;
const SINGLE_URL = `${ROOT}/box/box.fbx`;

type LogisticsBoxesAssets = {
  stack: THREE.Group;
  single: THREE.Group;
};

const SINGLE_BOX_PLACEMENTS = [
  'logistics_box_single',
  'logistics_box_shelf_2',
  'logistics_box_shelf_3',
  'logistics_box_shelf_4',
  'logistics_box_under_table_1',
  'logistics_box_under_table_2',
  'logistics_box_under_table_3',
] as const;

let boxesPromise: Promise<LogisticsBoxesAssets> | null = null;

function setTextureDefaults(texture: THREE.Texture, colorTexture = false) {
  texture.flipY = false;
  texture.colorSpace = colorTexture ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

function materialColor(material: THREE.Material, fallback: string) {
  const color = (material as THREE.Material & { color?: THREE.Color }).color;
  return color?.clone() ?? new THREE.Color(fallback);
}

function collectMaterialTextures(material: THREE.Material, textures: Set<THREE.Texture>) {
  const candidate = material as THREE.MeshStandardMaterial;
  for (const texture of [
    candidate.map,
    candidate.alphaMap,
    candidate.normalMap,
    candidate.roughnessMap,
    candidate.bumpMap,
    candidate.metalnessMap,
    candidate.aoMap,
    candidate.emissiveMap,
  ]) {
    if (texture) textures.add(texture);
  }
}

function replaceModelMaterials(
  model: THREE.Group,
  kind: 'stack' | 'single',
  textures: {
    single: THREE.Texture;
    albedo: THREE.Texture;
    normal: THREE.Texture;
    roughness: THREE.Texture;
    height: THREE.Texture;
    warning: THREE.Texture;
  },
) {
  const oldTextures = new Set<THREE.Texture>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = true;

    const original = Array.isArray(object.material) ? object.material : [object.material];
    const replacement = original.map((source) => {
      collectMaterialTextures(source, oldTextures);
      const name = `${source.name || object.name || 'cardboard'}`;
      const normalized = name.toLowerCase();
      const key = `${kind}:${normalized}`;
      const cached = materials.get(key);
      if (cached) return cached;

      let material: THREE.MeshStandardMaterial;
      if (kind === 'single') {
        material = new THREE.MeshStandardMaterial({
          name,
          color: '#ffffff',
          map: textures.single,
          metalness: 0,
          roughness: 0.9,
          side: THREE.DoubleSide,
        });
      } else if (normalized.includes('warning')) {
        // A textura original desse decal não veio no RAR. O fallback WebP
        // usa o símbolo de manuseio presente na textura da box individual.
        material = new THREE.MeshStandardMaterial({
          name,
          color: '#ffffff',
          map: textures.warning,
          metalness: 0,
          roughness: 0.95,
          transparent: true,
          alphaTest: 0.06,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          side: THREE.DoubleSide,
        });
      } else if (normalized.includes('tape')) {
        material = new THREE.MeshStandardMaterial({
          name,
          color: materialColor(source, '#c49a63'),
          metalness: 0,
          roughness: 0.72,
          side: source.side,
        });
      } else {
        material = new THREE.MeshStandardMaterial({
          name,
          color: materialColor(source, '#ffffff'),
          map: textures.albedo,
          normalMap: textures.normal,
          normalScale: new THREE.Vector2(0.75, 0.75),
          roughnessMap: textures.roughness,
          bumpMap: textures.height,
          bumpScale: 0.006,
          metalness: 0,
          roughness: 0.92,
          side: source.side,
        });
      }
      materials.set(key, material);
      return material;
    });
    object.material = Array.isArray(object.material) ? replacement : replacement[0];
  });

  oldTextures.forEach((texture) => texture.dispose());
}

export function preloadLogisticsBoxes(): Promise<LogisticsBoxesAssets> {
  if (!boxesPromise) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const basename = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
      const mapped: Record<string, string> = {
        'texture.png': `${ROOT}/box/box.webp`,
        'texturescom_cardboard_toplayer_1k_albedo.tif': `${ROOT}/boxes/cardboard_albedo.webp`,
        'texturescom_cardboard_toplayer_1k_albedo.tiff': `${ROOT}/boxes/cardboard_albedo.webp`,
        'texturescom_cardboard_toplayer_1k_normal.tif': `${ROOT}/boxes/cardboard_normal.webp`,
        'texturescom_cardboard_toplayer_1k_roughness.tif': `${ROOT}/boxes/cardboard_roughness.webp`,
        'texturescom_cardboard_toplayer_1k_height.tif': `${ROOT}/boxes/cardboard_height.webp`,
        'cardboard boxes warning symbols.png': `${ROOT}/boxes/warning-symbols.webp`,
      };
      return mapped[basename] ?? url;
    });

    const loader = new THREE.TextureLoader();
    boxesPromise = Promise.all([
      new FBXLoader(manager).loadAsync(STACK_URL),
      new FBXLoader(manager).loadAsync(SINGLE_URL),
      loader.loadAsync(`${ROOT}/box/box.webp`),
      loader.loadAsync(`${ROOT}/boxes/cardboard_albedo.webp`),
      loader.loadAsync(`${ROOT}/boxes/cardboard_normal.webp`),
      loader.loadAsync(`${ROOT}/boxes/cardboard_roughness.webp`),
      loader.loadAsync(`${ROOT}/boxes/cardboard_height.webp`),
      loader.loadAsync(`${ROOT}/boxes/warning-symbols.webp`),
    ])
      .then(([stack, single, singleTexture, albedo, normal, roughness, height, warning]) => {
        if (!stack.children.length || !single.children.length) {
          throw new Error('Um dos modelos de boxes está vazio');
        }
        setTextureDefaults(singleTexture, true);
        setTextureDefaults(albedo, true);
        setTextureDefaults(normal);
        setTextureDefaults(roughness);
        setTextureDefaults(height);
        setTextureDefaults(warning, true);

        const textureSet = { single: singleTexture, albedo, normal, roughness, height, warning };
        replaceModelMaterials(stack, 'stack', textureSet);
        replaceModelMaterials(single, 'single', textureSet);
        return { stack, single };
      })
      .catch((error: unknown) => {
        boxesPromise = null;
        throw error;
      });
  }
  return boxesPromise;
}

function getFittedModel(model: THREE.Group, maxDimensions: readonly number[]) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) return null;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const factor = Math.min(
    ...maxDimensions.map((limit, axis) => limit / Math.max(0.00001, size.getComponent(axis))),
  );
  if (!Number.isFinite(factor) || factor <= 0) return null;
  return {
    factor,
    offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
  };
}

export function LogisticsBoxesModel() {
  const [assets, setAssets] = useState<LogisticsBoxesAssets | null>(null);
  useEffect(() => {
    let active = true;
    void preloadLogisticsBoxes()
      .then((loaded) => {
        if (active) setAssets(loaded);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Boxes de Logística:', error));
    return () => {
      active = false;
    };
  }, []);

  const stackCfg = MODEL_PLACEMENTS.logistics_boxes_stack;
  const stackInstance = useMemo(() => assets?.stack.clone(true) ?? null, [assets]);
  const singleInstances = useMemo(
    () => (assets ? SINGLE_BOX_PLACEMENTS.map(() => assets.single.clone(true)) : []),
    [assets],
  );
  const stackFit = useMemo(
    () => (assets ? getFittedModel(assets.stack, stackCfg.maxDimensions) : null),
    [assets, stackCfg.maxDimensions],
  );
  const singleFits = useMemo(
    () =>
      assets
        ? SINGLE_BOX_PLACEMENTS.map((placementId) =>
            getFittedModel(assets.single, MODEL_PLACEMENTS[placementId].maxDimensions),
          )
        : [],
    [assets],
  );

  if (
    !assets ||
    !stackInstance ||
    !stackFit ||
    singleInstances.length !== SINGLE_BOX_PLACEMENTS.length
  )
    return null;

  return (
    <group name="logistics-sales-boxes">
      <group
        name="logistics-sales-box-stack"
        position={stackCfg.position}
        rotation={[0, stackCfg.rotationY, 0]}
      >
        <group scale={stackFit.factor}>
          <group position={stackFit.offset}>
            <primitive object={stackInstance} dispose={null} />
          </group>
        </group>
      </group>
      {SINGLE_BOX_PLACEMENTS.map((placementId, index) => {
        const cfg = MODEL_PLACEMENTS[placementId];
        const instance = singleInstances[index];
        const fit = singleFits[index];
        if (!instance || !fit) return null;
        const onShelf =
          placementId.startsWith('logistics_box_shelf') || placementId === 'logistics_box_single';
        return (
          <group
            key={placementId}
            name={
              onShelf
                ? `logistics-sales-single-box-on-shelf-${index + 1}`
                : `logistics-sales-box-under-table-${index + 1}`
            }
            position={cfg.position}
            rotation={[0, cfg.rotationY, 0]}
          >
            <group scale={fit.factor}>
              <group position={fit.offset}>
                <primitive object={instance} dispose={null} />
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Estante FBX de Logística e Vendas, com textura e normal map originais
 * convertidos para WebP. Não usar o mapa colorido de canais desconhecidos como
 * roughness/metalness: ele deixava os materiais artificialmente brilhantes. */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';
import { shelfCenterFromBackFaceX } from './roomWallPlacement';

const ROOT = '/models/logistics/shelfvendas';
const URL = `${ROOT}/shelfvendas.fbx`;

type ShelfAssets = { model: THREE.Group; base: THREE.Texture; normal: THREE.Texture };
let shelfPromise: Promise<ShelfAssets> | null = null;

export function preloadLogisticsShelf(): Promise<ShelfAssets> {
  if (!shelfPromise) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const name = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
      if (name === 'image_0') return `${ROOT}/shelfvendas_base.webp`;
      if (name === 'image_2') return `${ROOT}/shelfvendas_normal.webp`;
      return url;
    });
    const textures = new THREE.TextureLoader(manager);
    shelfPromise = Promise.all([
      new FBXLoader(manager).loadAsync(URL),
      textures.loadAsync(`${ROOT}/shelfvendas_base.webp`),
      textures.loadAsync(`${ROOT}/shelfvendas_normal.webp`),
    ])
      .then(([model, base, normal]) => {
        if (!model.children.length) throw new Error('FBX de Logística e Vendas vazio');
        base.colorSpace = THREE.SRGBColorSpace;
        normal.colorSpace = THREE.NoColorSpace;
        base.anisotropy = normal.anisotropy = 4;
        base.needsUpdate = normal.needsUpdate = true;
        return { model, base, normal };
      })
      .catch((error: unknown) => {
        shelfPromise = null;
        throw error;
      });
  }
  return shelfPromise;
}

export function LogisticsShelfModel() {
  const [assets, setAssets] = useState<ShelfAssets | null>(null);
  useEffect(() => {
    let mounted = true;
    void preloadLogisticsShelf()
      .then((data) => {
        if (mounted) setAssets(data);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Estante Logística:', error));
    return () => {
      mounted = false;
    };
  }, []);

  const cfg = MODEL_PLACEMENTS.logistics_shelf;
  const prepared = useMemo(() => {
    if (!assets) return null;
    const instance = assets.model.clone(true);
    instance.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      if (!mesh.geometry.getAttribute('uv')) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
        return;
      }
      mesh.material = new THREE.MeshStandardMaterial({
        map: assets.base,
        normalMap: assets.normal,
        color: '#ffffff',
        metalness: 0.1,
        roughness: 0.84,
      });
    });
    instance.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(instance);
    if (bounds.isEmpty()) return null;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(
      ...cfg.maxDimensions.map((limit, axis) => limit / Math.max(size.getComponent(axis), 0.0001)),
    );
    if (!Number.isFinite(scale) || scale <= 0) return null;
    return {
      instance,
      centerX: shelfCenterFromBackFaceX(
        cfg.position[0],
        cfg.rotationY,
        size.x * scale,
        size.z * scale,
      ),
      scale,
      offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
    };
  }, [assets, cfg.maxDimensions, cfg.rotationY, cfg.position]);
  if (!prepared) return null;
  return (
    <group
      name="logistics-sales-final-shelf"
      position={[prepared.centerX, cfg.position[1], cfg.position[2]]}
      rotation={[0, cfg.rotationY, 0]}
    >
      <group scale={prepared.scale}>
        <group position={prepared.offset}>
          <primitive object={prepared.instance} />
        </group>
      </group>
    </group>
  );
}

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';

const ROOT = '/models/sector-whiteboard';
const TEXTURES = `${ROOT}/textures`;
const MODEL_URL = `${ROOT}/White_board.fbx`;

type WhiteboardAssets = {
  model: THREE.Group;
  albedo: THREE.Texture;
  ao: THREE.Texture;
  metallic: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
};

let assetsPromise: Promise<WhiteboardAssets> | null = null;

function loadTexture(url: string, color: boolean): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(url).then((texture) => {
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 4;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  });
}

function loadWhiteboard(): Promise<WhiteboardAssets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      new FBXLoader().loadAsync(MODEL_URL),
      loadTexture(`${TEXTURES}/White_board_Albedo.webp`, true),
      loadTexture(`${TEXTURES}/White_board_AO.webp`, false),
      loadTexture(`${TEXTURES}/White_board_Metallic.webp`, false),
      loadTexture(`${TEXTURES}/White_board_Normal.webp`, false),
      loadTexture(`${TEXTURES}/White_board_Roughness.webp`, false),
    ])
      .then(([model, albedo, ao, metallic, normal, roughness]) => {
        if (!model.children.length) throw new Error('FBX do quadro está vazio');
        return { model, albedo, ao, metallic, normal, roughness };
      })
      .catch((error: unknown) => {
        assetsPromise = null;
        throw error;
      });
  }
  return assetsPromise;
}

function Whiteboard({
  assets,
  placementId,
}: {
  assets: WhiteboardAssets;
  placementId: 'administration_whiteboard' | 'logistics_whiteboard';
}) {
  const placement = MODEL_PLACEMENTS[placementId];
  const fitted = useMemo(() => {
    const model = assets.model.clone(true);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      const uv = object.geometry.getAttribute('uv');
      if (uv && !object.geometry.getAttribute('uv2')) {
        object.geometry.setAttribute('uv2', uv);
      }
      object.material = new THREE.MeshStandardMaterial({
        name: 'SENAQUEST Whiteboard PBR',
        map: assets.albedo,
        aoMap: assets.ao,
        aoMapIntensity: 0.8,
        metalnessMap: assets.metallic,
        metalness: 0.18,
        normalMap: assets.normal,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughnessMap: assets.roughness,
        roughness: 0.85,
      });
    });
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) return null;
    const dimensions = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(
      ...placement.maxDimensions.map(
        (limit, axis) => limit / Math.max(dimensions.getComponent(axis), 0.0001),
      ),
    );
    if (!Number.isFinite(scale) || scale <= 0) return null;
    return {
      model,
      scale,
      offset: [-center.x, -center.y, -center.z] as [number, number, number],
    };
  }, [assets, placement.maxDimensions]);

  if (!fitted) return null;
  return (
    <group
      name={`sector-${placementId}`}
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
    >
      <group scale={fitted.scale}>
        <group position={fitted.offset}>
          <primitive object={fitted.model} />
        </group>
      </group>
    </group>
  );
}

export function SectorWhiteboards() {
  const [assets, setAssets] = useState<WhiteboardAssets | null>(null);
  useEffect(() => {
    let active = true;
    void loadWhiteboard()
      .then((loaded) => {
        if (active) setAssets(loaded);
      })
      .catch((error: unknown) => {
        console.error('[SENAQUEST] Quadros dos setores indisponíveis:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!assets) return null;
  return (
    <>
      <Whiteboard assets={assets} placementId="administration_whiteboard" />
      <Whiteboard assets={assets} placementId="logistics_whiteboard" />
    </>
  );
}

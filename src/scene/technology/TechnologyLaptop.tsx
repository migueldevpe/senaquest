/** Laptop da área de TI. O arquivo FBX usa o conjunto de texturas New.
 * Os seis mapas PBR são carregados de WebPs locais; o FBX/UV original é preservado.
 * Ajustes de posição e escala: MODEL_PLACEMENTS.technology_laptop.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS, type Vec3 } from '../modelPlacements';
import { fitModel } from './fitModel';

const ROOT = '/models/technology/laptop';

type LaptopAssets = {
  model: THREE.Group;
  albedo: THREE.Texture;
  ao: THREE.Texture;
  emission: THREE.Texture;
  metallic: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
};

let sharedLaptopPromise: Promise<LaptopAssets> | null = null;

/** FBX original aponta para PNGs fora do projeto. Remapeia para URLs locais
 * para impedir referências quebradas no navegador e no Meta Quest.
 */
function remapFbxTextureURL(url: string) {
  const filename = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase();
  const names: Record<string, string> = {
    'new_normal.png': 'laptop_normal.webp',
    'new_roughness.png': 'laptop_roughness.webp',
    'new_metalness.png': 'laptop_metallic.webp',
  };
  return filename && names[filename] ? `${ROOT}/${names[filename]}` : url;
}

export function preloadTechnologyLaptop(): Promise<LaptopAssets> {
  if (!sharedLaptopPromise) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(remapFbxTextureURL);
    const fbxLoader = new FBXLoader(manager);
    const textureLoader = new THREE.TextureLoader(manager);
    sharedLaptopPromise = Promise.all([
      fbxLoader.loadAsync(`${ROOT}/laptop.fbx`),
      textureLoader.loadAsync(`${ROOT}/laptop_albedo.webp`),
      textureLoader.loadAsync(`${ROOT}/laptop_ao.webp`),
      textureLoader.loadAsync(`${ROOT}/laptop_emission.webp`),
      textureLoader.loadAsync(`${ROOT}/laptop_metallic.webp`),
      textureLoader.loadAsync(`${ROOT}/laptop_normal.webp`),
      textureLoader.loadAsync(`${ROOT}/laptop_roughness.webp`),
    ])
      .then(([model, albedo, ao, emission, metallic, normal, roughness]) => {
        if (!model.children.length) throw new Error('Laptop FBX sem geometria');
        albedo.colorSpace = THREE.SRGBColorSpace;
        emission.colorSpace = THREE.SRGBColorSpace;
        for (const map of [ao, metallic, normal, roughness]) {
          map.colorSpace = THREE.NoColorSpace;
        }
        // As seis texturas compartilham o atlas UV principal do FBX.
        ao.channel = 0;
        for (const map of [albedo, ao, emission, metallic, normal, roughness]) {
          map.anisotropy = 4;
          map.needsUpdate = true;
        }
        return { model, albedo, ao, emission, metallic, normal, roughness };
      })
      .catch((error: unknown) => {
        sharedLaptopPromise = null;
        throw error;
      });
  }
  return sharedLaptopPromise;
}

function prepareLaptop(assets: LaptopAssets, limits: Vec3) {
  const instance = assets.model.clone(true);
  const standardMaterial = new THREE.MeshStandardMaterial({
    name: 'senaquest-laptop-new-pbr',
    color: '#ffffff',
    map: assets.albedo,
    aoMap: assets.ao,
    aoMapIntensity: 0.85,
    normalMap: assets.normal,
    metalnessMap: assets.metallic,
    metalness: 1,
    roughnessMap: assets.roughness,
    roughness: 1,
    emissive: '#ffffff',
    emissiveMap: assets.emission,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });
  instance.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (mesh.geometry.getAttribute('uv')) {
      mesh.material = standardMaterial;
    } else {
      // Falta UV: evita distorcer o atlas e respeita o material de origem.
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
    }
  });
  return fitModel(instance, limits);
}

export function TechnologyLaptop() {
  const [assets, setAssets] = useState<LaptopAssets | null>(null);
  useEffect(() => {
    let active = true;
    void preloadTechnologyLaptop()
      .then((loaded) => {
        if (active) setAssets(loaded);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Laptop da área de TI:', error));
    return () => {
      active = false;
    };
  }, []);
  const cfg = MODEL_PLACEMENTS.technology_laptop;
  const fitted = useMemo(
    () => (assets ? prepareLaptop(assets, cfg.maxDimensions) : null),
    [assets, cfg.maxDimensions],
  );
  if (!fitted) return null;
  return (
    <group name="technology_laptop" position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      <group scale={fitted.scale}>
        <group position={fitted.offset}>
          <primitive object={fitted.instance} />
        </group>
      </group>
    </group>
  );
}

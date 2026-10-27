/** TV de parede e fone definitivos do setor de Tecnologia.
 * FBXs permanecem originais. Somente a TV usa os cinco mapas PBR WebP anexados;
 * o fone conserva os materiais e as cores existentes no FBX, sem substituição.
 * Posições/limites provisórios: MODEL_PLACEMENTS.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS, type Vec3 } from '../modelPlacements';
import { fitModel } from './fitModel';

const TV_ROOT = '/models/technology/tv';
const HEADPHONES_ROOT = '/models/technology/headphones';

type TVAssets = {
  model: THREE.Group;
  albedo: THREE.Texture;
  ao: THREE.Texture;
  metallic: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
};

let tvPromise: Promise<TVAssets> | null = null;
let headphonesPromise: Promise<THREE.Group> | null = null;

export function preloadTechnologyTV(): Promise<TVAssets> {
  if (!tvPromise) {
    const fbxLoader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();
    tvPromise = Promise.all([
      fbxLoader.loadAsync(`${TV_ROOT}/tv.fbx`),
      textureLoader.loadAsync(`${TV_ROOT}/tv_albedo.webp`),
      textureLoader.loadAsync(`${TV_ROOT}/tv_ao.webp`),
      textureLoader.loadAsync(`${TV_ROOT}/tv_metallic.webp`),
      textureLoader.loadAsync(`${TV_ROOT}/tv_normal.webp`),
      textureLoader.loadAsync(`${TV_ROOT}/tv_roughness.webp`),
    ])
      .then(([model, albedo, ao, metallic, normal, roughness]) => {
        if (!model.children.length) throw new Error('TV FBX não possui geometria');
        albedo.colorSpace = THREE.SRGBColorSpace;
        for (const texture of [ao, metallic, normal, roughness]) {
          texture.colorSpace = THREE.NoColorSpace;
        }
        for (const texture of [albedo, ao, metallic, normal, roughness]) {
          texture.anisotropy = 4;
          texture.needsUpdate = true;
        }
        // Os mapas da TV utilizam as UVs do atlas original (canal 0).
        ao.channel = 0;
        return { model, albedo, ao, metallic, normal, roughness };
      })
      .catch((error: unknown) => {
        tvPromise = null; // permite tentar novamente caso os arquivos sejam atualizados
        throw error;
      });
  }
  return tvPromise;
}

export function preloadTechnologyHeadphones(): Promise<THREE.Group> {
  if (!headphonesPromise) {
    headphonesPromise = new FBXLoader()
      .loadAsync(`${HEADPHONES_ROOT}/fone.fbx`)
      .then((model) => {
        if (!model.children.length) throw new Error('Fone FBX não possui geometria');
        return model;
      })
      .catch((error: unknown) => {
        headphonesPromise = null;
        throw error;
      });
  }
  return headphonesPromise;
}

function preparedTV(assets: TVAssets, maxDimensions: Vec3) {
  const instance = assets.model.clone(true);
  instance.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    // Os FBX da TV possuem UV. Se não houver UV, preserve o material de origem.
    if (!mesh.geometry.getAttribute('uv')) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
      return;
    }
    mesh.material = new THREE.MeshStandardMaterial({
      name: `tv-${mesh.name}`,
      color: '#ffffff',
      map: assets.albedo,
      aoMap: assets.ao,
      aoMapIntensity: 0.7,
      metalnessMap: assets.metallic,
      metalness: 1,
      normalMap: assets.normal,
      roughnessMap: assets.roughness,
      roughness: 1,
      side: THREE.DoubleSide,
    });
  });
  return fitModel(instance, maxDimensions);
}

function preparedHeadphones(source: THREE.Group, maxDimensions: Vec3) {
  const instance = source.clone(true);
  instance.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    // NÃO atribuir textura, cor ou material PBR novo: o fone já tem materiais próprios.
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
  });
  return fitModel(instance, maxDimensions);
}

function TechnologyTV() {
  const [assets, setAssets] = useState<TVAssets | null>(null);
  useEffect(() => {
    let mounted = true;
    void preloadTechnologyTV()
      .then((loaded) => {
        if (mounted) setAssets(loaded);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] TV de Tecnologia:', error));
    return () => {
      mounted = false;
    };
  }, []);
  const cfg = MODEL_PLACEMENTS.technology_tv;
  const fitted = useMemo(
    () => (assets ? preparedTV(assets, cfg.maxDimensions) : null),
    [assets, cfg.maxDimensions],
  );
  if (!fitted) return null;
  return (
    <group name="technology_tv" position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      <group scale={fitted.scale}>
        <group position={fitted.offset}>
          <primitive object={fitted.instance} />
        </group>
      </group>
    </group>
  );
}

function TechnologyHeadphones() {
  const [source, setSource] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let mounted = true;
    void preloadTechnologyHeadphones()
      .then((model) => {
        if (mounted) setSource(model);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Fone de Tecnologia:', error));
    return () => {
      mounted = false;
    };
  }, []);
  const cfg = MODEL_PLACEMENTS.technology_headphones;
  const fitted = useMemo(
    () => (source ? preparedHeadphones(source, cfg.maxDimensions) : null),
    [source, cfg.maxDimensions],
  );
  if (!fitted) return null;
  return (
    <group name="technology_headphones" position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      <group scale={fitted.scale}>
        <group position={fitted.offset}>
          <primitive object={fitted.instance} />
        </group>
      </group>
    </group>
  );
}

/** Instâncias isoladas: erro em um FBX não impede carregar o outro. */
export function TechnologyTVHeadphones() {
  return (
    <>
      <TechnologyTV />
      <TechnologyHeadphones />
    </>
  );
}

/**
 * Modelos DEFINITIVOS de Saúde: mesa de Medicina e iMac originais do usuário.
 * Cada FBX tem materiais/UVs separados. NÃO aplicar um atlas de um material
 * nos outros: isso desenha bordas pretas e recortes no tampo/teclado.
 * As imagens fornecidas são WebP locais; os mapas não enviados têm acabamento
 * neutro individual, sem fingir que a textura original está disponível.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';

const ROOT = '/models/health-final/medicine';
const FALLBACK_TEXTURE = `${ROOT}/neutral.webp`;

type Fit = { scale: number; offset: [number, number, number]; top: number };
function fitting(scene: THREE.Group, max: [number, number, number]): Fit | null {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(
    scene as unknown as Parameters<THREE.Box3['setFromObject']>[0],
  );
  if (bounds.isEmpty()) return null;
  const dims = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = Math.min(
    ...max.map((limit, index) => limit / Math.max(dims.getComponent(index), 0.00001)),
  );
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return { scale, offset: [-center.x, -bounds.min.y, -center.z], top: dims.y * scale };
}

/** Os FBX referenciam imagens TGA/Image_1..4 ausentes e caminhos absolutos.
 * O loader recebe uma imagem neutra enquanto lê a malha; em seguida TODOS
 * os materiais são substituídos pelas associações válidas abaixo.
 * Isso impede tentativas de baixar caminhos locais Windows e warnings em loop.
 */
function loadFbx(url: string): Promise<THREE.Group> {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((imageUrl) => {
    if (imageUrl === url || imageUrl.endsWith('.fbx')) return imageUrl;
    return FALLBACK_TEXTURE;
  });
  return new Promise((resolve, reject) => {
    new FBXLoader(manager).load(url, resolve, undefined, reject);
  });
}

function loadTexture(url: string, isColor: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = 2;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

type DeskMats = { drawerColor: THREE.Texture; drawerNormal: THREE.Texture };
function applyDesk(scene: THREE.Group, { drawerColor, drawerNormal }: DeskMats) {
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const make = (sourceName: string): THREE.MeshStandardMaterial => {
    const key = sourceName.trim().toLowerCase();
    const prev = cache.get(key);
    if (prev) return prev;
    let result: THREE.MeshStandardMaterial;
    // O mapa enviado é Drawer01DiffuseMap: o UV atlas serve SOMENTE para as gavetas.
    if (key === 'drawers') {
      result = new THREE.MeshStandardMaterial({
        name: sourceName,
        color: '#ffffff',
        map: drawerColor,
        normalMap: drawerNormal,
        normalScale: new THREE.Vector2(0.14, 0.14),
        metalness: 0.0,
        roughness: 0.87,
      });
    } else {
      const color =
        key === 'drawerhandle'
          ? '#8a9296'
          : key === 'desktop'
            ? '#e7e7e3'
            : key === 'drawerlsup'
              ? '#e1e3df'
              : key === 'deskdrawer'
                ? '#e2e4e0'
                : key === 'deskm'
                  ? '#d9dcd8'
                  : '#e3e4e1';
      result = new THREE.MeshStandardMaterial({
        name: sourceName,
        color,
        metalness: key === 'drawerhandle' ? 0.55 : 0.03,
        roughness: key === 'drawerhandle' ? 0.56 : 0.84,
      });
    }
    cache.set(key, result);
    return result;
  };
  scene.traverse((item) => {
    if (!(item as THREE.Mesh).isMesh) return;
    const mesh = item as THREE.Mesh;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((mat) => make(mat.name || mesh.name))
      : make(mesh.material.name || mesh.name);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
  });
  return scene;
}

type ImacMats = { displayColor: THREE.Texture; displayEmissive: THREE.Texture };
function applyImac(scene: THREE.Group, { displayColor, displayEmissive }: ImacMats) {
  const cache = new Map<string, THREE.Material>();
  const make = (sourceName: string): THREE.Material => {
    const key = sourceName.trim().toLowerCase();
    const prev = cache.get(key);
    if (prev) return prev;
    let result: THREE.Material;
    // FBX: o material "Screen" possui DiffuseColor e EmissiveColor separados.
    // Texturas do monitor não pertencem à carcaça nem ao teclado/mouse.
    if (key === 'screen') {
      result = new THREE.MeshStandardMaterial({
        name: sourceName,
        color: '#ffffff',
        map: displayColor,
        emissive: '#ffffff',
        emissiveMap: displayEmissive,
        emissiveIntensity: 0.12,
        roughness: 0.85,
        metalness: 0,
      });
    } else if (key === 'tasti') {
      result = new THREE.MeshStandardMaterial({
        name: sourceName,
        color: '#ececea',
        roughness: 0.78,
        metalness: 0.06,
      });
    } else if (key === 'material.004') {
      result = new THREE.MeshStandardMaterial({
        name: sourceName,
        color: '#d7d9d8',
        roughness: 0.57,
        metalness: 0.28,
      });
    } else {
      result = new THREE.MeshStandardMaterial({
        name: sourceName,
        color: '#c8cbca',
        roughness: 0.58,
        metalness: 0.22,
      });
    }
    cache.set(key, result);
    return result;
  };
  scene.traverse((item) => {
    if (!(item as THREE.Mesh).isMesh) return;
    const mesh = item as THREE.Mesh;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((mat) => make(mat.name || mesh.name))
      : make(mesh.material.name || mesh.name);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
  });
  return scene;
}

let deskPromise: Promise<THREE.Group | null> | undefined;
let imacPromise: Promise<THREE.Group | null> | undefined;

export function preloadMedicalDesk(): Promise<THREE.Group | null> {
  deskPromise ??= Promise.all([
    loadFbx(`${ROOT}/mesa_medicina_otimizada.fbx`),
    loadTexture(`${ROOT}/desk_base.webp`, true),
    loadTexture(`${ROOT}/desk_normal.webp`, false),
  ])
    .then(([scene, drawerColor, drawerNormal]) => applyDesk(scene, { drawerColor, drawerNormal }))
    .catch((error: unknown) => {
      console.warn('[SENAQUEST] Mesa Medicina indisponível', error);
      return null;
    });
  return deskPromise;
}

export function preloadMedicalImac(): Promise<THREE.Group | null> {
  imacPromise ??= Promise.all([
    loadFbx(`${ROOT}/imac.fbx`),
    loadTexture(`${ROOT}/imac_body.webp`, true),
    loadTexture(`${ROOT}/imac_screen.webp`, true),
  ])
    .then(([scene, displayColor, displayEmissive]) =>
      applyImac(scene, { displayColor, displayEmissive }),
    )
    .catch((error: unknown) => {
      console.warn('[SENAQUEST] iMac indisponível', error);
      return null;
    });
  return imacPromise;
}

export function MedicalDeskModels() {
  const [desk, setDesk] = useState<THREE.Group | null>(null);
  const [imac, setImac] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let active = true;
    void preloadMedicalDesk().then((model) => {
      if (active) setDesk(model);
    });
    void preloadMedicalImac().then((model) => {
      if (active) setImac(model);
    });
    return () => {
      active = false;
    };
  }, []);
  const deskFit = useMemo(
    () => desk && fitting(desk, MODEL_PLACEMENTS.mesa_medicina.maxDimensions),
    [desk],
  );
  const imacFit = useMemo(() => imac && fitting(imac, MODEL_PLACEMENTS.imac.maxDimensions), [imac]);
  const deskCfg = MODEL_PLACEMENTS.mesa_medicina;
  const imacCfg = MODEL_PLACEMENTS.imac;
  const enabled =
    typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('healthModels') !== 'off';
  if (!enabled) return null;
  return (
    <group
      name="medical-desk-with-imac"
      position={deskCfg.position}
      rotation={[0, deskCfg.rotationY, 0]}
    >
      {desk && deskFit && (
        <group name="medical-desk-surface" scale={deskFit.scale}>
          <group position={deskFit.offset}>
            <primitive object={desk} />
          </group>
        </group>
      )}
      {imac && imacFit && deskFit && (
        <group
          name="medical-desk-imac"
          position={[imacCfg.position[0], deskFit.top + imacCfg.position[1], imacCfg.position[2]]}
          rotation={[0, imacCfg.rotationY, 0]}
          scale={imacFit.scale}
        >
          <group position={imacFit.offset}>
            <primitive object={imac} />
          </group>
        </group>
      )}
    </group>
  );
}

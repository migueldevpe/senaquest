import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS, type Vec3 } from '../modelPlacements';
import { fitModel } from './fitModel';

const PC_URL = '/models/technology/pc/pc.fbx';
const KEYBOARD_ROOT = '/models/technology/keyboard';
const KEYBOARD_URL = `${KEYBOARD_ROOT}/keyboard.fbx`;

type TechnologyPCKeyboardAssets = {
  pc: THREE.Group;
  keyboard: THREE.Group;
  keyboardAlbedo: THREE.Texture;
  keyboardEmissive: THREE.Texture;
  keyboardNormal: THREE.Texture;
  keyboardORM: THREE.Texture;
};

let sharedPromise: Promise<TechnologyPCKeyboardAssets> | null = null;

function keyboardTextureURL(url: string) {
  const name = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
  switch (name) {
    case 'computer_keyboard_01_basecolor.png':
      return `${KEYBOARD_ROOT}/keyboard_albedo.webp`;
    case 'computer_keyboard_01_emissive.png':
      return `${KEYBOARD_ROOT}/keyboard_emissive.webp`;
    case 'computer_keyboard_01_normal.png':
      return `${KEYBOARD_ROOT}/keyboard_normal.webp`;
    default:
      return url;
  }
}

export function preloadTechnologyPCStack(): Promise<TechnologyPCKeyboardAssets> {
  if (!sharedPromise) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(keyboardTextureURL);
    const loader = new FBXLoader(manager);
    const textureLoader = new THREE.TextureLoader(manager);
    sharedPromise = Promise.all([
      loader.loadAsync(PC_URL),
      loader.loadAsync(KEYBOARD_URL),
      textureLoader.loadAsync(`${KEYBOARD_ROOT}/keyboard_albedo.webp`),
      textureLoader.loadAsync(`${KEYBOARD_ROOT}/keyboard_emissive.webp`),
      textureLoader.loadAsync(`${KEYBOARD_ROOT}/keyboard_normal.webp`),
      textureLoader.loadAsync(`${KEYBOARD_ROOT}/keyboard_aux.webp`),
    ])
      .then(([pc, keyboard, keyboardAlbedo, keyboardEmissive, keyboardNormal, keyboardORM]) => {
        keyboardAlbedo.colorSpace = THREE.SRGBColorSpace;
        keyboardEmissive.colorSpace = THREE.SRGBColorSpace;
        keyboardNormal.colorSpace = THREE.NoColorSpace;
        keyboardORM.colorSpace = THREE.NoColorSpace;
        // O mapa combinado usa R=AO, G=Roughness e B=Metallic.
        // O FBX dispõe de um conjunto de UVs; também usar UV0 para o AO.
        keyboardORM.channel = 0;
        for (const map of [keyboardAlbedo, keyboardEmissive, keyboardNormal, keyboardORM]) {
          map.anisotropy = 4;
          map.needsUpdate = true;
        }
        return { pc, keyboard, keyboardAlbedo, keyboardEmissive, keyboardNormal, keyboardORM };
      })
      .catch((error: unknown) => {
        sharedPromise = null;
        throw error;
      });
  }
  return sharedPromise;
}

/** O gabinete não usa textura de imagem: suas oito regiões têm materiais
 * diferentes definidos no próprio FBX (preto, metal claro e detalhes azuis).
 * Não substituir esses materiais por um único preto. As três instâncias
 * compartilham geometrias e materiais, evitando cópias desnecessárias na GPU. */
function preparePc(source: THREE.Group, limits: Vec3) {
  const instance = source.clone(true);
  instance.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = true;
    // Sem override de cor: mantém as regiões do painel frontal e conexões.
  });
  return fitModel(instance, limits);
}

function prepareKeyboard(
  source: THREE.Group,
  limits: Vec3,
  assets: Pick<
    TechnologyPCKeyboardAssets,
    'keyboardAlbedo' | 'keyboardEmissive' | 'keyboardNormal' | 'keyboardORM'
  >,
) {
  const instance = source.clone(true);
  instance.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const textured = materials.map((original) => {
      const material = original.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.set('#ffffff');
        material.map = assets.keyboardAlbedo;
        material.emissiveMap = assets.keyboardEmissive;
        material.emissive = new THREE.Color('#ffffff');
        material.emissiveIntensity = 0.65;
        material.normalMap = assets.keyboardNormal;
        material.roughnessMap = assets.keyboardORM;
        material.metalnessMap = assets.keyboardORM;
        material.aoMap = assets.keyboardORM;
        material.aoMapIntensity = 0.8;
        material.roughness = 1;
        material.metalness = 1;
        material.needsUpdate = true;
      } else if (material instanceof THREE.MeshPhongMaterial) {
        material.color.set('#ffffff');
        material.map = assets.keyboardAlbedo;
        material.emissive = new THREE.Color('#ffffff');
        material.emissiveMap = assets.keyboardEmissive;
        material.normalMap = assets.keyboardNormal;
        material.shininess = 4;
        material.needsUpdate = true;
      }
      return material;
    });
    object.material = Array.isArray(object.material) ? textured : textured[0];
  });
  return fitModel(instance, limits);
}

function TechnologyPC({
  id,
  source,
}: {
  id: 'technology_pc_1' | 'technology_pc_2' | 'technology_pc_3';
  source: THREE.Group;
}) {
  const cfg = MODEL_PLACEMENTS[id];
  const fitted = useMemo(() => preparePc(source, cfg.maxDimensions), [source, cfg.maxDimensions]);
  if (!fitted) return null;
  return (
    <group name={id} position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      <group scale={fitted.scale}>
        <group position={fitted.offset}>
          <primitive object={fitted.instance} />
        </group>
      </group>
    </group>
  );
}

function TechnologyKeyboard({ assets }: { assets: TechnologyPCKeyboardAssets }) {
  const cfg = MODEL_PLACEMENTS.technology_keyboard;
  const fitted = useMemo(
    () => prepareKeyboard(assets.keyboard, cfg.maxDimensions, assets),
    [assets, cfg.maxDimensions],
  );
  if (!fitted) return null;
  return (
    <group name="technology_keyboard" position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      <group scale={fitted.scale}>
        <group position={fitted.offset}>
          <primitive object={fitted.instance} />
        </group>
      </group>
    </group>
  );
}

export function TechnologyPCStack() {
  const [assets, setAssets] = useState<TechnologyPCKeyboardAssets | null>(null);
  useEffect(() => {
    let active = true;
    void preloadTechnologyPCStack()
      .then((value) => {
        if (active) setAssets(value);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] PCs e teclado da TI:', error));
    return () => {
      active = false;
    };
  }, []);
  if (!assets) return null;
  return (
    <>
      <TechnologyPC id="technology_pc_1" source={assets.pc} />
      <TechnologyPC id="technology_pc_2" source={assets.pc} />
      <TechnologyPC id="technology_pc_3" source={assets.pc} />
      <TechnologyKeyboard assets={assets} />
    </>
  );
}

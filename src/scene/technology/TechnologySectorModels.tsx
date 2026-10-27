/** Modelos definitivos do setor Tecnologia. Todos os posicionamentos são
 * ajustáveis em MODEL_PLACEMENTS; as texturas usam WebP local. */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS, type UserModelId, type Vec3 } from '../modelPlacements';
import { fitModel } from './fitModel';

const ROOT = '/models/technology';
const VR = `${ROOT}/vr`;
const SERVER = `${ROOT}/server`;

type SourceAssets = {
  vr: THREE.Group;
  server: THREE.Group;
  vrColor: THREE.Texture;
  vrNormal: THREE.Texture;
  vrRoughness: THREE.Texture;
  serverColor: THREE.Texture;
  serverBump: THREE.Texture;
};
let sharedAssets: Promise<SourceAssets> | null = null;

function textureURL(url: string) {
  const name = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
  switch (name) {
    case 'vr_base_color.png':
      return `${VR}/vr_albedo.webp`;
    case 'vr_normal.jpg':
      return `${VR}/vr_normal.webp`;
    case 'vr_roughness.png':
      return `${VR}/vr_roughness.webp`;
    default:
      return url;
  }
}

export function preloadTechnologyModels(): Promise<SourceAssets> {
  if (!sharedAssets) {
    const manager = new THREE.LoadingManager();
    // FBX exportado em outro computador referencia C:\\Users\\...:
    // estes caminhos devem sempre resolver para os WebPs locais.
    manager.setURLModifier(textureURL);
    const textureLoader = new THREE.TextureLoader(manager);
    const fbxLoader = new FBXLoader(manager);
    sharedAssets = Promise.all([
      fbxLoader.loadAsync(`${VR}/vr.fbx`),
      fbxLoader.loadAsync(`${SERVER}/server.fbx`),
      textureLoader.loadAsync(`${VR}/vr_albedo.webp`),
      textureLoader.loadAsync(`${VR}/vr_normal.webp`),
      textureLoader.loadAsync(`${VR}/vr_roughness.webp`),
      textureLoader.loadAsync(`${SERVER}/server_albedo.webp`),
      textureLoader.loadAsync(`${SERVER}/server_bump.webp`),
    ])
      .then(([vr, server, vrColor, vrNormal, vrRoughness, serverColor, serverBump]) => {
        vrColor.colorSpace = THREE.SRGBColorSpace;
        vrNormal.colorSpace = THREE.NoColorSpace;
        vrRoughness.colorSpace = THREE.NoColorSpace;
        serverColor.colorSpace = THREE.SRGBColorSpace;
        serverBump.colorSpace = THREE.NoColorSpace;
        for (const map of [vrColor, vrNormal, vrRoughness, serverColor, serverBump]) {
          map.anisotropy = 4;
          map.needsUpdate = true;
        }
        return { vr, server, vrColor, vrNormal, vrRoughness, serverColor, serverBump };
      })
      .catch((error: unknown) => {
        sharedAssets = null;
        throw error;
      });
  }
  return sharedAssets;
}

function prepareInstance(assets: SourceAssets, kind: 'vr' | 'server', maxDimensions: Vec3) {
  // Cada instância precisa de um Object3D distinto. Geometrias e WebPs são compartilhados.
  const instance = assets[kind].clone(true);
  instance.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    // Sem UV utilizável: preservar o material original, evitando aplicar o atlas
    // inteiro sobre a peça e deixar parafusos, lentes ou cabos texturizados incorretamente.
    if (!mesh.geometry.getAttribute('uv')) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
      return;
    }
    if (kind === 'vr') {
      mesh.material = new THREE.MeshStandardMaterial({
        map: assets.vrColor,
        normalMap: assets.vrNormal,
        roughnessMap: assets.vrRoughness,
        roughness: 0.88,
        metalness: 0.03,
        color: '#ffffff',
      });
    } else {
      // O gabinete principal tem materiais glass, server e metal.
      // O atlas do usuário é usado em server/metal; glass é translúcido,
      // SEM mapa, para não ocultar o conteúdo atrás da porta.
      // LEDs, conectores e etiquetas preservam os materiais de origem.
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const isMainCabinet =
        mesh.name.toLowerCase().startsWith('server_cube') ||
        materials.some((material) => material.name.trim().toLowerCase() === 'server');
      const corrected = materials.map((sourceMaterial) => {
        if (!isMainCabinet) return sourceMaterial.clone();
        const materialName = sourceMaterial.name.trim().toLowerCase();
        // O painel frontal é VIDRO: aplicar o atlas de cor nele o torna
        // opaco e esconde as bandejas do rack, mesmo que estejam modeladas.
        // O vidro não usa map nem bumpMap; depthWrite=false deixa os módulos
        // internos visíveis através dele sem afetar o restante do gabinete.
        if (materialName === 'glass') {
          // O vidro transparente gerava artefatos de ordenação/depth nas
          // quinas da porta. A malha do vidro não é necessária para mostrar
          // os racks internos: não enviá-la ao renderer evita esses glitches.
          const glass = sourceMaterial.clone();
          glass.visible = false;
          return glass;
        }
        if (materialName === 'server') {
          return new THREE.MeshStandardMaterial({
            name: sourceMaterial.name,
            // Atlas apenas no rack, cujos UVs correspondem à imagem fornecida.
            map: assets.serverColor,
            bumpMap: assets.serverBump,
            bumpScale: 0.003,
            color: '#ffffff',
            roughness: 0.83,
            metalness: 0.08,
            side: THREE.FrontSide,
          });
        }
        // Moldura, ferragens e quaisquer materiais residuais da porta usam
        // um acabamento escuro uniforme. Isso elimina os pequenos retângulos
        // claros que apareciam nas bordas por causa de UVs incompatíveis.
        return new THREE.MeshStandardMaterial({
          name: sourceMaterial.name,
          color: '#20252b',
          roughness: 0.7,
          metalness: 0.25,
          side: THREE.DoubleSide,
        });
      });
      mesh.material = Array.isArray(mesh.material) ? corrected : corrected[0];
    }
  });
  return fitModel(instance, maxDimensions);
}

function TechnologyExhibit({
  assets,
  id,
  kind,
}: {
  assets: SourceAssets;
  id: UserModelId;
  kind: 'vr' | 'server';
}) {
  const cfg = MODEL_PLACEMENTS[id];
  const model = useMemo(
    () => prepareInstance(assets, kind, cfg.maxDimensions),
    [assets, kind, cfg.maxDimensions],
  );
  if (!model) return null;
  return (
    <group name={`technology-${id}`} position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      <group scale={model.scale}>
        <group position={model.offset}>
          <primitive object={model.instance} />
        </group>
      </group>
    </group>
  );
}

export function TechnologySectorModels() {
  const [assets, setAssets] = useState<SourceAssets | null>(null);
  useEffect(() => {
    let mounted = true;
    void preloadTechnologyModels()
      .then((loaded) => {
        if (mounted) setAssets(loaded);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Modelos do setor TI:', error));
    return () => {
      mounted = false;
    };
  }, []);
  if (!assets) return null;
  return (
    <>
      <TechnologyExhibit assets={assets} kind="vr" id="technology_vr_1" />
      <TechnologyExhibit assets={assets} kind="vr" id="technology_vr_2" />
      <TechnologyExhibit assets={assets} kind="vr" id="technology_vr_3" />
      <TechnologyExhibit assets={assets} kind="server" id="technology_server_1" />
      <TechnologyExhibit assets={assets} kind="server" id="technology_server_2" />
    </>
  );
}

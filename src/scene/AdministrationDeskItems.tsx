import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { preloadMedicalDesk } from './MedicalDeskModels';
import { getFittedSectorTableHeight } from './SectorTableCopies';
import { MODEL_PLACEMENTS } from './modelPlacements';
import { ADMINISTRATION_RACK_CONTENTS } from './administrationRackLayout';

const ROOT = '/models/administration/desk-items';
const TEXTURES = {
  documentBase: `${ROOT}/document_holder_base.webp`,
  documentMetallic: `${ROOT}/document_holder_metallic.webp`,
  documentNormal: `${ROOT}/document_holder_normal.webp`,
  documentRoughness: `${ROOT}/document_holder_roughness.webp`,
  paperStack: `${ROOT}/paper_stack_albedo.webp`,
} as const;
const FLAT_NORMAL = `${ROOT}/book_normal.webp`;

type DeskItems = {
  documentHolder: THREE.Group;
  book: THREE.Group;
  telephone: THREE.Group;
  paperStack: THREE.Group;
  stackOfPaper: THREE.Group;
};

let deskItemsPromise: Promise<DeskItems> | null = null;

function createManager() {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const filename = decodeURIComponent(url).split(/[\\/]/).pop()?.toLowerCase();
    if (!filename) return url;
    if (filename.includes('document_holder_mat_basecolor')) return TEXTURES.documentBase;
    if (filename.includes('document_holder_mat_metallic')) return TEXTURES.documentMetallic;
    if (filename.includes('document_holder_mat_normal')) return TEXTURES.documentNormal;
    if (filename.includes('document_holder_mat_roughness')) return TEXTURES.documentRoughness;
    if (filename.startsWith('paperstack_tex')) return TEXTURES.paperStack;
    if (filename === 'book_normals.tga') return FLAT_NORMAL;
    return url;
  });
  return manager;
}

function loadFbx(filename: string): Promise<THREE.Group> {
  return new FBXLoader(createManager()).loadAsync(`${ROOT}/${filename}`);
}

function loadTexture(url: string, isColor = false): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(url).then((texture) => {
    texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 2;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  });
}

function setMaterial(scene: THREE.Group, material: THREE.Material) {
  scene.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.material = material;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

function fitModel(source: THREE.Group, maxDimensions: [number, number, number]) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  if (bounds.isEmpty()) return null;
  const dimensions = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = Math.min(
    ...maxDimensions.map((limit, axis) => limit / Math.max(dimensions.getComponent(axis), 0.0001)),
  );
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return {
    scale,
    offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
  };
}

export function preloadAdministrationDeskItems(): Promise<DeskItems> {
  if (!deskItemsPromise) {
    deskItemsPromise = Promise.all([
      loadFbx('document_holder.fbx'),
      loadFbx('book.fbx'),
      loadFbx('telephone.fbx'),
      loadFbx('paper_stack.fbx'),
      loadFbx('stack_of_paper.fbx'),
      loadTexture(TEXTURES.documentBase, true),
      loadTexture(TEXTURES.documentMetallic),
      loadTexture(TEXTURES.documentNormal),
      loadTexture(TEXTURES.documentRoughness),
      loadTexture(TEXTURES.paperStack, true),
    ])
      .then(
        ([
          documentHolder,
          book,
          telephone,
          paperStack,
          stackOfPaper,
          documentBase,
          documentMetallic,
          documentNormal,
          documentRoughness,
          paperStackMap,
        ]) => {
          const documentMaterial = new THREE.MeshStandardMaterial({
            name: 'SENAQUEST Document Holder',
            map: documentBase,
            metalnessMap: documentMetallic,
            metalness: 0.1,
            normalMap: documentNormal,
            normalScale: new THREE.Vector2(0.7, 0.7),
            roughnessMap: documentRoughness,
            roughness: 0.8,
          });
          setMaterial(documentHolder, documentMaterial);

          setMaterial(
            paperStack,
            new THREE.MeshStandardMaterial({
              name: 'SENAQUEST Textured Paper Stack',
              map: paperStackMap,
              roughness: 0.96,
              metalness: 0,
            }),
          );
          setMaterial(
            stackOfPaper,
            new THREE.MeshStandardMaterial({
              name: 'SENAQUEST Paper',
              color: '#f2f0e8',
              roughness: 0.96,
              metalness: 0,
            }),
          );
          for (const model of [documentHolder, book, telephone, paperStack, stackOfPaper]) {
            model.updateMatrixWorld(true);
          }
          return { documentHolder, book, telephone, paperStack, stackOfPaper };
        },
      )
      .catch((error: unknown) => {
        deskItemsPromise = null;
        throw error;
      });
  }
  return deskItemsPromise;
}

type DeskItemId =
  'administration_telephone' | 'administration_paper_stack' | 'administration_stack_of_paper';
type DeskItemInstances = Record<DeskItemId, THREE.Object3D>;
type DeskItemFits = Record<DeskItemId, ReturnType<typeof fitModel>>;

const DESK_ITEM_IDS: readonly DeskItemId[] = [
  'administration_telephone',
  'administration_paper_stack',
  'administration_stack_of_paper',
];

export function AdministrationRackContents() {
  const [assets, setAssets] = useState<DeskItems | null>(null);

  useEffect(() => {
    let active = true;
    void preloadAdministrationDeskItems()
      .then((items) => {
        if (active) setAssets(items);
      })
      .catch((error: unknown) => {
        console.error('[SENAQUEST] Livros e porta-documentos do rack indisponíveis:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const displays = useMemo(() => {
    if (!assets) return null;
    return ADMINISTRATION_RACK_CONTENTS.map((item) => {
      const source = assets[item.model];
      const placement = MODEL_PLACEMENTS[item.placement];
      return {
        ...item,
        instance: source.clone(true),
        fit: fitModel(source, placement.maxDimensions),
      };
    });
  }, [assets]);

  if (!displays) return null;
  return (
    <group name="administration-rack-books-and-document-holders">
      {displays.map(({ placement: id, instance, fit }) => {
        if (!fit) return null;
        const placement = MODEL_PLACEMENTS[id];
        return (
          <group
            key={id}
            name={id}
            position={placement.position}
            rotation={[0, placement.rotationY, 0]}
          >
            <group scale={fit.scale}>
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

export function AdministrationDeskItems() {
  const [assets, setAssets] = useState<DeskItems | null>(null);
  const [tableTop, setTableTop] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([preloadAdministrationDeskItems(), preloadMedicalDesk()])
      .then(([items, table]) => {
        if (!table) throw new Error('A mesa de Administração não pôde ser carregada');
        if (!active) return;
        const height = getFittedSectorTableHeight(table, MODEL_PLACEMENTS.administration_table);
        if (height === null) throw new Error('Não foi possível calcular o tampo da mesa');
        setAssets(items);
        setTableTop(height);
      })
      .catch((error: unknown) => {
        console.error('[SENAQUEST] Objetos da mesa de Administração indisponíveis:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const instances = useMemo<DeskItemInstances | null>(() => {
    if (!assets) return null;
    return {
      administration_telephone: assets.telephone.clone(true),
      administration_paper_stack: assets.paperStack.clone(true),
      administration_stack_of_paper: assets.stackOfPaper.clone(true),
    };
  }, [assets]);
  const fits = useMemo<DeskItemFits | null>(() => {
    if (!assets) return null;
    return {
      administration_telephone: fitModel(
        assets.telephone,
        MODEL_PLACEMENTS.administration_telephone.maxDimensions,
      ),
      administration_paper_stack: fitModel(
        assets.paperStack,
        MODEL_PLACEMENTS.administration_paper_stack.maxDimensions,
      ),
      administration_stack_of_paper: fitModel(
        assets.stackOfPaper,
        MODEL_PLACEMENTS.administration_stack_of_paper.maxDimensions,
      ),
    };
  }, [assets]);

  if (tableTop === null || !instances || !fits) return null;
  return (
    <group name="administration-desk-items">
      {DESK_ITEM_IDS.map((id) => {
        const placement = MODEL_PLACEMENTS[id];
        const fit = fits[id];
        if (!fit) return null;
        return (
          <group
            key={id}
            name={id.replaceAll('_', '-')}
            position={[
              placement.position[0],
              tableTop + placement.position[1],
              placement.position[2],
            ]}
            rotation={[0, placement.rotationY, 0]}
          >
            <group scale={fit.scale}>
              <group position={fit.offset}>
                <primitive object={instances[id]} dispose={null} />
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}

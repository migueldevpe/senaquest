/** Caixa registradora FBX com textura WebP local e escala segura para o Quest. */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';
import { getFittedSectorTableHeight } from './SectorTableCopies';
import { preloadHealthMedicineTableModel } from './HealthSectorModels';

const ROOT = '/models/logistics/cash-register';
const URL = `${ROOT}/CashRegister.fbx`;
const TEXTURE_URL = `${ROOT}/CashRegister.webp`;

type CashRegisterAssets = { model: THREE.Group };
let cashRegisterPromise: Promise<CashRegisterAssets> | null = null;

export function preloadCashRegister(): Promise<CashRegisterAssets> {
  if (!cashRegisterPromise) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const basename = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
      return basename === 'cashregister.png' ? TEXTURE_URL : url;
    });
    // Preserve os materiais e os índices de material do FBX. O atlas contém UVs
    // para peças específicas; aplicar a mesma imagem em todas as malhas fazia
    // o teclado, o corpo e as laterais receberem regiões erradas da textura.
    const textureLoader = new THREE.TextureLoader(manager);
    cashRegisterPromise = new FBXLoader(manager)
      .loadAsync(URL)
      .then(async (model) => {
        if (!model.children.length) throw new Error('FBX da caixa registradora está vazio');
        const albedo = await textureLoader.loadAsync(TEXTURE_URL);
        albedo.colorSpace = THREE.SRGBColorSpace;
        albedo.anisotropy = 4;
        albedo.generateMipmaps = true;
        const replacedMaps = new Set<THREE.Texture>();
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = false;
          object.receiveShadow = false;
          object.frustumCulled = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const source of materials) {
            const material = source as THREE.Material & {
              map?: THREE.Texture | null;
              color?: THREE.Color;
              roughness?: number;
              metalness?: number;
            };
            // O FBX contém um atlas embutido escuro; substituir apenas mapas já
            // associados a materiais, mantendo as coordenadas UV e os índices.
            if (material.map) {
              replacedMaps.add(material.map);
              const map = albedo.clone();
              map.wrapS = material.map.wrapS;
              map.wrapT = material.map.wrapT;
              map.repeat.copy(material.map.repeat);
              map.offset.copy(material.map.offset);
              map.center.copy(material.map.center);
              map.rotation = material.map.rotation;
              map.needsUpdate = true;
              material.map = map;
              material.color?.set('#ffffff');
            }
            if (typeof material.roughness === 'number') material.roughness = 0.76;
            if (typeof material.metalness === 'number') material.metalness = 0.06;
            material.needsUpdate = true;
          }
        });
        for (const map of replacedMaps) {
          const image = map.image as { src?: string } | undefined;
          map.dispose();
          if (image?.src?.startsWith('blob:')) globalThis.URL.revokeObjectURL(image.src);
        }
        albedo.dispose();
        return { model };
      })
      .catch((error: unknown) => {
        cashRegisterPromise = null;
        throw error;
      });
  }
  return cashRegisterPromise;
}

export function LogisticsCashRegisterModel() {
  const cfg = MODEL_PLACEMENTS.logistics_cash_register;
  const tableCfg = MODEL_PLACEMENTS.logistics_table;
  const [assets, setAssets] = useState<CashRegisterAssets | null>(null);
  const [table, setTable] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([preloadCashRegister(), preloadHealthMedicineTableModel()])
      .then(([registerAssets, tableModel]) => {
        if (!active) return;
        setAssets(registerAssets);
        if (tableModel) setTable(tableModel);
      })
      .catch((error: unknown) => {
        console.error('[SENAQUEST] Caixa registradora indisponível:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const tableTop = useMemo(
    () => (table ? getFittedSectorTableHeight(table, tableCfg) : null),
    [table, tableCfg],
  );
  const instance = useMemo(() => assets?.model.clone(true) ?? null, [assets]);
  const fit = useMemo(() => {
    if (!assets) return null;
    const source = assets.model;
    source.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(source);
    if (bounds.isEmpty()) return null;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const factor = Math.min(
      ...cfg.maxDimensions.map((max, axis) => max / Math.max(0.00001, size.getComponent(axis))),
    );
    if (!Number.isFinite(factor) || factor <= 0) return null;
    return {
      factor,
      offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
    };
  }, [assets, cfg.maxDimensions]);

  if (!assets || !instance || !fit || tableTop === null) return null;
  return (
    <group
      name="logistics-sales-cash-register"
      position={[cfg.position[0], tableTop + cfg.position[1], cfg.position[2]]}
      rotation={[0, cfg.rotationY, 0]}
    >
      <group scale={fit.factor}>
        <group position={fit.offset}>
          <primitive object={instance} dispose={null} />
        </group>
      </group>
    </group>
  );
}

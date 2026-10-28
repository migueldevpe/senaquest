/** Impressora e iMac reutilizado, posicionados sobre a mesa de Administração. */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS } from './modelPlacements';
import { preloadMedicalImac } from './MedicalDeskModels';
import { getFittedSectorTableHeight } from './SectorTableCopies';
import { preloadMedicalDesk } from './MedicalDeskModels';

const ROOT = '/models/administration/printer';
const MAPS = {
  albedo: `${ROOT}/printer_albedo.webp`,
  ao: `${ROOT}/printer_ao.webp`,
  emissive: `${ROOT}/printer_emissive.webp`,
  metallic: `${ROOT}/printer_metallic.webp`,
  normal: `${ROOT}/printer_normal.webp`,
  roughness: `${ROOT}/printer_roughness.webp`,
} as const;

type PrinterAssets = {
  model: THREE.Group;
  maps: Record<keyof typeof MAPS, THREE.Texture>;
};

let printerPromise: Promise<PrinterAssets> | null = null;

function loadMap(url: string, color = false): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(url).then((texture) => {
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 2;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  });
}

export function preloadAdministrationPrinter(): Promise<PrinterAssets> {
  if (!printerPromise) {
    printerPromise = Promise.all([
      new FBXLoader().loadAsync(`${ROOT}/printer.fbx`),
      loadMap(MAPS.albedo, true),
      loadMap(MAPS.ao),
      loadMap(MAPS.emissive, true),
      loadMap(MAPS.metallic),
      loadMap(MAPS.normal),
      loadMap(MAPS.roughness),
    ])
      .then(([source, albedo, ao, emissive, metallic, normal, roughness]) => {
        const sourcePrinter = source.getObjectByName('Printer');
        if (!(sourcePrinter instanceof THREE.Mesh)) {
          throw new Error('A malha Printer não foi encontrada no FBX da impressora');
        }

        source.updateMatrixWorld(true);
        const model = new THREE.Group();
        const geometry = sourcePrinter.geometry.clone();
        const uv = geometry.getAttribute('uv');
        if (!uv) throw new Error('O FBX da impressora não contém coordenadas UV');
        if (!geometry.getAttribute('uv2')) geometry.setAttribute('uv2', uv);
        const material = new THREE.MeshStandardMaterial({
          name: 'SENAQUEST Printer PBR',
          map: albedo,
          aoMap: ao,
          aoMapIntensity: 0.8,
          emissive: '#ffffff',
          emissiveMap: emissive,
          metalnessMap: metallic,
          metalness: 0.2,
          normalMap: normal,
          normalScale: new THREE.Vector2(0.65, 0.65),
          roughnessMap: roughness,
          roughness: 0.8,
        });
        const printer = new THREE.Mesh(geometry, material);
        printer.matrixAutoUpdate = false;
        printer.matrix.copy(sourcePrinter.matrixWorld);
        printer.updateMatrixWorld(true);
        model.add(printer);
        printer.castShadow = false;
        printer.receiveShadow = false;
        printer.frustumCulled = true;
        model.updateMatrixWorld(true);
        return { model, maps: { albedo, ao, emissive, metallic, normal, roughness } };
      })
      .catch((error: unknown) => {
        printerPromise = null;
        throw error;
      });
  }
  return printerPromise;
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

export function AdministrationPrinterAndImac() {
  const [assets, setAssets] = useState<PrinterAssets | null>(null);
  const [table, setTable] = useState<THREE.Group | null>(null);
  const [imac, setImac] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([preloadAdministrationPrinter(), preloadMedicalDesk(), preloadMedicalImac()])
      .then(([printerAssets, tableModel, imacModel]) => {
        if (!active) return;
        setAssets(printerAssets);
        setTable(tableModel);
        setImac(imacModel);
      })
      .catch((error: unknown) => {
        console.error('[SENAQUEST] Impressora/iMac de Administração indisponíveis:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const tableTop = useMemo(
    () => (table ? getFittedSectorTableHeight(table, MODEL_PLACEMENTS.administration_table) : null),
    [table],
  );
  const printerInstance = useMemo(() => assets?.model.clone(true) ?? null, [assets]);
  const printerFit = useMemo(
    () =>
      assets ? fitModel(assets.model, MODEL_PLACEMENTS.administration_printer.maxDimensions) : null,
    [assets],
  );
  const imacInstance = useMemo(() => imac?.clone(true) ?? null, [imac]);
  const imacFit = useMemo(
    () => (imac ? fitModel(imac, MODEL_PLACEMENTS.administration_imac.maxDimensions) : null),
    [imac],
  );

  if (tableTop === null) return null;
  return (
    <>
      {assets && printerInstance && printerFit && (
        <group
          name="administration-printer"
          position={[
            MODEL_PLACEMENTS.administration_printer.position[0],
            tableTop + MODEL_PLACEMENTS.administration_printer.position[1],
            MODEL_PLACEMENTS.administration_printer.position[2],
          ]}
          rotation={[0, MODEL_PLACEMENTS.administration_printer.rotationY, 0]}
        >
          <group scale={printerFit.scale}>
            <group position={printerFit.offset}>
              <primitive object={printerInstance} dispose={null} />
            </group>
          </group>
        </group>
      )}
      {imacInstance && imacFit && (
        <group
          name="administration-imac"
          position={[
            MODEL_PLACEMENTS.administration_imac.position[0],
            tableTop + MODEL_PLACEMENTS.administration_imac.position[1],
            MODEL_PLACEMENTS.administration_imac.position[2],
          ]}
          rotation={[0, MODEL_PLACEMENTS.administration_imac.rotationY, 0]}
        >
          <group scale={imacFit.scale}>
            <group position={imacFit.offset}>
              <primitive object={imacInstance} dispose={null} />
            </group>
          </group>
        </group>
      )}
    </>
  );
}

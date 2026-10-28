import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { getFittedSectorTableHeight } from './SectorTableCopies';
import { preloadHealthMedicineTableModel } from './HealthSectorModels';
import { MODEL_PLACEMENTS } from './modelPlacements';

const ROOT = '/models/logistics/payment-terminal';
const MODEL_URL = `${ROOT}/paymentterminal.fbx`;
const TEXTURE_URL = `${ROOT}/payment_terminal_surface.webp`;

let terminalPromise: Promise<THREE.Group> | null = null;

function getModelBounds(model: THREE.Group) {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  model.updateMatrixWorld(true);

  model.traverse((object) => {
    if (!object.visible || !(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    const elements = object.matrixWorld.elements;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const transformed: [number, number, number] = [
        x * elements[0] + y * elements[4] + z * elements[8] + elements[12],
        x * elements[1] + y * elements[5] + z * elements[9] + elements[13],
        x * elements[2] + y * elements[6] + z * elements[10] + elements[14],
      ];
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], transformed[axis]);
        max[axis] = Math.max(max[axis], transformed[axis]);
      }
    }
  });

  if (!min.every(Number.isFinite) || !max.every(Number.isFinite)) return null;
  return {
    min,
    max,
    size: max.map((value, axis) => value - min[axis]) as [number, number, number],
  };
}

export function preloadLogisticsPaymentTerminal(): Promise<THREE.Group> {
  if (!terminalPromise) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const basename = url.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
      return basename === 'metal_corrogated_shiny.jpg' ? TEXTURE_URL : url;
    });

    terminalPromise = new FBXLoader(manager)
      .loadAsync(MODEL_URL)
      .then((source) => {
        const model = source.clone(true) as unknown as THREE.Group;
        // The FBX is modeled upright; this angle lays its chassis flat on the tabletop.
        model.rotation.x = -Math.PI / 6;
        model.traverse((object) => {
          if (object.name.trim().toLowerCase() === 'cube') {
            object.visible = false;
            return;
          }
          if (!(object instanceof THREE.Mesh)) return;

          object.castShadow = false;
          object.receiveShadow = false;
          object.frustumCulled = true;
          const sources = Array.isArray(object.material) ? object.material : [object.material];
          const materials = sources.map((sourceMaterial) => {
            const source = sourceMaterial as THREE.Material & {
              color?: THREE.Color;
              map?: THREE.Texture | null;
              side?: THREE.Side;
            };
            const isDisplay = /display|screen|visor/i.test(object.name);
            const material = new THREE.MeshStandardMaterial({
              color: isDisplay ? '#37495b' : (source.color ?? new THREE.Color('#aeb5bc')),
              map: source.map ?? null,
              side: source.side,
              roughness: isDisplay ? 0.24 : 0.48,
              metalness: isDisplay ? 0.12 : 0.34,
            });
            if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
            return material;
          });
          object.material = Array.isArray(object.material) ? materials : materials[0];
        });

        if (!getModelBounds(model)) {
          throw new Error('FBX do terminal de pagamento não contém geometria válida');
        }
        return model;
      })
      .catch((error: unknown) => {
        terminalPromise = null;
        throw error;
      });
  }
  return terminalPromise!;
}

export function LogisticsPaymentTerminal() {
  const placement = MODEL_PLACEMENTS.logistics_payment_terminal;
  const tablePlacement = MODEL_PLACEMENTS.logistics_table;
  const [terminal, setTerminal] = useState<THREE.Group | null>(null);
  const [table, setTable] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([preloadLogisticsPaymentTerminal(), preloadHealthMedicineTableModel()])
      .then(([model, tableModel]) => {
        if (!active) return;
        setTerminal(model);
        if (tableModel) setTable(tableModel);
      })
      .catch((error: unknown) => {
        console.error('[SENAQUEST] Terminal de pagamento indisponível:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const tableTop = useMemo(
    () => (table ? getFittedSectorTableHeight(table, tablePlacement) : null),
    [table, tablePlacement],
  );
  const instance = useMemo(() => terminal?.clone(true) ?? null, [terminal]);
  const fit = useMemo(() => {
    if (!terminal) return null;
    const bounds = getModelBounds(terminal);
    if (!bounds) return null;
    const scale = Math.min(
      ...placement.maxDimensions.map((max, axis) => max / Math.max(0.00001, bounds.size[axis])),
    );
    if (!Number.isFinite(scale) || scale <= 0) return null;
    return {
      scale,
      offset: [
        -(bounds.min[0] + bounds.max[0]) / 2,
        -bounds.min[1],
        -(bounds.min[2] + bounds.max[2]) / 2,
      ] as [number, number, number],
    };
  }, [terminal, placement.maxDimensions]);

  if (!terminal || !instance || !fit || tableTop === null) return null;
  return (
    <group
      name="logistics-payment-terminal"
      position={[placement.position[0], tableTop + placement.position[1], placement.position[2]]}
      rotation={[0, placement.rotationY, 0]}
    >
      <group scale={fit.scale}>
        <group position={fit.offset}>
          <primitive object={instance} dispose={null} />
        </group>
      </group>
    </group>
  );
}

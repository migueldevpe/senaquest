/** Administração usa a mesa.fbx; Logística e Vendas usa mesa_medicina.fbx. */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { preloadHealthMedicineTableModel } from './HealthSectorModels';
import { preloadMedicalDesk } from './MedicalDeskModels';
import { MODEL_PLACEMENTS, type ModelPlacement, type Vec3 } from './modelPlacements';

type SectorTableId = 'administration_table' | 'logistics_table';

function SectorTable({ id }: { id: SectorTableId }) {
  const cfg: ModelPlacement = MODEL_PLACEMENTS[id];
  const [source, setSource] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let active = true;
    const load =
      id === 'administration_table' ? preloadMedicalDesk : preloadHealthMedicineTableModel;
    void load().then((model) => {
      if (active && model) setSource(model);
    });
    return () => {
      active = false;
    };
  }, [id]);

  // Cada setor recebe sua própria instância: THREE.Object3D não pode ser
  // renderizado em dois pais ao mesmo tempo. Administração usa mesa.fbx;
  // Logística mantém mesa_medicina.fbx.
  const instance = useMemo(() => source?.clone(true) ?? null, [source]);
  const fit = useMemo(() => {
    if (!source) return null;
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
      offset: [-center.x, -bounds.min.y, -center.z] as Vec3,
    };
  }, [source, cfg.maxDimensions]);

  return (
    <group
      name={`shared-sector-${id === 'administration_table' ? 'mesa' : 'mesa_medicina'}-${id}`}
      position={cfg.position}
      rotation={[0, cfg.rotationY, 0]}
    >
      {instance && fit && (
        <group scale={fit.factor}>
          <group position={fit.offset}>
            <primitive object={instance} dispose={null} />
          </group>
        </group>
      )}
    </group>
  );
}

export function SectorTableCopies() {
  return (
    <group name="shared-sector-table-copies">
      <SectorTable id="administration_table" />
      <SectorTable id="logistics_table" />
    </group>
  );
}

/** Altura real do tampo, calculada com a mesma regra usada para renderizar a mesa. */
export function getFittedSectorTableHeight(
  source: THREE.Group,
  placement: ModelPlacement,
): number | null {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  if (bounds.isEmpty()) return null;
  const size = bounds.getSize(new THREE.Vector3());
  const factor = Math.min(
    ...placement.maxDimensions.map((max, axis) => max / Math.max(0.00001, size.getComponent(axis))),
  );
  if (!Number.isFinite(factor) || factor <= 0) return null;
  return placement.position[1] + size.y * factor;
}

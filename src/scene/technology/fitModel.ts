/** Normalização compartilhada dos modelos de TI.
 * maxDimensions define somente os limites por eixo, sem distorcer proporções.
 * A origem do grupo final fica na base do modelo, centralizada no plano XZ.
 */
import * as THREE from 'three';
import type { Vec3 } from '../modelPlacements';

export function fitModel<T extends { updateMatrixWorld(force?: boolean): void }>(
  instance: T,
  limits: Vec3,
) {
  instance.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(
    instance as unknown as Parameters<THREE.Box3['setFromObject']>[0],
  );
  if (bounds.isEmpty()) return null;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = Math.min(
    limits[0] / Math.max(size.x, 0.00001),
    limits[1] / Math.max(size.y, 0.00001),
    limits[2] / Math.max(size.z, 0.00001),
  );
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return {
    instance,
    scale,
    offset: [-center.x, -bounds.min.y, -center.z] as Vec3,
  };
}

/** Modelos definitivos de Tecnologia: monitor e console PS5.
 * Preserva integralmente as cores e os materiais dos FBX originais.
 * Não há mapas de imagem incorporados nesses dois arquivos, portanto
 * não cria nem força texturas artificiais sobre as superfícies.
 * Posição, yaw e dimensões máximas ficam em MODEL_PLACEMENTS.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MODEL_PLACEMENTS, type Vec3 } from '../modelPlacements';
import { fitModel } from './fitModel';

const PS5_URL = '/models/technology/ps5/ps5.fbx';
const MONITOR_URL = '/models/technology/monitor/monitor1.fbx';

type TechnologyAccessoryAssets = { ps5: THREE.Group; monitor: THREE.Group };
let sharedPromise: Promise<TechnologyAccessoryAssets> | null = null;

/** Cacheado; um único download de cada FBX, mesmo com carregamento + StrictMode. */
export function preloadTechnologyAccessories(): Promise<TechnologyAccessoryAssets> {
  if (!sharedPromise) {
    const loader = new FBXLoader();
    sharedPromise = Promise.all([loader.loadAsync(PS5_URL), loader.loadAsync(MONITOR_URL)])
      .then(([ps5, monitor]) => {
        if (!ps5.children.length || !monitor.children.length) {
          throw new Error('PS5 ou monitor FBX sem geometria');
        }
        return { ps5, monitor };
      })
      .catch((error: unknown) => {
        sharedPromise = null;
        throw error;
      });
  }
  return sharedPromise;
}

function prepareModel(
  source: THREE.Group,
  limits: Vec3,
  id: 'technology_ps5' | 'technology_monitor_1',
) {
  // O FBX do PS5 contém uma correção de eixo (-90° X) em um nó filho.
  // Não presumir que +90° no root vai colocá-lo em pé: conforme o exportador,
  // essa correção já pode ter sido incorporada pelo FBXLoader. Avaliar as
  // orientações ortogonais e escolher aquela em que o maior eixo do console
  // fica vertical ANTES de normalizar escala e apoiar na bancada.
  const instance = source.clone(true);
  if (id === 'technology_ps5') {
    const candidates: [number, number][] = [
      [Math.PI / 2, 0],
      [0, 0],
      [-Math.PI / 2, 0],
      [Math.PI, 0],
      [0, Math.PI / 2],
      [0, -Math.PI / 2],
    ];
    let best = candidates[0];
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      instance.rotation.set(candidate[0], 0, candidate[1]);
      instance.updateMatrixWorld(true);
      const testBounds = new THREE.Box3().setFromObject(instance);
      const dims = testBounds.getSize(new THREE.Vector3());
      // PS5 em pé: o eixo Y precisa ser maior que a largura/profundidade.
      const score = dims.y / Math.max(dims.x, dims.z, 0.0001);
      if (score > bestScore + 0.001) {
        bestScore = score;
        best = candidate;
      }
    }
    instance.rotation.set(best[0], 0, best[1]);
    // O FBX permanece em pé após a busca acima, porém vinha de cabeça para baixo
    // no cenário. Girar 180° no eixo Z preserva a vertical e coloca a base no piso.
    instance.rotateZ(Math.PI);
  }
  instance.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (id === 'technology_monitor_1') {
      // O monitor tem faces de plano de um lado só no FBX. Clonar os
      // materiais evita alterar a versão original e renderiza frente/verso,
      // inclusive a carcaça traseira vista do outro lado da bancada.
      const doubleSided = (material: THREE.Material): THREE.Material => {
        const copy = material.clone();
        copy.side = THREE.DoubleSide;
        copy.needsUpdate = true;
        return copy;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(doubleSided)
        : doubleSided(mesh.material);
    }
  });
  return fitModel(instance, limits);
}

function Exhibit({
  source,
  id,
}: {
  source: THREE.Group;
  id: 'technology_ps5' | 'technology_monitor_1';
}) {
  const cfg = MODEL_PLACEMENTS[id];
  const fitted = useMemo(
    () => prepareModel(source, cfg.maxDimensions, id),
    [source, cfg.maxDimensions, id],
  );
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

export function TechnologyAccessories() {
  const [assets, setAssets] = useState<TechnologyAccessoryAssets | null>(null);
  useEffect(() => {
    let active = true;
    void preloadTechnologyAccessories()
      .then((value) => {
        if (active) setAssets(value);
      })
      .catch((error: unknown) => console.error('[SENAQUEST] Modelos PS5 e monitor:', error));
    return () => {
      active = false;
    };
  }, []);
  if (!assets) return null;
  return (
    <>
      <Exhibit id="technology_monitor_1" source={assets.monitor} />
      <Exhibit id="technology_ps5" source={assets.ps5} />
    </>
  );
}

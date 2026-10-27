import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { administrationExhibitX, ROOM_INNER_FACE, ROOM_WALL } from './roomWallPlacement';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  LOCAL_SECTOR_ASSET_BASE,
  SECTOR_ADMIN_ASSETS,
  SECTOR_ASSET_FILES,
  SECTOR_FALLBACK_COLORS,
  SECTOR_SHELF_ASSETS,
  SECTOR_WORKTOP_ASSETS,
  type ExhibitSector,
  type SectorAssetId,
} from './sectorAssets';

// Download único por modelo, mesmo se o objeto estiver em vários expositores.
const cachedScenes = new Map<string, Promise<THREE.Group | null>>();
let localFilesPromise: Promise<Set<string>> | undefined;

function availableLocalFiles(): Promise<Set<string>> {
  if (!localFilesPromise) {
    localFilesPromise = fetch(`${LOCAL_SECTOR_ASSET_BASE}index.json`)
      .then(async (response) => {
        if (!response.ok) return new Set<string>();
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('files' in data) || !Array.isArray(data.files)) {
          return new Set<string>();
        }
        return new Set<string>(
          data.files.filter((file: unknown): file is string => typeof file === 'string'),
        );
      })
      .catch(() => new Set<string>());
  }
  return localFilesPromise;
}

function loadGLB(url: string): Promise<THREE.Group | null> {
  const existing = cachedScenes.get(url);
  if (existing) return existing;
  const promise = new Promise<THREE.Group | null>((resolve) => {
    new GLTFLoader().load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      () => resolve(null), // Queda de rede não pode interromper o jogo nem a sala.
    );
  });
  cachedScenes.set(url, promise);
  return promise;
}

async function getSectorScene(id: SectorAssetId): Promise<THREE.Group | null> {
  const file = SECTOR_ASSET_FILES[id];
  const localFiles = await availableLocalFiles();
  if (localFiles.has(file)) {
    const local = await loadGLB(`${LOCAL_SECTOR_ASSET_BASE}${file}`);
    if (local) return local;
  }
  // Nunca abrir downloads de terceiros durante a sessão: na falta dos GLBs
  // locais, os suportes leves abaixo são mostrados imediatamente.
  // O instalador local pode baixar os assets antes de executar o jogo.
  return null;
}

/** Malhas simples e locais para não carregar GLBs externos durante a partida.
 * Servem só como marcadores até a troca pelos modelos definitivos. */
function LocalFallback({
  asset,
  sector,
  maxSize,
}: {
  asset: SectorAssetId;
  sector: ExhibitSector;
  maxSize: [number, number, number];
}) {
  const color = SECTOR_FALLBACK_COLORS[sector];
  const cube = (w: number, h: number, d: number, y: number, tint = color, x = 0, z = 0) => (
    <mesh position={[x, y, z]} key={`${x}-${y}-${z}-${w}-${h}`}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={tint} roughness={0.87} />
    </mesh>
  );
  const lower = asset.toLowerCase();
  const vehicle = ['truck', 'delivery', 'van', 'vehicleBox'].includes(asset);
  const plant = lower.includes('plant');
  const computer = asset === 'laptop' || asset === 'screen';
  return (
    <group scale={[maxSize[0], maxSize[1], maxSize[2]]}>
      {vehicle ? (
        <>
          {cube(0.8, 0.37, 0.68, 0.42)}
          {cube(0.28, 0.24, 0.68, 0.34, '#dbe6ed', -0.33)}
          {[-0.31, 0.31].map((x) =>
            [-0.34, 0.34].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.19, z]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.09, 10]} />
                <meshStandardMaterial color="#26313c" roughness={0.9} />
              </mesh>
            )),
          )}
        </>
      ) : plant ? (
        <>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.18, 0.14, 0.28, 8]} />
            <meshStandardMaterial color="#b99365" />
          </mesh>
          <mesh position={[0, 0.57, 0]}>
            <coneGeometry args={[0.32, 0.58, 6]} />
            <meshStandardMaterial color="#4a9d6b" />
          </mesh>
        </>
      ) : computer ? (
        <>
          {cube(0.82, 0.08, 0.68, 0.08, '#718696')}
          {cube(0.78, 0.66, 0.1, 0.46, '#344454', 0, -0.22)}
          {cube(0.66, 0.49, 0.015, 0.48, '#277da0', 0, -0.28)}
        </>
      ) : asset === 'books' ? (
        <>
          {cube(0.78, 0.16, 0.73, 0.11, '#c99d63')}
          {cube(0.72, 0.16, 0.72, 0.28, '#5886b4')}
          {cube(0.64, 0.16, 0.72, 0.45, '#b66e83')}
        </>
      ) : asset === 'safetyCone' ? (
        <>
          <mesh position={[0, 0.44, 0]}>
            <coneGeometry args={[0.32, 0.77, 9]} />
            <meshStandardMaterial color="#ed8228" />
          </mesh>
          {cube(0.8, 0.08, 0.8, 0.04, '#b95b21')}
        </>
      ) : asset === 'hardHat' ? (
        <>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.43, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e7b845" />
          </mesh>
          {cube(0.86, 0.06, 0.55, 0.06, '#d69924')}
        </>
      ) : asset === 'mouse' ? (
        <>
          <mesh position={[0, 0.13, 0]} scale={[0.55, 0.28, 0.8]}>
            <sphereGeometry args={[0.42, 12, 9]} />
            <meshStandardMaterial color="#85929a" />
          </mesh>
        </>
      ) : (
        <>
          {cube(0.74, asset === 'keyboard' ? 0.1 : 0.6, 0.7, asset === 'keyboard' ? 0.06 : 0.31)}
          {asset === 'drawers' && cube(0.64, 0.06, 0.72, 0.48, '#c8d2de', 0, 0.03)}
        </>
      )}
    </group>
  );
}

function AssetOnDisplay({
  asset,
  sector,
  position,
  maxSize = [0.76, 0.62, 0.36],
  rotation = 0,
}: {
  asset: SectorAssetId;
  sector: ExhibitSector;
  position: [number, number, number];
  maxSize?: [number, number, number];
  rotation?: number;
}) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let mounted = true;
    getSectorScene(asset).then((loaded) => {
      if (mounted && loaded) setScene(loaded.clone(true) as unknown as THREE.Group);
    });
    return () => {
      mounted = false;
    };
  }, [asset]);

  const fitted = useMemo(() => {
    if (!scene) return null;
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    if (![size.x, size.y, size.z].every(Number.isFinite)) return null;
    const scale = Math.min(
      maxSize[0] / Math.max(size.x, 0.001),
      maxSize[1] / Math.max(size.y, 0.001),
      maxSize[2] / Math.max(size.z, 0.001),
    );
    if (!Number.isFinite(scale) || scale <= 0) return null;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.receiveShadow = false;
        object.frustumCulled = true;
      }
    });
    return { scale, offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number] };
  }, [scene, maxSize]);

  return (
    <group position={position} rotation={[0, rotation, 0]} name={`sector-prop-${sector}-${asset}`}>
      {scene && fitted ? (
        <group scale={fitted.scale}>
          <group position={fitted.offset}>
            <primitive object={scene} />
          </group>
        </group>
      ) : (
        <LocalFallback asset={asset} sector={sector} maxSize={maxSize} />
      )}
    </group>
  );
}

/** Somente os modelos sobre as prateleiras. Geometria das estantes permanece no World. */
export function SectorShelfDecor({ sector }: { sector: 'technology' | 'logistics' | 'health' }) {
  const models = SECTOR_SHELF_ASSETS[sector];
  return (
    <group name={`temp-sector-exhibit-${sector}`}>
      {models.map((asset, index) => (
        <AssetOnDisplay
          key={`${sector}-${index}`}
          sector={sector}
          asset={asset}
          // 3 colunas x 3 níveis, todos no interior da estante existente.
          position={[-0.72 + (index % 3) * 0.72, -1.055 + Math.floor(index / 3) * 0.75, 0]}
          maxSize={[0.57, 0.57, 0.35]}
          rotation={((index % 3) - 1) * 0.14}
        />
      ))}
    </group>
  );
}

/** Expositor raso na região de Administração. Não cria novas estantes no ambiente. */
export function AdministrationWallDecor() {
  return (
    <group
      position={[administrationExhibitX(), 1.55, 0]}
      rotation={[0, Math.PI / 2, 0]}
      name="temp-sector-exhibit-administration"
    >
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[4.25, 1.57, 0.075]} />
        <meshStandardMaterial color="#6c5382" roughness={0.87} />
      </mesh>
      {/* Apoios rasos apenas dentro do próprio expositor temporário. */}
      {[-0.7, 0.06].map((y) => (
        <mesh key={y} position={[0, y, 0.13]}>
          <boxGeometry args={[4.05, 0.045, 0.31]} />
          <meshStandardMaterial color="#8c72a2" roughness={0.85} />
        </mesh>
      ))}
      {SECTOR_ADMIN_ASSETS.map((asset, index) => (
        <AssetOnDisplay
          key={`administration-${index}`}
          sector="administration"
          asset={asset}
          position={[-1.56 + (index % 4) * 1.04, -0.68 + Math.floor(index / 4) * 0.76, 0.14]}
          maxSize={[0.65, 0.6, 0.2]}
        />
      ))}
    </group>
  );
}

/** Props leves sobre a bancada já existente; sem adicionar outro móvel. */
export function TechnologyWorktopDecor() {
  return (
    <group name="temp-sector-exhibit-worktop">
      {SECTOR_WORKTOP_ASSETS.map((asset, index) => ({ asset, index }))
        // Liberar a área do monitor FBX e do PS5 definitivos na bancada central.
        .filter(({ index }) => index !== 2 && index !== 3)
        .map(({ asset, index }) => (
          <AssetOnDisplay
            key={`worktop-${index}`}
            sector="technology"
            asset={asset}
            // Posição top da bancada = 1.385. Disposição frontal aos computadores.
            position={[-2.0 + index * 0.8, 1.395, -ROOM_INNER_FACE + 0.715 + ROOM_WALL.clearance]}
            maxSize={[0.34, 0.16, 0.23]}
            rotation={0.12}
          />
        ))}
    </group>
  );
}

/** Prepara todos os placeholders locais existentes antes de revelar o jogo.
 * Não baixa modelos externos. Limita a 4 workers para proteger a memória do Quest.
 */
export async function preloadSectorDecor(): Promise<void> {
  const ids = Object.keys(SECTOR_ASSET_FILES) as SectorAssetId[];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        await getSectorScene(id);
      }
    }),
  );
}

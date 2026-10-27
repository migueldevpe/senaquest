import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { REQUIRED_ASSETS } from './preloadManifest';
import { preloadHealthSectorModels } from './HealthSectorModels';
import { preloadMedicalDesk, preloadMedicalImac } from './MedicalDeskModels';
import { loadPoppinsCanvas } from './poppins';
import { preloadSectorDecor } from './SectorDecor';
import { preloadCeilingFixtures } from './CeilingLightFixtures';
import { preloadLogisticsShelf } from './LogisticsShelfModel';
import { preloadTechnologyModels, preloadTechnologyAccessories } from './technology';

const CORE_FBX = [
  '/models/pawn.fbx',
  '/models/main_chair.fbx',
  '/models/chico.fbx',
  '/models/paty.fbx',
  '/models/claudinha.fbx',
  '/models/crownwin.fbx',
] as const;
const HEALTH_FBX_COUNT = 8; // 3 modelos iniciais + 5 acessórios definitivos.
const ASSET_TOTAL =
  REQUIRED_ASSETS.length + CORE_FBX.length + HEALTH_FBX_COUNT + 2 + 1 + 1 + 1 + 1 + 1 + 1;
const TOTAL = ASSET_TOTAL + 1; // 1 etapa final: a cena WebGL desenhada.
type Progress = { completed: number; description: string; error: string | null };
const initialProgress: Progress = {
  completed: 0,
  description: 'Preparando recursos...',
  error: null,
};

async function fetchAndCheck(url: string): Promise<void> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const bytes = await response.blob();
  if (!bytes.size) throw new Error(`Arquivo vazio: ${url}`);
  if (/\.(png|webp|jpe?g)$/i.test(url) && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(bytes);
    bitmap.close();
  }
  // Arquivos de áudio Opus estão pré-baixados, mas podem precisar de gesto
  // humano para iniciar a reprodução conforme política do navegador.
}

async function preloadEverything(report: (description: string) => void) {
  THREE.Cache.enabled = true;
  let index = 0;
  async function worker() {
    while (index < REQUIRED_ASSETS.length) {
      const url = REQUIRED_ASSETS[index++];
      await fetchAndCheck(url);
      report(`Arquivo preparado: ${url.split('/').pop()}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  for (const url of CORE_FBX) {
    const model = await new FBXLoader().loadAsync(url);
    if (!model.children.length) throw new Error(`FBX sem conteúdo: ${url}`);
    report(`Modelo 3D verificado: ${url.split('/').pop()}`);
  }
  await preloadHealthSectorModels();
  for (const id of [
    'mesa',
    'maca',
    'trolley',
    'iv_pole',
    'trash',
    'glove_box',
    'defibrillator',
    'medical_kit',
  ]) {
    report(`Saúde: ${id}`);
  }
  if (!(await preloadMedicalDesk())) throw new Error('Mesa de Medicina não pôde ser carregada');
  report('Mesa de Medicina');
  if (!(await preloadMedicalImac())) throw new Error('iMac não pôde ser carregado');
  report('iMac');
  await preloadCeilingFixtures();
  report('Luminárias de teto');
  await preloadLogisticsShelf();
  report('Estante definitiva de Logística e Vendas');
  await preloadTechnologyModels();
  report('Óculos VR e servidores de TI');
  await preloadTechnologyAccessories();
  report('Console PS5 e monitor de TI');
  await preloadSectorDecor();
  report('Decoração local preparada');
  await loadPoppinsCanvas();
  report('Fontes da interface');
}

// Um carregamento em todo o app, inclusive no React.StrictMode.
let globalProgress: Progress = initialProgress;
let assetPromise: Promise<void> | null = null;
const listeners = new Set<(progress: Progress) => void>();
function notify() {
  for (const listener of listeners) listener(globalProgress);
}
function loadOnce() {
  if (assetPromise) return assetPromise;
  assetPromise = preloadEverything((description) => {
    globalProgress = { completed: globalProgress.completed + 1, description, error: null };
    notify();
  }).catch((error: unknown) => {
    globalProgress = {
      ...globalProgress,
      error: error instanceof Error ? error.message : String(error),
    };
    notify();
    assetPromise = null;
    throw error;
  });
  return assetPromise;
}

export function StartupLoading({
  onReady,
  sceneReady,
  sceneError,
  fading,
  onFadeEnd,
}: {
  onReady: () => void;
  sceneReady: boolean;
  sceneError: string | null;
  fading: boolean;
  onFadeEnd: () => void;
}) {
  const [progress, setProgress] = useState(globalProgress);
  useEffect(() => {
    let active = true;
    const onChange = (next: Progress) => {
      if (active) setProgress(next);
    };
    listeners.add(onChange);
    setProgress(globalProgress);
    void loadOnce()
      .then(() => {
        if (active) onReady();
      })
      .catch(() => {
        /* erro visível na tela */
      });
    return () => {
      active = false;
      listeners.delete(onChange);
    };
  }, [onReady]);
  useEffect(() => {
    if (!fading) return;
    // Fallback para reduced-motion e navegadores sem transitionend.
    const timeout = window.setTimeout(onFadeEnd, 650);
    return () => window.clearTimeout(timeout);
  }, [fading, onFadeEnd]);
  const count = Math.min(ASSET_TOTAL, progress.completed) + (sceneReady ? 1 : 0);
  const percent = Math.min(100, Math.floor((count * 100) / TOTAL));
  const error = progress.error || sceneError;
  const description = sceneReady
    ? 'Sala pronta para jogar!'
    : progress.completed >= ASSET_TOTAL
      ? 'Montando a sala e finalizando WebGL...'
      : progress.description;
  return (
    <main
      className={`startup${fading ? ' startup--fading' : ''}`}
      role="status"
      aria-live="polite"
      onTransitionEnd={(event) => {
        if (fading && event.target === event.currentTarget) onFadeEnd();
      }}
    >
      <section className="startup-card">
        <h1>
          SENA<span>QUEST</span>
        </h1>
        <p>PREPARANDO SUA JORNADA</p>
        <div className="startup-progress-row">
          <strong>
            {error
              ? 'Falha no carregamento'
              : sceneReady
                ? 'Tudo pronto!'
                : 'Carregando recursos...'}
          </strong>
          <output>{percent}%</output>
        </div>
        <div
          className="startup-track"
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-label="Recursos preparados"
        >
          <div className="startup-fill" style={{ width: `${percent}%` }} />
        </div>
        <small>{description}</small>
        <p className="startup-note">
          {count} de {TOTAL} etapas concluídas.
        </p>
        {error && (
          <div className="startup-error">
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reiniciar carregamento
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

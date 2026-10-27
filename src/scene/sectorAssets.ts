/**
 * PLACEHOLDERS TEMPORÁRIOS, não modelos finais do SENAQUEST.
 * Remover com: node scripts/remove-temporary-sector-decor.mjs
 * Nenhum pacote npm exclusivo é exigido por esta coleção.
 * Fontes: GLBs Kenney CC0 via espelho público Hidencod/tge-assets.
 */
export const SECTOR_ASSET_FILES = {
  laptop: 'furniture-kit/laptop.glb',
  screen: 'furniture-kit/computerscreen.glb',
  keyboard: 'furniture-kit/computerkeyboard.glb',
  mouse: 'furniture-kit/computermouse.glb',
  speaker: 'furniture-kit/speaker.glb',
  smallSpeaker: 'furniture-kit/speakersmall.glb',
  radio: 'furniture-kit/radio.glb',
  books: 'furniture-kit/books.glb',
  closedBox: 'furniture-kit/cardboardboxclosed.glb',
  openBox: 'furniture-kit/cardboardboxopen.glb',
  plant: 'furniture-kit/plantsmall2.glb',
  smallPlant: 'furniture-kit/plantsmall1.glb',
  leafyPlant: 'furniture-kit/plantsmall3.glb',
  pottedPlant: 'furniture-kit/pottedplant.glb',
  drawers: 'furniture-kit/sidetabledrawers.glb',
  crate: 'prototype-kit/crate-color.glb',
  hardHat: 'prototype-kit/hat-hard.glb',
  truck: 'car-kit/truck.glb',
  van: 'car-kit/van.glb',
  delivery: 'car-kit/delivery.glb',
  vehicleBox: 'car-kit/box.glb',
  safetyCone: 'car-kit/cone.glb',
} as const;

export type SectorAssetId = keyof typeof SECTOR_ASSET_FILES;
export type ExhibitSector = 'technology' | 'administration' | 'logistics' | 'health';

export const SECTOR_FALLBACK_COLORS: Record<ExhibitSector, string> = {
  technology: '#318fba',
  administration: '#9a75b8',
  logistics: '#ce9555',
  health: '#62a992',
};

/** Três peças por nível nas três prateleiras atuais, sem novos móveis. */
export const SECTOR_SHELF_ASSETS: Record<
  Exclude<ExhibitSector, 'administration'>,
  readonly SectorAssetId[]
> = {
  technology: [
    'laptop',
    'screen',
    'speaker',
    'keyboard',
    'radio',
    'smallSpeaker',
    'mouse',
    'books',
    'smallPlant',
  ],
  logistics: [
    'closedBox',
    'openBox',
    'crate',
    'truck',
    'delivery',
    'van',
    'vehicleBox',
    'safetyCone',
    'hardHat',
  ],
  health: [
    'books',
    'laptop',
    'closedBox',
    'drawers',
    'screen',
    'smallPlant',
    'openBox',
    'mouse',
    'leafyPlant',
  ],
} as const;

/** 2 linhas x 4 objetos no painel decorativo já previsto. */
export const SECTOR_ADMIN_ASSETS: readonly SectorAssetId[] = [
  'books',
  'laptop',
  'mouse',
  'drawers',
  'screen',
  'keyboard',
  'smallSpeaker',
  'pottedPlant',
] as const;

/** Acessórios pequenos na bancada atual de Tecnologia. */
export const SECTOR_WORKTOP_ASSETS: readonly SectorAssetId[] = [
  'keyboard',
  'mouse',
  'smallSpeaker',
  'smallPlant',
  'books',
  'radio',
] as const;

export const KENNEY_ASSET_BASE = 'https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/';
export const LOCAL_SECTOR_ASSET_BASE = '/models/sector-assets/';

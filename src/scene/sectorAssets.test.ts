import { describe, expect, it } from 'vitest';
import {
  KENNEY_ASSET_BASE,
  SECTOR_ASSET_FILES,
  SECTOR_SHELF_ASSETS,
  SECTOR_WORKTOP_ASSETS,
} from './sectorAssets';

describe('acervo decorativo CC0 dos setores', () => {
  it('registra somente caminhos relativos GLB sem segmentos inseguros', () => {
    for (const file of Object.values(SECTOR_ASSET_FILES)) {
      expect(file).toMatch(/^(furniture-kit|prototype-kit|car-kit)\/[\w-]+\.glb$/);
      expect(file).not.toContain('..');
    }
    expect(new Set(Object.values(SECTOR_ASSET_FILES)).size).toBe(
      Object.values(SECTOR_ASSET_FILES).length,
    );
    expect(KENNEY_ASSET_BASE.startsWith('https://')).toBe(true);
  });

  it('atribui peças existentes às prateleiras e à bancada', () => {
    for (const models of Object.values(SECTOR_SHELF_ASSETS)) {
      expect(models.length).toBe(9);
      for (const model of models) expect(SECTOR_ASSET_FILES[model]).toBeTruthy();
    }
    expect(SECTOR_WORKTOP_ASSETS.length).toBe(6);
    for (const model of SECTOR_WORKTOP_ASSETS) expect(SECTOR_ASSET_FILES[model]).toBeTruthy();
  });
});

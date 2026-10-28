import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSETS } from './preloadManifest';

describe('assets de tecnologia', () => {
  it('inclui todos os modelos e mapas carregados pelos preloads da cena', () => {
    const technologyAssets = [
      '/models/technology/laptop/laptop.fbx',
      '/models/technology/laptop/laptop_albedo.webp',
      '/models/technology/laptop/laptop_ao.webp',
      '/models/technology/laptop/laptop_emission.webp',
      '/models/technology/laptop/laptop_metallic.webp',
      '/models/technology/laptop/laptop_normal.webp',
      '/models/technology/laptop/laptop_roughness.webp',
      '/models/technology/tv/tv.fbx',
      '/models/technology/tv/tv_albedo.webp',
      '/models/technology/tv/tv_ao.webp',
      '/models/technology/tv/tv_metallic.webp',
      '/models/technology/tv/tv_normal.webp',
      '/models/technology/tv/tv_roughness.webp',
      '/models/technology/headphones/fone.fbx',
      '/models/health-final/medicine/imac.fbx',
      '/models/sector-assets/index.json',
    ];

    for (const asset of technologyAssets) {
      expect(REQUIRED_ASSETS, asset).toContain(asset);
    }
  });
});

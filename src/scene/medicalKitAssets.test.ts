import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSETS } from './preloadManifest';
import { MODEL_PLACEMENTS } from './modelPlacements';

describe('Kit de primeiros socorros no setor Saúde', () => {
  it('tem modelo e mapas WebP no manifesto de carregamento', () => {
    const folder = '/models/health-final/accessories/medical_kit/';
    expect(REQUIRED_ASSETS).toContain(`${folder}medical_kit.fbx`);
    expect(REQUIRED_ASSETS).toContain(`${folder}medical_kit_base.webp`);
    expect(REQUIRED_ASSETS).toContain(`${folder}medical_kit_normal.webp`);
    expect(REQUIRED_ASSETS.filter((path) => path.startsWith(folder))).toHaveLength(3);
  });

  it('tem posicionamento 3D configurável, sem alterar os demais', () => {
    const placement = MODEL_PLACEMENTS.medical_kit;
    expect(placement.position).toHaveLength(3);
    expect(placement.maxDimensions).toHaveLength(3);
    expect(placement.maxDimensions.every((v) => Number.isFinite(v) && v > 0)).toBe(true);
    expect(Number.isFinite(placement.rotationY)).toBe(true);
    expect(MODEL_PLACEMENTS.mesa.position).toEqual([0.3, 0.005, 7.25]);
  });
});

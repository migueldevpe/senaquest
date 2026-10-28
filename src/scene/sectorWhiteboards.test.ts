import { describe, expect, it } from 'vitest';
import { MODEL_PLACEMENTS } from './modelPlacements';
import { REQUIRED_ASSETS } from './preloadManifest';

describe('quadros dos setores', () => {
  it('posiciona os dois modelos voltados para o centro das paredes laterais', () => {
    expect(MODEL_PLACEMENTS.administration_whiteboard).toEqual({
      position: [-7.86, 2.75, -5],
      rotationY: Math.PI / 2,
      maxDimensions: [2.6, 1.32, 0.16],
    });
    expect(MODEL_PLACEMENTS.logistics_whiteboard).toEqual({
      position: [7.84, 2.75, -5],
      rotationY: -Math.PI / 2,
      maxDimensions: [2.6, 1.32, 0.16],
    });
  });

  it('precarrega o FBX e todos os mapas PBR em WebP', () => {
    expect(REQUIRED_ASSETS).toContain('/models/sector-whiteboard/White_board.fbx');
    for (const map of ['Albedo', 'AO', 'Metallic', 'Normal', 'Roughness']) {
      expect(REQUIRED_ASSETS).toContain(
        `/models/sector-whiteboard/textures/White_board_${map}.webp`,
      );
    }
  });
});

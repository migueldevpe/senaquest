import { describe, expect, it } from 'vitest';
import { HEALTH_MODEL_PLACEMENTS, MODEL_PLACEMENTS } from './modelPlacements';

describe('Cadastro unificado de modelos definitivos', () => {
  it('contém os elementos padronizados de sala e mantém as posições acordadas', () => {
    expect(Object.keys(MODEL_PLACEMENTS)).toEqual([
      'technology_shelf',
      'health_shelf',
      'logistics_shelf',
      'cadeira_mesa_saude',
      'ceiling_light_1',
      'ceiling_light_2',
      'ceiling_light_3',
      'ceiling_light_4',
      'mesa',
      'maca',
      'trolley',
      'mesa_medicina',
      'imac',
      'iv_pole',
      'trash',
      'glove_box',
      'defibrillator',
      'medical_kit',
      'technology_vr_1',
      'technology_vr_2',
      'technology_vr_3',
      'technology_server_1',
      'technology_server_2',
      'technology_monitor_1',
      'technology_ps5',
      'technology_tv',
      'technology_headphones',
      'technology_laptop',
      'technology_pc_1',
      'technology_pc_2',
      'technology_pc_3',
      'technology_keyboard',
    ]);
    expect(MODEL_PLACEMENTS.technology_vr_1).toEqual({
      position: [-2.15, 1.375, -7.5],
      rotationY: 0.5,
      maxDimensions: [0.56, 0.34, 0.38],
    });
    expect(MODEL_PLACEMENTS.technology_vr_2).toEqual({
      position: [-1.75, 1.375, -7.35],
      rotationY: 0,
      maxDimensions: [0.56, 0.34, 0.38],
    });
    expect(MODEL_PLACEMENTS.technology_vr_3).toEqual({
      position: [-1.35, 1.375, -7.65],
      rotationY: -0.5,
      maxDimensions: [0.56, 0.34, 0.38],
    });
    expect(MODEL_PLACEMENTS.technology_server_1).toEqual({
      position: [4.55, 0.005, -7.25],
      rotationY: 0,
      maxDimensions: [1.24, 3.4, 1.04],
    });
    expect(MODEL_PLACEMENTS.technology_server_2).toEqual({
      position: [6, 0.005, -7.25],
      rotationY: 0,
      maxDimensions: [1.24, 3.4, 1.04],
    });
    expect(MODEL_PLACEMENTS.technology_monitor_1).toEqual({
      position: [1.2, 1.375, -7.5],
      rotationY: Math.PI / -2,
      maxDimensions: [3.35, 2.54, 1.22],
    });
    expect(MODEL_PLACEMENTS.technology_ps5).toEqual({
      position: [2.15, 1.375, -7.5],
      rotationY: 0,
      maxDimensions: [0.45, 0.55, 0.38],
    });
    expect(MODEL_PLACEMENTS.technology_tv).toEqual({
      position: [-4.5, 2.02, -7.65],
      rotationY: 0,
      maxDimensions: [2.45, 1.45, 0.58],
    });
    expect(MODEL_PLACEMENTS.technology_headphones).toEqual({
      position: [2.15, 1.55, -7.5],
      rotationY: 0,
      maxDimensions: [0.56, 0.55, 0.45],
    });
    expect(MODEL_PLACEMENTS.technology_laptop).toEqual({
      position: [-0.75, 1.375, -7.5],
      rotationY: 0,
      maxDimensions: [0.72, 0.48, 0.6],
    });
    expect(MODEL_PLACEMENTS.technology_pc_1).toEqual({
      position: [-5.0, 0.005, -7.65],
      rotationY: 0,
      maxDimensions: [0.88, 0.74, 0.66],
    });
    expect(MODEL_PLACEMENTS.technology_pc_2).toEqual({
      position: [-4.25, 0.005, -7.65],
      rotationY: 0,
      maxDimensions: [0.88, 0.74, 0.66],
    });
    expect(MODEL_PLACEMENTS.technology_pc_3).toEqual({
      position: [-4.6, 0.68, -7.65],
      rotationY: 0,
      maxDimensions: [0.88, 0.74, 0.66],
    });
    expect(MODEL_PLACEMENTS.technology_keyboard).toEqual({
      position: [-4.5, 1.425, -7.65],
      rotationY: 0.2,
      maxDimensions: [0.72, 0.09, 0.32],
    });
    expect(MODEL_PLACEMENTS.technology_shelf).toEqual({
      position: [-4.5, 1.3, -7.15],
      rotationY: 0,
      maxDimensions: [2.3, 2.55, 0.5],
    });
    expect(MODEL_PLACEMENTS.health_shelf).toEqual({
      position: [6.15, 1.3, 7.15],
      rotationY: Math.PI,
      maxDimensions: [2.3, 2.55, 0.5],
    });
    expect(MODEL_PLACEMENTS.logistics_shelf).toEqual({
      position: [7.905, 0.005, 4.5],
      rotationY: -Math.PI / 2,
      maxDimensions: [2.3, 2.55, 0.5],
    });
    expect(MODEL_PLACEMENTS.cadeira_mesa_saude).toEqual({
      position: [2.6, 0, 6.45],
      rotationY: Math.PI * 2.25,
      maxDimensions: [1.55, 1.9, 1.55],
    });
    for (const [index, position] of (
      [
        [-4, 5.15, -4],
        [4, 5.15, -4],
        [-4, 5.15, 4],
        [4, 5.15, 4],
      ] as const
    ).entries()) {
      const id = `ceiling_light_${index + 1}` as keyof typeof MODEL_PLACEMENTS;
      expect(MODEL_PLACEMENTS[id]).toEqual({
        position,
        rotationY: 0,
        maxDimensions: [2.6, 0.6, 0.55],
      });
    }
    expect(MODEL_PLACEMENTS.mesa).toEqual({
      position: [0.3, 0.005, 7.25],
      rotationY: 4.7125,
      maxDimensions: [2.5, 2.1, 2.6],
    });
    expect(MODEL_PLACEMENTS.maca).toEqual({
      position: [-2, 0.005, 5.85],
      rotationY: Math.PI / 2,
      maxDimensions: [3.85, 4.725, 3.51],
    });
    expect(MODEL_PLACEMENTS.trolley).toEqual({
      position: [-3.5, 0.005, 6.25],
      rotationY: 2.75,
      maxDimensions: [1, 1.3, 1.03],
    });
    expect(MODEL_PLACEMENTS.mesa_medicina).toEqual({
      position: [3.1, 0.005, 7.35],
      rotationY: Math.PI,
      maxDimensions: [2.2, 1.3, 2],
    });
    // Coordenadas locais em relação ao topo da mesa de Medicina.
    expect(MODEL_PLACEMENTS.imac).toEqual({
      position: [0, 0.01, 0],
      rotationY: 0,
      maxDimensions: [1.42, 1.36, 0.6],
    });
    expect(MODEL_PLACEMENTS.iv_pole).toEqual({
      position: [-3.3, 0.005, 7.25],
      rotationY: 3.125,
      maxDimensions: [1.2, 2.45, 1.2],
    });
    expect(MODEL_PLACEMENTS.trash).toEqual({
      position: [-0.8, 0.005, 6.5],
      rotationY: Math.PI * 2,
      maxDimensions: [0.72, 1.05, 0.72],
    });
    expect(MODEL_PLACEMENTS.glove_box).toEqual({
      position: [0.25, 1.175, 7],
      rotationY: Math.PI / 2,
      maxDimensions: [0.46, 0.18, 0.32],
    });
    expect(MODEL_PLACEMENTS.defibrillator).toEqual({
      position: [0.25, 1.75, 7.75],
      rotationY: Math.PI * 3,
      maxDimensions: [0.74, 0.46, 0.34],
    });
    expect(MODEL_PLACEMENTS.medical_kit).toEqual({
      position: [1, 1.175, 7.1],
      rotationY: Math.PI,
      maxDimensions: [0.5, 0.39, 0.24],
    });
  });

  it('padroniza posição, rotação e tamanho para todos os modelos cadastrados', () => {
    expect(HEALTH_MODEL_PLACEMENTS).toBe(MODEL_PLACEMENTS);
    for (const [name, placement] of Object.entries(MODEL_PLACEMENTS)) {
      expect(Object.keys(placement).sort(), name).toEqual([
        'maxDimensions',
        'position',
        'rotationY',
      ]);
      expect(placement.position).toHaveLength(3);
      expect(placement.maxDimensions).toHaveLength(3);
      expect(
        [...placement.position, ...placement.maxDimensions, placement.rotationY].every(
          Number.isFinite,
        ),
        name,
      ).toBe(true);
      expect(
        placement.maxDimensions.every((length) => length > 0),
        name,
      ).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { ADMINISTRATION_RACK_CONTENTS } from './administrationRackLayout';
import { MODEL_PLACEMENTS } from './modelPlacements';

describe('administração: distribuição de livros no rack', () => {
  it('distribui seis livros e seis porta-documentos com posições personalizáveis', () => {
    const books = ADMINISTRATION_RACK_CONTENTS.filter((item) => item.model === 'book');
    const holders = ADMINISTRATION_RACK_CONTENTS.filter((item) => item.model === 'documentHolder');

    expect(books).toHaveLength(6);
    expect(holders).toHaveLength(6);
    expect(new Set(ADMINISTRATION_RACK_CONTENTS.map((item) => item.placement)).size).toBe(12);

    for (const item of ADMINISTRATION_RACK_CONTENTS) {
      expect(MODEL_PLACEMENTS[item.placement]).toBeDefined();
    }
  });

  it('mantém o conteúdo dentro da largura, altura e profundidade do rack', () => {
    const rack = MODEL_PLACEMENTS.administration_rack;
    for (const item of ADMINISTRATION_RACK_CONTENTS) {
      const placement = MODEL_PLACEMENTS[item.placement];
      const [x, y, z] = placement.position;
      const width = placement.maxDimensions[0];

      expect(Math.abs(x) + width / 2).toBeLessThan(rack.maxDimensions[0] / 2);
      expect(y).toBeGreaterThan(-rack.maxDimensions[1] / 2);
      expect(y).toBeLessThan(rack.maxDimensions[1] / 2);
      expect(z).toBeGreaterThan(0.025);
      expect(z).toBeLessThan(rack.maxDimensions[2]);
      expect(Number.isFinite(placement.rotationY)).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { MODEL_PLACEMENTS } from './modelPlacements';

const ADMINISTRATION_DESK_ITEMS = [
  'administration_printer',
  'administration_imac',
  'administration_telephone',
  'administration_paper_stack',
  'administration_stack_of_paper',
] as const;

function footprint(id: (typeof ADMINISTRATION_DESK_ITEMS)[number]) {
  const placement = MODEL_PLACEMENTS[id];
  const rotated = Math.abs(Math.sin(placement.rotationY)) > 0.5;
  return {
    x: rotated ? placement.maxDimensions[2] : placement.maxDimensions[0],
    z: rotated ? placement.maxDimensions[0] : placement.maxDimensions[2],
  };
}

describe('administration desk placements', () => {
  it('keeps every model above and within the administration tabletop footprint', () => {
    const table = MODEL_PLACEMENTS.administration_table;
    const tableHalfWidth = table.maxDimensions[2] / 2;
    const tableHalfDepth = table.maxDimensions[0] / 2;

    for (const id of ADMINISTRATION_DESK_ITEMS) {
      const placement = MODEL_PLACEMENTS[id];
      const size = footprint(id);
      expect(placement.position[1]).toBeGreaterThan(0);
      expect(Math.abs(placement.position[0] - table.position[0]) + size.x / 2).toBeLessThan(
        tableHalfWidth,
      );
      expect(Math.abs(placement.position[2] - table.position[2]) + size.z / 2).toBeLessThan(
        tableHalfDepth,
      );
      expect(placement.maxDimensions.every((dimension) => dimension > 0)).toBe(true);
    }
  });

  it('keeps all tabletop models from overlapping each other', () => {
    for (let firstIndex = 0; firstIndex < ADMINISTRATION_DESK_ITEMS.length; firstIndex += 1) {
      const firstId = ADMINISTRATION_DESK_ITEMS[firstIndex];
      const first = MODEL_PLACEMENTS[firstId];
      const firstSize = footprint(firstId);
      for (const secondId of ADMINISTRATION_DESK_ITEMS.slice(firstIndex + 1)) {
        const second = MODEL_PLACEMENTS[secondId];
        const secondSize = footprint(secondId);
        const overlapsX =
          Math.abs(first.position[0] - second.position[0]) < (firstSize.x + secondSize.x) / 2;
        const overlapsZ =
          Math.abs(first.position[2] - second.position[2]) < (firstSize.z + secondSize.z) / 2;
        expect(overlapsX && overlapsZ, `${firstId} overlaps ${secondId}`).toBe(false);
      }
    }
  });
});

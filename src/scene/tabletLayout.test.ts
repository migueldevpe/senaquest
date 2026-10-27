import { describe, expect, it } from 'vitest';
import {
  TABLET,
  tabletActions,
  tabletEllipsis,
  tabletGrid,
  tabletRectToWorld,
  tabletTimerRects,
  tabletWrap,
} from './tabletLayout';

const inside = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) =>
  x >= TABLET.inset && y >= 0 && x + w <= TABLET.width - TABLET.inset && y + h <= TABLET.height;

describe('layout padronizado do tablet WebXR', () => {
  it('mantém três linhas de cursos dentro da tela', () => {
    const cells = tabletGrid(2, 6, TABLET.inset, 245, 1116, 132, 20, 26);
    expect(cells).toHaveLength(6);
    expect(cells.every(inside)).toBe(true);
    expect(cells[0].w).toBe(cells[1].w);
    expect(cells[4].y).toBeGreaterThan(cells[2].y);
  });
  it('padroniza quatro alternativas e quatro placares sem sobreposição', () => {
    for (const { startY, height } of [
      { startY: 500, height: 82 },
      { startY: 351, height: 82 },
    ]) {
      const cells = tabletGrid(2, 4, TABLET.inset, startY, 1116, height);
      expect(cells.every(inside)).toBe(true);
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const a = cells[i],
            b = cells[j];
          const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
          expect(overlap).toBe(false);
        }
      }
    }
  });
  it('centraliza ação única e aplica space-between para duas ações', () => {
    const [center] = tabletActions([500]);
    expect(center.x + center.w / 2).toBe(TABLET.width / 2);
    const [left, right] = tabletActions([548, 548]);
    expect(left.x).toBe(TABLET.inset);
    expect(right.x + right.w).toBe(TABLET.width - TABLET.inset);
    expect(right.x - (left.x + left.w)).toBe(TABLET.gap);
  });
  it('separa palavras por largura real e corta palavras longas sem transbordar', () => {
    const measure = (value: string) => value.length * 10;
    expect(tabletWrap('A lua é azul', measure, 60)).toEqual(['A lua', 'é azul']);
    const cut = tabletEllipsis('supercalifragilistic', measure, 55);
    expect(cut.endsWith('…')).toBe(true);
    expect(measure(cut)).toBeLessThanOrEqual(55);
  });
});

describe('barra de progresso do tablet', () => {
  it('mantém preenchimento arredondado estritamente dentro da trilha, inclusive em 100%', () => {
    const { background, fill } = tabletTimerRects();
    expect(fill.x).toBeGreaterThan(background.x);
    expect(fill.y).toBeGreaterThan(background.y);
    expect(fill.x + fill.w).toBeLessThan(background.x + background.w);
    expect(fill.y + fill.h).toBeLessThan(background.y + background.h);
  });
  it('converte a área do Canvas para o mesmo espaço do plano 3D sem desalinhamento', () => {
    const { background, fill } = tabletTimerRects();
    const b = tabletRectToWorld(background);
    const f = tabletRectToWorld(fill);
    expect(f.x - f.w / 2).toBeGreaterThan(b.x - b.w / 2);
    expect(f.x + f.w / 2).toBeLessThan(b.x + b.w / 2);
    expect(f.y - f.h / 2).toBeGreaterThan(b.y - b.h / 2);
    expect(f.y + f.h / 2).toBeLessThan(b.y + b.h / 2);
    expect(Math.abs(f.x)).toBeLessThan(0.000001);
  });
});

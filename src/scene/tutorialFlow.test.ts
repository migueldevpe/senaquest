import { describe, expect, it } from 'vitest';
import {
  DESKTOP_TUTORIAL_STEPS,
  VR_TUTORIAL_STEPS,
  TUTORIAL_STEPS,
  shouldFollowTutorialPanel,
  yawDifference,
  shouldShowTutorialRecenter,
} from './tutorialFlow';

describe('tutorial isolado por plataforma', () => {
  it('mostra somente as regras no desktop', () => {
    expect(DESKTOP_TUTORIAL_STEPS).toEqual([
      'lottery',
      'questions',
      'movement',
      'events',
      'victory',
    ]);
    expect(DESKTOP_TUTORIAL_STEPS.every((key) => Boolean(TUTORIAL_STEPS[key]))).toBe(true);
  });
  it('oferece exercícios de XR sem modificar o estado do tabuleiro', () => {
    expect(VR_TUTORIAL_STEPS).toContain('pinch');
    expect(VR_TUTORIAL_STEPS).toContain('click');
    expect(VR_TUTORIAL_STEPS).toContain('tablet');
    expect(VR_TUTORIAL_STEPS.every((key) => Boolean(TUTORIAL_STEPS[key]))).toBe(true);
  });
  it('recentrar só aparece quando o painel sair da área visível e não pisca', () => {
    const degrees = (value: number) => (value * Math.PI) / 180;
    expect(shouldShowTutorialRecenter(degrees(20), false)).toBe(false);
    expect(shouldShowTutorialRecenter(degrees(45), false)).toBe(true);
    expect(shouldShowTutorialRecenter(degrees(36), true)).toBe(true);
    expect(shouldShowTutorialRecenter(degrees(25), true)).toBe(false);
  });
  it('usa limiar de 45 graus sem oscilar ao cruzar +/-180 graus', () => {
    expect(shouldFollowTutorialPanel(Math.PI / 6, 0)).toBe(false);
    expect(shouldFollowTutorialPanel(Math.PI / 2, 0)).toBe(true);
    expect(yawDifference(Math.PI - 0.02, -Math.PI + 0.02)).toBeCloseTo(-0.04, 4);
  });
});

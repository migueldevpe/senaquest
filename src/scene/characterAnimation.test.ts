import { describe, expect, it } from 'vitest';
import { CHARACTER_ANIMATION, victoryPunchEnvelope, victoryPunchSway } from './characterAnimation';

describe('soquinho de vitória', () => {
  const total =
    CHARACTER_ANIMATION.punchEnter + CHARACTER_ANIMATION.punchHold + CHARACTER_ANIMATION.punchExit;
  it('começa e termina em repouso', () => {
    expect(victoryPunchEnvelope(-0.1)).toBe(0);
    expect(victoryPunchEnvelope(0)).toBe(0);
    expect(victoryPunchEnvelope(total)).toBe(0);
  });
  it('mantém a pose durante o intervalo configurado', () => {
    expect(victoryPunchEnvelope(CHARACTER_ANIMATION.punchEnter)).toBe(1);
    expect(
      victoryPunchEnvelope(CHARACTER_ANIMATION.punchEnter + CHARACTER_ANIMATION.punchHold - 0.01),
    ).toBe(1);
  });
  it('respeita a amplitude da oscilação', () => {
    for (let t = 0; t < total; t += 0.05) {
      expect(Math.abs(victoryPunchSway(t))).toBeLessThanOrEqual(
        CHARACTER_ANIMATION.punchSwayAmplitude + 1e-8,
      );
    }
  });
});

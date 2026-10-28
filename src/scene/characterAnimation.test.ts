import { describe, expect, it } from 'vitest';
import {
  CHARACTER_ANIMATION,
  VICTORY_ARM_POSE,
  victoryPunchEnvelope,
  victoryPunchSway,
} from './characterAnimation';

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

describe('pose de vitória com cotovelos dobrados', () => {
  const dot = (a: { lateral: number; vertical: number; forward: number }, b: typeof a) =>
    a.lateral * b.lateral + a.vertical * b.vertical + a.forward * b.forward;

  it('abre os braços para fora e dobra os antebraços para dentro', () => {
    for (const side of ['left', 'right'] as const) {
      const pose = VICTORY_ARM_POSE[side];
      expect(Math.abs(pose.upperArm.lateral)).toBeGreaterThan(pose.upperArm.vertical);
      expect(pose.forearm.vertical).toBeGreaterThan(Math.abs(pose.forearm.lateral));
      expect(Math.abs(dot(pose.upperArm, pose.forearm))).toBeLessThan(0.08);
    }
    expect(VICTORY_ARM_POSE.left.upperArm.lateral).toBeLessThan(0);
    expect(VICTORY_ARM_POSE.right.upperArm.lateral).toBeGreaterThan(0);
    expect(VICTORY_ARM_POSE.left.forearm.lateral).toBeGreaterThan(0);
    expect(VICTORY_ARM_POSE.right.forearm.lateral).toBeLessThan(0);
  });
});

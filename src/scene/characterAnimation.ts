/** Soquinho de vitória: braço direito flexionado, punho fechado erguido. */
export const CHARACTER_ANIMATION = {
  punchEnter: 0.22,
  punchHold: 0.75,
  punchExit: 0.32,
  punchSwayAmplitude: 0.025,
  punchSwayHz: 2.0,
} as const;

/**
 * Direções da pose de vitória no referencial do personagem:
 * [lateral, vertical, frente]. Os braços abrem para os lados e os antebraços
 * voltam para dentro, formando um cotovelo dobrado em vez de dois braços retos.
 */
export const VICTORY_ARM_POSE = {
  left: {
    upperArm: { lateral: -0.82, vertical: 0.38, forward: 0.1 },
    forearm: { lateral: 0.42, vertical: 0.82, forward: 0.12 },
  },
  right: {
    upperArm: { lateral: 0.82, vertical: 0.38, forward: 0.1 },
    forearm: { lateral: -0.42, vertical: 0.82, forward: 0.12 },
  },
} as const;

const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

export function victoryPunchEnvelope(elapsed: number): number {
  const { punchEnter, punchHold, punchExit } = CHARACTER_ANIMATION;
  if (elapsed < 0 || elapsed >= punchEnter + punchHold + punchExit) return 0;
  if (elapsed < punchEnter) return smooth(elapsed / punchEnter);
  if (elapsed < punchEnter + punchHold) return 1;
  return 1 - smooth((elapsed - punchEnter - punchHold) / punchExit);
}

export function victoryPunchSway(elapsed: number): number {
  return (
    victoryPunchEnvelope(elapsed) *
    CHARACTER_ANIMATION.punchSwayAmplitude *
    Math.sin(elapsed * Math.PI * 2 * CHARACTER_ANIMATION.punchSwayHz)
  );
}

/** Vitória da partida: dois punhos erguidos, sem interromper a postura sentada. */
export function championEnvelope(elapsed: number): number {
  if (elapsed < 0 || elapsed >= 3.0) return 0;
  if (elapsed < 0.5) return smooth(elapsed / 0.5);
  if (elapsed < 2.4) return 1;
  return 1 - smooth((elapsed - 2.4) / 0.6);
}

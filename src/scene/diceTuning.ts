import { create } from 'zustand';

export const DEFAULT_DICE_TUNING = { impulse: 0.08, torque: 0.015, showColliders: false } as const;

interface DiceTuning {
  impulse: number;
  torque: number;
  showColliders: boolean;
  setImpulse: (value: number) => void;
  setTorque: (value: number) => void;
  setShowColliders: (value: boolean) => void;
}

/** Valores de impulso baixos para um dado pequeno (massa derivada do colisor). */
export const useDiceTuning = create<DiceTuning>((set) => ({
  ...DEFAULT_DICE_TUNING,
  setImpulse: (impulse) => set({ impulse }),
  setTorque: (torque) => set({ torque }),
  setShowColliders: (showColliders) => set({ showColliders }),
}));

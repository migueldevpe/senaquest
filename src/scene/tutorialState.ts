import { create } from 'zustand';
import {
  type TutorialMode,
  type TutorialStepId,
  stepsFor,
  saveTutorialComplete,
} from './tutorialFlow';

type InputKind = 'hands' | 'controllers' | 'unknown';
type TutorialState = {
  mode: TutorialMode | null;
  index: number;
  inputKind: InputKind;
  handsDetected: boolean;
  hoverDetected: boolean;
  pinchDetected: boolean;
  recenterNonce: number;
  start: (mode: TutorialMode) => void;
  end: (completed?: boolean) => void;
  back: () => void;
  next: () => void;
  setInput: (kind: InputKind, bothHands: boolean) => void;
  markHover: () => void;
  markPinch: () => void;
  recenter: () => void;
};

export const useTutorial = create<TutorialState>((set, get) => ({
  mode: null,
  index: 0,
  inputKind: 'unknown',
  handsDetected: false,
  hoverDetected: false,
  pinchDetected: false,
  recenterNonce: 0,
  start: (mode) =>
    set((old) => ({
      mode,
      index: 0,
      inputKind: 'unknown',
      handsDetected: false,
      hoverDetected: false,
      pinchDetected: false,
      recenterNonce: old.recenterNonce + 1,
    })),
  end: (completed = false) => {
    const { mode } = get();
    if (mode && completed) saveTutorialComplete(mode);
    set({ mode: null, index: 0 });
  },
  back: () => set((old) => ({ index: Math.max(0, old.index - 1) })),
  next: () => {
    const state = get();
    if (!state.mode) return;
    const steps = stepsFor(state.mode);
    if (state.index + 1 >= steps.length) state.end(true);
    else set({ index: state.index + 1, hoverDetected: false });
  },
  setInput: (kind, bothHands) =>
    set((old) =>
      old.inputKind === kind && old.handsDetected === bothHands
        ? old
        : { inputKind: kind, handsDetected: bothHands },
    ),
  markHover: () => {
    if (get().mode === 'vr' && !get().hoverDetected) set({ hoverDetected: true });
  },
  markPinch: () => {
    if (get().mode === 'vr' && !get().pinchDetected) set({ pinchDetected: true });
  },
  recenter: () => set((old) => ({ recenterNonce: old.recenterNonce + 1 })),
}));

export function currentTutorialStep(mode: TutorialMode, index: number): TutorialStepId {
  const list = stepsFor(mode);
  return list[Math.min(Math.max(0, index), list.length - 1)];
}

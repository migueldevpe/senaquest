import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound, setSoundVolume } from './sounds';

class FakeOscillator {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn() };
  connect(node: unknown) {
    return node;
  }
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  static instances: FakeGain[] = [];
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  constructor() {
    FakeGain.instances.push(this);
  }
  connect(node: unknown) {
    return node;
  }
}

class FakeAudioContext {
  static instance: FakeAudioContext | undefined;
  currentTime = 1;
  state = 'running';
  destination = {};
  oscillators: FakeOscillator[] = [];

  constructor() {
    FakeAudioContext.instance = this;
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return new FakeGain();
  }
}

beforeEach(() => {
  if (FakeAudioContext.instance) FakeAudioContext.instance.oscillators = [];
  FakeGain.instances = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('AudioContext', FakeAudioContext);
  setSoundVolume(0.35);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('efeitos de resposta', () => {
  it('toca uma sequência ascendente para acerto', () => {
    playSound('correct');

    expect(
      FakeAudioContext.instance!.oscillators.map(
        (oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0][0],
      ),
    ).toEqual([660, 880, 1100]);
    expect(
      FakeAudioContext.instance!.oscillators.every((oscillator) => oscillator.type === 'sine'),
    ).toBe(true);
    expect(FakeGain.instances[0].gain.setValueAtTime.mock.calls[0][0]).toBe(0.35 * 0.24);
  });

  it('toca uma sequência descendente para erro', () => {
    playSound('wrong');

    expect(
      FakeAudioContext.instance!.oscillators.map(
        (oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0][0],
      ),
    ).toEqual([330, 220]);
    expect(
      FakeAudioContext.instance!.oscillators.every((oscillator) => oscillator.type === 'triangle'),
    ).toBe(true);
    expect(FakeGain.instances[0].gain.setValueAtTime.mock.calls[0][0]).toBe(0.35 * 0.24);
  });
});

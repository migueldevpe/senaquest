import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposeBackgroundMusic, setBackgroundMusic } from './backgroundMusic';

class FakeAudio {
  static instances: FakeAudio[] = [];
  paused = true;
  currentTime = 0;
  volume = 1;
  src = '';
  loop = false;
  preload = '';
  constructor() {
    FakeAudio.instances.push(this);
  }
  pause() {
    this.paused = true;
  }
  async play() {
    this.paused = false;
  }
  removeAttribute() {
    this.src = '';
  }
  load() {}
}

let requestedFrames: ReturnType<typeof vi.fn>;

beforeEach(() => {
  FakeAudio.instances = [];
  requestedFrames = vi.fn(() => 1);
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal(
    'CustomEvent',
    class {
      constructor(
        public name: string,
        public init: unknown,
      ) {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', requestedFrames);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  disposeBackgroundMusic();
  vi.unstubAllGlobals();
});

describe('transições da trilha do questionário', () => {
  it('interrompe imediatamente ao entrar em feedback/perdeu a vez', async () => {
    setBackgroundMusic('question');
    await Promise.resolve();
    expect(FakeAudio.instances).toHaveLength(1);
    const sound = FakeAudio.instances[0];
    expect(sound.paused).toBe(false);
    sound.currentTime = 5;
    setBackgroundMusic(null);
    expect(sound.paused).toBe(true);
    expect(sound.currentTime).toBe(0);
    expect(requestedFrames).not.toHaveBeenCalled();
  });

  it('preserva fade-out do menu e não cria outro Audio', async () => {
    setBackgroundMusic('menu');
    await Promise.resolve();
    const sound = FakeAudio.instances[0];
    setBackgroundMusic(null);
    expect(sound.paused).toBe(false);
    expect(requestedFrames).toHaveBeenCalledTimes(1);
    setBackgroundMusic('question');
    await Promise.resolve();
    expect(FakeAudio.instances).toHaveLength(1);
    expect(sound.src).toBe('/audio/musicquestionary.opus');
  });
});

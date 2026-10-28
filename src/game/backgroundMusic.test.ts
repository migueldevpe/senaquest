import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disposeBackgroundMusic,
  musicContextForPhase,
  setBackgroundMusic,
  setBackgroundMusicDucked,
  setBackgroundMusicMuted,
  unlockBackgroundMusic,
} from './backgroundMusic';

class FakeAudio {
  static instances: FakeAudio[] = [];
  paused = true;
  currentTime = 0;
  volume = 1;
  muted = false;
  src = '';
  loop = false;
  preload = '';
  onended: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  duration = 10;
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

let frames: FrameRequestCallback[];
let requestedFrames: ReturnType<typeof vi.fn>;

function finishFade() {
  frames.shift()?.(Number.MAX_SAFE_INTEGER);
}

beforeEach(() => {
  FakeAudio.instances = [];
  frames = [];
  requestedFrames = vi.fn((callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
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

describe('trilhas exclusivas e transições da partida', () => {
  it('inicia gameplay após confirmar o curso e seleciona as faixas do jogador', () => {
    expect(musicContextForPhase(true, 'confirm', 0, null)).toBe('menu');
    expect(musicContextForPhase(true, 'intro', 0, null)).toBe('gameplay');
    expect(musicContextForPhase(true, 'lottery', 0, null)).toBe('gameplay');
    expect(musicContextForPhase(true, 'question', 0, null)).toBe('question');
    expect(musicContextForPhase(true, 'feedback', 0, null)).toBe('afterQuestionary');
    expect(musicContextForPhase(true, 'feedback', 1, null)).toBe('gameplay');
    expect(musicContextForPhase(true, 'finished', 0, 0)).toBe('win');
    expect(musicContextForPhase(false, 'lottery', 0, null)).toBeNull();
  });

  it('faz fade entre faixas sem criar ou sobrepor elementos de áudio', async () => {
    setBackgroundMusic('menu');
    await Promise.resolve();
    const sound = FakeAudio.instances[0];
    expect(sound.src).toBe('/audio/musicmenu.opus');
    expect(sound.loop).toBe(true);
    finishFade();

    setBackgroundMusic('gameplay');
    expect(sound.src).toBe('/audio/musicmenu.opus');
    finishFade();
    await Promise.resolve();
    expect(sound.src).toBe('/audio/musicgameplay.opus');
    expect(sound.loop).toBe(true);
    expect(sound.paused).toBe(false);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('mantém a faixa pós-questionário até o fim e então retoma gameplay em loop', async () => {
    setBackgroundMusic('afterQuestionary');
    await Promise.resolve();
    const sound = FakeAudio.instances[0];
    expect(sound.src).toBe('/audio/musicafterquestionary.opus');
    expect(sound.loop).toBe(false);
    finishFade();

    setBackgroundMusic('gameplay');
    expect(sound.src).toBe('/audio/musicafterquestionary.opus');
    expect(sound.paused).toBe(false);

    sound.onended?.();
    finishFade();
    await Promise.resolve();
    expect(sound.src).toBe('/audio/musicgameplay.opus');
    expect(sound.loop).toBe(true);
  });

  it('toca a faixa de vitória uma única vez e para ao terminar', async () => {
    setBackgroundMusic('win');
    await Promise.resolve();
    const sound = FakeAudio.instances[0];
    expect(sound.src).toBe('/audio/musicwin.opus');
    expect(sound.loop).toBe(false);
    expect(sound.volume).toBe(0.035);

    sound.currentTime = 9;
    sound.ontimeupdate?.();
    finishFade();

    expect(sound.paused).toBe(true);
  });

  it('toca a faixa do questionário sem fade-in', async () => {
    setBackgroundMusic('question');
    await Promise.resolve();

    expect(FakeAudio.instances[0].volume).toBe(0.035);
    expect(requestedFrames).not.toHaveBeenCalled();
  });

  it('abaixa e restaura a faixa pós-questionário durante o efeito de resposta', async () => {
    setBackgroundMusic('afterQuestionary');
    await Promise.resolve();
    finishFade();

    setBackgroundMusicDucked(true);
    finishFade();
    expect(FakeAudio.instances[0].volume).toBe(0.008);

    setBackgroundMusicDucked(false);
    finishFade();
    expect(FakeAudio.instances[0].volume).toBe(0.035);
  });

  it('permite retomar uma faixa após bloqueio de autoplay', async () => {
    const play = vi
      .spyOn(FakeAudio.prototype, 'play')
      .mockImplementationOnce(() => {
        FakeAudio.instances[0].paused = false;
        return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      })
      .mockResolvedValue(undefined);
    setBackgroundMusic('question');
    await Promise.resolve();
    unlockBackgroundMusic();
    await Promise.resolve();

    expect(play).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances[0].src).toBe('/audio/musicquestionary.opus');
  });

  it('usa uma cópia MP3 compatível quando o navegador não decodifica Opus', async () => {
    const play = vi
      .spyOn(FakeAudio.prototype, 'play')
      .mockRejectedValueOnce(new DOMException('unsupported', 'NotSupportedError'))
      .mockResolvedValue(undefined);
    setBackgroundMusic('gameplay');
    expect(FakeAudio.instances[0].src).toBe('/audio/musicgameplay.opus');
    await Promise.resolve();
    await Promise.resolve();

    expect(play).toHaveBeenCalledTimes(2);
    expect(FakeAudio.instances[0].src).toBe('/audio/compat/musicgameplay.mp3');
    expect(FakeAudio.instances[0].loop).toBe(true);
  });

  it('mantém Opus como formato principal', async () => {
    setBackgroundMusic('menu');
    await Promise.resolve();
    expect(FakeAudio.instances[0].src).toBe('/audio/musicmenu.opus');
  });

  it('usa volume baixo de fundo em todas as trilhas', async () => {
    setBackgroundMusic('menu');
    await Promise.resolve();
    finishFade();

    expect(FakeAudio.instances[0].volume).toBe(0.035);
  });

  it('silencia e restaura a música sem trocar ou reiniciar a faixa', async () => {
    setBackgroundMusic('gameplay');
    await Promise.resolve();
    const sound = FakeAudio.instances[0];
    sound.currentTime = 18;

    setBackgroundMusicMuted(true);
    expect(sound.muted).toBe(true);
    expect(sound.currentTime).toBe(18);

    setBackgroundMusicMuted(false);
    expect(sound.muted).toBe(false);
    expect(sound.currentTime).toBe(18);
    expect(sound.src).toBe('/audio/musicgameplay.opus');
  });

  it('mantém a música silenciada ao trocar de fase', async () => {
    setBackgroundMusicMuted(true);
    setBackgroundMusic('question');
    await Promise.resolve();

    expect(FakeAudio.instances[0].muted).toBe(true);
    expect(FakeAudio.instances[0].src).toBe('/audio/musicquestionary.opus');
  });
});

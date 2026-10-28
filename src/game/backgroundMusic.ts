import type { Phase } from './store';

/** Um único elemento de áudio mantém todas as trilhas mutuamente exclusivas. */
export type MusicContext = 'menu' | 'gameplay' | 'question' | 'afterQuestionary' | 'win' | null;

const VOLUME = 0.035;
const FADE_MS = 1500;
const DUCKED_VOLUME = 0.008;
const SOURCES: Record<Exclude<MusicContext, null>, string> = {
  menu: '/audio/musicmenu.opus',
  gameplay: '/audio/musicgameplay.opus',
  question: '/audio/musicquestionary.opus',
  afterQuestionary: '/audio/musicafterquestionary.opus',
  win: '/audio/musicwin.opus',
};
// Downloaded only when a browser rejects Opus despite reporting support.
const COMPATIBILITY_SOURCES: Record<Exclude<MusicContext, null>, string> = {
  menu: '/audio/compat/musicmenu.mp3',
  gameplay: '/audio/compat/musicgameplay.mp3',
  question: '/audio/compat/musicquestionary.mp3',
  afterQuestionary: '/audio/compat/musicafterquestionary.mp3',
  win: '/audio/compat/musicwin.mp3',
};
const LOOPING_CONTEXTS = new Set<MusicContext>(['menu', 'gameplay', 'question']);
const compatibilityContexts = new Set<MusicContext>();

export function musicContextForPhase(
  sceneReady: boolean,
  phase: Phase,
  player: number,
  winner: number | null,
): MusicContext {
  if (!sceneReady) return null;
  if (phase === 'choose' || phase === 'confirm') return 'menu';
  if (phase === 'finished') return winner === null ? null : 'win';
  if (phase === 'question' && player === 0) return 'question';
  if (phase === 'feedback' && player === 0) return 'afterQuestionary';
  return 'gameplay';
}

let audio: HTMLAudioElement | null = null;
let desired: MusicContext = null;
let loaded: MusicContext = null;
let generation = 0;
let fadeHandle = 0;
let blocked = false;
let playbackConfirmed = false;
let deferredContext: MusicContext = null;
let musicDucked = false;
let musicMuted = false;
let winFadeStarted = false;

function notifyAudioBlocked(value: boolean) {
  if (blocked === value) return;
  blocked = value;
  window.dispatchEvent(new CustomEvent('senaquest:audio-blocked', { detail: value }));
}

export function isBackgroundMusicBlocked(): boolean {
  return blocked;
}

function cancelFade() {
  ++generation;
  if (fadeHandle) cancelAnimationFrame(fadeHandle);
  fadeHandle = 0;
}

function fadeTo(target: number, onComplete?: () => void, duration = FADE_MS) {
  if (!audio) {
    onComplete?.();
    return;
  }
  cancelFade();
  const sound = audio;
  const from = sound.volume;
  const started = performance.now();
  const token = generation;
  const tick = (now: number) => {
    if (token !== generation) return;
    const progress = Math.min(1, (now - started) / duration);
    sound.volume = from + (target - from) * progress;
    if (progress < 1) fadeHandle = requestAnimationFrame(tick);
    else {
      fadeHandle = 0;
      onComplete?.();
    }
  };
  fadeHandle = requestAnimationFrame(tick);
}

function stopImmediately() {
  cancelFade();
  playbackConfirmed = false;
  winFadeStarted = false;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = VOLUME;
  }
  loaded = null;
  notifyAudioBlocked(false);
}

function startCompatibilitySource(context: MusicContext): boolean {
  if (!context || compatibilityContexts.has(context) || !audio || desired !== context) {
    return false;
  }
  compatibilityContexts.add(context);
  cancelFade();
  loaded = null;
  startDesired();
  return true;
}

function startDesired() {
  if (!desired) return;
  const context = desired;
  winFadeStarted = false;
  if (!audio) {
    audio = new Audio();
    audio.onerror = () => {
      if (audio?.error?.code === 4) startCompatibilitySource(desired);
    };
    audio.onended = () => {
      if (desired === 'afterQuestionary') {
        desired = deferredContext ?? 'gameplay';
        deferredContext = null;
        stopImmediately();
        startDesired();
      } else if (desired === 'win') {
        desired = null;
        stopImmediately();
      }
    };
    audio.ontimeupdate = () => {
      if (
        desired !== 'win' ||
        winFadeStarted ||
        !audio ||
        !Number.isFinite(audio.duration) ||
        audio.duration - audio.currentTime > FADE_MS / 1000
      ) {
        return;
      }
      winFadeStarted = true;
      fadeTo(
        0,
        () => {
          desired = null;
          stopImmediately();
        },
        Math.max(100, (audio.duration - audio.currentTime) * 1000),
      );
    };
  }
  const sound = audio;
  sound.muted = musicMuted;
  if (loaded !== context) {
    sound.pause();
    sound.src = compatibilityContexts.has(context)
      ? COMPATIBILITY_SOURCES[context]
      : SOURCES[context];
    loaded = context;
  }
  sound.currentTime = 0;
  sound.loop = LOOPING_CONTEXTS.has(context);
  sound.preload = 'auto';
  const fadeIn = context !== 'question' && context !== 'win';
  sound.volume = fadeIn ? 0 : musicDucked ? DUCKED_VOLUME : VOLUME;
  const token = generation;
  playbackConfirmed = false;
  void sound
    .play()
    .then(() => {
      if (token !== generation || desired !== context) return;
      playbackConfirmed = true;
      notifyAudioBlocked(false);
      if (fadeIn) fadeTo(musicDucked ? DUCKED_VOLUME : VOLUME);
    })
    .catch((error: unknown) => {
      if (token !== generation || desired !== context) return;
      if ((error as { name?: string } | null)?.name === 'NotSupportedError') {
        if (startCompatibilitySource(context)) return;
      }
      if (
        (error instanceof DOMException && error.name === 'NotAllowedError') ||
        (error as { name?: string } | null)?.name === 'NotAllowedError'
      ) {
        notifyAudioBlocked(true);
      } else {
        console.warn('[SENAQUEST] Falha ao reproduzir música:', error);
      }
    });
}

export function setBackgroundMusic(context: MusicContext) {
  if (desired === 'afterQuestionary' && context === 'gameplay') {
    deferredContext = context;
    return;
  }
  if (desired === context) return;
  deferredContext = null;
  if (context === 'question' || desired === 'question') {
    desired = context;
    stopImmediately();
    if (context) startDesired();
    return;
  }
  if (context === 'win') {
    desired = context;
    cancelFade();
    const startWin = () => {
      if (desired !== 'win') return;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      loaded = null;
      startDesired();
    };
    if (!audio || audio.paused || blocked) {
      if (blocked) stopImmediately();
      startWin();
    } else {
      fadeTo(0, startWin);
    }
    return;
  }
  desired = context;
  cancelFade();
  if (!audio || audio.paused || blocked) {
    if (blocked) stopImmediately();
    if (context) startDesired();
    else stopImmediately();
    return;
  }

  const sound = audio;
  fadeTo(0, () => {
    sound.pause();
    sound.currentTime = 0;
    sound.volume = VOLUME;
    loaded = null;
    if (desired) startDesired();
  });
}

/** Repetir uma reprodução bloqueada somente após um gesto real do usuário. */
export function unlockBackgroundMusic() {
  if (!desired || (audio && playbackConfirmed && !audio.paused && !blocked)) return;
  if (blocked) stopImmediately();
  if (!audio || audio.paused) {
    startDesired();
    return;
  }

  cancelFade();
  const sound = audio;
  const context = desired;
  const token = generation;
  playbackConfirmed = false;
  void sound
    .play()
    .then(() => {
      if (token !== generation || desired !== context) return;
      playbackConfirmed = true;
      notifyAudioBlocked(false);
      fadeTo(musicDucked ? DUCKED_VOLUME : VOLUME);
    })
    .catch((error: unknown) => {
      if (token !== generation || desired !== context) return;
      if ((error as { name?: string } | null)?.name === 'NotSupportedError') {
        if (startCompatibilitySource(context)) return;
      }
      if (
        (error instanceof DOMException && error.name === 'NotAllowedError') ||
        (error as { name?: string } | null)?.name === 'NotAllowedError'
      ) {
        notifyAudioBlocked(true);
      } else {
        console.warn('[SENAQUEST] Falha ao reproduzir música:', error);
      }
    });
}

export function setBackgroundMusicDucked(ducked: boolean) {
  if (musicDucked === ducked) return;
  musicDucked = ducked;
  if (!audio || audio.paused || desired !== 'afterQuestionary') return;
  if (musicMuted) return;
  fadeTo(ducked ? DUCKED_VOLUME : VOLUME, undefined, 120);
}

export function setBackgroundMusicMuted(muted: boolean) {
  musicMuted = muted;
  if (audio) audio.muted = muted;
}

export function disposeBackgroundMusic() {
  desired = null;
  deferredContext = null;
  musicDucked = false;
  musicMuted = false;
  winFadeStarted = false;
  compatibilityContexts.clear();
  playbackConfirmed = false;
  stopImmediately();
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.ontimeupdate = null;
    audio.removeAttribute('src');
    audio.load();
    audio = null;
  }
}

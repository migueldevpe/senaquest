/** Música do questionário. Reproduz em loop apenas durante a fase 'question'. */
const FADE_MS = 1500;
const TARGET_VOLUME = 0.2;
let track: HTMLAudioElement | null = null;
let frame = 0;
let transition = 0;
let active = false;
let unlocked = false;

function getTrack(): HTMLAudioElement {
  if (!track) {
    track = new Audio('/audio/musicquestionary.opus');
    track.loop = true;
    track.preload = 'auto';
    track.volume = TARGET_VOLUME;
  }
  return track;
}

function fadeTo(target: number, stopAfter = false) {
  if (!track) return;
  cancelAnimationFrame(frame);
  const token = ++transition;
  const audio = track;
  const startVolume = audio.volume;
  const start = performance.now();
  function tick(now: number) {
    if (token !== transition) return;
    const progress = Math.min(1, (now - start) / FADE_MS);
    audio.volume = Math.max(0, Math.min(1, startVolume + (target - startVolume) * progress));
    if (progress < 1) frame = requestAnimationFrame(tick);
    else if (stopAfter && !active) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
  frame = requestAnimationFrame(tick);
}

export function setQuizMusicActive(next: boolean) {
  active = next;
  if (!next) {
    if (track && !track.paused) fadeTo(0, true);
    return;
  }
  if (!unlocked) return;
  const audio = getTrack();
  if (audio.paused) {
    ++transition;
    cancelAnimationFrame(frame);
    audio.volume = TARGET_VOLUME;
    void audio
      .play()
      .then(() => {
        if (active) audio.volume = TARGET_VOLUME;
        else {
          audio.pause();
          audio.currentTime = 0;
        }
      })
      .catch(() => {
        /* Autoplay bloqueado: aguardar gesto do usuário. */
      });
  } else {
    ++transition;
    cancelAnimationFrame(frame);
    audio.volume = TARGET_VOLUME;
  }
}

/** Chamar em um gesto real do usuário (clique/toque/seleção XR). */
export function unlockQuizMusic() {
  unlocked = true;
  if (active) setQuizMusicActive(true);
}

export function disposeQuizMusic() {
  active = false;
  ++transition;
  cancelAnimationFrame(frame);
  if (track) {
    track.pause();
    track.currentTime = 0;
    track = null;
  }
}

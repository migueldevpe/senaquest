/** Música do menu: entrada imediata, fade-out de 1,5 s na saída. */
const TARGET_VOLUME = 0.2;
let track: HTMLAudioElement | null = null;
let active = false;
let unlocked = false;
let fadeFrame = 0;
let fadeToken = 0;

function getTrack(): HTMLAudioElement {
  if (!track) {
    track = new Audio('/audio/musicmenu.opus');
    track.loop = true;
    track.preload = 'auto';
    track.volume = TARGET_VOLUME;
  }
  return track;
}

export function setMenuMusicActive(next: boolean) {
  active = next;
  if (!next) {
    if (track && !track.paused) {
      cancelAnimationFrame(fadeFrame);
      const token = ++fadeToken;
      const audio = track;
      const from = audio.volume;
      const started = performance.now();
      const tick = (now: number) => {
        if (token !== fadeToken) return;
        const t = Math.min(1, (now - started) / 1500);
        audio.volume = Math.max(0, from * (1 - t));
        if (t < 1) fadeFrame = requestAnimationFrame(tick);
        else if (!active) {
          audio.pause();
          audio.currentTime = 0;
        }
      };
      fadeFrame = requestAnimationFrame(tick);
    }
    return;
  }
  if (!unlocked) return;
  const audio = getTrack();
  ++fadeToken;
  cancelAnimationFrame(fadeFrame);
  audio.volume = TARGET_VOLUME;
  if (audio.paused) {
    void audio
      .play()
      .then(() => {
        if (!active) {
          audio.pause();
          audio.currentTime = 0;
        }
      })
      .catch(() => {
        /* Aguardar novo gesto se o navegador bloquear autoplay. */
      });
  }
}

/** Desbloqueio a partir de interação real (mouse, toque ou teclado). */
export function unlockMenuMusic() {
  unlocked = true;
  if (active) setMenuMusicActive(true);
}

export function disposeMenuMusic() {
  active = false;
  ++fadeToken;
  cancelAnimationFrame(fadeFrame);
  if (track) {
    track.pause();
    track.currentTime = 0;
    track = null;
  }
}

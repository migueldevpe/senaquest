/** Música do menu (seleção e confirmação de curso). Sem fade-in/out. */
const TARGET_VOLUME = 0.2;
let track: HTMLAudioElement | null = null;
let active = false;
let unlocked = false;

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
    if (track) {
      track.pause();
      track.currentTime = 0;
    }
    return;
  }
  if (!unlocked) return;
  const audio = getTrack();
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
  if (track) {
    track.pause();
    track.currentTime = 0;
    track = null;
  }
}

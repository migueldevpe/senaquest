/** Uma única trilha por cliente, inclusive no WebXR. Música a 20%.
 * Sempre TENTA tocar sem interação: o navegador decide se autoplay com som é
 * permitido. Se recusar (NotAllowedError), informa a UI e reintenta no gesto
 * seguinte; não é possível contornar a política de autoplay do Quest/Chrome.
 */
export type MusicContext = 'menu' | 'question' | null;
const VOLUME = 0.2;
const FADE_OUT_MS = 1500;
const SOURCES = {
  menu: '/audio/musicmenu.opus',
  question: '/audio/musicquestionary.opus',
} as const;

let audio: HTMLAudioElement | null = null;
let desired: MusicContext = null;
let loaded: MusicContext = null;
let generation = 0;
let fadeHandle = 0;
let blocked = false;

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

function stopImmediately() {
  cancelFade();
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = VOLUME;
  }
  notifyAudioBlocked(false);
}

function playDesired() {
  if (!desired) return;
  const context = desired;
  cancelFade();
  if (!audio) audio = new Audio();
  const sound = audio;
  sound.pause();
  if (loaded !== context) {
    sound.src = SOURCES[context];
    loaded = context;
  }
  sound.currentTime = 0;
  sound.loop = true;
  sound.preload = 'auto';
  sound.volume = VOLUME;
  const token = generation;
  // A tentativa ocorre imediatamente após o carregamento, sem guarda artificial
  // de "unlocked". Permissões do navegador continuam obrigatórias.
  void sound
    .play()
    .then(() => {
      if (token !== generation) return;
      notifyAudioBlocked(false);
      if (desired !== context) stopImmediately();
    })
    .catch((error: unknown) => {
      if (token !== generation || desired !== context) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        notifyAudioBlocked(true);
      } else if ((error as { name?: string } | null)?.name === 'NotAllowedError') {
        notifyAudioBlocked(true);
      } else {
        console.warn('[SENAQUEST] Falha ao reproduzir música:', error);
      }
    });
}

function fadeAndStop() {
  cancelFade();
  if (!audio || audio.paused) {
    stopImmediately();
    return;
  }
  const sound = audio;
  const token = generation;
  const fromVolume = sound.volume;
  const started = performance.now();
  const tick = (now: number) => {
    if (token !== generation) return;
    const t = Math.min(1, (now - started) / FADE_OUT_MS);
    sound.volume = Math.max(0, fromVolume * (1 - t));
    if (t < 1) fadeHandle = requestAnimationFrame(tick);
    else if (!desired) stopImmediately();
  };
  fadeHandle = requestAnimationFrame(tick);
}

export function setBackgroundMusic(context: MusicContext) {
  if (desired === context) {
    // Um "play" recusado só pode ser repetido após interação real.
    return;
  }
  // A música do questionário deve parar NO MESMO INSTANTE em que a
  // pergunta ativa termina, inclusive por timeout ou fase 'skipped'.
  // O fade normal de 1,5 s continua reservado às outras transições.
  const leavingQuestion = desired === 'question' && context !== 'question';
  desired = context;
  if (leavingQuestion) stopImmediately();
  if (!context) {
    if (!leavingQuestion) fadeAndStop();
  } else playDesired();
}

/** Chamar em pointerdown/keydown/select/squeeze para liberar autoplay bloqueado. */
export function unlockBackgroundMusic() {
  if (!desired) return;
  if (audio && loaded === desired && !audio.paused) return;
  playDesired();
}

export function disposeBackgroundMusic() {
  desired = null;
  stopImmediately();
  if (audio) {
    audio.removeAttribute('src');
    audio.load();
    audio = null;
  }
  loaded = null;
}

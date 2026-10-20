const SOUND_CONFIG = { defaultVolume: 0.35, gainScale: 0.075, minimumGain: 0.0001 } as const;
const SOUND_PRESETS: Record<Sound, [number, number, number, OscillatorType]> = {
  step: [310, 390, 0.1, 'triangle'],
  correct: [620, 890, 0.22, 'sine'],
  wrong: [260, 140, 0.24, 'triangle'],
  roll: [145, 95, 0.18, 'triangle'],
  victory: [640, 1080, 0.38, 'sine'],
  select: [520, 720, 0.1, 'sine'],
  hover: [490, 550, 0.055, 'sine'],
  countdown: [440, 380, 0.11, 'sine'],
  reveal: [360, 610, 0.26, 'sine'],
  move: [320, 470, 0.1, 'triangle'],
  turn: [500, 670, 0.18, 'sine'],
  finish: [670, 1040, 0.36, 'sine'],
};

let volume: number = SOUND_CONFIG.defaultVolume;
let audio: AudioContext | null = null;
type Sound =
  | 'step'
  | 'correct'
  | 'wrong'
  | 'roll'
  | 'victory'
  | 'select'
  | 'hover'
  | 'countdown'
  | 'reveal'
  | 'move'
  | 'turn'
  | 'finish';
export function setSoundVolume(next: number) {
  volume = Math.max(0, Math.min(1, next));
}
/** Sons sintéticos leves: nenhum download ou decodificação no Quest. */
export function playSound(type: Sound) {
  if (volume <= 0 || typeof window === 'undefined') return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const [start, end, duration, wave] = SOUND_PRESETS[type];
    const now = audio.currentTime;
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(
      Math.max(SOUND_CONFIG.minimumGain, volume * SOUND_CONFIG.gainScale),
      now,
    );
    gain.gain.exponentialRampToValueAtTime(SOUND_CONFIG.minimumGain, now + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    /* Navegador pode bloquear áudio até interação. */
  }
}

/**
 * Procedural Web Audio synthesizer for Overwatch Gacha.
 * Generates all sound effects dynamically — 0 external requests, 0 asset dependencies.
 */

let audioCtx = null;
const SOUND_KEY = 'ow-gacha:sound-enabled';

function getContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  try {
    const saved = localStorage.getItem(SOUND_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled));
  } catch {}
}

/** UI subtle mechanical click */
export function playClick() {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(950, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.025);

  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.025);
}

/** Fast roulette spin tick */
export function playTick() {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  const baseFreq = 420 + Math.random() * 120;
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

  gain.gain.setValueAtTime(0.035, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.03);
}

/** Heavy lock-in impact tone when a hero card lands */
export function playLand(role) {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Deep sub kick impact
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(160, now);
  sub.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  subGain.gain.setValueAtTime(0.25, now);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  sub.connect(subGain);
  subGain.connect(ctx.destination);
  sub.start();
  sub.stop(now + 0.16);

  // 2. Role resonant chord
  const roleFreqs = {
    tank: [220, 277.18],      // Deep solid chord (A3, C#4)
    damage: [370, 440],       // Aggressive sharp chord (F#4, A4)
    support: [440, 554.37],   // Crystalline bright chord (A4, C#5)
  };
  const freqs = roleFreqs[role] || [330, 392];

  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.22);
  });
}

/** Squad ready fanfare chord */
export function playFanfare() {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;

  const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 arpeggio
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1900, now);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(now + 0.45);
    }, idx * 65);
  });
}


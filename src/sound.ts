/**
 * Sounds, made on the spot with the Web Audio API: no files to download, works offline.
 * Everything is short and soft. Nothing plays until you have touched the page once
 * (browsers require that), and everything stops when the Sounds switch in Settings is off.
 */
type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;
let lastTap = 0;

export const soundSupported = (): boolean =>
  typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** Create or wake the audio engine. Call from a touch or click handler. */
export function unlockAudio(): void {
  ac();
}

function ac(): Ctx | null {
  if (!enabled || !soundSupported()) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts { type?: OscillatorType; gain?: number; to?: number; attack?: number }

/** One soft note: fast rise, smooth fall. `to` slides the pitch. */
function tone(c: Ctx, at: number, freq: number, dur: number, o: ToneOpts = {}): void {
  const { type = 'sine', gain = 0.16, to, attack = 0.006 } = o;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

interface NoiseOpts { gain?: number; type?: BiquadFilterType; freq?: number; to?: number; q?: number; attack?: number }

/** A burst of filtered noise: whooshes, crackle, clicks. */
function noise(c: Ctx, at: number, dur: number, o: NoiseOpts = {}): void {
  const { gain = 0.1, type = 'bandpass', freq = 1200, to, q = 0.8, attack = 0.01 } = o;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, at);
  if (to) f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at);
  src.stop(at + dur + 0.05);
}

/** Little fire pops: a few very short clicks at uneven times. */
function crackle(c: Ctx, at: number, span: number, count: number, gain = 0.07): void {
  for (let i = 0; i < count; i++) {
    const t = at + ((i * 0.6180339) % 1) * span;
    noise(c, t, 0.025 + (i % 3) * 0.01, { type: 'highpass', freq: 2500 + (i % 4) * 900, gain: gain * (0.5 + (i % 3) * 0.3), attack: 0.002 });
  }
}

const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

const SOUNDS = {
  tap: (c: Ctx, t: number) => tone(c, t, 540, 0.06, { to: 390, gain: 0.1 }),
  tab: (c: Ctx, t: number) => { tone(c, t, 660, 0.05, { gain: 0.09 }); tone(c, t + 0.045, 880, 0.07, { gain: 0.09 }); },
  plus: (c: Ctx, t: number) => tone(c, t, 620, 0.07, { type: 'triangle', to: 820, gain: 0.12 }),
  minus: (c: Ctx, t: number) => tone(c, t, 560, 0.07, { type: 'triangle', to: 400, gain: 0.12 }),
  on: (c: Ctx, t: number) => { tone(c, t, 520, 0.08, { gain: 0.11 }); tone(c, t + 0.07, 780, 0.12, { gain: 0.11 }); },
  off: (c: Ctx, t: number) => { tone(c, t, 700, 0.08, { gain: 0.1 }); tone(c, t + 0.07, 450, 0.12, { gain: 0.1 }); },
  open: (c: Ctx, t: number) => { noise(c, t, 0.2, { freq: 500, to: 1800, gain: 0.05, q: 1.2 }); tone(c, t, 420, 0.16, { to: 640, gain: 0.07 }); },
  close: (c: Ctx, t: number) => { noise(c, t, 0.16, { freq: 1600, to: 450, gain: 0.04, q: 1.2 }); tone(c, t, 600, 0.12, { to: 380, gain: 0.06 }); },
  delete: (c: Ctx, t: number) => { tone(c, t, 190, 0.16, { to: 80, gain: 0.22 }); noise(c, t, 0.05, { type: 'lowpass', freq: 800, gain: 0.08 }); },
  spark: (c: Ctx, t: number) => { tone(c, t, 700, 0.07, { to: 940, gain: 0.12 }); crackle(c, t, 0.08, 2, 0.05); },
  hold: (c: Ctx, t: number) => { tone(c, t, 150, 0.22, { to: 260, gain: 0.2 }); noise(c, t, 0.22, { freq: 300, to: 1400, gain: 0.07 }); },
  ignite: (c: Ctx, t: number) => {
    noise(c, t, 0.45, { freq: 400, to: 2400, gain: 0.08, q: 0.7 });
    [N.C5, N.E5, N.G5].forEach((f, i) => tone(c, t + 0.05 + i * 0.07, f, 0.45, { type: 'triangle', gain: 0.1 }));
    crackle(c, t + 0.1, 0.4, 6);
  },
  fed: (c: Ctx, t: number) => {
    [N.C5, N.E5, N.G5].forEach((f, i) => tone(c, t + i * 0.06, f, 0.5, { type: 'triangle', gain: 0.11 }));
    tone(c, t + 0.2, N.C6, 0.5, { gain: 0.06 });
    crackle(c, t, 0.35, 7);
  },
  levelUp: (c: Ctx, t: number) => {
    noise(c, t, 0.5, { freq: 300, to: 3000, gain: 0.07, q: 0.6 });
    [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(c, t + 0.05 + i * 0.075, f, 0.6, { type: 'triangle', gain: 0.1 }));
    tone(c, t + 0.45, N.G6, 0.9, { gain: 0.05 });
    tone(c, t + 0.45, N.C5, 1.0, { gain: 0.08 });
    crackle(c, t + 0.1, 0.9, 12, 0.06);
  },
  big: (c: Ctx, t: number) => {
    tone(c, t, 95, 0.45, { to: 55, gain: 0.3 });
    noise(c, t, 0.7, { freq: 250, to: 3500, gain: 0.08, q: 0.6 });
    [N.C5, N.G5, N.C6, N.E6].forEach((f, i) => tone(c, t + 0.08 + i * 0.09, f, 0.8, { type: 'triangle', gain: 0.1 }));
    tone(c, t + 0.5, N.G6, 1.1, { gain: 0.05 });
    crackle(c, t + 0.1, 1.1, 16, 0.06);
  },
  wood: (c: Ctx, t: number) => {
    tone(c, t, 170, 0.12, { to: 70, gain: 0.3 });
    noise(c, t, 0.06, { type: 'lowpass', freq: 900, gain: 0.12 });
    tone(c, t + 0.05, 520, 0.05, { to: 380, type: 'square', gain: 0.04 });
    crackle(c, t + 0.08, 0.3, 4, 0.05);
  },
  woodBurn: (c: Ctx, t: number) => {
    noise(c, t, 0.7, { freq: 300, to: 2200, gain: 0.07, q: 0.7 });
    tone(c, t, 120, 0.5, { to: 200, gain: 0.12 });
    crackle(c, t + 0.05, 1.0, 12, 0.06);
  },
  bell: (c: Ctx, t: number) => {
    for (const d of [0, 0.7]) {
      tone(c, t + d, 880, 1.3, { gain: 0.14, attack: 0.003 });
      tone(c, t + d, 1320, 0.9, { gain: 0.06, attack: 0.003 });
      tone(c, t + d, 2217, 0.5, { gain: 0.03, attack: 0.003 });
    }
  },
  error: (c: Ctx, t: number) => { tone(c, t, 230, 0.12, { type: 'square', gain: 0.07 }); tone(c, t + 0.14, 190, 0.18, { type: 'square', gain: 0.07 }); },
  heat3: (c: Ctx, t: number) => SOUNDS.ignite(c, t),
  heat2: (c: Ctx, t: number) => { tone(c, t, N.E5, 0.5, { gain: 0.1 }); tone(c, t + 0.08, N.A5, 0.6, { gain: 0.09 }); },
  heat1: (c: Ctx, t: number) => { tone(c, t, 210, 0.4, { to: 150, gain: 0.12 }); crackle(c, t, 0.4, 5, 0.06); },
  heat0: (c: Ctx, t: number) => { tone(c, t, 1480, 1.0, { gain: 0.07 }); tone(c, t + 0.09, 1976, 0.8, { gain: 0.05 }); },
} as const;

export type SoundName = keyof typeof SOUNDS;

export function play(name: SoundName): void {
  const c = ac();
  if (!c || !master) return;
  const now = performance.now();
  if (name === 'tap' || name === 'tab' || name === 'plus' || name === 'minus') {
    if (now - lastTap < 35) return;
    lastTap = now;
  }
  try {
    SOUNDS[name](c, c.currentTime + 0.005);
  } catch {
    /* a sound failing must never break the app */
  }
}

export const playHeat = (level: 0 | 1 | 2 | 3) => play(`heat${level}` as SoundName);

/** Which sound a pressed element makes. */
export function soundForPress(el: Element): SoundName {
  if (el.closest('.stepper-btn.plus')) return 'plus';
  if (el.closest('.stepper-btn.minus')) return 'minus';
  if (el.closest('.tabbar, [role="tab"], .tab, .seg-item')) return 'tab';
  return 'tap';
}

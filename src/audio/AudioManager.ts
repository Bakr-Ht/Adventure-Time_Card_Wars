import { settings } from '../settings';

export type SoundEvent =
  | 'cardDraw'
  | 'cardPlay'
  | 'attack'
  | 'hit'
  | 'damage'
  | 'destroy'
  | 'floop'
  | 'spell'
  | 'turnStart'
  | 'victory'
  | 'defeat'
  | 'uiClick'
  | 'invalid';

interface Tone {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
  noise?: boolean;
  delay?: number;
}

/**
 * Placeholder sounds are synthesised on the fly so the game ships with no
 * third-party audio. `registerSample` swaps any event for a real file later.
 */
const RECIPES: Record<SoundEvent, Tone[]> = {
  cardDraw: [{ type: 'triangle', from: 520, to: 780, duration: 0.08, gain: 0.18 }],
  cardPlay: [{ type: 'square', from: 220, to: 330, duration: 0.1, gain: 0.12 }, { type: 'triangle', from: 440, to: 660, duration: 0.12, gain: 0.14, delay: 0.06 }],
  attack: [{ type: 'sawtooth', from: 300, to: 120, duration: 0.14, gain: 0.1 }],
  hit: [{ type: 'square', from: 160, to: 60, duration: 0.12, gain: 0.16, noise: true }],
  damage: [{ type: 'sawtooth', from: 200, to: 90, duration: 0.22, gain: 0.14 }],
  destroy: [{ type: 'square', from: 400, to: 40, duration: 0.35, gain: 0.14, noise: true }],
  floop: [{ type: 'sine', from: 300, to: 900, duration: 0.18, gain: 0.18 }, { type: 'sine', from: 900, to: 600, duration: 0.12, gain: 0.12, delay: 0.16 }],
  spell: [{ type: 'triangle', from: 660, to: 1320, duration: 0.25, gain: 0.14 }, { type: 'sine', from: 990, to: 1480, duration: 0.2, gain: 0.1, delay: 0.1 }],
  turnStart: [{ type: 'triangle', from: 392, to: 392, duration: 0.1, gain: 0.14 }, { type: 'triangle', from: 523, to: 523, duration: 0.14, gain: 0.14, delay: 0.1 }],
  victory: [523, 659, 784, 1046].map((f, i) => ({ type: 'triangle' as const, from: f, to: f, duration: 0.2, gain: 0.16, delay: i * 0.14 })),
  defeat: [392, 330, 262, 196].map((f, i) => ({ type: 'sine' as const, from: f, to: f * 0.97, duration: 0.26, gain: 0.16, delay: i * 0.18 })),
  uiClick: [{ type: 'triangle', from: 700, to: 900, duration: 0.05, gain: 0.1 }],
  invalid: [{ type: 'square', from: 180, to: 150, duration: 0.12, gain: 0.08 }, { type: 'square', from: 150, to: 120, duration: 0.12, gain: 0.08, delay: 0.12 }],
};

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private samples = new Map<SoundEvent, AudioBuffer>();
  private pendingSamples = new Map<SoundEvent, string>();
  private noiseBuffer: AudioBuffer | null = null;

  /** Browsers only allow audio after a user gesture; call from any input handler. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      for (const [event, url] of this.pendingSamples) void this.loadSample(event, url);
      this.pendingSamples.clear();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Replace a synthesised placeholder with a real audio file. */
  registerSample(event: SoundEvent, url: string): void {
    if (this.ctx) void this.loadSample(event, url);
    else this.pendingSamples.set(event, url);
  }

  private async loadSample(event: SoundEvent, url: string): Promise<void> {
    try {
      const data = await (await fetch(url)).arrayBuffer();
      this.samples.set(event, await this.ctx!.decodeAudioData(data));
    } catch {
      // Missing sample: keep the synthesised placeholder.
    }
  }

  play(event: SoundEvent): void {
    const { muted, volume } = settings.get();
    if (muted || volume <= 0 || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    const sample = this.samples.get(event);
    if (sample) {
      const src = ctx.createBufferSource();
      src.buffer = sample;
      src.connect(master);
      src.start();
      return;
    }
    for (const tone of RECIPES[event]) this.playTone(ctx, master, tone);
  }

  private playTone(ctx: AudioContext, out: AudioNode, t: Tone): void {
    const start = ctx.currentTime + (t.delay ?? 0);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(t.gain, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + t.duration);
    env.connect(out);

    const osc = ctx.createOscillator();
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), start + t.duration);
    osc.connect(env);
    osc.start(start);
    osc.stop(start + t.duration + 0.02);

    if (t.noise) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noise(ctx);
      const ng = ctx.createGain();
      ng.gain.value = 0.5;
      noise.connect(ng).connect(env);
      noise.start(start);
      noise.stop(start + t.duration);
    }
  }

  private noise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }
}

export const AudioManager = new AudioManagerImpl();

import { readString, writeString } from './storage';

const MUTE_KEY = 'muted';

export interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  delay?: number;
  slideTo?: number;
  detune?: number;
}

export interface NoiseOptions {
  gain?: number;
  filter?: BiquadFilterType;
  frequency?: number;
  delay?: number;
}

const MASTER_VOLUME = 0.4;

export class AudioKit {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private mutedState: boolean;

  constructor() {
    this.mutedState = readString(MUTE_KEY) === '1';
  }

  get muted(): boolean {
    return this.mutedState;
  }

  get ready(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  /** Debe llamarse dentro de un gesto del usuario. */
  async unlock(): Promise<void> {
    if (!this.context) {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;

      this.context = new Context();
      this.master = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 24;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.2;
      this.master.gain.value = this.mutedState ? 0 : MASTER_VOLUME;
      this.master.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        // Algunos navegadores requieren otro gesto; se reintenta en el siguiente.
      }
    }
  }

  setMuted(muted: boolean): void {
    this.mutedState = muted;
    writeString(MUTE_KEY, muted ? '1' : '0');
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.context.currentTime, 0.02);
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.mutedState);
    return this.mutedState;
  }

  tone(frequency: number, duration = 0.16, options: ToneOptions = {}): void {
    const context = this.context;
    if (!context || !this.master || this.mutedState) return;
    if (!Number.isFinite(frequency) || frequency <= 0) return;

    const {
      type = 'sine',
      gain = 0.14,
      attack = 0.006,
      release = 0.08,
      delay = 0,
      slideTo,
      detune = 0,
    } = options;

    const start = context.currentTime + Math.max(0, delay);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.value = detune;
    if (slideTo && slideTo > 0) {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(duration, attack + 0.02));

    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + release);
  }

  chord(frequencies: number[], duration = 0.3, options: ToneOptions = {}): void {
    const gain = (options.gain ?? 0.12) / Math.max(1, frequencies.length * 0.7);
    frequencies.forEach((frequency, index) => {
      this.tone(frequency, duration, {
        ...options,
        gain,
        delay: (options.delay ?? 0) + index * 0.012,
      });
    });
  }

  noise(duration = 0.2, options: NoiseOptions = {}): void {
    const context = this.context;
    if (!context || !this.master || this.mutedState) return;

    const { gain = 0.12, filter = 'lowpass', frequency = 900, delay = 0 } = options;
    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.7);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    const start = context.currentTime + Math.max(0, delay);
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const biquad = context.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.value = frequency;
    biquad.Q.value = 0.7;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(biquad);
    biquad.connect(envelope);
    envelope.connect(this.master);
    source.start(start);
    source.stop(start + duration);
  }

  click(): void {
    this.tone(880, 0.05, { type: 'triangle', gain: 0.05 });
  }

  destroy(): void {
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
  }
}

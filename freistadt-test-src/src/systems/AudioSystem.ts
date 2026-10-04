export type RadioChannel = 'off' | 'frei-fm' | 'westend-radio';

export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private radioGain: GainNode | null = null;
  private radioSource: AudioBufferSourceNode | null = null;
  private channel: RadioChannel = 'off';
  private enabled = true;

  getChannel(): RadioChannel {
    return this.channel;
  }

  getChannelLabel(): string {
    if (this.channel === 'frei-fm') return 'FREI FM';
    if (this.channel === 'westend-radio') return 'WESTEND RADIO';
    return 'RADIO AUS';
  }

  async unlock(): Promise<void> {
    if (!this.enabled) return;

    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        this.enabled = false;
        return;
      }

      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.context.destination);

      this.engineGain = this.context.createGain();
      this.engineGain.gain.value = 0;
      this.engineGain.connect(this.master);

      this.engineOscillator = this.context.createOscillator();
      this.engineOscillator.type = 'sawtooth';
      this.engineOscillator.frequency.value = 55;
      this.engineOscillator.connect(this.engineGain);
      this.engineOscillator.start();

      this.radioGain = this.context.createGain();
      this.radioGain.gain.value = 0.055;
      this.radioGain.connect(this.master);
    }

    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        // Browsers may still require a later user gesture.
      }
    }
  }

  updateEngine(speedRatio: number, driving: boolean): void {
    if (!this.context || !this.engineGain || !this.engineOscillator) return;

    const safeRatio = Math.max(0, Math.min(1, Number.isFinite(speedRatio) ? speedRatio : 0));
    const now = this.context.currentTime;
    const targetFrequency = 52 + safeRatio * 125;
    const targetGain = driving ? 0.014 + safeRatio * 0.035 : 0;

    this.engineOscillator.frequency.cancelScheduledValues(now);
    this.engineOscillator.frequency.linearRampToValueAtTime(targetFrequency, now + 0.08);
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.linearRampToValueAtTime(targetGain, now + 0.08);
  }

  async cycleRadio(): Promise<RadioChannel> {
    await this.unlock();
    const next: RadioChannel = this.channel === 'off'
      ? 'frei-fm'
      : this.channel === 'frei-fm'
        ? 'westend-radio'
        : 'off';

    this.setRadio(next);
    return this.channel;
  }

  setRadio(channel: RadioChannel): void {
    this.channel = channel;
    this.stopRadioSource();
    if (!this.context || !this.radioGain || channel === 'off') return;

    const buffer = this.makeRadioBuffer(channel);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.radioGain);
    source.start();
    this.radioSource = source;
  }

  dispose(): void {
    this.stopRadioSource();
    try {
      this.engineOscillator?.stop();
    } catch {
      // already stopped
    }
    this.engineOscillator = null;
    if (this.context) {
      void this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.master = null;
    this.engineGain = null;
    this.radioGain = null;
  }

  private stopRadioSource(): void {
    if (!this.radioSource) return;
    try {
      this.radioSource.stop();
    } catch {
      // already stopped
    }
    this.radioSource.disconnect();
    this.radioSource = null;
  }

  private makeRadioBuffer(channel: Exclude<RadioChannel, 'off'>): AudioBuffer {
    if (!this.context) throw new Error('AudioContext unavailable');

    const sampleRate = this.context.sampleRate;
    const duration = 8;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.context.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    const notes = channel === 'frei-fm'
      ? [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 349.23]
      : [110.0, 146.83, 164.81, 196.0, 164.81, 146.83, 123.47, 164.81];

    const stepDuration = duration / notes.length;

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const step = Math.min(notes.length - 1, Math.floor(t / stepDuration));
      const local = (t % stepDuration) / stepDuration;
      const envelope = Math.sin(Math.PI * Math.min(1, local * 1.7)) * Math.min(1, (1 - local) * 3.2);
      const base = notes[step];
      const melody = Math.sin(2 * Math.PI * base * t) * 0.20;
      const harmony = Math.sin(2 * Math.PI * base * 1.5 * t) * 0.08;
      const pulse = channel === 'westend-radio'
        ? Math.sin(2 * Math.PI * 2 * t) > 0.45 ? 0.06 * Math.sin(2 * Math.PI * 55 * t) : 0
        : 0.025 * Math.sin(2 * Math.PI * 0.5 * t);

      data[i] = (melody + harmony + pulse) * envelope;
    }

    return buffer;
  }
}

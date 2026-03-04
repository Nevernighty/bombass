// Web Audio API engine for procedural game audio
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicOsc: OscillatorNode[] = [];
  private sirenOsc: OscillatorNode | null = null;
  private isPlaying = false;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    this.ctx?.resume();
  }

  playClick() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSuccess() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx!.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + i * 0.1 + 0.2);
    });
  }

  playExplosion() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  startSiren() {
    if (!this.ctx || !this.masterGain || this.sirenOsc) return;
    this.sirenOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    this.sirenOsc.type = 'sawtooth';
    gain.gain.value = 0.12;
    this.sirenOsc.connect(gain);
    gain.connect(this.masterGain);
    this.sirenOsc.start();
    // Modulate siren frequency
    const modulate = () => {
      if (!this.sirenOsc || !this.ctx) return;
      const t = this.ctx.currentTime;
      this.sirenOsc.frequency.setValueAtTime(440, t);
      this.sirenOsc.frequency.linearRampToValueAtTime(880, t + 2);
      this.sirenOsc.frequency.linearRampToValueAtTime(440, t + 4);
      if (this.sirenOsc) setTimeout(modulate, 4000);
    };
    modulate();
  }

  stopSiren() {
    if (this.sirenOsc) {
      this.sirenOsc.stop();
      this.sirenOsc = null;
    }
  }

  playAllClear() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [392, 440, 523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx!.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(this.ctx!.currentTime + i * 0.15);
      osc.stop(this.ctx!.currentTime + i * 0.15 + 0.4);
    });
  }

  startAmbientMusic(stress: number = 0) {
    if (!this.ctx || !this.masterGain || this.isPlaying) return;
    this.isPlaying = true;
    const baseNotes = [130.81, 164.81, 196.00, 220.00];
    baseNotes.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      this.musicOsc.push(osc);
    });
  }

  stopMusic() {
    this.musicOsc.forEach(o => { try { o.stop(); } catch {} });
    this.musicOsc = [];
    this.isPlaying = false;
  }

  playDroneHum() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 80 + Math.random() * 20;
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  playIntercept() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  destroy() {
    this.stopMusic();
    this.stopSiren();
    this.ctx?.close();
    this.ctx = null;
  }
}

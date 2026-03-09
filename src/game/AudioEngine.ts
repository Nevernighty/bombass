// Web Audio API engine for procedural game audio
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicOsc: OscillatorNode[] = [];
  private sirenNodes: AudioNode[] = [];
  private sirenGain: GainNode | null = null;
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
    // Low boom
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    // Sub-bass thump
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, this.ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start();
    sub.stop(this.ctx.currentTime + 0.6);
  }

  startSiren() {
    if (!this.ctx || !this.masterGain || this.sirenNodes.length > 0) return;
    const t = this.ctx.currentTime;

    // Main gain
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.08;
    this.sirenGain.connect(this.masterGain);

    // Primary siren - sawtooth
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';

    // Secondary siren - square, 1 octave up
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.value = 0.03;

    // FM modulator for warble
    const fmOsc = this.ctx.createOscillator();
    fmOsc.type = 'sine';
    fmOsc.frequency.value = 4;
    const fmGain = this.ctx.createGain();
    fmGain.gain.value = 250;
    fmOsc.connect(fmGain);
    fmGain.connect(osc1.frequency);

    // FM for second oscillator
    const fmGain2 = this.ctx.createGain();
    fmGain2.gain.value = 180;
    fmOsc.connect(fmGain2);
    fmGain2.connect(osc2.frequency);

    // Amplitude tremolo
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenGain.gain);

    // Bandpass filter sweep
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.value = 2;

    // Low rumble
    const rumble = this.ctx.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 50;
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.value = 0.06;
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);

    // High harmonic
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'sine';
    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.value = 0.015;

    // Connections
    osc1.connect(bandpass);
    bandpass.connect(this.sirenGain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(this.sirenGain);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(this.sirenGain);

    // Start all
    [osc1, osc2, fmOsc, lfo, rumble, harmonic].forEach(o => o.start(t));
    this.sirenNodes = [osc1, osc2, fmOsc, lfo, rumble, harmonic];

    // Sweep frequency in loop
    const modulate = () => {
      if (!this.ctx || this.sirenNodes.length === 0) return;
      const now = this.ctx.currentTime;
      // Primary sweep 380 → 780 → 380
      osc1.frequency.setValueAtTime(380, now);
      osc1.frequency.linearRampToValueAtTime(780, now + 2.5);
      osc1.frequency.linearRampToValueAtTime(380, now + 5);
      // Secondary 1 octave up
      osc2.frequency.setValueAtTime(760, now);
      osc2.frequency.linearRampToValueAtTime(1560, now + 2.5);
      osc2.frequency.linearRampToValueAtTime(760, now + 5);
      // Harmonic 
      harmonic.frequency.setValueAtTime(1140, now);
      harmonic.frequency.linearRampToValueAtTime(2340, now + 2.5);
      harmonic.frequency.linearRampToValueAtTime(1140, now + 5);
      // Filter sweep
      bandpass.frequency.setValueAtTime(500, now);
      bandpass.frequency.linearRampToValueAtTime(1200, now + 2.5);
      bandpass.frequency.linearRampToValueAtTime(500, now + 5);

      if (this.sirenNodes.length > 0) setTimeout(modulate, 5000);
    };
    modulate();
  }

  stopSiren() {
    this.sirenNodes.forEach(n => { try { (n as OscillatorNode).stop(); } catch {} });
    this.sirenNodes = [];
    this.sirenGain = null;
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
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    osc.connect(filter);
    filter.connect(gain);
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

    // Metallic ping
    const ping = this.ctx.createOscillator();
    ping.type = 'sine';
    ping.frequency.value = 2400;
    const pingGain = this.ctx.createGain();
    pingGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    pingGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    ping.connect(pingGain);
    pingGain.connect(this.masterGain);
    ping.start();
    ping.stop(this.ctx.currentTime + 0.15);
  }

  playHover() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playStationArrive() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 660;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
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

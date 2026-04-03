// Web Audio API engine for procedural game audio with adaptive music
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicOsc: OscillatorNode[] = [];
  private sirenNodes: AudioNode[] = [];
  private sirenGain: GainNode | null = null;
  private isPlaying = false;
  
  // Adaptive music layers
  private layer1Oscs: OscillatorNode[] = [];
  private layer2Oscs: OscillatorNode[] = [];
  private layer3Oscs: OscillatorNode[] = [];
  private layer4Oscs: OscillatorNode[] = [];
  private layer1Gain: GainNode | null = null;
  private layer2Gain: GainNode | null = null;
  private layer3Gain: GainNode | null = null;
  private layer4Gain: GainNode | null = null;
  
  // Heartbeat
  private heartbeatInterval: number | null = null;

  private _sfxEnabled = true;
  private _musicEnabled = true;

  set sfxEnabled(v: boolean) { this._sfxEnabled = v; }
  set musicEnabled(v: boolean) {
    this._musicEnabled = v;
    if (this.musicGain) this.musicGain.gain.value = v ? 0.3 : 0;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.masterGain);
    
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this._musicEnabled ? 0.3 : 0;
    this.musicGain.connect(this.masterGain);
  }

  resume() { this.ctx?.resume(); }
  
  private get sfx() { return this.sfxGain || this.masterGain; }

  playClick() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSuccess() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
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
      gain.connect(this.sfx!);
      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + i * 0.1 + 0.2);
    });
  }

  playExplosion() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
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
    gain.connect(this.sfx!);
    source.start();

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, this.ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    sub.connect(subGain);
    subGain.connect(this.sfx!);
    sub.start();
    sub.stop(this.ctx.currentTime + 0.6);
    
    // Haptic
    this.vibrate(100);
  }

  startSiren() {
    if (!this.ctx || !this.sfx || this.sirenNodes.length > 0 || !this._sfxEnabled) return;
    const t = this.ctx.currentTime;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.08;
    this.sirenGain.connect(this.sfx!);
    const osc1 = this.ctx.createOscillator(); osc1.type = 'sawtooth';
    const osc2 = this.ctx.createOscillator(); osc2.type = 'square';
    const osc2Gain = this.ctx.createGain(); osc2Gain.gain.value = 0.03;
    const fmOsc = this.ctx.createOscillator(); fmOsc.type = 'sine'; fmOsc.frequency.value = 4;
    const fmGain = this.ctx.createGain(); fmGain.gain.value = 250;
    fmOsc.connect(fmGain); fmGain.connect(osc1.frequency);
    const fmGain2 = this.ctx.createGain(); fmGain2.gain.value = 180;
    fmOsc.connect(fmGain2); fmGain2.connect(osc2.frequency);
    const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.3;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain); lfoGain.connect(this.sirenGain.gain);
    const bandpass = this.ctx.createBiquadFilter(); bandpass.type = 'bandpass'; bandpass.Q.value = 2;
    const rumble = this.ctx.createOscillator(); rumble.type = 'sine'; rumble.frequency.value = 50;
    const rumbleGain = this.ctx.createGain(); rumbleGain.gain.value = 0.06;
    rumble.connect(rumbleGain); rumbleGain.connect(this.sfx!);
    const harmonic = this.ctx.createOscillator(); harmonic.type = 'sine';
    const harmonicGain = this.ctx.createGain(); harmonicGain.gain.value = 0.015;
    osc1.connect(bandpass); bandpass.connect(this.sirenGain);
    osc2.connect(osc2Gain); osc2Gain.connect(this.sirenGain);
    harmonic.connect(harmonicGain); harmonicGain.connect(this.sirenGain);
    [osc1, osc2, fmOsc, lfo, rumble, harmonic].forEach(o => o.start(t));
    this.sirenNodes = [osc1, osc2, fmOsc, lfo, rumble, harmonic];
    const modulate = () => {
      if (!this.ctx || this.sirenNodes.length === 0) return;
      const now = this.ctx.currentTime;
      osc1.frequency.setValueAtTime(380, now);
      osc1.frequency.linearRampToValueAtTime(780, now + 2.5);
      osc1.frequency.linearRampToValueAtTime(380, now + 5);
      osc2.frequency.setValueAtTime(760, now);
      osc2.frequency.linearRampToValueAtTime(1560, now + 2.5);
      osc2.frequency.linearRampToValueAtTime(760, now + 5);
      harmonic.frequency.setValueAtTime(1140, now);
      harmonic.frequency.linearRampToValueAtTime(2340, now + 2.5);
      harmonic.frequency.linearRampToValueAtTime(1140, now + 5);
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
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
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
      gain.connect(this.sfx!);
      osc.start(this.ctx!.currentTime + i * 0.15);
      osc.stop(this.ctx!.currentTime + i * 0.15 + 0.4);
    });
  }

  // === ADAPTIVE MUSIC ===
  startAmbientMusic() {
    if (!this.ctx || !this.musicGain || this.isPlaying) return;
    this.isPlaying = true;
    
    // Layer 1: Always-on pad
    this.layer1Gain = this.ctx.createGain();
    this.layer1Gain.gain.value = 0.04;
    this.layer1Gain.connect(this.musicGain);
    [130.81, 164.81, 196.00, 220.00].forEach(freq => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(this.layer1Gain!);
      osc.start();
      this.layer1Oscs.push(osc);
    });
    
    // Layer 2: Rhythmic bass pulse (fades in with station count)
    this.layer2Gain = this.ctx.createGain();
    this.layer2Gain.gain.value = 0;
    this.layer2Gain.connect(this.musicGain);
    const bass = this.ctx.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 55;
    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 120;
    bass.connect(bassFilter);
    bassFilter.connect(this.layer2Gain);
    bass.start();
    this.layer2Oscs.push(bass);
    
    // Layer 3: Tense strings (air raid)
    this.layer3Gain = this.ctx.createGain();
    this.layer3Gain.gain.value = 0;
    this.layer3Gain.connect(this.musicGain);
    [440, 554, 659].forEach(freq => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 5;
      osc.connect(filter);
      filter.connect(this.layer3Gain!);
      osc.start();
      this.layer3Oscs.push(osc);
    });
    
    // Layer 4: Upbeat arpeggios (combo)
    this.layer4Gain = this.ctx.createGain();
    this.layer4Gain.gain.value = 0;
    this.layer4Gain.connect(this.musicGain);
    const arp = this.ctx.createOscillator();
    arp.type = 'triangle';
    arp.frequency.value = 523;
    arp.connect(this.layer4Gain);
    arp.start();
    this.layer4Oscs.push(arp);
  }
  
  // Call each frame to adjust music layers
  updateMusicLayers(activeStations: number, isAirRaid: boolean, combo: number, isNight: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Layer 1: shift chord for night
    if (this.layer1Gain) {
      const targetVol = isNight ? 0.025 : 0.04;
      this.layer1Gain.gain.linearRampToValueAtTime(targetVol, t + 0.5);
    }
    
    // Layer 2: rhythmic bass fades in with 8+ stations
    if (this.layer2Gain) {
      const target = activeStations >= 8 ? 0.03 : 0;
      this.layer2Gain.gain.linearRampToValueAtTime(target, t + 1);
    }
    
    // Layer 3: tense strings during air raid
    if (this.layer3Gain) {
      const target = isAirRaid ? 0.015 : 0;
      this.layer3Gain.gain.linearRampToValueAtTime(target, t + 0.3);
    }
    
    // Layer 4: arpeggios when combo > 3
    if (this.layer4Gain) {
      const target = combo > 3 ? 0.02 : 0;
      this.layer4Gain.gain.linearRampToValueAtTime(target, t + 0.5);
    }
  }

  stopMusic() {
    [this.layer1Oscs, this.layer2Oscs, this.layer3Oscs, this.layer4Oscs, this.musicOsc].forEach(arr => {
      arr.forEach(o => { try { o.stop(); } catch {} });
      arr.length = 0;
    });
    this.isPlaying = false;
  }

  // === NEW SFX ===
  
  playCashRegister() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    // Metallic ring
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 2000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
    // Coin drop
    setTimeout(() => {
      if (!this.ctx || !this.sfx) return;
      const o2 = this.ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(3500, this.ctx.currentTime);
      o2.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.08);
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.1, this.ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      o2.connect(g2);
      g2.connect(this.sfx!);
      o2.start();
      o2.stop(this.ctx.currentTime + 0.1);
    }, 60);
  }
  
  playComboBreak() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    // Glass shatter noise burst
    const bufSize = this.ctx.sampleRate * 0.3;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.03));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.sfx!);
    src.start();
    // Descending tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.4);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.12, this.ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(og);
    og.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
  
  playFeverMode() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    // Rising synth sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.6);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(500, this.ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 0.6);
    osc.connect(f);
    f.connect(g);
    g.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
    this.vibrate(200);
  }
  
  playMilestone() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    // 3-note brass fanfare
    const notes = [392, 523, 784];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.15);
      g.gain.linearRampToValueAtTime(0.12, this.ctx!.currentTime + i * 0.15 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.15 + 0.5);
      const f = this.ctx!.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1500;
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfx!);
      osc.start(this.ctx!.currentTime + i * 0.15);
      osc.stop(this.ctx!.currentTime + i * 0.15 + 0.5);
    });
    this.vibrate(150);
  }
  
  playStationOverflow() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    // Urgent staccato beeps
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.1, this.ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.06);
      osc.connect(g);
      g.connect(this.sfx!);
      osc.start(this.ctx.currentTime + i * 0.12);
      osc.stop(this.ctx.currentTime + i * 0.12 + 0.06);
    }
  }
  
  startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
      // Low thump
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(g);
      g.connect(this.sfx!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
      this.vibrate(50);
    }, 1000);
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  playDroneHum() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
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
    gain.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  playIntercept() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
    const ping = this.ctx.createOscillator();
    ping.type = 'sine';
    ping.frequency.value = 2400;
    const pingGain = this.ctx.createGain();
    pingGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    pingGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    ping.connect(pingGain);
    pingGain.connect(this.sfx!);
    ping.start();
    ping.stop(this.ctx.currentTime + 0.15);
  }

  playHover() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playStationArrive() {
    if (!this.ctx || !this.sfx || !this._sfxEnabled) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 660;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfx!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
  
  // Haptic feedback
  vibrate(ms: number) {
    try { navigator?.vibrate?.(ms); } catch {}
  }

  destroy() {
    this.stopMusic();
    this.stopSiren();
    this.stopHeartbeat();
    this.ctx?.close();
    this.ctx = null;
  }
}

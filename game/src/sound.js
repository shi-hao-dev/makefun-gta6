// Sound: everything procedural through WebAudio — an engine hum that follows
// speed, a two-tone siren when the heat is on, gunshots, crashes, pickups and
// UI blips. The context only starts on a player gesture, and M mutes it all.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenFlip = 0;
    this.started = false;
  }

  /** Create the context and the looping voices. Call from a user gesture. */
  start() {
    if (this.started) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();

      this.started = true;
    } catch {
      // Audio is a garnish: the game runs fine without it.
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** A short blip. freq in Hz, dur in seconds, kind 'sine' | 'square' | 'triangle'. */
  blip(freq, dur, kind = 'sine', vol = 0.3) {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = kind;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch { /* ignore */ }
  }

  /** A burst of filtered noise — a gunshot or a crash. */
  noise(dur, vol, freq = 900) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start();
    } catch { /* ignore */ }
  }

  click() { this.blip(660, 0.07, 'square', 0.18); }
  shot() { this.noise(0.14, 0.5, 2400); }
  crash(v) { this.noise(0.25, 0.3 + v * 0.4, 320); }
  pickup() { this.blip(880, 0.08, 'sine', 0.3); this.blip(1320, 0.12, 'sine', 0.25); }
  done() { this.blip(523, 0.12, 'triangle', 0.3); this.blip(659, 0.12, 'triangle', 0.3); this.blip(784, 0.22, 'triangle', 0.3); }
  bust() { this.blip(392, 0.18, 'sawtooth', 0.25); this.blip(311, 0.3, 'sawtooth', 0.25); }

  /** Engine pitch by speed, siren wail while wanted. Called every step. */
  tick(speedNorm, inCar, wanted, dt) {
    if (!this.ctx || !this.started) return;
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 55 + speedNorm * 130;
      this.engineGain.gain.value = inCar ? 0.05 + speedNorm * 0.06 : 0;
    }
    if (this.sirenOsc) {
      if (wanted > 0 && !this.muted) {
        this.sirenFlip += dt;
        const high = Math.floor(this.sirenFlip * 1.6) % 2 === 0;
        this.sirenOsc.frequency.value = high ? 720 : 540;
        this.sirenGain.gain.value = 0.045;
      } else {
        this.sirenGain.gain.value = 0;
      }
    }
  }
}

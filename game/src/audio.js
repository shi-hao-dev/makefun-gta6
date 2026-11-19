// Procedural sound: no audio files, everything is oscillators and filtered noise through one
// WebAudio graph. It starts on the first click or keypress, as browsers require, and M mutes it.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
    this.noiseBuf = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Shared noise buffer for shots, crashes and skids.
    const len = this.ctx.sampleRate * 1;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    // Engine hum: a sawtooth through a low-pass, pitched by speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: a square wave that alternates two tones.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 750;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** Continuous sounds, called every frame. `speed01` is 0..1, `siren` is wanted stars > 0. */
  step(speed01, inCar, siren, dt) {
    if (!this.ctx) return;
    this.engineGain.gain.value = inCar ? 0.05 + speed01 * 0.09 : 0;
    this.engineOsc.frequency.value = 55 + speed01 * 160;
    if (siren) {
      this.sirenPhase += dt;
      const hi = Math.floor(this.sirenPhase / 0.42) % 2 === 0;
      this.sirenOsc.frequency.value = hi ? 960 : 720;
      this.sirenGain.gain.value = 0.028;
    } else {
      this.sirenGain.gain.value = 0;
    }
  }

  blip(freq, dur, type = 'sine', vol = 0.2, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, filterFreq, vol, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shot() {
    this.noise(0.12, 2400, 0.3, 'bandpass');
  }

  crash(strength) {
    this.noise(0.3, 300 + strength * 400, Math.min(0.5, 0.15 + strength * 0.2));
  }

  pickup() {
    this.blip(880, 0.12);
    this.blip(1320, 0.18, 'sine', 0.2, 0.09);
  }

  missionDone() {
    this.blip(523, 0.14);
    this.blip(659, 0.14, 'sine', 0.2, 0.12);
    this.blip(784, 0.22, 'sine', 0.2, 0.24);
  }

  click() {
    this.blip(660, 0.06, 'square', 0.08);
  }

  bust() {
    this.blip(220, 0.4, 'sawtooth', 0.15);
    this.blip(165, 0.5, 'sawtooth', 0.15, 0.2);
  }
}

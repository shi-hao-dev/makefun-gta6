// Procedural sound: no audio files, everything is oscillators and filtered noise through
// one WebAudio graph. It starts on the first click or keypress, as browsers require, and
// M mutes it.

export class Soundboard {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engOsc = null;
    this.engGain = null;
    this.engFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
    this.noiseBuf = null;
  }

  start() {
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
    // One shared noise buffer for shots, crashes and skids.
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    // Engine hum: a sawtooth through a low-pass, pitched by speed.
    this.engOsc = this.ctx.createOscillator();
    this.engOsc.type = 'sawtooth';
    this.engOsc.frequency.value = 55;
    this.engFilter = this.ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 320;
    this.engGain = this.ctx.createGain();
    this.engGain.gain.value = 0;
    this.engOsc.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);
    this.engOsc.start();
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

  /** Continuous sounds, called every frame. `spd01` is 0..1, `siren` is stars > 0. */
  tick(spd01, inAuto, siren, dt) {
    if (!this.ctx) return;
    this.engGain.gain.value = inAuto ? 0.05 + spd01 * 0.09 : 0;
    this.engOsc.frequency.value = 55 + spd01 * 160;
    if (siren) {
      this.sirenPhase += dt;
      const hi = Math.floor(this.sirenPhase / 0.42) % 2 === 0;
      this.sirenOsc.frequency.value = hi ? 960 : 720;
      this.sirenGain.gain.value = 0.028;
    } else {
      this.sirenGain.gain.value = 0;
    }
  }

  tone(freq, dur, type = 'sine', vol = 0.2, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
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

  hiss(dur, freq, vol, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
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
    this.hiss(0.12, 2400, 0.3, 'bandpass');
  }

  crash(strength) {
    this.hiss(0.3, 300 + strength * 400, Math.min(0.5, 0.15 + strength * 0.2));
  }

  pickup() {
    this.tone(880, 0.12);
    this.tone(1320, 0.18, 'sine', 0.2, 0.09);
  }

  done() {
    this.tone(523, 0.14);
    this.tone(659, 0.14, 'sine', 0.2, 0.12);
    this.tone(784, 0.22, 'sine', 0.2, 0.24);
  }

  click() {
    this.tone(660, 0.06, 'square', 0.08);
  }

  bust() {
    this.tone(220, 0.4, 'sawtooth', 0.15);
    this.tone(165, 0.5, 'sawtooth', 0.15, 0.2);
  }
}

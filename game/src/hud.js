// The HUD: objective text, wanted stars, cash, health bar, speedometer, a
// live 2D minimap, toasts, banners and the full-screen overlays. All DOM —
// the 3D scene never draws UI, so the HUD is crisp at any resolution.

import { cash } from './rand.js';

const STAR_ON = '★';
const STAR_OFF = '☆';

export class Hud {
  constructor(doc) {
    this.doc = doc;
    this.el = {};
    for (const id of ['obj-title', 'obj-dist', 'wanted', 'money', 'hp-fill', 'speedo', 'sight', 'pop', 'flash', 'flash-title', 'flash-sub', 'hurt', 'map']) {
      this.el[id] = doc.getElementById(id);
    }
    this.mapCtx = this.el.map ? this.el.map.getContext('2d') : null;
    this.overlays = {
      title: doc.getElementById('ov-title'),
      paused: doc.getElementById('ov-pause'),
      busted: doc.getElementById('ov-busted'),
      wasted: doc.getElementById('ov-wasted'),
      done: doc.getElementById('ov-done'),
    };
    this.popTimer = 0;
    this.flashTimer = 0;
    this.hurtTimer = 0;
  }

  /** Show one overlay by name, or hide them all with null. */
  show(name) {
    for (const [key, el] of Object.entries(this.overlays)) {
      if (el) el.style.display = key === name ? 'flex' : 'none';
    }
  }

  toast(msg) {
    const el = this.el.pop;
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    this.popTimer = 3;
  }

  banner(title, sub, secs = 3) {
    if (!this.el.flash) return;
    this.el['flash-title'].textContent = title;
    this.el['flash-sub'].textContent = sub || '';
    this.el.flash.style.opacity = '1';
    this.flashTimer = secs;
  }

  setStars(n) {
    if (!this.el.wanted) return;
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < n ? STAR_ON : STAR_OFF;
    this.el.wanted.textContent = s;
  }

  setCash(n) {
    if (this.el.money) this.el.money.textContent = cash(n);
  }

  setHealth(h) {
    if (!this.el['hp-fill']) return;
    this.el['hp-fill'].style.width = `${Math.max(0, Math.min(100, h))}%`;
    this.el['hp-fill'].style.background = h > 50 ? '#37c978' : h > 25 ? '#e8c832' : '#e5534b';
  }

  setSpeed(kmh, show) {
    if (!this.el.speedo) return;
    this.el.speedo.style.display = show ? 'block' : 'none';
    if (show) this.el.speedo.textContent = String(Math.round(kmh));
  }

  setBrief(text, dist) {
    if (this.el['obj-title']) this.el['obj-title'].textContent = text;
    if (this.el['obj-dist']) {
      this.el['obj-dist'].textContent = dist === null || dist === undefined ? '' : `${Math.round(dist)} m away`;
    }
  }

  setSight(show) {
    if (this.el.sight) this.el.sight.style.display = show ? 'block' : 'none';
  }

  setMuted(m) {
    const el = this.doc.getElementById('mute-note');
    if (el) el.textContent = m ? 'M — unmute' : 'M — mute';
  }

  hurtFlash() {
    this.hurtTimer = 0.5;
    if (this.el.hurt) this.el.hurt.style.opacity = '1';
  }

  tick(dt) {
    if (this.popTimer > 0) {
      this.popTimer -= dt;
      if (this.popTimer <= 0 && this.el.pop) this.el.pop.style.opacity = '0';
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0 && this.el.flash) this.el.flash.style.opacity = '0';
    }
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.el.hurt) this.el.hurt.style.opacity = String(Math.max(0, this.hurtTimer * 2));
    }
  }

  /**
   * Draw the minimap: roads, the beach, the player, traffic, police, the
   * mission marker and the stashes. data is {player, traffic, police, marker,
   * stashes}; time drives the marker pulse.
   */
  drawMap(data, time) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const W = 220;
    const H = 220;
    const toMap = (x, z) => [((x + 330) / 720) * W, ((z + 330) / 720) * H];
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, W, H);
    // Beach strip.
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(0, ((300 + 330) / 720) * H, W, H - ((300 + 330) / 720) * H);
    // Roads.
    ctx.strokeStyle = '#3a4048';
    ctx.lineWidth = 4;
    for (let k = -5; k <= 5; k += 1) {
      const [x] = toMap(k * 60, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      const [, z] = toMap(0, k * 60);
      ctx.beginPath();
      ctx.moveTo(0, z);
      ctx.lineTo(W, z);
      ctx.stroke();
    }
    // Stashes.
    ctx.fillStyle = '#37c978';
    for (const s of data.stashes || []) {
      if (s.taken) continue;
      const [x, z] = toMap(s.x, s.z);
      ctx.fillRect(x - 2, z - 2, 4, 4);
    }
    // Mission marker: a pulsing gold diamond.
    if (data.marker) {
      const [x, z] = toMap(data.marker.x, data.marker.z);
      const r = 5 + Math.sin(time * 4) * 1.5;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(x, z - r);
      ctx.lineTo(x + r, z);
      ctx.lineTo(x, z + r);
      ctx.lineTo(x - r, z);
      ctx.closePath();
      ctx.fill();
    }
    // Traffic: yellow dots. Police: blue dots.
    ctx.fillStyle = '#e8c832';
    for (const car of data.traffic || []) {
      if (car.dead) continue;
      const [x, z] = toMap(car.x, car.z);
      ctx.fillRect(x - 2, z - 2, 4, 4);
    }
    ctx.fillStyle = '#2e6bff';
    for (const car of data.police || []) {
      if (car.dead) continue;
      const [x, z] = toMap(car.x, car.z);
      ctx.beginPath();
      ctx.arc(x, z, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player: a white arrow pointing where he faces.
    const p = data.player;
    if (p) {
      const [x, z] = toMap(p.x, p.z);
      ctx.save();
      ctx.translate(x, z);
      ctx.rotate(Math.atan2(Math.sin(p.heading), Math.cos(p.heading)) + Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

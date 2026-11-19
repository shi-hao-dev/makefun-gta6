// The HUD: DOM readouts (stars, cash, health, speed, objective) and a 2D minimap canvas
// that draws the city top-down with the player, traffic, police, the mission marker and
// the stashes. The full-screen overlays (title, pause, busted, wasted, story complete)
// live here too.

const MAP = 220;
const BOUND = 260;

export class Dash {
  constructor(doc) {
    this.doc = doc;
    this.el = {
      hud: doc.getElementById('hud'),
      stars: doc.getElementById('wanted'),
      cash: doc.getElementById('money'),
      healthFill: doc.getElementById('hp-fill'),
      speed: doc.getElementById('speedo'),
      objective: doc.getElementById('obj-title'),
      objectiveDist: doc.getElementById('obj-dist'),
      toast: doc.getElementById('pop'),
      banner: doc.getElementById('flash'),
      bannerTitle: doc.getElementById('flash-title'),
      bannerSub: doc.getElementById('flash-sub'),
      crosshair: doc.getElementById('sight'),
      vignette: doc.getElementById('hurt'),
      minimap: doc.getElementById('map'),
      title: doc.getElementById('ov-title'),
      pause: doc.getElementById('ov-pause'),
      busted: doc.getElementById('ov-busted'),
      wasted: doc.getElementById('ov-wasted'),
      complete: doc.getElementById('ov-done'),
      mute: doc.getElementById('mute-note'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.toastLeft = 0;
    this.bannerLeft = 0;
    this.lastStars = -1;
    this.lastCash = -1;
  }

  setStars(n) {
    if (n === this.lastStars) return;
    this.lastStars = n;
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < n ? '★' : '☆';
    this.el.stars.textContent = s;
    this.el.stars.style.opacity = n > 0 ? '1' : '0.35';
  }

  setCash(n) {
    const v = Math.floor(n);
    if (v === this.lastCash) return;
    this.lastCash = v;
    this.el.cash.textContent = `$${v.toLocaleString('en-US')}`;
  }

  setHealth(v) {
    this.el.healthFill.style.width = `${Math.max(0, Math.min(100, v))}%`;
    this.el.healthFill.style.background = v > 50 ? '#37c978' : v > 25 ? '#f2a93b' : '#e5534b';
  }

  setSpeed(kmh, inAuto) {
    this.el.speed.textContent = inAuto ? `${Math.round(kmh)}` : '';
    this.el.speed.style.display = inAuto ? 'block' : 'none';
  }

  setBrief(text, dist) {
    this.el.objective.textContent = text;
    this.el.objectiveDist.textContent = dist === null || dist === undefined ? '' : `${Math.round(dist)}m`;
  }

  setSight(show) {
    this.el.crosshair.style.display = show ? 'block' : 'none';
  }

  setMuted(muted) {
    this.el.mute.textContent = muted ? 'M — sound off' : 'M — mute';
  }

  toast(text, seconds = 3) {
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    this.toastLeft = seconds;
  }

  banner(title, sub = '', seconds = 3) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    this.el.banner.style.opacity = '1';
    this.bannerLeft = seconds;
  }

  hurtFlash() {
    this.el.vignette.style.opacity = '0.75';
  }

  tick(dt) {
    if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) this.el.toast.style.opacity = '0';
    }
    if (this.bannerLeft > 0) {
      this.bannerLeft -= dt;
      if (this.bannerLeft <= 0) this.el.banner.style.opacity = '0';
    }
    const v = Number.parseFloat(this.el.vignette.style.opacity || '0');
    if (v > 0) this.el.vignette.style.opacity = String(Math.max(0, v - dt * 1.4));
  }

  /** Which full-screen overlay is up: 'title' | 'pause' | 'busted' | 'wasted' | 'done' | null. */
  show(which) {
    const map = { title: this.el.title, pause: this.el.pause, busted: this.el.busted, wasted: this.el.wasted, done: this.el.complete };
    for (const [key, element] of Object.entries(map)) {
      element.style.display = key === which ? 'flex' : 'none';
    }
    this.el.hud.style.display = which === null ? 'block' : 'none';
  }

  /** Draw the minimap. `state` carries the player, cars, police, marker and stashes. */
  drawMap(state, time) {
    const ctx = this.mapCtx;
    const s = MAP;
    const scale = s / (BOUND * 2);
    const mx = (x) => (x + BOUND) * scale;
    const my = (z) => (z + BOUND) * scale;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#20262e';
    ctx.fillRect(0, 0, s, s);
    // Ocean and sand at the bottom (south).
    ctx.fillStyle = '#1d5f8f';
    ctx.fillRect(0, my(292), s, s - my(292));
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(0, my(245), s, my(292) - my(245));
    // Roads.
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 5;
    for (const street of [-210, -150, -90, -30, 30, 90, 150, 210]) {
      ctx.beginPath();
      ctx.moveTo(mx(-240), my(street));
      ctx.lineTo(mx(240), my(street));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx(street), my(-240));
      ctx.lineTo(mx(street), my(240));
      ctx.stroke();
    }
    // Stashes.
    ctx.fillStyle = '#37c978';
    for (const stash of state.stashes) {
      if (stash.taken) continue;
      ctx.fillRect(mx(stash.x) - 2, my(stash.z) - 2, 4, 4);
    }
    // Mission marker: a pulsing yellow diamond.
    if (state.marker) {
      const pulse = 5 + Math.sin(time * 5) * 2;
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.moveTo(mx(state.marker.x), my(state.marker.z) - pulse);
      ctx.lineTo(mx(state.marker.x) + pulse, my(state.marker.z));
      ctx.lineTo(mx(state.marker.x), my(state.marker.z) + pulse);
      ctx.lineTo(mx(state.marker.x) - pulse, my(state.marker.z));
      ctx.closePath();
      ctx.fill();
    }
    // Traffic: pale dots.
    ctx.fillStyle = '#dfe6ea';
    for (const car of state.traffic) {
      if (car.dead) continue;
      ctx.fillRect(mx(car.x) - 2, my(car.z) - 2, 4, 4);
    }
    // Police: flashing red/blue.
    const flash = Math.floor(time * 3) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2e6bff';
    for (const car of state.police) {
      ctx.beginPath();
      ctx.arc(mx(car.x), my(car.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: a white arrow that points where he faces.
    const px = mx(state.player.x);
    const py = my(state.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-Math.atan2(Math.sin(state.player.heading), Math.cos(state.player.heading)) + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#20262e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // North tick.
    ctx.fillStyle = '#c8ccd2';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N', 6, 14);
  }
}

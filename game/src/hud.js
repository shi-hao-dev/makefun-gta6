// The HUD: DOM readouts (stars, cash, health, speed, objective) and a 2D minimap canvas that
// draws the city top-down with the player, traffic, police, the mission marker and the stashes.
// Overlays (title, pause, busted, wasted, story complete) live here too.

const MAP_SIZE = 220;
const MAP_BOUND = 260;

export class Hud {
  constructor(doc) {
    this.doc = doc;
    this.el = {
      hud: doc.getElementById('hud'),
      stars: doc.getElementById('stars'),
      cash: doc.getElementById('cash'),
      healthFill: doc.getElementById('health-fill'),
      speed: doc.getElementById('speed'),
      objective: doc.getElementById('objective'),
      objectiveDist: doc.getElementById('objective-dist'),
      toast: doc.getElementById('toast'),
      banner: doc.getElementById('banner'),
      bannerTitle: doc.getElementById('banner-title'),
      bannerSub: doc.getElementById('banner-sub'),
      crosshair: doc.getElementById('crosshair'),
      vignette: doc.getElementById('vignette'),
      minimap: doc.getElementById('minimap'),
      title: doc.getElementById('screen-title'),
      pause: doc.getElementById('screen-pause'),
      busted: doc.getElementById('screen-busted'),
      wasted: doc.getElementById('screen-wasted'),
      complete: doc.getElementById('screen-complete'),
      mute: doc.getElementById('mute-hint'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.toastTimer = 0;
    this.bannerTimer = 0;
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

  setSpeed(kmh, inCar) {
    this.el.speed.textContent = inCar ? `${Math.round(kmh)}` : '';
    this.el.speed.style.display = inCar ? 'block' : 'none';
  }

  setObjective(text, dist) {
    this.el.objective.textContent = text;
    this.el.objectiveDist.textContent = dist === null || dist === undefined ? '' : `${Math.round(dist)}m`;
  }

  setCrosshair(show) {
    this.el.crosshair.style.display = show ? 'block' : 'none';
  }

  setMuted(muted) {
    this.el.mute.textContent = muted ? 'M — sound off' : 'M — mute';
  }

  toast(text, seconds = 3) {
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    this.toastTimer = seconds;
  }

  banner(title, sub = '', seconds = 3) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    this.el.banner.style.opacity = '1';
    this.bannerTimer = seconds;
  }

  damageFlash() {
    this.el.vignette.style.opacity = '0.75';
  }

  step(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.style.opacity = '0';
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.el.banner.style.opacity = '0';
    }
    const v = Number.parseFloat(this.el.vignette.style.opacity || '0');
    if (v > 0) this.el.vignette.style.opacity = String(Math.max(0, v - dt * 1.4));
  }

  /** Which full-screen overlay is up: 'title' | 'pause' | 'busted' | 'wasted' | 'complete' | null. */
  showOverlay(name) {
    const map = { title: this.el.title, pause: this.el.pause, busted: this.el.busted, wasted: this.el.wasted, complete: this.el.complete };
    for (const [key, element] of Object.entries(map)) {
      element.style.display = key === name ? 'flex' : 'none';
    }
    this.el.hud.style.display = name === null ? 'block' : 'none';
  }

  /** Draw the minimap. `state` carries the player, cars, police, marker and stashes. */
  drawMinimap(state, time) {
    const ctx = this.mapCtx;
    const s = MAP_SIZE;
    const scale = s / (MAP_BOUND * 2);
    const toX = (x) => (x + MAP_BOUND) * scale;
    const toY = (z) => (z + MAP_BOUND) * scale;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#20262e';
    ctx.fillRect(0, 0, s, s);
    // Ocean and sand at the bottom (south).
    ctx.fillStyle = '#1d5f8f';
    ctx.fillRect(0, toY(292), s, s - toY(292));
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(0, toY(245), s, toY(292) - toY(245));
    // Roads.
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 5;
    for (const street of [-210, -150, -90, -30, 30, 90, 150, 210]) {
      ctx.beginPath();
      ctx.moveTo(toX(-240), toY(street));
      ctx.lineTo(toX(240), toY(street));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX(street), toY(-240));
      ctx.lineTo(toX(street), toY(240));
      ctx.stroke();
    }
    // Stashes.
    ctx.fillStyle = '#37c978';
    for (const stash of state.stashes) {
      if (stash.taken) continue;
      ctx.fillRect(toX(stash.x) - 2, toY(stash.z) - 2, 4, 4);
    }
    // Mission marker: a pulsing yellow diamond.
    if (state.marker) {
      const pulse = 5 + Math.sin(time * 5) * 2;
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.moveTo(toX(state.marker.x), toY(state.marker.z) - pulse);
      ctx.lineTo(toX(state.marker.x) + pulse, toY(state.marker.z));
      ctx.lineTo(toX(state.marker.x), toY(state.marker.z) + pulse);
      ctx.lineTo(toX(state.marker.x) - pulse, toY(state.marker.z));
      ctx.closePath();
      ctx.fill();
    }
    // Traffic: pale dots.
    ctx.fillStyle = '#dfe6ea';
    for (const car of state.traffic) {
      if (car.dead) continue;
      ctx.fillRect(toX(car.x) - 2, toY(car.z) - 2, 4, 4);
    }
    // Police: flashing red/blue.
    const flash = Math.floor(time * 3) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2e6bff';
    for (const car of state.police) {
      ctx.beginPath();
      ctx.arc(toX(car.x), toY(car.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: a white arrow that points where he faces.
    const px = toX(state.player.x);
    const py = toY(state.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(state.player.heading), Math.cos(state.player.heading)) * -1 + Math.PI);
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

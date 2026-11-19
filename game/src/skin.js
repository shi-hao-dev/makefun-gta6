// Canvas-painted textures: building facades with lit windows, asphalt with a centre line,
// sidewalk slabs, sand, the ocean, and the billboard signs that give Solmar Bay its voice.
// Everything is drawn in code at boot, so the game ships no image files and loads nothing
// over the network.

function blank(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A building face: tinted plaster, a grid of windows, some lit warm, some dark. */
export function paintFacade(seed, base, lit) {
  const [c, g] = blank(128, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const shade = g.createLinearGradient(0, 0, 128, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.20)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  shade.addColorStop(1, 'rgba(0,0,0,0.24)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 128, 256);
  // A darker band at the base and a parapet line at the top.
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 240, 128, 16);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(0, 0, 128, 6);
  const cols = 4;
  const rows = 9;
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = 8 + col * 31;
      const y = 14 + r * 25;
      g.fillStyle = seed.draw() < lit ? '#ffd98a' : '#1f252c';
      g.fillRect(x, y, 20, 15);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(x, y, 20, 3);
    }
  }
  return toTex(c);
}

/** Asphalt with a centre dashed line, tiled along the road. */
export function paintRoad() {
  const [c, g] = blank(128, 128);
  g.fillStyle = '#33373d';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i += 1) {
    g.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.fillStyle = '#d8c25a';
  g.fillRect(62, 6, 4, 46);
  g.fillRect(62, 76, 4, 46);
  return toTex(c);
}

/** Pale sidewalk slabs with seams. */
export function paintWalk() {
  const [c, g] = blank(128, 128);
  g.fillStyle = '#9a938a';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i += 1) {
    g.beginPath();
    g.moveTo(0, i * 32);
    g.lineTo(128, i * 32);
    g.stroke();
    g.beginPath();
    g.moveTo(i * 32, 0);
    g.lineTo(i * 32, 128);
    g.stroke();
  }
  return toTex(c);
}

/** Beach sand with a few speckles. */
export function paintSand() {
  const [c, g] = blank(128, 128);
  g.fillStyle = '#e8d29a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 420; i += 1) {
    g.fillStyle = `rgba(160,130,70,${0.08 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  return toTex(c, 8, 8);
}

/** Ocean: deep blue with soft wave streaks. */
export function paintSea() {
  const [c, g] = blank(256, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2e7fb8');
  grad.addColorStop(1, '#1d5f8f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 3;
  for (let i = 0; i < 12; i += 1) {
    const y = 12 + i * 20 + Math.random() * 6;
    g.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const yy = y + Math.sin(x * 0.05 + i) * 4;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  return toTex(c, 6, 3);
}

/** A billboard face with big original lettering. */
export function paintSign(lines, bg, fg) {
  const [c, g] = blank(512, 256);
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 64px system-ui, sans-serif';
  if (lines.length === 1) {
    g.fillText(lines[0], 256, 128);
  } else {
    g.fillText(lines[0], 256, 96);
    g.font = 'bold 44px system-ui, sans-serif';
    g.fillText(lines[1], 256, 168);
  }
  g.strokeStyle = fg;
  g.lineWidth = 8;
  g.strokeRect(8, 8, 496, 240);
  return toTex(c);
}

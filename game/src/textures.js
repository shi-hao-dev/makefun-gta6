// Canvas-painted textures: building facades with lit windows, asphalt with lane dashes,
// sidewalk slabs, sand, and the billboards that give Solmar Bay its signs. Everything is drawn
// in code at boot, so the game ships no image files and loads nothing over the network.

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function toTexture(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A building face: tinted plaster, a grid of windows, some lit warm, some dark. */
export function facadeTexture(rng, base, litRatio) {
  const [canvas, ctx] = makeCanvas(128, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  // Subtle vertical shading so the face is not flat.
  const shade = ctx.createLinearGradient(0, 0, 128, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.18)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  shade.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 128, 256);
  const cols = 4;
  const rows = 10;
  const w = 22;
  const h = 16;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = 6 + c * 31;
      const y = 8 + r * 24;
      const lit = rng.next() < litRatio;
      ctx.fillStyle = lit ? '#ffd98a' : '#20262e';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x, y, w, 3);
    }
  }
  return toTexture(canvas);
}

/** Asphalt with a centre dashed line, tiled along the road. */
export function asphaltTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#33373d';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  ctx.fillStyle = '#d8c25a';
  ctx.fillRect(62, 8, 4, 44);
  ctx.fillRect(62, 76, 4, 44);
  return toTexture(canvas, 1, 1);
}

/** Pale sidewalk slabs with seams. */
export function sidewalkTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#9a938a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * 32);
    ctx.lineTo(128, i * 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * 32, 0);
    ctx.lineTo(i * 32, 128);
    ctx.stroke();
  }
  return toTexture(canvas);
}

/** Beach sand with a few speckles. */
export function sandTexture() {
  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i += 1) {
    ctx.fillStyle = `rgba(160,130,70,${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  return toTexture(canvas, 8, 8);
}

/** Ocean: deep blue with soft wave streaks. */
export function oceanTexture() {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2e7fb8');
  grad.addColorStop(1, '#1d5f8f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i += 1) {
    const y = 10 + i * 18 + Math.random() * 6;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const yy = y + Math.sin(x * 0.05 + i) * 4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  return toTexture(canvas, 6, 3);
}

/** A billboard face with big original lettering. */
export function billboardTexture(lines, bg, fg) {
  const [canvas, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px system-ui, sans-serif';
  if (lines.length === 1) {
    ctx.fillText(lines[0], 256, 128);
  } else {
    ctx.fillText(lines[0], 256, 96);
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(lines[1], 256, 168);
  }
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 240);
  return toTexture(canvas);
}

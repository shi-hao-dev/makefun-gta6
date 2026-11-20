// Input: keyboard, mouse drag to look, wheel to zoom, click to shoot. Actions
// are edge-triggered bits the app consumes once per step, so a held key never
// double-fires a menu or a car door.

export const ACT_OK = 1; // Enter / Space / click on an overlay
export const ACT_PAUSE = 2; // P
export const ACT_ENTER = 4; // E, get in / out of a car
export const ACT_MUTE = 8; // M
export const ACT_FIRE = 16; // clean mouse click (a drag is a look, not a shot)

export function makeKeys(canvas) {
  const keys = new Set();
  let acts = 0;
  let firing = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragDist = 0;
  let moveDX = 0;
  let moveDY = 0;
  let moveWheel = 0;

  function press(e) {
    const k = e.key.toLowerCase();
    if (k === 'enter' || k === ' ') acts |= ACT_OK;
    if (k === 'p') acts |= ACT_PAUSE;
    if (k === 'e') acts |= ACT_ENTER;
    if (k === 'm') acts |= ACT_MUTE;
    keys.add(k);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  }

  function release(e) {
    keys.delete(e.key.toLowerCase());
  }

  window.addEventListener('keydown', press);
  window.addEventListener('keyup', release);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      firing = true;
      dragging = true;
      dragDist = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      // A clean click fires the pistol once; a drag only looked around.
      if (dragDist < 6) acts |= ACT_FIRE;
      firing = false;
      dragging = false;
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    dragDist += Math.abs(dx) + Math.abs(dy);
    moveDX += dx;
    moveDY += dy;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => {
    moveWheel += e.deltaY;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    /** Movement axes from WASD / arrows: f forward, s strafe, each -1..1. */
    axes() {
      let f = 0;
      let s = 0;
      if (keys.has('w') || keys.has('arrowup')) f += 1;
      if (keys.has('s') || keys.has('arrowdown')) f -= 1;
      if (keys.has('a') || keys.has('arrowleft')) s -= 1;
      if (keys.has('d') || keys.has('arrowright')) s += 1;
      return { f, s };
    },
    braking() {
      return keys.has(' ');
    },
    sprinting() {
      return keys.has('shift');
    },
    isFiring() {
      // Holding the button still autofires; dragging to look never shoots.
      return firing && dragDist < 6;
    },
    /** Consume the edge-triggered action bits set since the last call. */
    takeActs() {
      const a = acts;
      acts = 0;
      return a;
    },
    /** Consume the mouse drag / wheel deltas since the last call. */
    takeMove() {
      const m = { dx: moveDX, dy: moveDY, wheel: moveWheel };
      moveDX = 0;
      moveDY = 0;
      moveWheel = 0;
      return m;
    },
    /** Clear pending actions (used after entering a car so E does not re-fire). */
    lock() {
      acts = 0;
    },
  };
}

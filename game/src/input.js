// Keyboard and mouse input. Held keys steer; one-shot presses (confirm, pause, enter car,
// mute) queue as flags and are taken once by the loop, so a press between frames is never
// lost or counted twice. The mouse orbits the camera by drag, or by pointer lock after a click.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_MUTE = 8;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const HANDBRAKE = new Set(['Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false;
  let shooting = false;
  let dragDX = 0;
  let dragDY = 0;
  let wheelDelta = 0;
  let locked = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) event.preventDefault();
      return;
    }
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER.has(event.code)) actions |= ACTION_ENTER;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || HANDBRAKE.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
    shooting = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      shooting = true;
      actions |= ACTION_CONFIRM;
    }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) {
      mouseDown = false;
      shooting = false;
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (locked) {
      dragDX += event.movementX || 0;
      dragDY += event.movementY || 0;
    } else if (mouseDown) {
      dragDX += event.movementX || 0;
      dragDY += event.movementY || 0;
    }
  });
  canvas.addEventListener('wheel', (event) => {
    wheelDelta += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });

  return {
    /** Forward/back and strafe as -1..1, from WASD or the arrow keys. */
    axes() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { f, s };
    },
    running() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    handbrake() {
      return keys.has('Space');
    },
    shooting() {
      return shooting;
    },
    /** Mouse orbit deltas since the last call. */
    takeDrag() {
      const d = { dx: dragDX, dy: dragDY, wheel: wheelDelta };
      dragDX = 0;
      dragDY = 0;
      wheelDelta = 0;
      return d;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Ask the browser to lock the pointer to the canvas (driving aim). */
    lockPointer() {
      if (!locked && canvas.requestPointerLock) {
        try {
          canvas.requestPointerLock();
        } catch {
          // Pointer lock can be refused (headless, iframe): dragging still works.
        }
      }
    },
  };
}

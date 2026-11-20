// Renderer and lighting: one WebGL renderer, a warm late-afternoon sun with
// shadows that follows the player, and a hazy sky. Nothing here loads a file.

const THREE = window.THREE;

/** Build the renderer, scene and camera for the canvas. */
export function makeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec7e8);
  scene.fog = new THREE.Fog(0x9fc8e0, 180, 620);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 40, 60);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe0b0, 2.4);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 520;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  /** Keep the sun (and its shadow box) centred on the player. */
  function sunFollow(x, z) {
    sun.position.set(x + 120, 180, z + 60);
    sun.target.position.set(x, 0, z);
    sun.target.updateMatrixWorld();
  }

  return { renderer, scene, camera, sunFollow, resize };
}

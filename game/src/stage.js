// The three.js stage: the renderer, a warm sun-soaked sky, fog, and a sun that follows
// the player so its shadows stay crisp wherever the action goes.

export function makeStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec9ee);
  scene.fog = new THREE.Fog(0xd8e6f2, 180, 520);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe3b3, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  // A pale sun disc and a few soft clouds for the sky.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(18, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }),
  );
  disc.position.set(240, 260, -320);
  disc.lookAt(0, 0, 0);
  scene.add(disc);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, fog: false });
  for (const [x, y, z, s] of [[-160, 150, -260, 40], [60, 170, -300, 55], [200, 140, 180, 45], [-220, 160, 120, 38]]) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), cloudMat);
    cloud.scale.y = 0.32;
    cloud.position.set(x, y, z);
    scene.add(cloud);
  }

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 8, -12);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /** Keep the sun and its shadow box centred on the action. */
  function sunFollow(fx, fz) {
    sun.position.set(fx + 90, 130, fz - 60);
    sun.target.position.set(fx, 0, fz);
    sun.target.updateMatrixWorld();
  }

  return { renderer, scene, camera, sunFollow };
}

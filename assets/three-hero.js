(function() {
  const container = document.getElementById('three-container');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0f1d');

  // Camera
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.maxDistance = 8;
  controls.minDistance = 2;
  controls.enablePan = false;

  // 3D Objects Group
  const machineGroup = new THREE.Group();
  scene.add(machineGroup);

  // 1. Central Chrome Shaft
  const shaftGeom = new THREE.CylinderGeometry(0.18, 0.18, 3, 32);
  const shaftMat = new THREE.MeshStandardMaterial({ 
    color: 0x94a3b8, 
    roughness: 0.1, 
    metalness: 0.9 
  });
  const shaft = new THREE.Mesh(shaftGeom, shaftMat);
  shaft.rotation.x = Math.PI / 2;
  machineGroup.add(shaft);

  // 2. Primary Emerald Gear Ring
  const ringGeom = new THREE.TorusGeometry(1, 0.22, 16, 100);
  const ringMat = new THREE.MeshStandardMaterial({ 
    color: 0x22a35a, 
    roughness: 0.25, 
    metalness: 0.75 
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  machineGroup.add(ring);

  // 3. Gold Cog Teeth (8 surrounding cogs)
  const cogGeom = new THREE.BoxGeometry(0.16, 0.3, 0.24);
  const cogMat = new THREE.MeshStandardMaterial({ 
    color: 0xf59e0b, 
    roughness: 0.15, 
    metalness: 0.85 
  });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const cog = new THREE.Mesh(cogGeom, cogMat);
    cog.position.set(Math.cos(angle) * 1.1, Math.sin(angle) * 1.1, 0);
    cog.rotation.z = angle + Math.PI / 2;
    machineGroup.add(cog);
  }

  // 4. Outer support shield outline (subtle)
  const shieldGeom = new THREE.RingGeometry(1.6, 1.62, 6);
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
  const shield = new THREE.Mesh(shieldGeom, shieldMat);
  machineGroup.add(shield);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff0d0, 1.5); // Warm gold main light
  dirLight.position.set(5, 5, 4);
  scene.add(dirLight);

  const greenLight = new THREE.PointLight(0x22a35a, 2.5, 12); // Secondary green accent glow
  greenLight.position.set(-3, -2, 2.5);
  scene.add(greenLight);

  const goldLight = new THREE.PointLight(0xf59e0b, 2.0, 10); // Secondary gold glow
  goldLight.position.set(3, 3, -1);
  scene.add(goldLight);

  // Mouse Parallax variables
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    mouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  });

  // Animation Loop
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Slowly rotate machine components
    machineGroup.rotation.z = elapsedTime * 0.15;
    machineGroup.rotation.y = Math.sin(elapsedTime * 0.08) * 0.12;

    // Apply mouse parallax if controls are idle
    if (controls.state === -1) {
      targetX = mouseX * 0.5;
      targetY = -mouseY * 0.3; // Invert Y
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
})();

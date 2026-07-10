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

  // Helper function to create a precision gear
  function createGear(radius, thickness, toothCount, color, metalness, roughness) {
    const gearGroup = new THREE.Group();

    // 1. Central hub (cylinder)
    const hubGeom = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, thickness + 0.02, 32);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
    const hub = new THREE.Mesh(hubGeom, hubMat);
    hub.rotation.x = Math.PI / 2;
    gearGroup.add(hub);

    // 2. Main Gear body (cylinder)
    const bodyGeom = new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, thickness, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: metalness, roughness: roughness });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    gearGroup.add(body);

    // 3. Teeth (cogs)
    const toothWidth = (Math.PI * 2 * radius) / (toothCount * 2);
    const toothHeight = radius * 0.25;
    const toothDepth = thickness - 0.02;
    const toothGeom = new THREE.BoxGeometry(toothWidth, toothHeight, toothDepth);
    const toothMat = new THREE.MeshStandardMaterial({ color: color, metalness: metalness, roughness: roughness });

    for (let i = 0; i < toothCount; i++) {
      const angle = (i / toothCount) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeom, toothMat);
      tooth.position.set(Math.cos(angle) * (radius * 0.92), Math.sin(angle) * (radius * 0.92), 0);
      tooth.rotation.z = angle;
      gearGroup.add(tooth);
    }

    return gearGroup;
  }

  // Create Gears (large center gear, interlinked with left and right small gears)
  const thickness = 0.22;

  // 1. Large Central Green Gear (16 cogs)
  const largeGear = createGear(0.75, thickness, 16, 0x22a35a, 0.8, 0.2);
  machineGroup.add(largeGear);

  // 2. Left Gold Gear (8 cogs, half size)
  const leftGear = createGear(0.375, thickness, 8, 0xf59e0b, 0.9, 0.15);
  leftGear.position.set(-1.12, 0, 0);
  machineGroup.add(leftGear);

  // 3. Right Gold Gear (8 cogs, half size)
  const rightGear = createGear(0.375, thickness, 8, 0xf59e0b, 0.9, 0.15);
  rightGear.position.set(1.12, 0, 0);
  machineGroup.add(rightGear);

  // 4. Outer shield ring (enclosing gear setup)
  const shieldRingGeom = new THREE.TorusGeometry(1.6, 0.04, 16, 100);
  const shieldRingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 });
  const shieldRing = new THREE.Mesh(shieldRingGeom, shieldRingMat);
  machineGroup.add(shieldRing);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff0d0, 1.6); // Warm gold main light
  dirLight.position.set(5, 5, 4);
  scene.add(dirLight);

  const greenLight = new THREE.PointLight(0x22a35a, 2.5, 12); // Emerald accent glow
  greenLight.position.set(-3, -2, 2.5);
  scene.add(greenLight);

  const goldLight = new THREE.PointLight(0xf59e0b, 2.0, 10); // Gold accent glow
  goldLight.position.set(3, 3, -1);
  scene.add(goldLight);

  // Initial Tilt to display 3D depth of gears
  machineGroup.rotation.x = 0.5; 
  machineGroup.rotation.y = -0.3;

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

    // 1. Rotate central gear clockwise
    largeGear.rotation.z = elapsedTime * 0.18;

    // 2. Rotate side gears counter-clockwise at mesh-perfect ratio (2x speed)
    // Add small angle offsets so teeth slot into each other rather than collide
    leftGear.rotation.z = -elapsedTime * 0.36 + Math.PI / 8;
    rightGear.rotation.z = -elapsedTime * 0.36 + Math.PI / 8;

    // Apply mouse parallax if controls are idle
    if (controls.state === -1) {
      targetX = mouseX * 0.5;
      targetY = -mouseY * 0.3;
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

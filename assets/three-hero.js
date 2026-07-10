(function() {
  const container = document.getElementById('three-container');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0f1d');

  // Camera
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1.4, 4.2);

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

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff0d0, 1.5); // Gold main light
  dirLight.position.set(5, 8, 4);
  scene.add(dirLight);

  const pointLight1 = new THREE.PointLight(0x22a35a, 2.5, 10); // Green glow
  pointLight1.position.set(-2, 1, 2);
  scene.add(pointLight1);

  // 1. Conveyor Belt Setup
  const beltGroup = new THREE.Group();
  beltGroup.position.set(0, -0.6, 0);
  scene.add(beltGroup);

  // Conveyor Frame
  const frameGeom = new THREE.BoxGeometry(3.6, 0.15, 0.6);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
  const frame = new THREE.Mesh(frameGeom, frameMat);
  beltGroup.add(frame);

  // Roller Cylinders
  const rollerGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16);
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
  const rollerLeft = new THREE.Mesh(rollerGeom, rollerMat);
  rollerLeft.position.set(-1.75, 0, 0);
  rollerLeft.rotation.x = Math.PI / 2;
  beltGroup.add(rollerLeft);

  const rollerRight = rollerLeft.clone();
  rollerRight.position.set(1.75, 0, 0);
  beltGroup.add(rollerRight);

  // 2. Moving Products (Boxes)
  const productGroup = new THREE.Group();
  scene.add(productGroup);

  const products = [];
  const productGeom = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  const productMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.15 });

  // Create 3 products spaced out
  for (let i = 0; i < 3; i++) {
    const prod = new THREE.Mesh(productGeom, productMat);
    prod.position.set(-1.6 + i * 1.1, -0.4, 0);
    productGroup.add(prod);
    products.push(prod);
  }

  // 3. Robot Arm Setup
  const robotGroup = new THREE.Group();
  robotGroup.position.set(-0.6, -0.6, -0.5); // Sits behind belt
  scene.add(robotGroup);

  // Base
  const baseGeom = new THREE.CylinderGeometry(0.18, 0.2, 0.3, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.15;
  robotGroup.add(base);

  // Lower Arm
  const arm1Group = new THREE.Group();
  arm1Group.position.set(0, 0.3, 0);
  robotGroup.add(arm1Group);

  const arm1Geom = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 16);
  const arm1Mat = new THREE.MeshStandardMaterial({ color: 0x22a35a, metalness: 0.8, roughness: 0.2 });
  const arm1 = new THREE.Mesh(arm1Geom, arm1Mat);
  arm1.position.y = 0.4;
  arm1Group.add(arm1);

  // Upper Arm
  const arm2Group = new THREE.Group();
  arm2Group.position.set(0, 0.8, 0);
  arm1Group.add(arm2Group);

  const arm2Geom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 16);
  const arm2Mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
  const arm2 = new THREE.Mesh(arm2Geom, arm2Mat);
  arm2.position.y = 0.3;
  arm2Group.add(arm2);

  // Gripper/Tool Head
  const toolGeom = new THREE.SphereGeometry(0.08, 16, 16);
  const toolMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
  const tool = new THREE.Mesh(toolGeom, toolMat);
  tool.position.set(0, 0.6, 0);
  arm2Group.add(tool);

  // 4. Scanner Sensor Arch
  const scannerGroup = new THREE.Group();
  scannerGroup.position.set(0.6, -0.6, 0);
  scene.add(scannerGroup);

  // Support Arch
  const legGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 16);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
  
  const legLeft = new THREE.Mesh(legGeom, legMat);
  legLeft.position.set(0, 0.6, -0.28);
  scannerGroup.add(legLeft);

  const legRight = legLeft.clone();
  legRight.position.set(0, 0.6, 0.28);
  scannerGroup.add(legRight);

  const topBarGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 16);
  const topBar = new THREE.Mesh(topBarGeom, legMat);
  topBar.position.set(0, 1.2, 0);
  topBar.rotation.x = Math.PI / 2;
  scannerGroup.add(topBar);

  // Sensor Head
  const headGeom = new THREE.BoxGeometry(0.12, 0.1, 0.16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
  const head = new THREE.Mesh(headGeom, headMat);
  head.position.set(0, 1.2, 0);
  scannerGroup.add(head);

  // Laser beam
  const laserGeom = new THREE.CylinderGeometry(0.015, 0.015, 1.15, 8);
  const laserMat = new THREE.MeshBasicMaterial({ 
    color: 0x22a35a, 
    transparent: true, 
    opacity: 0.35 
  });
  const laser = new THREE.Mesh(laserGeom, laserMat);
  laser.position.set(0, 0.6, 0);
  scannerGroup.add(laser);

  // 5. Background Rotating Power Gears
  const bgGearGroup = new THREE.Group();
  bgGearGroup.position.set(0, 0.7, -1.0); // High and back
  scene.add(bgGearGroup);

  function createGear(radius, thickness, toothCount, color) {
    const gear = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(radius, radius, thickness, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    gear.add(body);

    const toothGeom = new THREE.BoxGeometry(radius * 0.15, radius * 0.3, thickness - 0.02);
    for (let i = 0; i < toothCount; i++) {
      const angle = (i / toothCount) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeom, bodyMat);
      tooth.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      tooth.rotation.z = angle;
      gear.add(tooth);
    }
    return gear;
  }

  const gearBig = createGear(0.45, 0.15, 12, 0x22a35a);
  gearBig.position.set(-0.5, 0, 0);
  bgGearGroup.add(gearBig);

  const gearSmall = createGear(0.22, 0.15, 6, 0xf59e0b);
  gearSmall.position.set(0.2, 0.1, 0);
  bgGearGroup.add(gearSmall);

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

    // 1. Rollers rotation
    rollerLeft.rotation.y = elapsedTime * 2;
    rollerRight.rotation.y = elapsedTime * 2;

    // 2. Move products along X-axis
    products.forEach((prod) => {
      prod.position.x += 0.012; // Speed of conveyor
      
      // If product goes beyond right roller, loop back to left roller
      if (prod.position.x > 1.6) {
        prod.position.x = -1.6;
      }

      // Scanner check: pulse laser and change box emissive light when passing under laser arch
      const distToLaser = Math.abs(prod.position.x - 0.6);
      if (distToLaser < 0.15) {
        laser.material.opacity = 0.8 + Math.sin(elapsedTime * 30) * 0.15; // Pulse beam
        prod.material.emissive.setHex(0x226622); // Turn green briefly to simulate scanning
      } else {
        prod.material.emissive.setHex(0x000000);
      }
    });

    // Idle pulse for laser beam
    if (products.every(p => Math.abs(p.position.x - 0.6) >= 0.15)) {
      laser.material.opacity = 0.35 + Math.sin(elapsedTime * 4) * 0.15;
    }

    // 3. Robot Arm cyclic animation (swiveling & bending tool head)
    base.rotation.y = Math.sin(elapsedTime * 1.4) * 0.35;
    arm1Group.rotation.z = Math.sin(elapsedTime * 1.4) * 0.18 - 0.2;
    arm2Group.rotation.z = -Math.cos(elapsedTime * 1.4) * 0.25 - 0.35;

    // 4. Background power gears rotation
    gearBig.rotation.z = elapsedTime * 0.3;
    gearSmall.rotation.z = -elapsedTime * 0.6 + Math.PI/6;

    // 5. Mouse Parallax camera offset (idle state)
    if (controls.state === -1) {
      targetX = mouseX * 0.6;
      targetY = -mouseY * 0.4;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY + 1.4 - camera.position.y) * 0.05;
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

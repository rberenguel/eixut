// --- Base Enemy Class ---
class BaseEnemy {
  constructor(spawnPosition) {
    this.mesh = null;
    this.velocity = new THREE.Vector3();
    this.health = 10;
    this.maxHealth = 10;
    this.healthBarVisibleTimer = 0;

    const healthBarBGMaterial = new THREE.SpriteMaterial({ color: 0x330000 });
    this.healthBarBG = new THREE.Sprite(healthBarBGMaterial);
    this.healthBarBG.scale.set(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);

    const healthBarMaterial = new THREE.SpriteMaterial({ color: 0xff0000 });
    this.healthBar = new THREE.Sprite(healthBarMaterial);
    this.healthBar.scale.set(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);
    this.healthBar.position.z = 0.1;

    this.healthBarGroup = new THREE.Group();
    this.healthBarGroup.add(this.healthBarBG);
    this.healthBarGroup.add(this.healthBar);
    this.healthBarGroup.visible = false;
  }
  update(deltaTime, playerPosition) {
    if (this.healthBarVisibleTimer > 0) {
      this.healthBarVisibleTimer -= deltaTime;
      if (this.healthBarVisibleTimer <= 0) {
        this.healthBarGroup.visible = false;
      }
    }
    if (this.healthBarGroup.visible) {
      const targetScaleX = (this.health / this.maxHealth) * HEALTH_BAR_WIDTH;
      this.healthBar.scale.x +=
        (targetScaleX - this.healthBar.scale.x) * 7 * deltaTime;
    }
  }
  destroy() {
    createEnemyExplosion(this.mesh.position);
    createDebrisSplat(this.mesh.position);
    scene.remove(this.mesh);
    scene.remove(this.healthBarGroup);
  }
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    this.healthBarGroup.visible = true;
    this.healthBarVisibleTimer = HEALTH_BAR_VISIBILITY_DURATION;
    return this.health <= 0;
  }
}

// --- Cone Enemy Class ---
class ConeEnemy extends BaseEnemy {
  constructor(spawnPosition) {
    super(spawnPosition);
    this.maxHealth = CONE_ENEMY_HEALTH;
    this.health = this.maxHealth;
    this.state = "choosing_action";
    this.chargeTimer = 0;
    this.waitTimer = 0;
    this.strafeTimer = 0;
    this.aimTarget = new THREE.Vector3();
    this.strafeDirection = new THREE.Vector3();
    this.radius = PLAYER_SIZE / 2.5;

    const height = CONE_ENEMY_HEIGHT;
    const geometry = new THREE.ConeGeometry(this.radius, height, 16);
    this.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(spawnPosition);

    const edges = new THREE.EdgesGeometry(geometry);
    this.mesh.add(
      new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      ),
    );

    scene.add(this.mesh);
    scene.add(this.healthBarGroup);
  }

  update(deltaTime, playerPosition) {
    super.update(deltaTime);

    this.healthBarGroup.position.copy(this.mesh.position);
    this.healthBarGroup.position.y += CONE_ENEMY_HEIGHT / 2 + 0.5;

    if (gameState !== "playing") {
      this.velocity.set(0, 0, 0);
    } else {
      switch (this.state) {
        case "idle":
          this.velocity.set(0, 0, 0);
          this.waitTimer -= deltaTime;
          if (this.waitTimer <= 0) {
            this.state = "choosing_action";
          }
          break;

        case "choosing_action":
          reusableVector1
            .copy(playerPosition)
            .sub(this.mesh.position)
            .normalize();
          this.strafeDirection
            .set(reusableVector1.z, 0, -reusableVector1.x)
            .multiplyScalar(Math.random() < 0.5 ? 1 : -1);
          this.strafeTimer = Math.random() * 1.5 + 0.75;
          this.state = "strafing";
          break;

        case "strafing":
          this.velocity
            .copy(this.strafeDirection)
            .multiplyScalar(ENEMY_SPEED * 1.5);
          this.strafeTimer -= deltaTime;

          if (this.strafeTimer <= 0) {
            this.state = "charging";
            this.chargeTimer = ENEMY_ATTACK_CHARGE_TIME;
            this.velocity.set(0, 0, 0);
          }
          break;

        case "charging":
          const chargeProgress =
            1 - this.chargeTimer / ENEMY_ATTACK_CHARGE_TIME;
          this.material.color.lerpColors(
            new THREE.Color(0xcccccc),
            new THREE.Color(0xff0000),
            chargeProgress,
          );
          this.chargeTimer -= deltaTime;
          if (this.chargeTimer <= 0) {
            this.state = "pre-firing";
            this.chargeTimer = ENEMY_PRE_FIRE_TIME;
            this.material.emissive.setHex(0xff0000);
            this.aimTarget.copy(playerPosition);
          }
          break;

        case "pre-firing":
          this.chargeTimer -= deltaTime;
          if (this.chargeTimer <= 0) {
            this.state = "firing";
            this.material.emissive.setHex(0x000000);
          }
          break;

        case "firing":
          this.fireBullet();
          this.state = "idle";
          this.waitTimer = Math.random() * 1.5 + 0.75;
          break;
      }
    }

    this.mesh.position.addScaledVector(this.velocity, deltaTime);

    const halfWidth = ARENA_WIDTH / 2 - this.radius;
    const halfDepth = ARENA_DEPTH / 2 - this.radius;
    let hitWall = false;
    if (
      this.mesh.position.x >= halfWidth ||
      this.mesh.position.x <= -halfWidth
    ) {
      this.mesh.position.x = Math.max(
        -halfWidth,
        Math.min(halfWidth, this.mesh.position.x),
      );
      hitWall = true;
    }
    if (
      this.mesh.position.z >= halfDepth ||
      this.mesh.position.z <= -halfDepth
    ) {
      this.mesh.position.z = Math.max(
        -halfDepth,
        Math.min(halfDepth, this.mesh.position.z),
      );
      hitWall = true;
    }

    if (hitWall && this.state === "strafing") {
      this.state = "charging"; // If it hits a wall, just start shooting
      this.chargeTimer = ENEMY_ATTACK_CHARGE_TIME;
      this.velocity.set(0, 0, 0);
    }
  }

  fireBullet() {
    bullets.push(new Bullet(this.mesh.position, this.aimTarget));
  }
}
// --- Sphere Enemy Class ---
class SphereEnemy extends BaseEnemy {
  constructor(spawnPosition) {
    super(spawnPosition);
    this.maxHealth = SPHERE_ENEMY_HEALTH;
    this.health = this.maxHealth;
    this.state = "wandering";
    this.actionTimer = SPHERE_ENEMY_MIN_ACTION_INTERVAL;
    this.wanderDirection = new THREE.Vector3();
    this.dashTarget = new THREE.Vector3();
    this.radius = PLAYER_SIZE / 1.5;
    this.stunTimer = 0;

    const geometry = new THREE.SphereGeometry(this.radius, 16, 16);
    this.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(spawnPosition);
    this.mesh.position.y = this.radius;

    const edges = new THREE.EdgesGeometry(geometry);
    this.mesh.add(
      new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      ),
    );

    scene.add(this.mesh);
    scene.add(this.healthBarGroup);

    this.setNewWanderDirection();
    sphereEnemyCount++;
  }

  destroy() {
    super.destroy();
    sphereEnemyCount--;
  }

  setNewWanderDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle));
  }

  update(deltaTime, playerPosition) {
    super.update(deltaTime);

    this.healthBarGroup.position.copy(this.mesh.position);
    this.healthBarGroup.position.y += this.radius + 0.5;

    if (gameState !== "playing") {
      this.velocity.set(0, 0, 0);
      return;
    }
    this.actionTimer -= deltaTime;

    switch (this.state) {
      case "stunned":
        this.stunTimer -= deltaTime;
        if (this.stunTimer <= 0) {
          this.state = "wandering";
          this.material.color.setHex(0xcccccc);
          this.actionTimer = SPHERE_ENEMY_MIN_ACTION_INTERVAL;
          this.setNewWanderDirection();
        }
        break;
      case "wandering":
        if (this.actionTimer <= 0) {
          this.state = "charging";
          this.actionTimer = SPHERE_ENEMY_CHARGE_TIME;
          this.velocity.set(0, 0, 0);
          this.dashTarget.copy(playerPosition);
        } else {
          this.velocity
            .copy(this.wanderDirection)
            .multiplyScalar(SPHERE_ENEMY_WANDER_SPEED);
        }
        break;
      case "charging":
        const chargeProgress = 1 - this.actionTimer / SPHERE_ENEMY_CHARGE_TIME;
        this.material.color.lerpColors(
          new THREE.Color(0xcccccc),
          new THREE.Color(0xff0000),
          chargeProgress,
        );
        if (this.actionTimer <= 0) {
          this.state = "dashing";
          const direction = this.dashTarget.clone().sub(this.mesh.position);
          direction.y = 0; // This is the fix: ensures movement is only horizontal
          direction.normalize();
          this.velocity.copy(direction).multiplyScalar(SPHERE_ENEMY_DASH_SPEED);
          this.material.color.setHex(0xcccccc);
        }
        break;
      case "dashing":
        if (
          shieldTimer > 0 &&
          this.mesh.position.distanceTo(playerPosition) < SHIELD_RADIUS
        ) {
					createImpactFlare(this.mesh.position);
          this.state = "stunned";
					startHardScreenShake()
          this.stunTimer = SHIELD_STUN_DURATION;
          this.velocity.set(0, 0, 0);
          this.material.color.setHex(0x555555);
        } else if (
          this.mesh.position.distanceTo(playerPosition) <
          0.5 * PLAYER_SIZE
        ) {
          if (playerInvincibilityTimer <= 0) {
            playerHealth--;
            playerInvincibilityTimer = PLAYER_INVINCIBILITY_DURATION;
            player.material.color.setHex(0x555555);
            createPlayerHitExplosion(player.position);
            startHardScreenShake();
            arenaBorderFlashTimer = ARENA_BORDER_FLASH_DURATION;
            updateUI();
            if (playerHealth <= 0 && gameState === "playing") {
              gameState = "playerDying";
              gameOverTimer = PLAYER_DEATH_DURATION;
              player.visible = false;
              shield.visible = false;
              createPlayerExplosion(player.position);
            }
          }
        }
        break;
    }
    this.mesh.position.addScaledVector(this.velocity, deltaTime);

    if (this.state !== "stunned") {
      const distanceMoved = this.velocity.length() * deltaTime;
      if (distanceMoved > 0) {
        reusableVector1.set(this.velocity.z, 0, -this.velocity.x).normalize();
        this.mesh.rotateOnWorldAxis(
          reusableVector1,
          distanceMoved / this.radius,
        );
      }
    }
    const halfWidth = ARENA_WIDTH / 2 - this.radius;
    const halfDepth = ARENA_DEPTH / 2 - this.radius;
    let bounced = false;
    if (this.mesh.position.x > halfWidth || this.mesh.position.x < -halfWidth) {
      this.mesh.position.x = Math.max(
        -halfWidth,
        Math.min(halfWidth, this.mesh.position.x),
      );
      this.velocity.x *= -1;
      bounced = true;
    }
    if (this.mesh.position.z > halfDepth || this.mesh.position.z < -halfDepth) {
      this.mesh.position.z = Math.max(
        -halfDepth,
        Math.min(halfDepth, this.mesh.position.z),
      );
      this.velocity.z *= -1;
      bounced = true;
    }
    if (bounced && this.state === "dashing") {
      this.state = "wandering";
      this.actionTimer = SPHERE_ENEMY_MIN_ACTION_INTERVAL;
      this.setNewWanderDirection();
    }
  }
}

// --- Cube Enemy Class ---
class CubeEnemy extends BaseEnemy {
  constructor(spawnPosition) {
    super(spawnPosition);
    this.radius = PLAYER_SIZE / 2;

    const geometry = new THREE.BoxGeometry(
      PLAYER_SIZE,
      PLAYER_SIZE,
      PLAYER_SIZE,
    );
    this.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(spawnPosition);
    this.mesh.position.y = PLAYER_SIZE / 2;

    const edges = new THREE.EdgesGeometry(geometry);
    this.mesh.add(
      new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 }),
      ),
    );
    scene.add(this.mesh);

    this.velocity.set(1, 0, 0);
  }

  update(deltaTime, playerPosition) {
    super.update(deltaTime);
    if (gameState !== "playing") {
      this.velocity.set(0, 0, 0);
      return;
    }

    this.mesh.position.addScaledVector(this.velocity, deltaTime);

    const moveDistance = this.velocity.length() * deltaTime;
    if (moveDistance > 0) {
      reusableVector1.set(this.velocity.z, 0, -this.velocity.x).normalize();
      this.mesh.rotateOnWorldAxis(
        reusableVector1,
        (moveDistance / PLAYER_SIZE) * 2,
      );
    }
    const halfWidth = ARENA_WIDTH / 2 - this.radius;
    if (this.mesh.position.x > halfWidth || this.mesh.position.x < -halfWidth) {
      this.mesh.position.x = Math.max(
        -halfWidth,
        Math.min(halfWidth, this.mesh.position.x),
      );
      this.velocity.x *= -1;
    }
    const halfDepth = ARENA_DEPTH / 2 - this.radius;
    if (this.mesh.position.z > halfDepth || this.mesh.position.z < -halfDepth) {
      this.mesh.position.z = Math.max(
        -halfDepth,
        Math.min(halfDepth, this.mesh.position.z),
      );
      this.velocity.z *= -1;
    }
  }
}

class Bullet {
  constructor(startPosition, targetPosition) {
    this.isReflected = false;
    const direction = targetPosition.clone().sub(startPosition).normalize();
    const geometry = new THREE.CylinderGeometry(
      BULLET_SIZE / 2,
      BULLET_SIZE / 2,
      BULLET_SIZE * 2,
      8,
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(direction.x, 0, direction.z),
    );
    this.mesh.quaternion.copy(quaternion);

    this.light = new THREE.PointLight(0xff0000, 1, 5);
    this.mesh.add(this.light);
    this.mesh.position.set(startPosition.x, PLAYER_SIZE / 2, startPosition.z);
    scene.add(this.mesh);

    this.velocity = new THREE.Vector3(
      direction.x * BULLET_SPEED,
      0,
      direction.z * BULLET_SPEED,
    );
  }
  destroy() {
    scene.remove(this.mesh);
  }
}

// --- CORE FUNCTIONS ---
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, 0);
  scene.add(camera);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById("game-container").appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(-5, 10, 7.5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  createArena();
  createPlayer();
  initParticles();
  enemies.push(new ConeEnemy(new THREE.Vector3(8, CONE_ENEMY_HEIGHT / 2, -8)));
  window.addEventListener("resize", onWindowResize, false);
  document
    .getElementById("gameOverOverlay")
    .addEventListener("click", restartGame);
  document.getElementById("startModal").addEventListener("click", startGame);
  setupControls();
  updateUI();
  updateCameraZoom();
  renderer.render(scene, camera); // Initial render to show title screen
}

function startGame() {
  document.getElementById("startModal").style.display = "none";
  gameState = "playing";
  clock.start();
  animate();
}

function createArena() {
  const halfWidth = ARENA_WIDTH / 2;
  const halfDepth = ARENA_DEPTH / 2;
  const points = [
    new THREE.Vector3(-halfWidth, 0, -halfDepth),
    new THREE.Vector3(halfWidth, 0, -halfDepth),
    new THREE.Vector3(halfWidth, 0, halfDepth),
    new THREE.Vector3(-halfWidth, 0, halfDepth),
    new THREE.Vector3(-halfWidth, 0, -halfDepth),
  ];
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 1,
  });
  arenaBounds = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
  scene.add(arenaBounds);
}

function startHardScreenShake() {
  screenShakeTimer = SCREEN_SHAKE_DURATION;
  // This is a bit of a hack, we'll just overwrite the intensity for the hard shake
  // In a bigger project, we might pass intensity as an argument.
  document
    .getElementById("game-container")
    .style.setProperty("--shake-intensity", `${SCREEN_SHAKE_INTENSITY_HARD}px`);
}

function initParticles() {
  swordTrailContainer = new THREE.Group();
  scene.add(swordTrailContainer);
  const trailParticleGeo = new THREE.PlaneGeometry(0.2, 0.2);
  for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      emissive: 0x88ddff,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const particleMesh = new THREE.Mesh(trailParticleGeo, particleMat);
    particleMesh.visible = false;
    swordTrailContainer.add(particleMesh);
    swordTrailParticles.push({ mesh: particleMesh, lifetime: 0 });
  }
  explosionContainer = new THREE.Group();
  scene.add(explosionContainer);
  const explosionParticleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
    });
    const particleMesh = new THREE.Mesh(explosionParticleGeo, particleMat);
    particleMesh.visible = false;
    explosionContainer.add(particleMesh);
    explosionParticles.push({
      mesh: particleMesh,
      lifetime: 0,
      velocity: new THREE.Vector3(),
    });
  }

  debrisContainer = new THREE.Group();
  scene.add(debrisContainer);
  const debrisGeo = new THREE.CircleGeometry(PLAYER_SIZE / 2, 16);
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const decal = new THREE.Mesh(debrisGeo, material);
    decal.rotation.x = -Math.PI / 2;
    decal.visible = false;
    debrisContainer.add(decal);
    debrisDecals.push({ mesh: decal, lifetime: 0 });
  }
}

function createPlayer() {
  const geometry = new THREE.BoxGeometry(
    0.5 * PLAYER_SIZE,
    0.5 * PLAYER_SIZE * 2,
    0.5 * PLAYER_SIZE,
  );
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  player = new THREE.Mesh(geometry, material);
  player.position.set(0, 0.5 * PLAYER_SIZE, 0);
  player.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    ),
  );

  const shieldGeometry = new THREE.SphereGeometry(
    SHIELD_RADIUS,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const shieldMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x00aaff) },
      uOpacity: { value: 0.9 },
    },
    vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewVector;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vViewVector = normalize(cameraPosition - worldPosition.xyz);
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
            uniform vec3 uColor;
            uniform float uOpacity;
            varying vec3 vNormal;
            varying vec3 vViewVector;
            void main() {
                float fresnelTerm = 1.0 - dot(vNormal, vViewVector);
                fresnelTerm = pow(fresnelTerm, 2.5);
                gl_FragColor = vec4(uColor, fresnelTerm * uOpacity);
            }
        `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
  shield.visible = false;
  player.add(shield);

  swordPivot = new THREE.Object3D();
  player.add(swordPivot);

  const swordGeometry = new THREE.BoxGeometry(0.1, 0.1, SWORD_LENGTH);
  const swordMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    //  emissive: 0x00aaff
  });
  sword = new THREE.Mesh(swordGeometry, swordMaterial);
  sword.position.z = SWORD_LENGTH / 2;
  swordPivot.add(sword);
  sword.visible = false;

  swordTip = new THREE.Object3D();
  swordTip.position.z = SWORD_LENGTH;
  swordPivot.add(swordTip);

  const ringRadius = DASH_DISTANCE + SWORD_LENGTH / 2;
  const ringGeo = new THREE.RingGeometry(
    ringRadius - 0.1,
    ringRadius + 0.1,
    64,
  );
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    side: THREE.DoubleSide,
    transparent: true,
  });
  attackRangeIndicator = new THREE.Mesh(ringGeo, ringMat);
  attackRangeIndicator.rotation.x = -Math.PI / 2;
  attackRangeIndicator.visible = false;
  scene.add(attackRangeIndicator);

  scene.add(player);
}

function createImpactFlare(position) {
  const flareParticleCount = 8;
  for (let i = 0; i < flareParticleCount; i++) {
    const particle = explosionParticles[nextExplosionParticleIndex];
    particle.mesh.position.copy(position);

    // Short lifetime for a quick flash
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME * 0.3;
    particle.mesh.visible = true;
    particle.mesh.material.color.setHex(0xaaddff); // A bright, whitish-blue

    // Radiate outwards, but faster than a normal explosion
    particle.velocity
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * 1.5);

    nextExplosionParticleIndex =
      (nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

function createPlayerExplosion(position) {
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    const particle = explosionParticles[nextExplosionParticleIndex];
    particle.mesh.position.copy(position);
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME * 1.5;
    particle.mesh.visible = true;
    const color = Math.random() > 0.3 ? 0xffffff : 0x00aaff;
    particle.mesh.material.color.setHex(color);

    particle.velocity
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * (0.8 + Math.random() * 0.7));

    nextExplosionParticleIndex =
      (nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

function updatePlayerHealthColor() {
  if (playerInvincibilityTimer > 0) return;
  switch (playerHealth) {
    case 3:
      player.material.color.setHex(0xffffff);
      break;
    case 2:
      player.material.color.setHex(0xbbbbbb);
      break;
    case 1:
      player.material.color.setHex(0x888888);
      break;
    default:
      player.material.color.setHex(0x555555);
      break;
  }
}

function updateUI() {
  const healthElement = document.getElementById("healthDisplay");
  const killsElement = document.getElementById("killsDisplay");
  healthElement.innerText = "HEALTH: " + "❤️".repeat(Math.max(0, playerHealth));
  killsElement.innerText = "KILLS: " + enemiesKilled;
}

function updateBullets(deltaTime) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    if (!bullet.mesh) continue;

    reusableVector1.copy(bullet.velocity).multiplyScalar(deltaTime);
    bullet.mesh.position.add(reusableVector1);
    const pos = bullet.mesh.position;

    if (
      pos.x > ARENA_WIDTH / 2 ||
      pos.x < -ARENA_WIDTH / 2 ||
      pos.z > ARENA_DEPTH / 2 ||
      pos.z < -ARENA_DEPTH / 2
    ) {
      bullet.destroy();
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.isReflected) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (pos.distanceTo(enemy.mesh.position) < PLAYER_SIZE) {
          processEnemyHit(enemy, j, PLAYER_DAMAGE); // Reflected bullets do normal damage
          bullet.destroy();
          bullets.splice(i, 1);
          break;
        }
      }
    } else {
      if (shieldTimer > 0 && pos.distanceTo(player.position) < SHIELD_RADIUS) {
        bullet.isReflected = true;
        bullet.velocity
          .negate()
          .multiplyScalar(REFLECTED_BULLET_SPEED_MULTIPLIER);
        bullet.mesh.material.color.setHex(0x00aaff);
        //bullet.mesh.material.emissive.setHex(0x00aaff);
        bullet.light.color.setHex(0x00aaff);
      } else if (
        pos.distanceTo(player.position) <
        (0.5 * PLAYER_SIZE) / 2 + BULLET_SIZE / 2
      ) {
        if (playerInvincibilityTimer <= 0) {
          playerHealth--;
          playerInvincibilityTimer = PLAYER_INVINCIBILITY_DURATION;
          player.material.color.setHex(0x555555);
          createPlayerHitExplosion(player.position);
          startHardScreenShake();
          arenaBorderFlashTimer = ARENA_BORDER_FLASH_DURATION;
          updateUI();
          if (playerHealth <= 0 && gameState === "playing") {
            gameState = "playerDying";
            gameOverTimer = PLAYER_DEATH_DURATION;
            player.visible = false;
            shield.visible = false;
            createPlayerExplosion(player.position);
          }
        }
        bullet.destroy();
        bullets.splice(i, 1);
      }
    }
  }
}

function updateSwordTrail(deltaTime) {
  for (const particle of swordTrailParticles) {
    if (particle.lifetime > 0) {
      particle.lifetime -= deltaTime;
      const lifeRatio = particle.lifetime / TRAIL_PARTICLE_LIFETIME;
      particle.mesh.material.opacity = 0.6 * lifeRatio;
      const scale = 1.5 * lifeRatio;
      particle.mesh.scale.set(scale, scale, scale);
      particle.mesh.lookAt(camera.position);
      if (particle.lifetime <= 0) {
        particle.mesh.visible = false;
      }
    }
  }
}
function updateExplosionParticles(deltaTime) {
  for (const particle of explosionParticles) {
    if (particle.lifetime > 0) {
      particle.lifetime -= deltaTime;
      particle.velocity.y -= 20 * deltaTime;
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime),
      );
      particle.mesh.material.opacity =
        particle.lifetime / EXPLOSION_PARTICLE_LIFETIME;
      if (particle.lifetime <= 0) {
        particle.mesh.visible = false;
      }
    }
  }
}

function updateDebris(deltaTime) {
  for (const decal of debrisDecals) {
    if (decal.lifetime > 0) {
      decal.lifetime -= deltaTime;
      decal.mesh.material.opacity = 0.5 * (decal.lifetime / DEBRIS_LIFETIME);
      if (decal.lifetime <= 0) {
        decal.mesh.visible = false;
      }
    }
  }
}

function spawnEnemies(count) {
  if (enemies.length + count > MAX_ENEMIES) {
    count = MAX_ENEMIES - enemies.length;
  }
  if (count <= 0) return;

  const corners = [
    { x: ARENA_WIDTH / 2 - 1, z: ARENA_DEPTH / 2 - 1 },
    { x: -ARENA_WIDTH / 2 + 1, z: ARENA_DEPTH / 2 - 1 },
    { x: -ARENA_WIDTH / 2 + 1, z: -ARENA_DEPTH / 2 + 1 },
    { x: ARENA_WIDTH / 2 - 1, z: -ARENA_DEPTH / 2 + 1 },
  ];

  const playerPos = player.position;
  corners.sort((a, b) => {
    const distA = (a.x - playerPos.x) ** 2 + (a.z - playerPos.z) ** 2;
    const distB = (b.x - playerPos.x) ** 2 + (b.z - playerPos.z) ** 2;
    return distB - distA;
  });

  const spawnPoints = corners.slice(0, 2);

  for (let i = 0; i < count; i++) {
    const spawnPoint =
      spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    if (Math.random() < 0.4 && sphereEnemyCount < MAX_SPHERE_ENEMIES) {
      const position = new THREE.Vector3(spawnPoint.x, 0, spawnPoint.z);
      enemies.push(new SphereEnemy(position));
    } else {
      const position = new THREE.Vector3(
        spawnPoint.x,
        CONE_ENEMY_HEIGHT / 2,
        spawnPoint.z,
      );
      enemies.push(new ConeEnemy(position));
    }
  }
}

function processEnemyHit(enemy, index, damage) {
  hitEnemiesInAttack.push(enemy);
  const died = enemy.takeDamage(damage);

  if (died) {
    enemy.destroy();
    enemies.splice(index, 1);
    enemiesKilled++;
    startScreenShake();
    updateUI();
    const spawnCount = Math.floor(Math.random() * 2) + 1;
    spawnEnemies(spawnCount);
  }
}

function createPlayerHitExplosion(position) {
  for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
    const particle = explosionParticles[nextExplosionParticleIndex];
    particle.mesh.position.copy(position);
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME * 0.5;
    particle.mesh.visible = true;
    particle.velocity
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * 0.5);
    nextExplosionParticleIndex =
      (nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

function createEnemyExplosion(position) {
  for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
    const particle = explosionParticles[nextExplosionParticleIndex];
    particle.mesh.position.copy(position);
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME;
    particle.mesh.visible = true;
    particle.velocity
      .set(Math.random() - 0.5, Math.random() * 1.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * (0.5 + Math.random() * 0.5));

    nextExplosionParticleIndex =
      (nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

function createDebrisSplat(position) {
  const decal = debrisDecals[nextDebrisIndex];
  decal.mesh.position.set(position.x, 0.01, position.z);
  decal.mesh.rotation.z = Math.random() * Math.PI * 2;
  decal.lifetime = DEBRIS_LIFETIME;
  decal.mesh.visible = true;
  decal.mesh.material.opacity = 0.5;
  nextDebrisIndex = (nextDebrisIndex + 1) % DEBRIS_COUNT;
}

function gameOver() {
  if (gameState === "gameOver") return;
  gameState = "gameOver";
  document.getElementById("gameOverOverlay").style.display = "flex";
}

function restartGame() {
  document.getElementById("gameOverOverlay").style.display = "none";

  playerHealth = 3;
  enemiesKilled = 0;
  sphereEnemyCount = 0;
  playerInvincibilityTimer = 0;
  attackCooldownTimer = 0;
  shieldTimer = 0;
  screenShakeTimer = 0;

  isHolding = false;
  isDashing = false;
  isAttacking = false;

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].destroy();
  }
  enemies.length = 0;

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].destroy();
  }
  bullets.length = 0;

  [...swordTrailParticles, ...explosionParticles, ...debrisDecals].forEach(
    (p) => {
      p.mesh.visible = false;
      p.lifetime = 0;
    },
  );

  player.position.set(0, 0.5 * PLAYER_SIZE, 0);
  player.quaternion.set(0, 0, 0, 1);
  player.visible = true;
  updatePlayerHealthColor();
  updateUI();
  document.getElementById("cooldownBar").style.width = "100%";
  enemies.push(new ConeEnemy(new THREE.Vector3(8, CONE_ENEMY_HEIGHT / 2, -8)));
  gameState = "playing";
}

function pointToSegmentDistanceSq(p, a, b) {
  const l2 = (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  if (l2 === 0) return (p.x - a.x) ** 2 + (p.z - a.z) ** 2;
  let t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projectionX = a.x + t * (b.x - a.x);
  const projectionZ = a.z + t * (b.z - a.z);
  return (p.x - projectionX) ** 2 + (p.z - projectionZ) ** 2;
}

function startScreenShake() {
  screenShakeTimer = SCREEN_SHAKE_DURATION;
}

function updateCameraZoom() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    cameraOffset.set(0, 21, 28);
  } else {
    cameraOffset.set(0, 15, 20);
  }
}

function animate() {
  if (gameState === "paused") return;
  requestAnimationFrame(animate);
  if (gameState === "gameOver") return;

  const deltaTime = clock.getDelta();

  updateSwordTrail(deltaTime);
  updateExplosionParticles(deltaTime);
  updateDebris(deltaTime);

  if (gameState === "playerDying") {
    gameOverTimer -= deltaTime;
    if (gameOverTimer <= 0) {
      gameOver();
    }
  }

  if (gameState === "playing") {
    if (playerInvincibilityTimer > 0) {
      playerInvincibilityTimer -= deltaTime;
      if (playerInvincibilityTimer <= 0) {
        updatePlayerHealthColor();
      }
    }

    if (attackCooldownTimer > 0) {
      attackCooldownTimer -= deltaTime;
      const cooldownBar = document.getElementById("cooldownBar");
      if (cooldownBar) {
        const cooldownProgress = Math.max(
          0,
          1 - attackCooldownTimer / ATTACK_COOLDOWN,
        );
        cooldownBar.style.width = `${cooldownProgress * 100}%`;
      }
    }

    if (shieldTimer > 0) {
      shieldTimer -= deltaTime;
      if (shieldTimer <= 0) {
        shield.visible = false;
      }
    }

    if (arenaBorderFlashTimer > 0) {
      arenaBorderFlashTimer -= deltaTime;
      if (arenaBorderFlashTimer <= 0) {
        arenaBounds.material.color.setHex(0xff0000); // Revert to red
      } else if (
        arenaBorderFlashTimer > 0 &&
        arenaBounds.material.color.getHex() === 0xff0000
      ) {
        arenaBounds.material.color.setHex(0xffffff); // Set to white
      }
    }

    if (screenShakeTimer > 0) {
      const shakeX = (Math.random() - 0.5) * 2 * SCREEN_SHAKE_INTENSITY;
      const shakeY = (Math.random() - 0.5) * 2 * SCREEN_SHAKE_INTENSITY;
      document.getElementById("game-container").style.transform =
        `translate(${shakeX}px, ${shakeY}px)`;
      screenShakeTimer -= deltaTime;
      if (screenShakeTimer <= 0) {
        document.getElementById("game-container").style.transform =
          `translate(0, 0)`;
      }
    }

    // This block now provides the correct visual feedback for charging attacks
    if (startCoords && !isDashing && !isAttacking) {
      const holdTime = clock.getElapsedTime() - holdStartTime;
      if (holdTime > LONG_HOLD_DURATION_MS / 1000 && !isHardCharging) {
        isHardCharging = true;
        attackRangeIndicator.material.color.setHex(0xffaaff); // Pink/purple
      } else if (holdTime > HOLD_DURATION_MS / 1000 && !isHolding) {
        isHolding = true;
        if (playerInvincibilityTimer <= 0) {
          player.material.color.setHex(0x00aaff);
        }
        attackRangeIndicator.material.color.setHex(0x00aaff);
        attackRangeIndicator.position.set(
          player.position.x,
          0.01,
          player.position.z,
        );
        attackRangeIndicator.material.opacity = 1.0;
        attackRangeIndicator.visible = true;
      }
    }

    enemies.forEach((enemy) => enemy.update(deltaTime, player.position));
    updateBullets(deltaTime);

    let wallCollision = false;
    if (isDashing) {
      player.quaternion.slerp(
        targetQuaternion,
        deltaTime * PLAYER_ROTATION_SPEED,
      );
      const moveDistance = DASH_SPEED * deltaTime;
      player.position.addScaledVector(dashDirection, moveDistance);

      if (
        player.position.distanceToSquared(dashStartPosition) >=
        DASH_DISTANCE * DASH_DISTANCE
      ) {
        stopDash(true);
      }
    }

    if (isAttacking) {
      const moveDistance = ATTACK_SPEED * deltaTime;
      player.position.addScaledVector(attackDirection, moveDistance);

      if (
        player.position.distanceToSquared(attackStartPosition) >=
        ATTACK_DISTANCE * ATTACK_DISTANCE
      ) {
        const finalPosition = attackStartPosition
          .clone()
          .addScaledVector(attackDirection, ATTACK_DISTANCE);
        player.position.copy(finalPosition);
      }
    }

    const halfPlayerWidth = (0.5 * PLAYER_SIZE) / 2;
    const halfWidth = ARENA_WIDTH / 2 - halfPlayerWidth;
    const halfDepth = ARENA_DEPTH / 2 - halfPlayerWidth;
    if (
      player.position.x > halfWidth ||
      player.position.x < -halfWidth ||
      player.position.z > halfDepth ||
      player.position.z < -halfDepth
    ) {
      player.position.x = Math.max(
        -halfWidth,
        Math.min(halfWidth, player.position.x),
      );
      player.position.z = Math.max(
        -halfDepth,
        Math.min(halfDepth, player.position.z),
      );
      wallCollision = true;
    }

    if (wallCollision) {
      if (isDashing) stopDash(false);
      if (isAttacking) {
        attackStartPosition.copy(player.position);
      }
    }

    const playerMovementFinished =
      !isAttacking ||
      player.position.distanceToSquared(attackStartPosition) >=
        ATTACK_DISTANCE * ATTACK_DISTANCE;

    if (isAttacking) {
      if (!sword.visible) {
        const distanceSq =
          player.position.distanceToSquared(attackStartPosition);
        if (
          distanceSq >=
          (ATTACK_DISTANCE * SWORD_ACTIVATION_DISTANCE_RATIO) ** 2
        ) {
          sword.visible = true;
          swordRotationTimer = 0;
        }
      }

      if (sword.visible) {
        swordRotationTimer += deltaTime;
        const progress = Math.min(swordRotationTimer / SWORD_ARC_DURATION, 1);
        const startAngle = (-2 * Math.PI) / 3;
        const endAngle = Math.PI / 2;
        swordPivot.rotation.y = startAngle + (endAngle - startAngle) * progress;

        reusableVector1.setFromMatrixPosition(swordTip.matrixWorld);

        if (isFirstSwordFrame) {
          lastSwordTipPosition.copy(reusableVector1);
          isFirstSwordFrame = false;
        }

        const distance = lastSwordTipPosition.distanceTo(reusableVector1);
        const particleSpacing = 0.1;
        const particlesToSpawn = Math.max(
          1,
          Math.ceil(distance / particleSpacing),
        );

        for (let i = 1; i <= particlesToSpawn; i++) {
          const interpolationFactor = i / particlesToSpawn;
          reusableVector2.lerpVectors(
            lastSwordTipPosition,
            reusableVector1,
            interpolationFactor,
          );

          const particle = swordTrailParticles[nextTrailParticleIndex];
          particle.mesh.position.copy(reusableVector2);
          particle.lifetime = TRAIL_PARTICLE_LIFETIME;
          particle.mesh.visible = true;
          nextTrailParticleIndex =
            (nextTrailParticleIndex + 1) % TRAIL_PARTICLE_COUNT;
        }

        lastSwordTipPosition.copy(reusableVector1);

        // Check for bullet collisions along the sword path for this frame
        for (let j = bullets.length - 1; j >= 0; j--) {
          const bullet = bullets[j];
          if (bullet.isReflected) continue;

          const bulletPos = bullet.mesh.position;
          const distSq = pointToSegmentDistanceSq(
            { x: bulletPos.x, z: bulletPos.z },
            { x: lastSwordTipPosition.x, z: lastSwordTipPosition.z },
            { x: reusableVector1.x, z: reusableVector1.z },
          );

          const slashHitRadiusSq = PLAYER_SIZE ** 2;

          if (distSq <= slashHitRadiusSq) {
            bullet.isReflected = true;
           startScreenShake(); bullet.mesh.material.color.setHex(0x00aaff);
            bullet.light.color.setHex(0x00aaff);

            const slashNormal = reusableVector2.set(
              -attackDirection.z,
              0,
              attackDirection.x,
            );
            const incomingVelocity = reusableVector3.copy(bullet.velocity);

            incomingVelocity.reflect(slashNormal);

            bullet.velocity
              .copy(incomingVelocity)
              .multiplyScalar(-REFLECTED_BULLET_SPEED_MULTIPLIER);

            createImpactFlare(bullet.mesh.position);
            const newDirection = reusableVector1
              .copy(bullet.velocity)
              .normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              newDirection,
            );
            bullet.mesh.quaternion.copy(quaternion);
          }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (hitEnemiesInAttack.includes(enemy)) continue;
          if (enemy.mesh.position.distanceTo(reusableVector1) <= PLAYER_SIZE) {
            processEnemyHit(enemy, i, currentAttackDamage);
          }
        }

        if (progress >= 1) {
          stopAttack();
        }
      } else if (playerMovementFinished || wallCollision) {
        stopAttack();
      }
    }
  }

  camera.position.copy(player.position)
	//camera.position.z = 0
	camera.position.multiplyScalar(0).add(cameraOffset).add(player.position);//aaaaa
 reusableVector2.copy(player.position).multiplyScalar(-0.2)
 reusableVector2.y = 0
 reusableVector2.z = 0
 reusableVector2.add(player.position)
 camera.lookAt(reusableVector2)
  renderer.render(scene, camera);
}

// --- CONTROLS & MOVEMENT ---
function setupControls() {
  renderer.domElement.addEventListener(
    "touchstart",
    (e) => onSwipeStart(e.touches[0]),
    { passive: true },
  );
  renderer.domElement.addEventListener("touchend", onSwipeEnd);
  renderer.domElement.addEventListener("mousedown", onSwipeStart);
  renderer.domElement.addEventListener("mouseup", onSwipeEnd);
}

function onSwipeStart(e) {
  if (gameState !== "playing" || isDashing || isAttacking) return;
  startCoords = { x: e.clientX, y: e.clientY };
  holdStartTime = clock.getElapsedTime();
}

function onSwipeEnd(e) {
  if (!startCoords || gameState !== "playing") return;

  const holdDuration = clock.getElapsedTime() - holdStartTime;
  const endCoords = e.changedTouches ? e.changedTouches[0] : e;
  const deltaX = endCoords.clientX - startCoords.x;
  const deltaY = endCoords.clientY - startCoords.y;

  // It's crucial to nullify startCoords immediately after using it.
  startCoords = null;

  const isSwipe = Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10;
  const isLongHold = holdDuration > LONG_HOLD_DURATION_MS / 1000;
  const isNormalHold = holdDuration > HOLD_DURATION_MS / 1000;
  let wasHolding = false;
  // Always clean up the visual state from the 'animate' loop first.
  if (isHolding) {
    wasHolding = true;
    isHolding = false;
    isHardCharging = false;
    attackRangeIndicator.visible = false;
    updatePlayerHealthColor();
  }
  // Now, determine the action based on the clean input data.
  if (isSwipe) {
    const moveDir = getMoveDirection(deltaX, deltaY);
    if (isLongHold) {
      startPlayerHardAttack(moveDir);
    } else if (isNormalHold) {
      startPlayerAttack(moveDir);
    } else {
      movePlayer(moveDir);
    }
  } else {
    // Not a swipe
    if (!wasHolding) {
      // This is a true tap (short duration, no movement).
      activateShield();
    }
    // If it wasn't a swipe but it WAS a normal hold, it's a canceled attack.
    // We do nothing, and the state has already been cleaned up.
  }
}

function getMoveDirection(deltaX, deltaY) {
  const viewDir = new THREE.Vector3();
  camera.getWorldDirection(viewDir);
  viewDir.y = 0;
  viewDir.normalize();
  const rightDir = new THREE.Vector3();
  rightDir.crossVectors(camera.up, viewDir).normalize();
  const moveDir = rightDir
    .multiplyScalar(-deltaX)
    .add(viewDir.multiplyScalar(-deltaY));
  moveDir.normalize();
  return moveDir;
}

function movePlayer(direction) {
  if (isDashing || isAttacking) return;
  isDashing = true;
  dashStartPosition.copy(player.position);
  dashDirection.copy(direction);

  const angle = Math.atan2(direction.x, direction.z);
  targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
}

function startPlayerAttack(direction) {
  if (isDashing || isAttacking || attackCooldownTimer > 0) return;

  isFirstSwordFrame = true;
  currentAttackDamage = PLAYER_DAMAGE;
  attackCooldownTimer = ATTACK_COOLDOWN;
  isAttacking = true;
  hitEnemiesInAttack = [];
  attackStartPosition.copy(player.position);
  attackDirection.copy(direction);

  const angle = Math.atan2(direction.x, direction.z);
  player.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

  const attackEndPoint = new THREE.Vector3()
    .copy(attackStartPosition)
    .addScaledVector(attackDirection, ATTACK_DISTANCE);
  const attackPathHitRadiusSq = (PLAYER_SIZE * 1.5) ** 2;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (hitEnemiesInAttack.includes(enemy)) continue;
    const enemyPos = enemy.mesh.position;

    const distSq = pointToSegmentDistanceSq(
      { x: enemyPos.x, z: enemyPos.z },
      { x: attackStartPosition.x, z: attackStartPosition.z },
      { x: attackEndPoint.x, z: attackEndPoint.z },
    );

    if (distSq <= attackPathHitRadiusSq) {
      processEnemyHit(enemy, i, currentAttackDamage);
    }
  }
}

function startPlayerHardAttack(direction) {
  if (isDashing || isAttacking || attackCooldownTimer > 0) return;

  isFirstSwordFrame = true;
  currentAttackDamage = PLAYER_DAMAGE * HARD_ATTACK_DAMAGE_MULTIPLIER;
  attackCooldownTimer = ATTACK_COOLDOWN * HARD_ATTACK_COOLDOWN_MULTIPLIER;
  // The rest is the same as a normal attack
  isAttacking = true;
  hitEnemiesInAttack = [];
  attackStartPosition.copy(player.position);
  attackDirection.copy(direction);

  const angle = Math.atan2(direction.x, direction.z);
  player.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

  const attackEndPoint = new THREE.Vector3()
    .copy(attackStartPosition)
    .addScaledVector(attackDirection, ATTACK_DISTANCE);
  const attackPathHitRadiusSq = (PLAYER_SIZE * 1.5) ** 2;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (hitEnemiesInAttack.includes(enemy)) continue;
    const enemyPos = enemy.mesh.position;

    const distSq = pointToSegmentDistanceSq(
      { x: enemyPos.x, z: enemyPos.z },
      { x: attackStartPosition.x, z: attackStartPosition.z },
      { x: attackEndPoint.x, z: attackEndPoint.z },
    );

    if (distSq <= attackPathHitRadiusSq) {
      processEnemyHit(enemy, i, currentAttackDamage);
    }
  }
}

function activateShield() {
  if (attackCooldownTimer > 0 || shieldTimer > 0) return;
  attackCooldownTimer = ATTACK_COOLDOWN;
  shieldTimer = SHIELD_DURATION;
  shield.visible = true;
}

function stopDash(isDistanceStop = false) {
  if (!isDashing) return;
  isDashing = false;

  if (isDistanceStop) {
    const finalPosition = dashStartPosition
      .clone()
      .addScaledVector(dashDirection, DASH_DISTANCE);
    player.position.copy(finalPosition);
  }
  player.quaternion.copy(targetQuaternion);
}

function stopAttack() {
  if (!isAttacking) return;
  isAttacking = false;
  sword.visible = false;
  swordPivot.rotation.y = 0;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraZoom();
}

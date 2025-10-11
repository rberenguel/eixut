// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/game.js
import { state } from "./modules/state.js";
import * as CONSTANTS from "./modules/constants.js";
import { ConeEnemy } from "./enemies/ConeEnemy.js";
import { SphereEnemy } from "./enemies/SphereEnemy.js";
import { createPlayer, updatePlayerHealthColor } from "./modules/player.js";
import { createArena, createObstacles, createDoors } from "./modules/arena.js";
import {
  initParticles,
  updateSwordTrail,
  updateExplosionParticles,
  updateSplatters,
  createImpactFlare,
  createPlayerHitExplosion,
  createSplat,
  loadSplattersForRoom,
} from "./modules/particles.js";
import { setupControls } from "./modules/controls.js";
import { updateUI } from "./modules/ui.js";
import { MapGenerator } from "./map.js";
import {
  updateCameraZoom,
  startScreenShake,
  pointToSegmentDistanceSq,
  handleObstacleCollision,
  startHardScreenShake,
} from "./modules/utils.js";
import { generateSplatterTextures } from "./modules/textureGenerator.js";

const isMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobi/i.test(userAgent);
};

const isDevel =
  window.location.hostname.startsWith("192") ||
  window.location.hostname.startsWith("127") ||
  window.location.hostname === "localhost"; // Added localhost check for completeness

const needsStandalone = () => {
  const standaloneiOS = window.navigator.standalone === true;
  const standaloneAndroid = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;

  return isMobile() && !isDevel && !standaloneiOS && !standaloneAndroid;
};

function init() {
  window.state = state;
  state.map = new MapGenerator(10, 10);
  state.map.generate(10);
  state.currentRoom = { x: 5, y: 5 };
  state.splatterTextures = generateSplatterTextures(20, 128);

  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x111111);
  state.camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  state.camera.position.set(0, 0, 0);
  state.camera.lookAt(0, 0, 0);
  state.scene.add(state.camera);
  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.shadowMap.enabled = true;
  document
    .getElementById("game-container")
    .appendChild(state.renderer.domElement);
  state.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(-5, 10, 7.5);
  directionalLight.castShadow = true;
  state.scene.add(directionalLight);
  createArena();
  createDoors();
  updateDoors();
  createPlayer();
  initParticles();
  spawnEnemiesForCurrentRoom();
  window.addEventListener("resize", onWindowResize, false);
  document
    .getElementById("gameOverOverlay")
    .addEventListener("click", restartGame);
  if (needsStandalone()) {
    document.getElementById("startModal").innerHTML =
      "Please install as a <span style='color: #c00'>standalone web app</span><br/>Usually this is done via<br/><span style='color: #cc0'>Share -> Add to Home Screen</span>";

    document.getElementsByTagName("canvas")[0].style.display = "none";
    return;
  } else {
    document.getElementById("startModal").addEventListener("click", startGame);
  }

  setupControls();
  updateUI();
  updateCameraZoom();
  state.renderer.render(state.scene, state.camera);
}

// In game.js, replace the entire updateDoors function with this:

function updateDoors() {
  const LOCKED_COLOR = 0x888888;
  const OPEN_COLOR = 0xffff00; // Yellow

  const room = state.map.grid[state.currentRoom.y][state.currentRoom.x];

  const targetColor = room.cleared ? OPEN_COLOR : LOCKED_COLOR;

  const { x, y } = state.currentRoom;
  const grid = state.map.grid;

  const hasNeighbor = (nx, ny) => grid[ny] && grid[ny][nx];
  for (let doorName in state.doors) {
    if (doorName === "special") continue;
    state.doors[doorName].material.color.setHex(LOCKED_COLOR);
  }
  // North
  state.doors.north.visible = hasNeighbor(x, y - 1);
  if (state.doors.north.visible)
    state.doors.north.material.color.setHex(targetColor);

  // South
  state.doors.south.visible = hasNeighbor(x, y + 1);
  if (state.doors.south.visible)
    state.doors.south.material.color.setHex(targetColor);

  // West
  state.doors.west.visible = hasNeighbor(x - 1, y);
  if (state.doors.west.visible)
    state.doors.west.material.color.setHex(targetColor);

  // East
  state.doors.east.visible = hasNeighbor(x + 1, y);
  if (state.doors.east.visible)
    state.doors.east.material.color.setHex(targetColor);

  // Special door
  const allClear = state.map.grid.flat().every((r) => r === null || r.cleared);
  state.doors.special.visible = false;
  if (allClear && room.isLast) {
    state.doors.special.visible = true;
  }
}

function startGame() {
  document.getElementById("startModal").style.display = "none";
  state.gameState = "playing";
  state.clock.start();
  animate();
}

function updateBullets(deltaTime) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const bullet = state.bullets[i];
    if (!bullet.mesh) continue;

    state.reusableVector1.copy(bullet.velocity).multiplyScalar(deltaTime);
    bullet.mesh.position.add(state.reusableVector1);
    const pos = bullet.mesh.position;

    if (
      pos.x > CONSTANTS.ARENA_WIDTH / 2 ||
      pos.x < -CONSTANTS.ARENA_WIDTH / 2 ||
      pos.z > CONSTANTS.ARENA_DEPTH / 2 ||
      pos.z < -CONSTANTS.ARENA_DEPTH / 2
    ) {
      bullet.destroy();
      state.bullets.splice(i, 1);
      continue;
    }

    if (bullet.isReflected) {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const enemy = state.enemies[j];
        if (pos.distanceTo(enemy.mesh.position) < CONSTANTS.PLAYER_SIZE) {
          processEnemyHit(enemy, j, CONSTANTS.PLAYER_DAMAGE); // Reflected bullets do normal damage
          bullet.destroy();
          state.bullets.splice(i, 1);
          break;
        }
      }
    } else {
      if (
        state.shieldTimer > 0 &&
        pos.distanceTo(state.player.position) < CONSTANTS.SHIELD_RADIUS
      ) {
        bullet.isReflected = true;
        bullet.velocity
          .negate()
          .multiplyScalar(CONSTANTS.REFLECTED_BULLET_SPEED_MULTIPLIER);
        bullet.mesh.material.color.setHex(0x00aaff);
        bullet.light.color.setHex(0x00aaff);
      } else if (
        pos.distanceTo(state.player.position) <
        (0.5 * CONSTANTS.PLAYER_SIZE) / 2 + CONSTANTS.BULLET_SIZE / 2
      ) {
        if (state.playerInvincibilityTimer <= 0) {
          state.playerHealth--;
          state.playerInvincibilityTimer =
            CONSTANTS.PLAYER_INVINCIBILITY_DURATION;
          state.player.material.color.setHex(0x555555);
          createPlayerHitExplosion(state.player.position);
          startHardScreenShake();
          state.arenaBorderFlashTimer = CONSTANTS.ARENA_BORDER_FLASH_DURATION;
          updateUI();
          if (state.playerHealth <= 0 && state.gameState === "playing") {
            state.gameState = "playerDying";
            state.gameOverTimer = CONSTANTS.PLAYER_DEATH_DURATION;
            state.player.visible = false;
            state.shield.visible = false;
            createPlayerExplosion(state.player.position);
          }
        }
        bullet.destroy();
        state.bullets.splice(i, 1);
      }
    }
  }
}

function animate() {
  if (state.gameState === "paused") return;
  requestAnimationFrame(animate);
  if (state.gameState === "gameOver") return;

  const deltaTime = state.clock.getDelta();

  // === START: TRANSITION LOGIC ===
  if (state.isTransitioning) {
    state.transitionTimer -= deltaTime;
    // At the halfway point (screen is black), swap the room
    if (
      state.transitionTimer <= TRANSITION_DURATION / 2 &&
      state.nextRoomData
    ) {
      const { dx, dy, newPlayerPos } = state.nextRoomData;
      if (dx === null) {
        state.map.generate(15);
        state.currentRoom = { x: 5, y: 5 };
        clearEnemiesAndBullets();
        const newRoom =
          state.map.grid[state.currentRoom.y][state.currentRoom.x];
        loadSplattersForRoom(newRoom);
        createObstacles();
        spawnEnemiesForCurrentRoom();
        updateDoors();
        state.player.position.set(0, CONSTANTS.PLAYER_SIZE * 0.5, 0);
      } else {
        moveRoom(dx, dy);
        state.player.position.copy(newPlayerPos);
      }
      state.nextRoomData = null; // Clear data after use
      document.getElementById("transitionOverlay").style.opacity = "0";
    }

    if (state.transitionTimer <= 0) {
      state.isTransitioning = false;
    }

    // Still render the scene, but skip all game logic below
    state.renderer.render(state.scene, state.camera);
    return;
  }
  updateSwordTrail(deltaTime);
  updateExplosionParticles(deltaTime);
  updateSplatters(deltaTime);

  if (state.gameState === "playerDying") {
    state.gameOverTimer -= deltaTime;
    if (state.gameOverTimer <= 0) {
      gameOver();
    }
  }

  if (state.gameState === "playing") {
    if (state.playerInvincibilityTimer > 0) {
      state.playerInvincibilityTimer -= deltaTime;
      if (state.playerInvincibilityTimer <= 0) {
        updatePlayerHealthColor();
      }
    }

    if (state.attackCooldownTimer > 0) {
      state.attackCooldownTimer -= deltaTime;
      const cooldownBar = document.getElementById("cooldownBar");
      if (cooldownBar) {
        const cooldownProgress = Math.max(
          0,
          1 - state.attackCooldownTimer / CONSTANTS.ATTACK_COOLDOWN,
        );
        cooldownBar.style.width = `${cooldownProgress * 100}%`;
      }
    }

    if (state.shieldTimer > 0) {
      state.shieldTimer -= deltaTime;
      if (state.shieldTimer <= 0) {
        state.shield.visible = false;
      }
    }

    if (state.arenaBorderFlashTimer > 0) {
      state.arenaBorderFlashTimer -= deltaTime;
      if (state.arenaBorderFlashTimer <= 0) {
        state.arenaBounds.material.color.setHex(0xff0000); // Revert to red
      } else if (
        state.arenaBorderFlashTimer > 0 &&
        state.arenaBounds.material.color.getHex() === 0xff0000
      ) {
        state.arenaBounds.material.color.setHex(0xffffff); // Set to white
      }
    }

    if (state.screenShakeTimer > 0) {
      const shakeX =
        (Math.random() - 0.5) * 2 * CONSTANTS.SCREEN_SHAKE_INTENSITY;
      const shakeY =
        (Math.random() - 0.5) * 2 * CONSTANTS.SCREEN_SHAKE_INTENSITY;
      document.getElementById("game-container").style.transform =
        `translate(${shakeX}px, ${shakeY}px)`;
      state.screenShakeTimer -= deltaTime;
      if (state.screenShakeTimer <= 0) {
        document.getElementById("game-container").style.transform =
          `translate(0, 0)`;
      }
    }

    if (state.startCoords && !state.isDashing && !state.isAttacking) {
      const holdTime = state.clock.getElapsedTime() - state.holdStartTime;
      if (
        holdTime > CONSTANTS.LONG_HOLD_DURATION_MS / 1000 &&
        !state.isHardCharging
      ) {
        state.isHardCharging = true;
        state.attackRangeIndicator.material.color.setHex(0xffaaff); // Pink/purple
      } else if (
        holdTime > CONSTANTS.HOLD_DURATION_MS / 1000 &&
        !state.isHolding
      ) {
        state.isHolding = true;
        if (state.playerInvincibilityTimer <= 0) {
          state.player.material.color.setHex(0x00aaff);
        }
        state.attackRangeIndicator.material.color.setHex(0x00aaff);
        state.attackRangeIndicator.position.set(
          state.player.position.x,
          0.01,
          state.player.position.z,
        );
        state.attackRangeIndicator.material.opacity = 1.0;
        state.attackRangeIndicator.visible = true;
      }
    }

    state.enemies.forEach((enemy) =>
      enemy.update(deltaTime, state.player.position),
    );
    updateBullets(deltaTime);

    checkRoomCompletion();
    handleRoomTransitions();

    let wallCollision = false;
    if (state.isDashing) {
      state.player.quaternion.slerp(
        state.targetQuaternion,
        deltaTime * CONSTANTS.PLAYER_ROTATION_SPEED,
      );
      const moveDistance = CONSTANTS.DASH_SPEED * deltaTime;
      const movementVector = state.dashDirection
        .clone()
        .multiplyScalar(moveDistance);

      handleObstacleCollision(state.player, movementVector, state.obstacles);

      // If movementVector is now zero, the dash hit a wall. Stop it.
      if (movementVector.lengthSq() === 0) {
        stopDash(false);
      }

      if (
        state.player.position.distanceToSquared(state.dashStartPosition) >=
        CONSTANTS.DASH_DISTANCE * CONSTANTS.DASH_DISTANCE
      ) {
        stopDash(true);
      }
    }

    // === REPLACEMENT FOR ATTACK LOGIC ===
    if (state.isAttacking) {
      const moveDistance = CONSTANTS.ATTACK_SPEED * deltaTime;
      const movementVector = state.attackDirection
        .clone()
        .multiplyScalar(moveDistance);

      handleObstacleCollision(state.player, movementVector, state.obstacles);

      // If movementVector is now zero, the attack hit a wall.
      if (movementVector.lengthSq() === 0) {
        // This check is used later to stop the sword animation
        wallCollision = true;
      }

      if (
        state.player.position.distanceToSquared(state.attackStartPosition) >=
        CONSTANTS.ATTACK_DISTANCE * CONSTANTS.ATTACK_DISTANCE
      ) {
        const finalPosition = state.attackStartPosition
          .clone()
          .addScaledVector(state.attackDirection, CONSTANTS.ATTACK_DISTANCE);
        state.player.position.copy(finalPosition);
      }
    }
    const halfPlayerWidth = (0.5 * CONSTANTS.PLAYER_SIZE) / 2;
    const halfWidth = CONSTANTS.ARENA_WIDTH / 2 - halfPlayerWidth;
    const halfDepth = CONSTANTS.ARENA_DEPTH / 2 - halfPlayerWidth;
    if (
      state.player.position.x > halfWidth ||
      state.player.position.x < -halfWidth ||
      state.player.position.z > halfDepth ||
      state.player.position.z < -halfDepth
    ) {
      state.player.position.x = Math.max(
        -halfWidth,
        Math.min(halfWidth, state.player.position.x),
      );
      state.player.position.z = Math.max(
        -halfDepth,
        Math.min(halfDepth, state.player.position.z),
      );
      wallCollision = true;
    }

    if (wallCollision) {
      if (state.isDashing) stopDash(false);
      if (state.isAttacking) {
        state.attackStartPosition.copy(state.player.position);
      }
    }

    const playerMovementFinished =
      !state.isAttacking ||
      state.player.position.distanceToSquared(state.attackStartPosition) >=
        CONSTANTS.ATTACK_DISTANCE * CONSTANTS.ATTACK_DISTANCE;

    if (state.isAttacking) {
      if (!state.sword.visible) {
        const distanceSq = state.player.position.distanceToSquared(
          state.attackStartPosition,
        );
        if (
          distanceSq >=
          (CONSTANTS.ATTACK_DISTANCE *
            CONSTANTS.SWORD_ACTIVATION_DISTANCE_RATIO) **
            2
        ) {
          state.sword.visible = true;
          state.swordRotationTimer = 0;
        }
      }

      if (state.sword.visible) {
        state.swordRotationTimer += deltaTime;
        const progress = Math.min(
          state.swordRotationTimer / CONSTANTS.SWORD_ARC_DURATION,
          1,
        );
        const startAngle = (-2 * Math.PI) / 3;
        const endAngle = Math.PI / 2;
        state.swordPivot.rotation.y =
          startAngle + (endAngle - startAngle) * progress;

        state.reusableVector1.setFromMatrixPosition(state.swordTip.matrixWorld);

        if (state.isFirstSwordFrame) {
          state.lastSwordTipPosition.copy(state.reusableVector1);
          state.isFirstSwordFrame = false;
        }

        const distance = state.lastSwordTipPosition.distanceTo(
          state.reusableVector1,
        );
        const particleSpacing = 0.1;
        const particlesToSpawn = Math.max(
          1,
          Math.ceil(distance / particleSpacing),
        );

        for (let i = 1; i <= particlesToSpawn; i++) {
          const interpolationFactor = i / particlesToSpawn;
          state.reusableVector2.lerpVectors(
            state.lastSwordTipPosition,
            state.reusableVector1,
            interpolationFactor,
          );

          const particle =
            state.swordTrailParticles[state.nextTrailParticleIndex];
          particle.mesh.position.copy(state.reusableVector2);
          particle.lifetime = CONSTANTS.TRAIL_PARTICLE_LIFETIME;
          particle.mesh.visible = true;
          state.nextTrailParticleIndex =
            (state.nextTrailParticleIndex + 1) % CONSTANTS.TRAIL_PARTICLE_COUNT;
        }

        state.lastSwordTipPosition.copy(state.reusableVector1);

        for (let j = state.bullets.length - 1; j >= 0; j--) {
          const bullet = state.bullets[j];
          if (bullet.isReflected) continue;

          const bulletPos = bullet.mesh.position;
          const distSq = pointToSegmentDistanceSq(
            { x: bulletPos.x, z: bulletPos.z },
            {
              x: state.lastSwordTipPosition.x,
              z: state.lastSwordTipPosition.z,
            },
            { x: state.reusableVector1.x, z: state.reusableVector1.z },
          );

          const slashHitRadiusSq = CONSTANTS.PLAYER_SIZE ** 2;

          if (distSq <= slashHitRadiusSq) {
            bullet.isReflected = true;
            startScreenShake();
            bullet.mesh.material.color.setHex(0x00aaff);
            bullet.light.color.setHex(0x00aaff);

            const slashNormal = state.reusableVector2.set(
              -state.attackDirection.z,
              0,
              state.attackDirection.x,
            );
            const incomingVelocity = state.reusableVector3.copy(
              bullet.velocity,
            );

            incomingVelocity.reflect(slashNormal);

            bullet.velocity
              .copy(incomingVelocity)
              .multiplyScalar(-CONSTANTS.REFLECTED_BULLET_SPEED_MULTIPLIER);

            createImpactFlare(bullet.mesh.position);
            const newDirection = state.reusableVector1
              .copy(bullet.velocity)
              .normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              newDirection,
            );
            bullet.mesh.quaternion.copy(quaternion);
          }
        }

        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const enemy = state.enemies[i];
          if (state.hitEnemiesInAttack.includes(enemy)) continue;
          if (
            enemy.mesh.position.distanceTo(state.reusableVector1) <=
            CONSTANTS.PLAYER_SIZE
          ) {
            processEnemyHit(enemy, i, state.currentAttackDamage);
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

  state.camera.position.copy(state.player.position);
  state.camera.position
    .multiplyScalar(0)
    .add(state.cameraOffset)
    .add(state.player.position);
  state.reusableVector2.copy(state.player.position).multiplyScalar(-0.2);
  state.reusableVector2.y = 0;
  state.reusableVector2.z = 0;
  state.reusableVector2.add(state.player.position);
  state.camera.lookAt(state.reusableVector2);
  state.renderer.render(state.scene, state.camera);
}

function stopDash(isDistanceStop = false) {
  if (!state.isDashing) return;
  state.isDashing = false;

  if (isDistanceStop) {
    const finalPosition = state.dashStartPosition
      .clone()
      .addScaledVector(state.dashDirection, CONSTANTS.DASH_DISTANCE);
    state.player.position.copy(finalPosition);
  }
  state.player.quaternion.copy(state.targetQuaternion);
}

function stopAttack() {
  if (!state.isAttacking) return;
  state.isAttacking = false;
  state.sword.visible = false;
  state.swordPivot.rotation.y = 0;
}

function onWindowResize() {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraZoom();
}

export function processEnemyHit(enemy, index, damage) {
  state.hitEnemiesInAttack.push(enemy);
  const died = enemy.takeDamage(damage);
  const wallThreshold = 1.0;
  const pos = enemy.mesh.position;

  if (died) {
    // Wall splatters for kills
    if (pos.x > CONSTANTS.ARENA_WIDTH / 2 - wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.6,
        5,
        true,
        new THREE.Vector3(-1, 0, 0),
      );
    }
    if (pos.x < -CONSTANTS.ARENA_WIDTH / 2 + wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.6,
        5,
        true,
        new THREE.Vector3(1, 0, 0),
      );
    }
    if (pos.z > CONSTANTS.ARENA_DEPTH / 2 - wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.6,
        5,
        true,
        new THREE.Vector3(0, 0, -1),
      );
    }
    if (pos.z < -CONSTANTS.ARENA_DEPTH / 2 + wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.6,
        5,
        true,
        new THREE.Vector3(0, 0, 1),
      );
    }

    enemy.destroy(); // This calls createEnemyExplosion for large floor splatters
    state.enemies.splice(index, 1);
    state.enemiesKilled++;
    if (state.enemiesKilled % 10 == 0) {
      state.playerHealth = Math.min(
        state.playerHealth + 1,
        CONSTANTS.PLAYER_HEALTH + 2,
      );
    }
    startScreenShake();
    updateUI();
  } else {
    // Splatters for non-lethal hits
    state.reusableVector1.copy(enemy.mesh.position);
    state.reusableVector1.y = 20;
    createSplat(state.reusableVector1, CONSTANTS.PLAYER_SIZE * 0.2, 3);

    // Smaller wall splatters for non-lethal hits
    if (pos.x > CONSTANTS.ARENA_WIDTH / 2 - wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.2,
        2,
        true,
        new THREE.Vector3(-1, 0, 0),
      );
    }
    if (pos.x < -CONSTANTS.ARENA_WIDTH / 2 + wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.2,
        2,
        true,
        new THREE.Vector3(1, 0, 0),
      );
    }
    if (pos.z > CONSTANTS.ARENA_DEPTH / 2 - wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.2,
        2,
        true,
        new THREE.Vector3(0, 0, -1),
      );
    }
    if (pos.z < -CONSTANTS.ARENA_DEPTH / 2 + wallThreshold) {
      createSplat(
        pos,
        CONSTANTS.PLAYER_SIZE * 0.2,
        2,
        true,
        new THREE.Vector3(0, 0, 1),
      );
    }

    startScreenShake();
    state.reusableVector2.copy(enemy.mesh.position);
    state.reusableVector2.y += 2;
    createImpactFlare(state.reusableVector2);
  }
}

function spawnEnemiesForCurrentRoom() {
  const room = state.map.grid[state.currentRoom.y][state.currentRoom.x];
  if (room && !room.cleared) {
    spawnEnemies(room.enemies);
  }
}

function checkRoomCompletion() {
  const room = state.map.grid[state.currentRoom.y][state.currentRoom.x];
  if (room && !room.cleared && state.enemies.length === 0) {
    room.cleared = true;
    updateDoors();
  }
}

function handleRoomTransitions() {
  const room = state.map.grid[state.currentRoom.y][state.currentRoom.x];
  if (!room || state.isTransitioning) {
    return;
  }

  if (
    state.doors.special.visible &&
    state.player.position.distanceTo(state.doors.special.position) < 3.0
  ) {
    startRoomTransition(null, null, null);
    return;
  }

  if (!room.cleared) {
    return;
  }

  const transitionDistanceSq = 2.0 * 2.0;
  const transitionBuffer = 2.0;

  const checkDoor = (door, dx, dy, newPosition) => {
    if (!door.visible) return false;

    if (door.material.color.getHex() === 0xffff00) {
      if (
        state.player.position.distanceToSquared(door.position) <
        transitionDistanceSq
      ) {
        startRoomTransition(dx, dy, newPosition);
        return true;
      }
    }
    return false;
  };

  if (
    checkDoor(
      state.doors.east,
      1,
      0,
      new THREE.Vector3(
        -CONSTANTS.ARENA_WIDTH / 2 + transitionBuffer,
        state.player.position.y,
        state.player.position.z,
      ),
    )
  )
    return;
  if (
    checkDoor(
      state.doors.west,
      -1,
      0,
      new THREE.Vector3(
        CONSTANTS.ARENA_WIDTH / 2 - transitionBuffer,
        state.player.position.y,
        state.player.position.z,
      ),
    )
  )
    return;
  if (
    checkDoor(
      state.doors.south,
      0,
      1,
      new THREE.Vector3(
        state.player.position.x,
        state.player.position.y,
        -CONSTANTS.ARENA_DEPTH / 2 + transitionBuffer,
      ),
    )
  )
    return;
  if (
    checkDoor(
      state.doors.north,
      0,
      -1,
      new THREE.Vector3(
        state.player.position.x,
        state.player.position.y,
        CONSTANTS.ARENA_DEPTH / 2 - transitionBuffer,
      ),
    )
  )
    return;
}

const TRANSITION_DURATION = 0.5; // Total duration: 0.25s fade out, 0.25s fade in

// Add this new helper function
function startRoomTransition(dx, dy, newPlayerPos) {
  if (state.isTransitioning) return;
  state.isTransitioning = true;
  state.transitionTimer = TRANSITION_DURATION;
  state.nextRoomData = { dx, dy, newPlayerPos };
  document.getElementById("transitionOverlay").style.opacity = "1";
}

function moveRoom(dx, dy) {
  const newX = state.currentRoom.x + dx;
  const newY = state.currentRoom.y + dy;

  if (state.map.grid[newY] && state.map.grid[newY][newX]) {
    state.currentRoom.x = newX;
    state.currentRoom.y = newY;
    clearEnemiesAndBullets();
    loadSplattersForRoom(state.map.grid[newY][newX]);
    createObstacles();
    spawnEnemiesForCurrentRoom();
    updateDoors();
  }
}

function clearEnemiesAndBullets() {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    state.enemies[i].destroy();
  }
  state.enemies.length = 0;

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    state.bullets[i].destroy();
  }
  state.bullets.length = 0;
}

function spawnEnemies(count) {
  if (state.enemies.length + count > CONSTANTS.MAX_ENEMIES) {
    count = CONSTANTS.MAX_ENEMIES - state.enemies.length;
  }
  if (count <= 0) return;

  const corners = [
    { x: CONSTANTS.ARENA_WIDTH / 2 - 1, z: CONSTANTS.ARENA_DEPTH / 2 - 1 },
    { x: -CONSTANTS.ARENA_WIDTH / 2 + 1, z: CONSTANTS.ARENA_DEPTH / 2 - 1 },
    { x: -CONSTANTS.ARENA_WIDTH / 2 + 1, z: -CONSTANTS.ARENA_DEPTH / 2 + 1 },
    { x: CONSTANTS.ARENA_WIDTH / 2 - 1, z: -CONSTANTS.ARENA_DEPTH / 2 + 1 },
  ];

  const playerPos = state.player.position;
  corners.sort((a, b) => {
    const distA = (a.x - playerPos.x) ** 2 + (a.z - playerPos.z) ** 2;
    const distB = (b.x - playerPos.x) ** 2 + (b.z - playerPos.z) ** 2;
    return distB - distA;
  });

  const spawnPoints = corners.slice(0, 2);

  for (let i = 0; i < count; i++) {
    const spawnPoint =
      spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    if (
      Math.random() < 0.4 &&
      state.sphereEnemyCount < CONSTANTS.MAX_SPHERE_ENEMIES
    ) {
      const position = new THREE.Vector3(spawnPoint.x, 0, spawnPoint.z);
      state.enemies.push(new SphereEnemy(position));
    } else {
      const position = new THREE.Vector3(
        spawnPoint.x,
        CONSTANTS.CONE_ENEMY_HEIGHT / 2,
        spawnPoint.z,
      );
      state.enemies.push(new ConeEnemy(position));
    }
  }
}

function gameOver() {
  if (state.gameState === "gameOver") return;
  state.gameState = "gameOver";
  document.getElementById("gameOverOverlay").style.display = "flex";
}

function restartGame() {
  document.getElementById("gameOverOverlay").style.display = "none";

  state.playerHealth = 3;
  state.enemiesKilled = 0;
  state.sphereEnemyCount = 0;
  state.playerInvincibilityTimer = 0;
  state.attackCooldownTimer = 0;
  state.shieldTimer = 0;
  state.screenShakeTimer = 0;

  state.isHolding = false;
  state.isDashing = false;
  state.isAttacking = false;

  clearEnemiesAndBullets();

  // Manually clear all splatters visuals when restarting the whole game
  const room = state.map.grid[state.currentRoom.y][state.currentRoom.x];
  if (room) {
    room.splatters = [];
  }
  loadSplattersForRoom(room);

  [...state.swordTrailParticles, ...state.explosionParticles].forEach((p) => {
    p.mesh.visible = false;
    p.lifetime = 0;
  });

  state.map.generate(15);
  state.currentRoom = { x: 5, y: 5 };

  state.player.position.set(0, 0.5 * CONSTANTS.PLAYER_SIZE, 0);
  state.player.quaternion.set(0, 0, 0, 1);
  state.player.visible = true;
  updatePlayerHealthColor();
  updateUI();
  document.getElementById("cooldownBar").style.width = "100%";
  createObstacles();
  spawnEnemiesForCurrentRoom();
  state.gameState = "playing";
}

init();

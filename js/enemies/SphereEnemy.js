import {
  handleObstacleCollision,
  isLineOfSightBlocked,
  startScreenShake,
} from "../modules/utils.js";
import {
  SPHERE_ENEMY_HEALTH,
  PLAYER_SIZE,
  SPHERE_ENEMY_MIN_ACTION_INTERVAL,
  SPHERE_ENEMY_CHARGE_TIME,
  SPHERE_ENEMY_WANDER_SPEED,
  SPHERE_ENEMY_DASH_SPEED,
  SHIELD_RADIUS,
  SHIELD_STUN_DURATION,
  PLAYER_INVINCIBILITY_DURATION,
  ARENA_BORDER_FLASH_DURATION,
  PLAYER_DEATH_DURATION,
  ARENA_WIDTH,
  ARENA_DEPTH,
} from "../modules/constants.js";
import {
  createImpactFlare,
  createPlayerHitExplosion,
  createPlayerExplosion,
} from "../modules/particles.js";
import { updateUI } from "../modules/ui.js";
import { startHardScreenShake } from "../modules/utils.js";
import { BaseEnemy } from "./BaseEnemy.js";

export class SphereEnemy extends BaseEnemy {
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

    state.scene.add(this.mesh);
    state.scene.add(this.healthBarGroup);

    this.setNewWanderDirection();
    state.sphereEnemyCount++;
  }

  destroy() {
    super.destroy();
    state.sphereEnemyCount--;
  }

  setNewWanderDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle));
  }

  update(deltaTime, playerPosition) {
    super.update(deltaTime);
    //handleObstacleCollision(this.mesh, this.radius, state.obstacles);
    this.healthBarGroup.position.copy(this.mesh.position);
    this.healthBarGroup.position.y += this.radius + 0.5;

    if (state.gameState !== "playing") {
      this.velocity.set(0, 0, 0);
      return;
    }
    this.actionTimer -= deltaTime;

    const losBlocked = isLineOfSightBlocked(this.mesh.position, playerPosition);
    let collided = false;
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
        if (this.actionTimer <= 0 && !losBlocked) {
          this.state = "charging";
          this.actionTimer = SPHERE_ENEMY_CHARGE_TIME;
          this.velocity.set(0, 0, 0);
          this.dashTarget.copy(playerPosition);
        } else {
          this.velocity
            .copy(this.wanderDirection)
            .multiplyScalar(SPHERE_ENEMY_WANDER_SPEED);
          const movementVector = this.velocity
            .clone()
            .multiplyScalar(deltaTime);
          collided = handleObstacleCollision(
            this.mesh,
            movementVector,
            state.obstacles,
          );
          if (collided && movementVector.lengthSq() === 0) {
            this.state = "wandering";
            this.bounced = true;
            break;
          }
        }
        break;
      case "charging":
        if (losBlocked) {
          this.state = "wandering";
          this.actionTimer = SPHERE_ENEMY_MIN_ACTION_INTERVAL;
          this.setNewWanderDirection();
          this.material.color.setHex(0xcccccc);
          break;
        }
        const chargeProgress = 1 - this.actionTimer / SPHERE_ENEMY_CHARGE_TIME;
        this.material.color.lerpColors(
          new THREE.Color(0xcccccc),
          new THREE.Color(0xff0000),
          chargeProgress,
        );
        if (this.actionTimer <= 0) {
          this.state = "dashing";
          const direction = this.dashTarget.clone().sub(this.mesh.position);
          direction.y = 0;
          direction.normalize();
          this.velocity.copy(direction).multiplyScalar(SPHERE_ENEMY_DASH_SPEED);
          this.material.color.setHex(0xcccccc);
        }
        break;
      case "dashing":
        const movementVector = this.velocity.clone().multiplyScalar(deltaTime);
        collided = handleObstacleCollision(
          this.mesh,
          movementVector,
          state.obstacles,
        );
        if (collided && movementVector.lengthSq() === 0) {
          this.state = "stunned";
          this.bounced = true;
          startScreenShake();
          break;
        }
        if (
          state.shieldTimer > 0 &&
          this.mesh.position.distanceTo(playerPosition) < SHIELD_RADIUS
        ) {
          createImpactFlare(this.mesh.position);
          this.state = "stunned";
          startHardScreenShake();
          this.stunTimer = SHIELD_STUN_DURATION;
          this.velocity.set(0, 0, 0);
          this.material.color.setHex(0x555555);
        } else if (
          this.mesh.position.distanceTo(playerPosition) <
          0.5 * PLAYER_SIZE
        ) {
          if (state.playerInvincibilityTimer <= 0) {
            state.playerHealth--;
            state.playerInvincibilityTimer = PLAYER_INVINCIBILITY_DURATION;
            state.player.material.color.setHex(0x555555);
            createPlayerHitExplosion(state.player.position);
            startHardScreenShake();
            state.arenaBorderFlashTimer = ARENA_BORDER_FLASH_DURATION;
            updateUI();
            if (state.playerHealth <= 0 && state.gameState === "playing") {
              state.gameState = "playerDying";
              state.gameOverTimer = PLAYER_DEATH_DURATION;
              state.player.visible = false;
              state.shield.visible = false;
              createPlayerExplosion(state.player.position);
            }
          }
        }
        break;
    }
    if (!collided) this.mesh.position.addScaledVector(this.velocity, deltaTime);
    if (this.state !== "stunned") {
      const distanceMoved = this.velocity.length() * deltaTime;
      if (distanceMoved > 0) {
        state.reusableVector1
          .set(this.velocity.z, 0, -this.velocity.x)
          .normalize();
        this.mesh.rotateOnWorldAxis(
          state.reusableVector1,
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
    if (bounced) {
      if (this.state === "dashing") {
        this.state = "wandering";
        this.actionTimer = SPHERE_ENEMY_MIN_ACTION_INTERVAL;
        this.setNewWanderDirection();
      } else if (this.state === "wandering") {
        this.setNewWanderDirection();
      }
    }
  }
}

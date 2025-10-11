import { BaseEnemy } from "./BaseEnemy.js";
import { state } from "../modules/state.js";
import { Bullet } from "../modules/bullet.js";
import { isLineOfSightBlocked } from "../modules/utils.js";
import {
  CONE_ENEMY_HEALTH,
  PLAYER_SIZE,
  CONE_ENEMY_HEIGHT,
  ENEMY_SPEED,
  ENEMY_ATTACK_CHARGE_TIME,
  ENEMY_PRE_FIRE_TIME,
  ARENA_WIDTH,
  ARENA_DEPTH,
} from "../modules/constants.js";

export class ConeEnemy extends BaseEnemy {
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
    this.wanderDirection = new THREE.Vector3();
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

    state.scene.add(this.mesh);
    state.scene.add(this.healthBarGroup);
  }

  setNewWanderDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle));
  }

  update(deltaTime, playerPosition) {
    super.update(deltaTime);

    this.healthBarGroup.position.copy(this.mesh.position);
    this.healthBarGroup.position.y += CONE_ENEMY_HEIGHT / 2 + 0.5;

    if (state.gameState !== "playing") {
      this.velocity.set(0, 0, 0);
    } else {
      const losBlocked = isLineOfSightBlocked(
        this.mesh.position,
        playerPosition,
      );

      switch (this.state) {
        case "idle":
          this.velocity.set(0, 0, 0);
          this.waitTimer -= deltaTime;
          if (this.waitTimer <= 0) {
            this.state = "choosing_action";
          }
          break;

        case "choosing_action":
          if (losBlocked) {
            this.state = "wandering";
            this.waitTimer = Math.random() * 2 + 1;
            this.setNewWanderDirection();
            break;
          }
          state.reusableVector1
            .copy(playerPosition)
            .sub(this.mesh.position)
            .normalize();
          this.strafeDirection
            .set(state.reusableVector1.z, 0, -state.reusableVector1.x)
            .multiplyScalar(Math.random() < 0.5 ? 1 : -1);
          this.strafeTimer = Math.random() * 1.5 + 0.75;
          this.state = "strafing";
          break;

        case "wandering":
          this.velocity
            .copy(this.wanderDirection)
            .multiplyScalar(ENEMY_SPEED * 0.5);
          this.waitTimer -= deltaTime;
          if (this.waitTimer <= 0 && !losBlocked) {
            this.state = "choosing_action";
          }
          break;

        case "strafing":
          if (losBlocked) {
            this.state = "wandering";
            this.waitTimer = Math.random() * 2 + 1;
            this.setNewWanderDirection();
            break;
          }
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
          if (losBlocked) {
            this.state = "wandering";
            this.waitTimer = Math.random() * 2 + 1;
            this.setNewWanderDirection();
            this.material.color.setHex(0xcccccc);
            break;
          }
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

    if (hitWall) {
      if (this.state === "strafing") {
        this.state = "charging";
        this.chargeTimer = ENEMY_ATTACK_CHARGE_TIME;
        this.velocity.set(0, 0, 0);
      } else if (this.state === "wandering") {
        this.setNewWanderDirection();
      }
    }
  }

  fireBullet() {
    state.bullets.push(new Bullet(this.mesh.position, this.aimTarget));
  }
}

// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/enemies/CubeEnemy.js
import { BaseEnemy } from "./BaseEnemy.js";
import { state } from "../modules/state.js";
import { PLAYER_SIZE, ARENA_WIDTH, ARENA_DEPTH } from "../modules/constants.js";

export class CubeEnemy extends BaseEnemy {
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
    this.mesh.renderOrder = 2;
    state.scene.add(this.mesh);

    this.velocity.set(1, 0, 0);
  }

  update(deltaTime, playerPosition) {
    super.update(deltaTime);
    if (state.gameState !== "playing") {
      this.velocity.set(0, 0, 0);
      return;
    }

    this.mesh.position.addScaledVector(this.velocity, deltaTime);

    const moveDistance = this.velocity.length() * deltaTime;
    if (moveDistance > 0) {
      state.reusableVector1
        .set(this.velocity.z, 0, -this.velocity.x)
        .normalize();
      this.mesh.rotateOnWorldAxis(
        state.reusableVector1,
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

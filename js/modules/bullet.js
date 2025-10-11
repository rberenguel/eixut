import { state } from "./state.js";
import { BULLET_SIZE, BULLET_SPEED, PLAYER_SIZE } from "./constants.js";

export class Bullet {
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
    state.scene.add(this.mesh);

    this.velocity = new THREE.Vector3(
      direction.x * BULLET_SPEED,
      0,
      direction.z * BULLET_SPEED,
    );
  }
  destroy() {
    state.scene.remove(this.mesh);
  }
}

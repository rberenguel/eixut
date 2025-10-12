import { state } from "./state.js";
import { PLAYER_SIZE } from "./constants.js";

export class Item {
  constructor(position, type) {
    this.type = type;
    const geometry = new THREE.BoxGeometry(
      PLAYER_SIZE / 2,
      PLAYER_SIZE / 2,
      PLAYER_SIZE / 2,
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x964b00,
      emissive: 0x3a1e00,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.position.y = PLAYER_SIZE / 4;
    state.scene.add(this.mesh);
  }

  destroy() {
    state.scene.remove(this.mesh);
  }
}
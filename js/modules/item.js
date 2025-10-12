import { state } from "./state.js";
import { PLAYER_SIZE } from "./constants.js";

export class Item {
  constructor(position, type) {
    this.type = type;
    this.time = 0;
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

    this.createIcon();
  }

  createIcon() {
    this.iconGroup = new THREE.Group();
    this.mesh.add(this.iconGroup);

    if (this.type === "health") {
      const heartShape = new THREE.Shape();
      heartShape.moveTo(0.25, 0.25);
      heartShape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
      heartShape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
      heartShape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
      heartShape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
      heartShape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
      heartShape.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);

      const extrudeSettings = { depth: 0.1, bevelEnabled: false };
      const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0x660000,
      });
      const heartMesh = new THREE.Mesh(geometry, material);
      heartMesh.scale.set(0.4, 0.4, 0.4);
      heartMesh.position.set(-0.2, 0.5, 0); // Center the shape
      heartMesh.rotation.z = Math.PI; // <-- This is the fix!
      this.iconGroup.add(heartMesh);
    } else if (this.type === "shotgun") {
      const shellGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
      const shellMat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x006600,
      });
      for (let i = 0; i < 3; i++) {
        const shell = new THREE.Mesh(shellGeo, shellMat);
        const angle = (i - 1) * (Math.PI / 8);
        shell.rotation.z = Math.PI / 2 + angle;
        shell.position.x = (i - 1) * 0.15;
        this.iconGroup.add(shell);
      }
      this.iconGroup.position.y = 0.5;
    }
  }

  update(deltaTime) {
    this.time += deltaTime;
    this.iconGroup.position.y = 0.5 + Math.sin(this.time * 3) * 0.1;
    this.iconGroup.rotation.y += deltaTime * 0.5;
  }

  destroy() {
    state.scene.remove(this.mesh);
  }
}

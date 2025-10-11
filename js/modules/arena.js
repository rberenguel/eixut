import { state } from "./state.js";
import { ARENA_WIDTH, ARENA_DEPTH, PLAYER_SIZE } from "./constants.js";

// In arena.js

export function createDoors() {
  state.doors = {};
  const doorGeometry = new THREE.BoxGeometry(4, 2, 0.5);
  // Default material is now a semi-transparent grey for "locked" doors
  const doorMaterial = new THREE.MeshBasicMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.5,
  });

  const createDoor = (name, position, rotationY = 0) => {
    const door = new THREE.Mesh(doorGeometry, doorMaterial.clone());
    door.position.copy(position);
    door.rotation.y = rotationY;
    door.visible = true;
    door.name = name;
    state.scene.add(door);
    state.doors[name] = door;
  };

  createDoor("north", new THREE.Vector3(0, 1, -ARENA_DEPTH / 2));
  createDoor("south", new THREE.Vector3(0, 1, ARENA_DEPTH / 2));
  createDoor("east", new THREE.Vector3(ARENA_WIDTH / 2, 1, 0), Math.PI / 2);
  createDoor("west", new THREE.Vector3(-ARENA_WIDTH / 2, 1, 0), Math.PI / 2);
}

export function createArena() {
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
  state.arenaBounds = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
  state.scene.add(state.arenaBounds);
}

export function clearObstacles() {
  state.obstacles.forEach((obstacle) => {
    state.scene.remove(obstacle);
  });
  state.obstacles = [];
}

export function createObstacles() {
  clearObstacles();
  const room = state.map.grid[state.currentRoom.y][state.currentRoom.x];
  if (room && room.type === "normal") {
    const hue = Math.abs(
      Math.sin(state.currentRoom.x * 0.5 + state.currentRoom.y * 0.3),
    );
    const roomColor = new THREE.Color().setHSL(hue, 0.4, 0.25); // (hue, saturation, lightness)
    const obstacle = new THREE.Mesh(
      new THREE.BoxGeometry(PLAYER_SIZE * 6, PLAYER_SIZE * 2, PLAYER_SIZE),
      new THREE.MeshStandardMaterial({
        color: roomColor,
        transparent: true,
        opacity: 0.5,
      }),
    );
    obstacle.position.set(0, PLAYER_SIZE, 0);
    state.scene.add(obstacle);
    state.obstacles.push(obstacle);
  }
}

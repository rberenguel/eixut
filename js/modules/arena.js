// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/modules/arena.js
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

  const specialDoorGroup = new THREE.Group();

  // The Arch Frame
  const archShape = new THREE.Shape();
  const archRadius = 2.5;
  const frameThickness = 0.5;
  archShape.moveTo(-archRadius - frameThickness, 0);
  archShape.lineTo(-archRadius - frameThickness, archRadius);
  archShape.absarc(
    0,
    archRadius,
    archRadius + frameThickness,
    Math.PI,
    0,
    true,
  );
  archShape.lineTo(archRadius + frameThickness, 0);
  archShape.lineTo(archRadius, 0);
  archShape.absarc(0, archRadius, archRadius, 0, Math.PI, false);
  archShape.closePath();

  const extrudeSettings = { depth: 0.5, bevelEnabled: false };
  const frameGeo = new THREE.ExtrudeGeometry(archShape, extrudeSettings);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x330000,
    roughness: 0.2,
  });
  const archFrame = new THREE.Mesh(frameGeo, frameMat);
  archFrame.position.z = -0.25;

  // The Glowing Portal
  const portalGeo = new THREE.PlaneGeometry(archRadius * 2, archRadius);
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const portalPlane = new THREE.Mesh(portalGeo, portalMat);
  portalPlane.position.set(0, archRadius, 0);

  specialDoorGroup.add(archFrame);
  specialDoorGroup.add(portalPlane);

  // Set position to the NORTH wall and rotate it to face inwards
  specialDoorGroup.position.set(0, 0, -ARENA_DEPTH / 2);
  specialDoorGroup.rotation.y = Math.PI;

  specialDoorGroup.visible = false;
  state.scene.add(specialDoorGroup);
  state.doors.special = specialDoorGroup;
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
        opacity: 0.3,
      }),
    );
    obstacle.position.set(0, PLAYER_SIZE, 0);
    state.scene.add(obstacle);
    state.obstacles.push(obstacle);
  }
}

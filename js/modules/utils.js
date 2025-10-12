import { state } from "./state.js";
import {
  SCREEN_SHAKE_DURATION,
  SCREEN_SHAKE_INTENSITY_HARD,
} from "./constants.js";

export const isMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobi/i.test(userAgent);
};

const raycaster = new THREE.Raycaster();

export function isLineOfSightBlocked(start, end) {
  if (state.obstacles.length === 0) {
    return false;
  }
  const direction = end.clone().sub(start).normalize();
  raycaster.set(start, direction);
  const distance = start.distanceTo(end);
  const intersects = raycaster.intersectObjects(state.obstacles);
  if (intersects.length > 0 && intersects[0].distance < distance) {
    return true;
  }
  return false;
}

// js/modules/utils.js

// js/modules/utils.js

// js/modules/utils.js

export function handleObstacleCollision(
  movingObject,
  movementVector,
  obstacles,
) {
  if (!obstacles || obstacles.length === 0 || movementVector.lengthSq() === 0) {
    movingObject.position.add(movementVector);
    return;
  }

  const moveDistance = movementVector.length();
  const moveDirection = movementVector.clone().normalize();
  const playerBody = movingObject; //.getObjectByName("playerBody");

  if (!playerBody) {
    console.error(
      "Player mesh 'playerBody' not found for collision detection.",
    );
    movingObject.position.add(movementVector);
    return;
  }

  const raycaster = new THREE.Raycaster(movingObject.position, moveDirection);
  const intersects = raycaster.intersectObjects(obstacles);

  const playerBox = new THREE.Box3().setFromObject(playerBody);
  const playerSize = playerBox.getSize(new THREE.Vector3());
  const playerRadius = Math.max(playerSize.x, playerSize.z) / 8;

  if (
    intersects.length > 0 &&
    intersects[0].distance < moveDistance + playerRadius
  ) {
    const newMoveDistance = Math.max(0, intersects[0].distance - playerRadius);
    movingObject.position.add(moveDirection.multiplyScalar(newMoveDistance));
    // Signal that movement was stopped
    movementVector.set(0, 0, 0);
    return true;
  } else {
    movingObject.position.add(movementVector);
  }
}

export function pointToSegmentDistanceSq(p, a, b) {
  const l2 = (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  if (l2 === 0) return (p.x - a.x) ** 2 + (p.z - a.z) ** 2;
  let t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projectionX = a.x + t * (b.x - a.x);
  const projectionZ = a.z + t * (b.z - a.z);
  return (p.x - projectionX) ** 2 + (p.z - projectionZ) ** 2;
}

export function startScreenShake() {
  state.screenShakeTimer = SCREEN_SHAKE_DURATION;
}

export function startHardScreenShake() {
  state.screenShakeTimer = SCREEN_SHAKE_DURATION;
  document
    .getElementById("game-container")
    .style.setProperty("--shake-intensity", `${SCREEN_SHAKE_INTENSITY_HARD}px`);
}

export function updateCameraZoom() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    state.cameraOffset.set(0, 21, 28);
  } else {
    state.cameraOffset.set(0, 15, 20);
  }
}

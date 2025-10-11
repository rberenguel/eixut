import { state } from "./state.js";
import {
  SCREEN_SHAKE_DURATION,
  SCREEN_SHAKE_INTENSITY_HARD,
} from "./constants.js";

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

// In utils.js

export function handleObstacleCollision(
  movingObject,
  movingObjectSize,
  obstacles,
) {
  if (obstacles.length === 0) return;

  // Fix: Declare Box3 objects inside the function
  const movingBox = new THREE.Box3();
  const obstacleBox = new THREE.Box3();

  movingBox.setFromCenterAndSize(movingObject.position, movingObjectSize);

  for (const obstacle of obstacles) {
    obstacleBox.setFromObject(obstacle);

    if (movingBox.intersectsBox(obstacleBox)) {
      const overlap = movingBox.clone().intersect(obstacleBox);
      const overlapSize = new THREE.Vector3();
      overlap.getSize(overlapSize);

      if (overlapSize.x < overlapSize.z) {
        const sign = Math.sign(movingObject.position.x - obstacle.position.x);
        movingObject.position.x += overlapSize.x * sign;
      } else {
        const sign = Math.sign(movingObject.position.z - obstacle.position.z);
        movingObject.position.z += overlapSize.z * sign;
      }
      // After resolving one collision, we might need to re-check, but for now this is a simple solution.
    }
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

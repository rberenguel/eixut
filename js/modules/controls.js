import { state } from "./state.js";
import {
	SWIPE_DELTA,
  LONG_HOLD_DURATION_MS,
  HOLD_DURATION_MS,
  PLAYER_DAMAGE,
  ATTACK_COOLDOWN,
  PLAYER_SIZE,
  ATTACK_DISTANCE,
  HARD_ATTACK_DAMAGE_MULTIPLIER,
  HARD_ATTACK_COOLDOWN_MULTIPLIER,
  SHIELD_DURATION,
} from "./constants.js";
import { updatePlayerHealthColor } from "./player.js";
import { pointToSegmentDistanceSq } from "./utils.js";
import { processEnemyHit } from "../game.js";

function getMoveDirection(deltaX, deltaY) {
  const viewDir = new THREE.Vector3();
  state.camera.getWorldDirection(viewDir);
  viewDir.y = 0;
  viewDir.normalize();
  const rightDir = new THREE.Vector3();
  rightDir.crossVectors(state.camera.up, viewDir).normalize();
  const moveDir = rightDir
    .multiplyScalar(-deltaX)
    .add(viewDir.multiplyScalar(-deltaY));
  moveDir.normalize();
  return moveDir;
}

function movePlayer(direction) {
  if (state.isTransitioning) return;
  if (state.isDashing || state.isAttacking) return;
  state.isDashing = true;
  state.dashStartPosition.copy(state.player.position);
  state.dashDirection.copy(direction);

  const angle = Math.atan2(direction.x, direction.z);
  state.targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
}

function startPlayerAttack(direction) {
  if (state.isTransitioning) return;
  if (state.isDashing || state.isAttacking || state.attackCooldownTimer > 0)
    return;

  state.isFirstSwordFrame = true;
  state.currentAttackDamage = PLAYER_DAMAGE;
  state.attackCooldownTimer = ATTACK_COOLDOWN;
  state.isAttacking = true;
  state.hitEnemiesInAttack = [];
  state.attackStartPosition.copy(state.player.position);
  state.attackDirection.copy(direction);

  const angle = Math.atan2(direction.x, direction.z);
  state.player.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

  const attackEndPoint = new THREE.Vector3()
    .copy(state.attackStartPosition)
    .addScaledVector(state.attackDirection, ATTACK_DISTANCE);
  const attackPathHitRadiusSq = (PLAYER_SIZE * 1.5) ** 2;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (state.hitEnemiesInAttack.includes(enemy)) continue;
    const enemyPos = enemy.mesh.position;

    const distSq = pointToSegmentDistanceSq(
      { x: enemyPos.x, z: enemyPos.z },
      { x: state.attackStartPosition.x, z: state.attackStartPosition.z },
      { x: attackEndPoint.x, z: attackEndPoint.z },
    );

    if (distSq <= attackPathHitRadiusSq) {
      processEnemyHit(enemy, i, state.currentAttackDamage);
    }
  }
}

function startPlayerHardAttack(direction) {
  if (state.isTransitioning) return;
  if (state.isDashing || state.isAttacking || state.attackCooldownTimer > 0)
    return;

  state.isFirstSwordFrame = true;
  state.currentAttackDamage = PLAYER_DAMAGE * HARD_ATTACK_DAMAGE_MULTIPLIER;
  state.attackCooldownTimer = ATTACK_COOLDOWN * HARD_ATTACK_COOLDOWN_MULTIPLIER;
  state.isAttacking = true;
  state.hitEnemiesInAttack = [];
  state.attackStartPosition.copy(state.player.position);
  state.attackDirection.copy(direction);

  const angle = Math.atan2(direction.x, direction.z);
  state.player.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

  const attackEndPoint = new THREE.Vector3()
    .copy(state.attackStartPosition)
    .addScaledVector(state.attackDirection, ATTACK_DISTANCE);
  const attackPathHitRadiusSq = (PLAYER_SIZE * 1.5) ** 2;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (state.hitEnemiesInAttack.includes(enemy)) continue;
    const enemyPos = enemy.mesh.position;

    const distSq = pointToSegmentDistanceSq(
      { x: enemyPos.x, z: enemyPos.z },
      { x: state.attackStartPosition.x, z: state.attackStartPosition.z },
      { x: attackEndPoint.x, z: attackEndPoint.z },
    );

    if (distSq <= attackPathHitRadiusSq) {
      processEnemyHit(enemy, i, state.currentAttackDamage);
    }
  }
}

function activateShield() {
  if (state.isTransitioning) return;
  if (state.attackCooldownTimer > 0 || state.shieldTimer > 0) return;
  state.attackCooldownTimer = ATTACK_COOLDOWN;
  state.shieldTimer = SHIELD_DURATION;
  state.shield.visible = true;
}

function onSwipeStart(e) {
  if (state.gameState !== "playing" || state.isDashing || state.isAttacking)
    return;
  state.startCoords = { x: e.clientX, y: e.clientY };
  state.holdStartTime = state.clock.getElapsedTime();
}

function onSwipeEnd(e) {
  if (!state.startCoords || state.gameState !== "playing") return;

  const holdDuration = state.clock.getElapsedTime() - state.holdStartTime;
  const endCoords = e.changedTouches ? e.changedTouches[0] : e;
  const deltaX = endCoords.clientX - state.startCoords.x;
  const deltaY = endCoords.clientY - state.startCoords.y;

  state.startCoords = null;

  const isSwipe = Math.abs(deltaX) > SWIPE_DELTA || Math.abs(deltaY) > SWIPE_DELTA;
  const isLongHold = holdDuration > LONG_HOLD_DURATION_MS / 1000;
  const isNormalHold = holdDuration > HOLD_DURATION_MS / 1000;
  let wasHolding = false;

  if (state.isHolding) {
    wasHolding = true;
    state.isHolding = false;
    state.isHardCharging = false;
    state.attackRangeIndicator.visible = false;
    updatePlayerHealthColor();
  }

  if (isSwipe) {
    const moveDir = getMoveDirection(deltaX, deltaY);
    if (isLongHold) {
      startPlayerHardAttack(moveDir);
    } else if (isNormalHold) {
      startPlayerAttack(moveDir);
    } else {
      movePlayer(moveDir);
    }
  } else {
    if (!wasHolding) {
      activateShield();
    }
  }
}

export function setupControls() {
  state.renderer.domElement.addEventListener(
    "touchstart",
    (e) => onSwipeStart(e.touches[0]),
    { passive: true },
  );
  state.renderer.domElement.addEventListener("touchend", onSwipeEnd);
  //state.renderer.domElement.addEventListener("mousedown", onSwipeStart);
  //state.renderer.domElement.addEventListener("mouseup", onSwipeEnd);
}

import { state } from "./state.js";
import { Bullet } from "./bullet.js";
import {
  SWIPE_DELTA,
  ATTACK_SWIPE_DELTA,
  LONG_HOLD_DURATION_MS,
  HOLD_DURATION_MS,
  PLAYER_DAMAGE,
  ATTACK_COOLDOWN,
  PLAYER_SIZE,
  ATTACK_DISTANCE,
  SHOTGUN_DISTANCE,
  HARD_ATTACK_DAMAGE_MULTIPLIER,
  HARD_ATTACK_COOLDOWN_MULTIPLIER,
  SHIELD_DURATION,
  SHOTGUN_SPEED_MULTIPLIER,
  ENERGY_COST_ATTACK,
  ENERGY_COST_HARD_ATTACK,
  ENERGY_COST_SHOTGUN,
  ENERGY_COST_SHIELD,
  SHOTGUN_AMMO,
} from "./constants.js";
import { updatePlayerHealthColor } from "./player.js";
import { isMobile, pointToSegmentDistanceSq } from "./utils.js";
import { processEnemyHit } from "../game.js";
import { updateUI } from "./ui.js";

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
  if (state.isDashing || state.isAttacking || state.attackCooldownTimer > 0 || state.playerEnergy < ENERGY_COST_ATTACK) {
    log(`ATK BLOCKED dash=${state.isDashing} atk=${state.isAttacking} cd=${state.attackCooldownTimer.toFixed(2)} e=${state.playerEnergy.toFixed(0)}<${ENERGY_COST_ATTACK}`);
    return;
  }

  state.playerEnergy -= ENERGY_COST_ATTACK;
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
  if (
    state.isDashing ||
    state.isAttacking ||
    state.attackCooldownTimer > 0 ||
    state.playerEnergy < ENERGY_COST_HARD_ATTACK
  )
    return;

  state.playerEnergy -= ENERGY_COST_HARD_ATTACK;
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

function startPlayerShotgunAttack(direction) {
  if (state.isTransitioning) return;
  if (
    state.isDashing ||
    state.isAttacking ||
    state.attackCooldownTimer > 0 ||
    !state.hasShotgun ||
    state.shotgunAmmo <= 0 ||
    state.playerEnergy < ENERGY_COST_SHOTGUN
  )
    return;

  state.playerEnergy -= ENERGY_COST_SHOTGUN;
  state.shotgunAmmo--;
  if (state.shotgunAmmo <= 0) {
    state.hasShotgun = false;
  }
  updateUI(); // This will update the shell icons
  state.attackCooldownTimer = ATTACK_COOLDOWN;

  const angle = Math.atan2(direction.x, direction.z);
  state.player.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

  const spreadAngle = Math.PI / 16; // Angle for the spread
  const leftDirection = direction
    .clone()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
  const rightDirection = direction
    .clone()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -spreadAngle);

  const startPosition = state.player.position;
  const targetPosition = startPosition.clone().add(direction);
  const leftTargetPosition = startPosition.clone().add(leftDirection);
  const rightTargetPosition = startPosition.clone().add(rightDirection);

  const b = (target) => {
    const bullet = new Bullet(startPosition, target, SHOTGUN_DISTANCE, true);
    bullet.velocity.multiplyScalar(SHOTGUN_SPEED_MULTIPLIER);
    return bullet;
  };
  state.bullets.push(b(targetPosition));
  state.bullets.push(b(leftTargetPosition));
  state.bullets.push(b(rightTargetPosition));

  state.shotgunStick.visible = true;
  setTimeout(() => {
    state.shotgunStick.visible = false;
  }, 100);
}

function activateShield() {
  if (state.isTransitioning) return;
  if (
    state.attackCooldownTimer > 0 ||
    state.shieldTimer > 0 ||
    state.playerEnergy < ENERGY_COST_SHIELD
  )
    return;
  state.playerEnergy -= ENERGY_COST_SHIELD;
  state.attackCooldownTimer = ATTACK_COOLDOWN;
  state.shieldTimer = SHIELD_DURATION;
  state.shield.visible = true;
}

const _log = [];
function log(msg) {
  _log.push(msg);
  if (_log.length > 10) _log.shift();
  const el = document.getElementById("debugLog");
  if (el) el.innerHTML = _log.join("<br>");
}

function onSwipeStart(e) {
  if (state.gameState !== "playing") return;
  state.startCoords = { x: e.clientX, y: e.clientY };
  state.holdStartTime = state.clock.getElapsedTime();
  state.gestureConsumed = false;
}

function onSwipeMove(e) {
  if (!state.startCoords || state.gameState !== "playing") return;
  if (state.gestureConsumed) return;

  const holdDuration = state.clock.getElapsedTime() - state.holdStartTime;
  if (holdDuration > HOLD_DURATION_MS / 1000) return;

  const coords = e.touches ? e.touches[0] : e;
  const deltaX = coords.clientX - state.startCoords.x;
  const deltaY = coords.clientY - state.startCoords.y;

  if (Math.abs(deltaX) > SWIPE_DELTA || Math.abs(deltaY) > SWIPE_DELTA) {
    log(`MOVE-DASH h=${holdDuration.toFixed(2)} d=${Math.hypot(deltaX,deltaY).toFixed(0)}`);
    state.gestureConsumed = true;
    state.startCoords = null;
    movePlayer(getMoveDirection(deltaX, deltaY));
  }
}

function onSwipeEnd(e) {
  if (state.gestureConsumed) {
    state.gestureConsumed = false;
    return;
  }
  if (!state.startCoords || state.gameState !== "playing") return;

  const holdDuration = state.clock.getElapsedTime() - state.holdStartTime;
  const endCoords = e.changedTouches ? e.changedTouches[0] : e;
  const deltaX = endCoords.clientX - state.startCoords.x;
  const deltaY = endCoords.clientY - state.startCoords.y;

  state.startCoords = null;

  const isLongHold = holdDuration > LONG_HOLD_DURATION_MS / 1000;
  const isNormalHold = holdDuration > HOLD_DURATION_MS / 1000;
  const swipeThreshold = isNormalHold ? ATTACK_SWIPE_DELTA : SWIPE_DELTA;
  const isSwipe = Math.hypot(deltaX, deltaY) > swipeThreshold;
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
    const d = Math.hypot(deltaX, deltaY).toFixed(0);
    if (isLongHold) {
      log(`END hard-atk h=${holdDuration.toFixed(2)} d=${d}`);
      startPlayerHardAttack(moveDir);
    } else if (isNormalHold) {
      log(`END atk h=${holdDuration.toFixed(2)} d=${d}`);
      if (state.hasShotgun) {
        startPlayerShotgunAttack(moveDir);
      } else {
        startPlayerAttack(moveDir);
      }
    } else {
      log(`END short-dash h=${holdDuration.toFixed(2)} d=${d}`);
      movePlayer(moveDir);
    }
  } else {
    if (!wasHolding) {
      log(`END shield h=${holdDuration.toFixed(2)}`);
      activateShield();
    }
  }
}

function onTouchCancel() {
  log(`CANCEL sc=${state.startCoords !== null} gc=${state.gestureConsumed}`);
  state.startCoords = null;
  state.gestureConsumed = false;
  if (state.isHolding) {
    state.isHolding = false;
    state.isHardCharging = false;
    state.attackRangeIndicator.visible = false;
    updatePlayerHealthColor();
  }
}

export function setupControls() {
  if (isMobile()) {
    window.addEventListener(
      "touchstart",
      (e) => onSwipeStart(e.touches[0]),
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      onSwipeMove,
      { passive: true },
    );
    window.addEventListener("touchend", onSwipeEnd);
    window.addEventListener("touchcancel", onTouchCancel);
  } else {
    window.addEventListener("mousedown", onSwipeStart);
    window.addEventListener("mousemove", onSwipeMove);
    window.addEventListener("mouseup", onSwipeEnd);
  }

  //
  //
}

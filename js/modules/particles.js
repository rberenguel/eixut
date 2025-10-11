// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/modules/particles.js
import { state } from "./state.js";
import {
  TRAIL_PARTICLE_COUNT,
  EXPLOSION_PARTICLE_COUNT,
  SPLATTER_COUNT,
  PLAYER_SIZE,
  EXPLOSION_PARTICLE_LIFETIME,
  EXPLOSION_SPEED,
  PARTICLES_PER_EXPLOSION,
  SPLATTER_LIFETIME,
  TRAIL_PARTICLE_LIFETIME,
} from "./constants.js";

export function initParticles() {
  state.swordTrailContainer = new THREE.Group();
  state.scene.add(state.swordTrailContainer);
  const trailParticleGeo = new THREE.PlaneGeometry(0.2, 0.2);
  for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      emissive: 0x88ddff,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const particleMesh = new THREE.Mesh(trailParticleGeo, particleMat);
    particleMesh.visible = false;
    state.swordTrailContainer.add(particleMesh);
    state.swordTrailParticles.push({ mesh: particleMesh, lifetime: 0 });
  }
  state.explosionContainer = new THREE.Group();
  state.scene.add(state.explosionContainer);
  const explosionParticleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
    });
    const particleMesh = new THREE.Mesh(explosionParticleGeo, particleMat);
    particleMesh.visible = false;
    state.explosionContainer.add(particleMesh);
    state.explosionParticles.push({
      mesh: particleMesh,
      lifetime: 0,
      velocity: new THREE.Vector3(),
    });
  }

  state.splatterContainer = new THREE.Group();
  state.scene.add(state.splatterContainer);
  const splatterGeo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < SPLATTER_COUNT; i++) {
    const splatterTexture =
      state.splatterTextures[
        Math.floor(Math.random() * state.splatterTextures.length)
      ];

    const material = new THREE.MeshStandardMaterial({
      map: splatterTexture,
      color: 0xff0000,
      transparent: false,
      opacity: 0.9,

      alphaTest: 0.5,
    });
    const decal = new THREE.Mesh(splatterGeo, material);
    decal.renderOrder = 1;
    decal.visible = false;
    state.splatterContainer.add(decal);
    state.splatters.push({ mesh: decal, lifetime: 0 });
  }
}

export function clearSplatters() {
  for (const splatter of state.splatters) {
    splatter.mesh.visible = false;
    splatter.lifetime = 0;
  }
  state.nextSplatIndex = 0;
}

function showSplat(splatterData) {
  const decal = state.splatters[state.nextSplatIndex];
  if (!decal) return;

  decal.mesh.position.fromArray(splatterData.position);
  decal.mesh.scale.set(splatterData.size, splatterData.size, splatterData.size);

  if (splatterData.onWall) {
    decal.mesh.quaternion.fromArray(splatterData.quaternion);
  } else {
    decal.mesh.rotation.set(
      splatterData.rotation.x,
      splatterData.rotation.y,
      splatterData.rotation.z,
    );
  }

  decal.lifetime = -1; // Persistent
  decal.mesh.visible = true;
  decal.mesh.material.opacity = splatterData.opacity;
  state.nextSplatIndex = (state.nextSplatIndex + 1) % SPLATTER_COUNT;
}

export function loadSplattersForRoom(room) {
  clearSplatters();
  if (room && room.splatters) {
    room.splatters.forEach(showSplat);
  }
}

export function createSplat(
  position,
  size,
  count,
  onWall = false,
  wallNormal = null,
) {
  const currentRoom = state.map.grid[state.currentRoom.y][state.currentRoom.x];
  if (!currentRoom) return;

  for (let i = 0; i < count; i++) {
    const randomSize = size * (0.5 + Math.random() * 0.8);
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * size * 2,
      0,
      (Math.random() - 0.5) * size * 2,
    );
    const splatterPosition = new THREE.Vector3()
      .copy(position)
      .add(randomOffset);
    const rotation = onWall
      ? null
      : { x: -Math.PI / 2, y: 0, z: Math.random() * Math.PI * 2 };
    const quaternion = onWall
      ? new THREE.Quaternion()
          .setFromUnitVectors(new THREE.Vector3(0, 0, 1), wallNormal)
          .toArray()
      : null;

    const splatterData = {
      position: splatterPosition.toArray(),
      size: randomSize,
      onWall,
      quaternion,
      rotation,
      opacity: 0.6 + Math.random() * 0.2,
    };
    currentRoom.splatters.push(splatterData);
    showSplat(splatterData);
  }
}

export function createImpactFlare(position) {
  const flareParticleCount = 8;
  for (let i = 0; i < flareParticleCount; i++) {
    const particle = state.explosionParticles[state.nextExplosionParticleIndex];
    particle.mesh.position.copy(position);

    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME * 0.3;
    particle.mesh.visible = true;
    particle.mesh.material.color.setHex(0xaaddff);

    particle.velocity
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * 1.5);

    state.nextExplosionParticleIndex =
      (state.nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

export function createPlayerExplosion(position) {
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    const particle = state.explosionParticles[state.nextExplosionParticleIndex];
    particle.mesh.position.copy(position);
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME * 1.5;
    particle.mesh.visible = true;
    const color = Math.random() > 0.3 ? 0xffffff : 0x00aaff;
    particle.mesh.material.color.setHex(color);

    particle.velocity
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * (0.8 + Math.random() * 0.7));

    state.nextExplosionParticleIndex =
      (state.nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

export function createPlayerHitExplosion(position) {
  for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
    const particle = state.explosionParticles[state.nextExplosionParticleIndex];
    particle.mesh.position.copy(position);
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME * 0.5;
    particle.mesh.visible = true;
    particle.velocity
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * 0.5);
    state.nextExplosionParticleIndex =
      (state.nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

export function createEnemyExplosion(position) {
  createSplat(position, PLAYER_SIZE * 0.8, 5);
  createSplat(position, PLAYER_SIZE * 0.4, 8);
}

export function createDebrisSplat(position) {
  const decal = state.splatters[state.nextSplatIndex];
  decal.mesh.position.set(position.x, 0.01, position.z);
  decal.mesh.rotation.z = Math.random() * Math.PI * 2;
  decal.lifetime = SPLATTER_LIFETIME;
  decal.mesh.visible = true;
  decal.mesh.material.opacity = 0.5;
  state.nextSplatIndex = (state.nextSplatIndex + 1) % SPLATTER_COUNT;
}

export function updateSwordTrail(deltaTime) {
  for (const particle of state.swordTrailParticles) {
    if (particle.lifetime > 0) {
      particle.lifetime -= deltaTime;
      const lifeRatio = particle.lifetime / TRAIL_PARTICLE_LIFETIME;
      particle.mesh.material.opacity = 0.6 * lifeRatio;
      const scale = 1.5 * lifeRatio;
      particle.mesh.scale.set(scale, scale, scale);
      particle.mesh.lookAt(state.camera.position);
      if (particle.lifetime <= 0) {
        particle.mesh.visible = false;
      }
    }
  }
}
export function updateExplosionParticles(deltaTime) {
  for (const particle of state.explosionParticles) {
    if (particle.lifetime > 0) {
      particle.lifetime -= deltaTime;
      particle.velocity.y -= 20 * deltaTime;
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime),
      );
      particle.mesh.material.opacity =
        particle.lifetime / EXPLOSION_PARTICLE_LIFETIME;
      if (particle.lifetime <= 0) {
        particle.mesh.visible = false;
      }
    }
  }
}

export function updateSplatters(deltaTime) {
  for (const decal of state.splatters) {
    if (decal.lifetime > 0) {
      decal.lifetime -= deltaTime;
      decal.mesh.material.opacity = 0.5 * (decal.lifetime / SPLATTER_LIFETIME);
      if (decal.lifetime <= 0) {
        decal.mesh.visible = false;
      }
    }
  }
}

import { state } from "./state.js";
import {
  TRAIL_PARTICLE_COUNT,
  EXPLOSION_PARTICLE_COUNT,
  DEBRIS_COUNT,
  PLAYER_SIZE,
  EXPLOSION_PARTICLE_LIFETIME,
  EXPLOSION_SPEED,
  PARTICLES_PER_EXPLOSION,
  DEBRIS_LIFETIME,
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

  state.debrisContainer = new THREE.Group();
  state.scene.add(state.debrisContainer);
  const debrisGeo = new THREE.CircleGeometry(PLAYER_SIZE / 2, 16);
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const decal = new THREE.Mesh(debrisGeo, material);
    decal.rotation.x = -Math.PI / 2;
    decal.visible = false;
    state.debrisContainer.add(decal);
    state.debrisDecals.push({ mesh: decal, lifetime: 0 });
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
  for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
    const particle = state.explosionParticles[state.nextExplosionParticleIndex];
    particle.mesh.position.copy(position);
    particle.lifetime = EXPLOSION_PARTICLE_LIFETIME;
    particle.mesh.visible = true;
    particle.velocity
      .set(Math.random() - 0.5, Math.random() * 1.5, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(EXPLOSION_SPEED * (0.5 + Math.random() * 0.5));

    state.nextExplosionParticleIndex =
      (state.nextExplosionParticleIndex + 1) % EXPLOSION_PARTICLE_COUNT;
  }
}

export function createDebrisSplat(position) {
  const decal = state.debrisDecals[state.nextDebrisIndex];
  decal.mesh.position.set(position.x, 0.01, position.z);
  decal.mesh.rotation.z = Math.random() * Math.PI * 2;
  decal.lifetime = DEBRIS_LIFETIME;
  decal.mesh.visible = true;
  decal.mesh.material.opacity = 0.5;
  state.nextDebrisIndex = (state.nextDebrisIndex + 1) % DEBRIS_COUNT;
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

export function updateDebris(deltaTime) {
  for (const decal of state.debrisDecals) {
    if (decal.lifetime > 0) {
      decal.lifetime -= deltaTime;
      decal.mesh.material.opacity = 0.5 * (decal.lifetime / DEBRIS_LIFETIME);
      if (decal.lifetime <= 0) {
        decal.mesh.visible = false;
      }
    }
  }
}

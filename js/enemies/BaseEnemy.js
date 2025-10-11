// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/enemies/BaseEnemy.js
import { state } from "../modules/state.js";
import {
  HEALTH_BAR_WIDTH,
  HEALTH_BAR_HEIGHT,
  HEALTH_BAR_VISIBILITY_DURATION,
} from "../modules/constants.js";
import { createEnemyExplosion } from "../modules/particles.js";

export class BaseEnemy {
  constructor(spawnPosition) {
    this.mesh = null;
    this.velocity = new THREE.Vector3();
    this.health = 10;
    this.maxHealth = 10;
    this.healthBarVisibleTimer = 0;

    const healthBarBGMaterial = new THREE.SpriteMaterial({ color: 0x330000 });
    this.healthBarBG = new THREE.Sprite(healthBarBGMaterial);
    this.healthBarBG.scale.set(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);

    const healthBarMaterial = new THREE.SpriteMaterial({ color: 0xff0000 });
    this.healthBar = new THREE.Sprite(healthBarMaterial);
    this.healthBar.scale.set(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);
    this.healthBar.position.z = 0.1;

    this.healthBarGroup = new THREE.Group();
    this.healthBarGroup.add(this.healthBarBG);
    this.healthBarGroup.add(this.healthBar);
    this.healthBarGroup.visible = false;
  }
  update(deltaTime, playerPosition) {
    if (state.isTransitioning) return;
    if (this.healthBarVisibleTimer > 0) {
      this.healthBarVisibleTimer -= deltaTime;
      if (this.healthBarVisibleTimer <= 0) {
        this.healthBarGroup.visible = false;
      }
    }
    if (this.healthBarGroup.visible) {
      const targetScaleX = (this.health / this.maxHealth) * HEALTH_BAR_WIDTH;
      this.healthBar.scale.x +=
        (targetScaleX - this.healthBar.scale.x) * 7 * deltaTime;
    }
  }
  destroy() {
    state.reusableVector1.copy(this.mesh.position);
    state.reusableVector1.y = 0;
    createEnemyExplosion(state.reusableVector1);
    state.scene.remove(this.mesh);
    state.scene.remove(this.healthBarGroup);
  }
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    this.healthBarGroup.visible = true;
    this.healthBarVisibleTimer = HEALTH_BAR_VISIBILITY_DURATION;
    return this.health <= 0;
  }
}

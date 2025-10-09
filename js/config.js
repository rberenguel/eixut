// --- SCENE SETUP ---
let scene, camera, renderer, player, shield, arenaBounds;
const clock = new THREE.Clock();

// --- GAME OBJECTS ---
let enemies = [];
let bullets = [];
let sword, swordPivot, swordTip;
let attackRangeIndicator;
let swordTrailParticles = [];
let swordTrailContainer;
let explosionParticles = [];
let explosionContainer;
let debrisDecals = [];
let debrisContainer;

// --- CONSTANTS ---
const ARENA_WIDTH = 20;
const ARENA_DEPTH = 20;
const MAX_ENEMIES = 20;
const MAX_SPHERE_ENEMIES = 3;
const PLAYER_SIZE = 0.8;
const PLAYER_DAMAGE = 10;
const PLAYER_DEATH_DURATION = 1.5;
const CONE_ENEMY_HEALTH = 14;
const SPHERE_ENEMY_HEALTH = 28;
const HEALTH_BAR_WIDTH = 1.5;
const HEALTH_BAR_HEIGHT = 0.15;
const HEALTH_BAR_VISIBILITY_DURATION = 2.0;
const CONE_ENEMY_HEIGHT = PLAYER_SIZE * 2.0;
const DASH_DISTANCE = 4;
const DASH_SPEED = 25;
const ATTACK_DISTANCE = DASH_DISTANCE;
const ATTACK_SPEED = 33;
const SWORD_LENGTH = 2.0;
const SWORD_ARC_DURATION = 0.3;
const SWORD_ACTIVATION_DISTANCE_RATIO = 0.1;
const ATTACK_COOLDOWN = 1.0; 
const HARD_ATTACK_DAMAGE_MULTIPLIER = 1.5;
const HARD_ATTACK_COOLDOWN_MULTIPLIER = 1.5;
const ENEMY_SPEED = 1.0;
const ENEMY_ATTACK_CHARGE_TIME = 0.8; 
const ENEMY_PRE_FIRE_TIME = 0.15;
const SPHERE_ENEMY_WANDER_SPEED = 1.5;
const SPHERE_ENEMY_DASH_SPEED = 18;
const SPHERE_ENEMY_CHARGE_TIME = 0.6;
const SPHERE_ENEMY_MIN_ACTION_INTERVAL = 2.0;
const BULLET_SPEED = 7;
const BULLET_SIZE = 0.2;
const HOLD_DURATION_MS = 250;
const LONG_HOLD_DURATION_MS = 750;
const SHIELD_DURATION = 0.5;
const SHIELD_RADIUS = PLAYER_SIZE * 1.5;
const SHIELD_STUN_DURATION = 1.0;
const REFLECTED_BULLET_SPEED_MULTIPLIER = 1.5;
const TRAIL_PARTICLE_COUNT = 50;
const TRAIL_PARTICLE_LIFETIME = 0.4;
const EXPLOSION_PARTICLE_COUNT = 45; 
const PARTICLES_PER_EXPLOSION = 15;
const EXPLOSION_PARTICLE_LIFETIME = 0.8;
const EXPLOSION_SPEED = 8;
const PLAYER_INVINCIBILITY_DURATION = 0.2;
const DEBRIS_COUNT = 30;
const DEBRIS_LIFETIME = 5.0;
const SCREEN_SHAKE_DURATION = 0.15;
const SCREEN_SHAKE_INTENSITY = 8;
const SCREEN_SHAKE_INTENSITY_HARD = 20;
const PLAYER_ROTATION_SPEED = 10;
const ARENA_BORDER_FLASH_DURATION = 0.5;


// --- GAME STATE ---
let playerHealth = 3;
let enemiesKilled = 0;
let sphereEnemyCount = 0;
let playerInvincibilityTimer = 0;
let attackCooldownTimer = 0;
let shieldTimer = 0;
let screenShakeTimer = 0;
let arenaBorderFlashTimer = 0;
let cameraOffset = new THREE.Vector3(0, 15, 15);
let isHolding = false;
let isHardCharging = false;
let isDashing = false;
let isAttacking = false;
let isFirstSwordFrame = true;
let currentAttackDamage = PLAYER_DAMAGE;
let gameState = 'paused'; // 'paused', 'playing', 'playerDying', 'gameOver'
let gameOverTimer = 0;
let dashStartPosition = new THREE.Vector3();
let dashDirection = new THREE.Vector3();
let targetQuaternion = new THREE.Quaternion();
let attackStartPosition = new THREE.Vector3();
let attackDirection = new THREE.Vector3();
let swipeStartTime = 0;
let holdStartTime = 0;
let swordRotationTimer = 0;
let nextTrailParticleIndex = 0;
let nextExplosionParticleIndex = 0;
let nextDebrisIndex = 0;
let hitEnemiesInAttack = [];
let startCoords = null;
let lastSwordTipPosition = new THREE.Vector3();

// --- REUSABLE OBJECTS ---
let reusableVector1 = new THREE.Vector3();
let reusableVector2 = new THREE.Vector3();
let reusableVector3 = new THREE.Vector3();

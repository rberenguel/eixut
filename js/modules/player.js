import { state } from "./state.js";
import {
  PLAYER_SIZE,
  SHIELD_RADIUS,
  SWORD_LENGTH,
  DASH_DISTANCE,
  PLAYER_HEALTH,
} from "./constants.js";

export function createPlayer() {
  const geometry = new THREE.BoxGeometry(
    0.5 * PLAYER_SIZE,
    0.5 * PLAYER_SIZE * 2,
    0.5 * PLAYER_SIZE,
  );
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  state.player = new THREE.Mesh(geometry, material);
  state.player.position.set(0, 0.5 * PLAYER_SIZE, 0);
  state.player.name = "playerBody";
  state.player.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    ),
  );

  const shieldGeometry = new THREE.SphereGeometry(
    SHIELD_RADIUS,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const shieldMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x00aaff) },
      uOpacity: { value: 0.9 },
    },
    vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewVector;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vViewVector = normalize(cameraPosition - worldPosition.xyz);
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
            uniform vec3 uColor;
            uniform float uOpacity;
            varying vec3 vNormal;
            varying vec3 vViewVector;
            void main() {
                float fresnelTerm = 1.0 - dot(vNormal, vViewVector);
                fresnelTerm = pow(fresnelTerm, 2.5);
                gl_FragColor = vec4(uColor, fresnelTerm * uOpacity);
            }
        `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  state.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
  state.shield.visible = false;
  state.player.add(state.shield);

  // Energy Indicators
  const innerRadius = PLAYER_SIZE * 0.8;
  const outerRadius = PLAYER_SIZE * 1.3;
  const indicatorGeo = new THREE.RingGeometry(innerRadius, outerRadius, 32);

  const vertexShader = `
    varying float vRadius;
    void main() {
        // 'position' is in local space. For a ring on the XY plane,
        // its distance from the center (0,0,0) is its radius.
        vRadius = length(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;
  const fragmentShader = `
    uniform vec3 uColor;
    uniform float innerRadius;
    uniform float outerRadius;
    varying float vRadius;
    void main() {
        // Create a gradient that is fully opaque at the inner radius
        // and fades to fully transparent at the outer radius.
        float gradient = smoothstep(outerRadius, innerRadius, vRadius);
        gl_FragColor = vec4(uColor, gradient * 0.35); // Keep it subtle
    }
    `;

  const attackIndicatorMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x00aaff) },
      innerRadius: { value: innerRadius },
      outerRadius: { value: outerRadius },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });

  state.attackIndicator = new THREE.Mesh(indicatorGeo, attackIndicatorMat);
  state.attackIndicator.rotation.x = -Math.PI / 2;
  state.attackIndicator.position.y = -PLAYER_SIZE / 2 + 0.01;
  state.attackIndicator.visible = false;
  state.player.add(state.attackIndicator);

  const shieldIndicatorMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x00ff00) },
      innerRadius: { value: innerRadius },
      outerRadius: { value: outerRadius },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });

  state.shieldIndicator = new THREE.Mesh(
    indicatorGeo.clone(),
    shieldIndicatorMat,
  );
  state.shieldIndicator.rotation.x = -Math.PI / 2;
  state.shieldIndicator.position.y = -PLAYER_SIZE / 2 + 0.01;
  state.shieldIndicator.visible = false;
  state.player.add(state.shieldIndicator);

  state.swordPivot = new THREE.Object3D();
  state.player.add(state.swordPivot);

  const swordGeometry = new THREE.BoxGeometry(0.1, 0.1, SWORD_LENGTH);
  const swordMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
  });
  state.sword = new THREE.Mesh(swordGeometry, swordMaterial);
  state.sword.position.z = SWORD_LENGTH / 2;
  state.swordPivot.add(state.sword);
  state.sword.visible = false;

  state.swordTip = new THREE.Object3D();
  state.swordTip.position.z = SWORD_LENGTH;
  state.swordPivot.add(state.swordTip);

  state.shotgunPivot = new THREE.Object3D();
  state.player.add(state.shotgunPivot);

  const shotgunStickGeometry = new THREE.BoxGeometry(0.05, 0.05, SWORD_LENGTH);
  const shotgunStickMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
  });
  state.shotgunStick = new THREE.Mesh(
    shotgunStickGeometry,
    shotgunStickMaterial,
  );
  state.shotgunStick.position.z = SWORD_LENGTH / 2;
  state.shotgunPivot.add(state.shotgunStick);
  state.shotgunStick.visible = false;

  const ringRadius = DASH_DISTANCE + SWORD_LENGTH / 2;
  const ringGeo = new THREE.RingGeometry(
    ringRadius - 0.1,
    ringRadius + 0.1,
    64,
  );
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    side: THREE.DoubleSide,
    transparent: true,
  });
  state.attackRangeIndicator = new THREE.Mesh(ringGeo, ringMat);
  state.attackRangeIndicator.rotation.x = -Math.PI / 2;
  state.attackRangeIndicator.visible = false;
  state.scene.add(state.attackRangeIndicator);
  state.player.castShadow = true;
  state.player.renderOrder = 2;
  state.scene.add(state.player);
}

export function updatePlayerHealthColor() {
  if (state.playerInvincibilityTimer > 0) return;
  switch (state.playerHealth) {
    case 3:
      state.player.material.color.setHex(0xffffff);
      break;
    case 2:
      state.player.material.color.setHex(0xbbbbbb);
      break;
    case 1:
      state.player.material.color.setHex(0x888888);
      break;
    default:
      state.player.material.color.setHex(0x555555);
      break;
  }
}

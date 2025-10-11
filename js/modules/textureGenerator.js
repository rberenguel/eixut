// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/modules/textureGenerator.js
function createSplatter(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const mainRadius = width * (0.15 + Math.random() * 0.1);
  const droplets = 50 + Math.random() * 50;

  // Main splatter
  for (let i = 0; i < droplets; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * mainRadius;
    const distance = Math.random() * (width / 2 - mainRadius);
    const x =
      centerX + Math.cos(angle) * (mainRadius + distance * Math.random());
    const y =
      centerY + Math.sin(angle) * (mainRadius + distance * Math.random());

    const dropletRadius =
      radius * (0.2 + Math.random() * 0.8) * (1 - distance / (width / 2));

    ctx.beginPath();
    ctx.arc(x, y, dropletRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 0, 0, ${0.4 + Math.random() * 0.4})`;
    ctx.fill();
  }
}

export function generateSplatterTextures(count = 5, size = 128) {
  const textures = [];
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < count; i++) {
    createSplatter(ctx, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    textures.push(texture);
  }

  return textures;
}

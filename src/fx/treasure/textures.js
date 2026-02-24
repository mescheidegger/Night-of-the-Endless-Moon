// Minimum/default particle texture size used for procedural generation.
const DEFAULT_SIZE = 12;

/**
 * Ensure a particle texture exists in the scene texture manager.
 *
 * If the key already exists, this function is a no-op and returns the key.
 * Otherwise it generates a simple coin-like circle texture for runtime fallback use.
 */
export function ensureTreasureParticleTexture(scene, {
  textureKey,
  size = DEFAULT_SIZE,
  fillColor = 0xffd166,
  highlightColor = 0xfff2b0,
  outlineColor = 0xd4a73a
} = {}) {
  // Guard against invalid inputs or missing Phaser subsystems.
  if (!scene?.textures || !textureKey) return null;

  // Respect preloaded assets: never overwrite existing keys.
  if (scene.textures.exists(textureKey)) return textureKey;

  const texSize = Math.max(2, Number(size) || DEFAULT_SIZE);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Base body.
  g.fillStyle(fillColor, 1);
  g.fillCircle(texSize / 2, texSize / 2, texSize / 2);

  // Small specular highlight.
  g.fillStyle(highlightColor, 1);
  g.fillCircle(texSize / 2 - 2, texSize / 2 - 2, 2);

  // Outline ring for better contrast.
  g.lineStyle(1, outlineColor, 1);
  g.strokeCircle(texSize / 2, texSize / 2, texSize / 2 - 0.5);

  g.generateTexture(textureKey, texSize, texSize);
  g.destroy();

  return textureKey;
}

/**
 * Resolve the best texture key for a treasure FX variant.
 *
 * Policy:
 * 1) use preloaded texture when present
 * 2) otherwise warn (optional) and generate deterministic procedural fallback
 */
export function resolveTreasureTextureKey(scene, variantConfig = {}, { debug = true } = {}) {
  const textureKey = variantConfig?.textureKey;
  if (!textureKey) return null;

  if (scene?.textures?.exists?.(textureKey)) {
    return textureKey;
  }

  if (debug) {
    console.warn('[TreasureModalFx] Missing texture key requested by variant; using procedural fallback.', {
      textureKey
    });
  }

  return ensureTreasureParticleTexture(scene, {
    textureKey,
    ...(variantConfig?.particle ?? {})
  });
}

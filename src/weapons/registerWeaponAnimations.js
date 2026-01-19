import { WeaponRegistry } from './WeaponRegistry.js';

/** Provide ensureSpriteSheetFromAtlas so callers can reuse shared logic safely. */
function ensureSpriteSheetFromAtlas(scene, projectileConfig) {
  const { atlas, atlasFrame, texture, frameWidth, frameHeight, frameCount } =
    projectileConfig || {};
  if (!atlas || !atlasFrame || !texture || !frameWidth || !frameHeight) return;

  const texMgr = scene.textures;

  if (texMgr.exists(texture)) return;

  texMgr.addSpriteSheetFromAtlas(texture, {
    atlas,
    frame: atlasFrame,
    frameWidth,
    frameHeight,
    endFrame: frameCount && frameCount > 0 ? frameCount - 1 : undefined
  });
}

/** Provide registerWeaponAnimations so callers can reuse shared logic safely. */
export function registerWeaponAnimations(scene) {
  if (!scene) return;

  Object.values(WeaponRegistry).forEach((weapon) => {
    const projectile = weapon?.projectile;
    if (!projectile) return;

    if (projectile.atlas && projectile.atlasFrame) {
      ensureSpriteSheetFromAtlas(scene, projectile);
    }

    const textureKey = projectile.texture;
    const animKey = projectile.animKey;
    if (!textureKey || !animKey) return;

    if (!scene.textures.exists(textureKey) || scene.anims.exists(animKey)) return;

    const frameCount =
      projectile.frameCount && projectile.frameCount > 0
        ? projectile.frameCount
        : undefined;
    const endFrame = frameCount ? frameCount - 1 : undefined;

    scene.anims.create({
      key: animKey,
      frames:
        endFrame !== undefined
          ? scene.anims.generateFrameNumbers(textureKey, { start: 0, end: endFrame })
          : scene.anims.generateFrameNumbers(textureKey),
      frameRate: projectile.frameRate ?? 12,
      repeat: projectile.repeat ?? 0
    });
  });
}

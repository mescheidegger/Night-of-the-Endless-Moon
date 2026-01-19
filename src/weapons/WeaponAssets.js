/**
 * Loads all weapon-related assets (icons, projectile sprites, FX sprites, explosion sprites)
 * defined in a registry. This is typically called in a BootScene / PreloadScene before
 * gameplay begins so that all weapon textures are ready when the main game scene starts.
 *
 * The loader is *data-driven*:
 *  - It inspects each weapon entry in the registry
 *  - If a texture/path pair is present and not yet loaded, it enqueues the appropriate
 *    loader call (image vs spritesheet) based on the presence of frameWidth/height.
 *
 * @param {Phaser.Scene} scene   - The loading scene responsible for loading textures.
 * @param {Object} registry      - Weapon registry object where each entry describes a weapon's assets.
 */
export function loadWeaponAssets(scene, registry) {
  // Defensive guard: if something is misconfigured, bail quietly.
  if (!scene || !registry) return;

  // Iterate every weapon entry in the registry. Each entry is expected to contain
  // projectile, ui.icon, and fx sections (depending on weapon type).
  Object.values(registry).forEach((entry) => {
    // ---------------------------------------------------------------------------
    // PROJECTILE TEXTURE (main projectile visual)
    // ---------------------------------------------------------------------------
    const projectile = entry?.projectile;
    const projectileTexture = projectile?.texture;
    const projectilePath = projectile?.path;
    const fw = projectile?.frameWidth;
    const fh = projectile?.frameHeight;
    const fromAtlas = !!projectile?.atlas && !!projectile?.atlasFrame;

    // Only load if we have a key + path and the texture isn’t already in the cache.
    if (!fromAtlas && projectileTexture && projectilePath && !scene.textures.exists(projectileTexture)) {
      // If frame dimensions are provided, treat it as a spritesheet (animation).
      // Otherwise load as a single-frame image.
      if (fw && fh) {
        scene.load.spritesheet(projectileTexture, projectilePath, { frameWidth: fw, frameHeight: fh });
      } else {
        scene.load.image(projectileTexture, projectilePath);
      }
    }

    // ---------------------------------------------------------------------------
    // EXPLOSION TEXTURE (optional explosion visual for projectile impacts)
    // ---------------------------------------------------------------------------
    // This allows a weapon to define a *separate* explosion sprite/image under:
    //   entry.projectile.explosion.{ texture, path, frameWidth, frameHeight }
    // Example: magic potion impact animation sheet.
    const explosionTexture = entry?.projectile?.explosion?.texture;
    const explosionPath = entry?.projectile?.explosion?.path;
    const eFw = entry?.projectile?.explosion?.frameWidth;
    const eFh = entry?.projectile?.explosion?.frameHeight;

    // Same pattern: if a texture + path is provided for the explosion and it
    // isn’t already loaded, enqueue it. This is what lets explosion animation
    // code just reference explosionTexture without having its own loader logic.
    if (explosionTexture && explosionPath && !scene.textures.exists(explosionTexture)) {
      // Spritesheet vs image is decided by whether frame dimensions are present.
      if (eFw && eFh) {
        scene.load.spritesheet(explosionTexture, explosionPath, { frameWidth: eFw, frameHeight: eFh });
      } else {
        scene.load.image(explosionTexture, explosionPath);
      }
    }

    // ---------------------------------------------------------------------------
    // UI ICON (weapon selection / loadout HUD icon)
    // ---------------------------------------------------------------------------
    // Usually a small standalone image, but could also reuse a frame from a
    // larger spritesheet if you choose to change the format later.
    const iconMeta = entry?.ui?.icon;
    const iconKey = iconMeta?.key;
    const iconPath = iconMeta?.path; // optional if you want a separate icon file
    const hasAtlas = !!iconMeta?.atlas;
    if (!hasAtlas && iconKey && iconPath && !scene.textures.exists(iconKey)) {
      scene.load.image(iconKey, iconPath);
    }

    // ---------------------------------------------------------------------------
    // FX (muzzle flash + impact FX)
    // ---------------------------------------------------------------------------
    // Muzzle FX: small flash at weapon origin when firing.
    const muzzleKey = entry?.fx?.muzzleKey ?? entry?.fx?.muzzle;
    const muzzlePath = entry?.fx?.muzzlePath;
    if (muzzleKey && muzzlePath && !scene.textures.exists(muzzleKey)) {
      scene.load.image(muzzleKey, muzzlePath);
    }

    // Impact FX: small spark / hit marker at projectile impact point.
    const impactKey = entry?.fx?.impactKey ?? entry?.fx?.impact;
    const impactPath = entry?.fx?.impactPath;
    if (impactKey && impactPath && !scene.textures.exists(impactKey)) {
      scene.load.image(impactKey, impactPath);
    }
  });
}

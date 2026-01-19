import { HERO_ATLAS_KEY } from './HeroAtlasConfig.js';
import { buildHeroSheetKey } from './HeroAtlasConfig.js';
import { getHeroEntry, listHeroes } from './HeroRegistry.js';

/**
 * Normalize a registry input into a resolved list of hero entries so loaders
 * can accept either custom registry objects or the global defaults.
 */
function normalizeHeroes(registry) {
  if (!registry) return listHeroes();
  return Object.values(registry)
    .map((entry) => (entry?.key ? getHeroEntry(entry.key) : entry))
    .filter(Boolean);
}

/**
 * Load every hero texture defined in the registry.  BootScene calls this once
 * so gameplay scenes can assume hero animations exist by the time they boot.
 */
export function loadHeroAssets(scene, registry = null) {
  const heroes = normalizeHeroes(registry);

  heroes.forEach((hero) => {
    const ui = hero.ui ?? {};

    /**
     * Hero selection screens rely on tiny UI sprites (icon + optional portrait).
     * They are deliberately independent from the gameplay spritesheets so
     * BootScene can load a lightweight subset without touching combat assets.
     *
     * When `frameWidth`/`frameHeight` metadata is missing we default to
     * `load.image` which is cheaper than a spritesheet registration.
     */
    const maybeLoadImage = (asset) => {
      if (!asset?.key || !asset?.path) {
        return; // Skip incomplete definitions to keep the loader resilient.
      }

      // Atlas-backed frames are already loaded globally; skip per-hero loaders.
      if (asset.key === HERO_ATLAS_KEY || typeof asset.frame === 'string') {
        return;
      }

      if (asset.type === 'image' || (!asset.frameWidth && !asset.frameHeight)) {
        scene.load.image(asset.key, asset.path);
      } else {
        scene.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight
        });
      }
    };

    // Load both icon and portrait art (if present). Fallback rendering handles missing assets gracefully.
    maybeLoadImage(ui.icon);
    maybeLoadImage(ui.portrait);
  });
}

/**
 * Guarantee that atlas-backed hero sheets are registered as individual textures
 * so animation systems can reference them like standard spritesheets.
 */
export function ensureHeroSheetTextures(scene, registry = null) {
  const heroes = normalizeHeroes(registry);
  const atlasTexture = scene.textures.get(HERO_ATLAS_KEY);

  if (!atlasTexture) {
    console.warn('[HeroAssets] Missing hero atlas texture:', HERO_ATLAS_KEY);
    return;
  }

  heroes.forEach((hero) => {
    const sheets = hero?.sheets ?? {};
    Object.entries(sheets).forEach(([sheetName, sheet]) => {
      const textureKey = sheet?.key ?? buildHeroSheetKey(hero.key, sheetName);
      const atlasFrame = sheet?.atlasFrame;

      if (!textureKey || !atlasFrame) return;
      if (scene.textures.exists(textureKey)) return;

      if (!sheet.frameWidth || !sheet.frameHeight || !sheet.frameCount) {
        console.warn('[HeroAssets] Incomplete sheet config', {
          heroKey: hero.key,
          sheetName,
          sheet
        });
        return;
      }

      if (!atlasTexture.has(atlasFrame)) {
        console.warn('[HeroAssets] Atlas frame missing', {
          heroKey: hero.key,
          sheetName,
          atlasFrame
        });
        return;
      }

      const frame = atlasTexture.get(atlasFrame);
      const atlasFrameWidth = frame?.width ?? 0;
      const atlasFrameHeight = frame?.height ?? 0;

      const columns = sheet.frameWidth ? atlasFrameWidth / sheet.frameWidth : 0;
      const rows = sheet.frameHeight ? atlasFrameHeight / sheet.frameHeight : 0;
      const maxFrames = Math.floor(columns) * Math.floor(rows);
      const fitsWidth = atlasFrameWidth % sheet.frameWidth === 0;
      const fitsHeight = atlasFrameHeight % sheet.frameHeight === 0;
      const requestedFrames = sheet.frameCount ?? maxFrames;
      const safeFrameCount = maxFrames > 0 ? Math.min(requestedFrames, maxFrames) : 0;

      if (!fitsWidth || !fitsHeight || requestedFrames > maxFrames) {
        console.warn('[HeroAssets] Atlas frame validation failed', {
          heroKey: hero.key,
          sheetName,
          atlasFrame,
          atlasFrameWidth,
          atlasFrameHeight,
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
          requestedFrames,
          maxFrames
        });
      }

      if (safeFrameCount <= 0) return;

      scene.textures.addSpriteSheetFromAtlas(textureKey, {
        atlas: HERO_ATLAS_KEY,
        frame: atlasFrame,
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
        endFrame: safeFrameCount - 1
      });
    });
  });
}

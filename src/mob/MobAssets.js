import { MobRegistry } from './MobRegistry.js';

/**
 * Load every mob texture defined in the registry. BootScene calls this once so
 * gameplay scenes can assume mob animations exist by the time they boot.
 */
export function loadMobAssets(scene, registry = MobRegistry) {
  const mobs = registry ? Object.values(registry) : Object.values(MobRegistry);

  // Walk each mob entry and enqueue any texture sheets it references.
  mobs.forEach(mob => {
    if (!mob) return;

    const loadedKeys = new Set();

    /**
     * Register a spritesheet or image for a mob sheet definition so the loader
     * always has the textures required by animation registration.
     */
    const enqueueSheet = (sheetConfig = {}, fallbackKey) => {
      const key = sheetConfig.key ?? sheetConfig.sheetKey ?? fallbackKey;
      const path = sheetConfig.path ?? sheetConfig.url ?? mob.sheetPath;
      if (!key || !path || loadedKeys.has(key)) return;

      loadedKeys.add(key);

      const frameWidth = sheetConfig.frameWidth ?? sheetConfig.frameConfig?.width ?? sheetConfig.frames?.width ?? sheetConfig.w ?? sheetConfig.width;
      const frameHeight = sheetConfig.frameHeight ?? sheetConfig.frameConfig?.height ?? sheetConfig.frames?.height ?? sheetConfig.h ?? sheetConfig.height;
      const type = sheetConfig.type;
      const hasFrameData = frameWidth != null && frameHeight != null;

      if (type === 'image' || (!hasFrameData && type !== 'spritesheet')) {
        scene.load.image(key, path);
      } else {
        scene.load.spritesheet(key, path, {
          frameWidth,
          frameHeight,
        });
      }
    };

    // New multi-sheet structure allows mobs to specify multiple texture sources.
    if (mob.sheets && typeof mob.sheets === 'object') {
      // Iterate every declared sheet so multi-asset mobs preload cleanly.
      Object.values(mob.sheets).forEach(sheetConfig => enqueueSheet(sheetConfig));
    }

    // Backwards compatibility: support legacy single-sheet configs.
    if (mob.sheetKey && (mob.sheet || mob.sheetPath)) {
      enqueueSheet(mob.sheet ?? {}, mob.sheetKey);
    }
  });
}

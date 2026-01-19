import { MobRegistry } from './MobRegistry.js';

/**
 * Idempotently declares every animation required by the registered mobs.
 *
 * The helper is called once per scene boot, but guards against duplicate
 * animation creation so restarting scenes (or pooling scenes in tests) does
 * not spam warnings.
 */
export function registerMobAnimations(scene) {
  const animManager = scene.anims;
  // Iterate each registered mob so every declared animation is created once.
  Object.values(MobRegistry).forEach(config => {
    (config.animations ?? []).forEach(def => {
      if (def.key && !animManager.exists(def.key)) {
        /**
         * Resolve the spritesheet key for this animation definition so callers
         * can refer to either legacy sheetKey or the multi-sheet config format.
         */
        const resolvedSheetKey = (() => {
          if (def.sheetKey) return def.sheetKey;
          if (def.sheet && config.sheets?.[def.sheet]) {
            return config.sheets[def.sheet]?.key;
          }
          return config.sheetKey;
        })();

        // Frame numbers are generated on demand from the sprite sheet defined
        // on the registry row.  Keeping the data-driven structure means adding
        // a new mob is as simple as extending the registry without touching
        // runtime logic.
        animManager.create({
          key: def.key,
          frames: resolvedSheetKey
            ? animManager.generateFrameNumbers(resolvedSheetKey, def.frames ?? { start: 0, end: 0 })
            : animManager.generateFrameNumbers(config.sheetKey, def.frames ?? { start: 0, end: 0 }),
          frameRate: def.frameRate ?? 8,
          repeat: def.repeat ?? -1,
        });
      }
    });
  });
}

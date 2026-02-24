/**
 * Shared baseline for all treasure modal particle variants.
 *
 * Each entry can override any subset of:
 * - textureKey (preferred preloaded texture)
 * - localX/localY (modal-local emitter anchor)
 * - particle (procedural fallback texture colors/size)
 * - emitter (Phaser particle emitter config)
 * - burst/pop timing values
 */
const BASE_BURST = {
  // Local modal offset: slightly below center so particles rise through the message area.
  localX: 0,
  localY: 18,

  // Procedural texture parameters used only when a texture key is missing at runtime.
  particle: {
    size: 12,
    fillColor: 0xffd166,
    highlightColor: 0xfff2b0,
    outlineColor: 0xd4a73a
  },

  // Default emitter profile: fast upward cone + gravity for coin-like spray.
  emitter: {
    angle: { min: 210, max: 330 },
    speed: { min: 160, max: 380 },
    gravityY: 900,
    rotate: { min: 0, max: 360 },
    scale: { start: 1.0, end: 0.6 },
    alpha: { start: 1.0, end: 0.0 },
    lifespan: { min: 450, max: 900 },
    xOffset: { min: -10, max: 10 },
    yOffset: { min: -6, max: 6 },
    quantity: 14,
    frequency: 50,
    maxParticles: 80
  },

  // Burst choreography timings.
  burstDurationMs: 260,
  popDelayMs: 140,
  popCount: 10,
  popFallbackDurationMs: 80
};

/**
 * Merge helper that preserves nested defaults for `particle` and `emitter`.
 */
const withOverrides = (overrides = {}) => ({
  ...BASE_BURST,
  ...overrides,
  particle: {
    ...BASE_BURST.particle,
    ...(overrides.particle ?? {})
  },
  emitter: {
    ...BASE_BURST.emitter,
    ...(overrides.emitter ?? {})
  }
});

/**
 * Variant map keyed by drop type.
 *
 * Keep this file data-only so adding a new treasure class is a config change,
 * not a modal/controller code change.
 */
export const TREASURE_FX_VARIANTS = {
  // Explicit default used when type is missing/unknown.
  default: withOverrides({
    textureKey: 'coin'
  }),

  // Current tier-1 treasure uses canonical coin art.
  treasure_1: withOverrides({
    textureKey: 'coin'
  }),

  // For now, all treasure tiers share canonical coin art while tuning differs by tier.
  treasure_2: withOverrides({
    textureKey: 'coin',
    particle: {
      fillColor: 0xffb347,
      highlightColor: 0xffd9a0,
      outlineColor: 0xd18116
    },
    emitter: {
      speed: { min: 180, max: 420 },
      quantity: 16
    }
  }),

  treasure_3: withOverrides({
    textureKey: 'coin',
    particle: {
      fillColor: 0x9af08f,
      highlightColor: 0xd9ffd3,
      outlineColor: 0x3f994f
    },
    emitter: {
      angle: { min: 200, max: 340 },
      speed: { min: 170, max: 360 },
      gravityY: 820,
      quantity: 18
    }
  }),

  treasure_4: withOverrides({
    textureKey: 'coin',
    particle: {
      fillColor: 0x77d9ff,
      highlightColor: 0xb9ecff,
      outlineColor: 0x2b7fa6
    },
    emitter: {
      angle: { min: 195, max: 345 },
      speed: { min: 200, max: 440 },
      gravityY: 780,
      quantity: 20,
      lifespan: { min: 520, max: 980 }
    }
  }),

  treasure_5: withOverrides({
    textureKey: 'coin',
    particle: {
      fillColor: 0xd79bff,
      highlightColor: 0xf1d5ff,
      outlineColor: 0x7d43a6
    },
    emitter: {
      angle: { min: 190, max: 350 },
      speed: { min: 220, max: 470 },
      gravityY: 760,
      quantity: 22,
      lifespan: { min: 560, max: 1020 }
    },
    burstDurationMs: 320,
    popDelayMs: 160,
    popCount: 14
  })
};

/**
 * Resolve a variant by type; returns `default` when key is unknown.
 */
export function getTreasureFxVariant(treasureType) {
  if (typeof treasureType === 'string' && TREASURE_FX_VARIANTS[treasureType]) {
    return TREASURE_FX_VARIANTS[treasureType];
  }

  return TREASURE_FX_VARIANTS.default;
}

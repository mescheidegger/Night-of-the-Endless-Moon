/**
 * Data-driven definitions for every decorative prop in the world.
 * Each entry describes how a prop should appear when rendered as a pooled
 * Phaser.Image — the PropSystem reads the fields to configure texture, depth,
 * transforms, and palette tweaks. Keeping the data centralized means new props
 * can be added without touching the spawning logic.
 */
import { PROP_OVERRIDES } from './PropConfig.js';
import { BLOODTHEME_FRAMES, GRAVETHEME_FRAMES } from './propAtlasFrames.js';

export const PROP_ATLASES = [
  {
    key: 'props_bloodtheme_atlas',
    imageURL: '/assets/sprites/props/bloodtheme.png',
    dataURL: '/assets/sprites/props/bloodtheme.json',
    frames: BLOODTHEME_FRAMES,
    theme: 'blood',
  },
  {
    key: 'props_gravetheme_atlas',
    imageURL: '/assets/sprites/props/gravetheme.png',
    dataURL: '/assets/sprites/props/gravetheme.json',
    frames: GRAVETHEME_FRAMES,
    theme: 'grave',
  },
];

/**
 * Build the prop registry from atlas frames and overrides for easy expansion.
 */
function createPropEntries(themeFilter = null) {
  const entries = {};

  for (const atlas of PROP_ATLASES) {
    const { key: atlasKey, frames = [], theme } = atlas;
    if (themeFilter && theme !== themeFilter) {
      continue;
    }

    frames.forEach((frame) => {
      const cleanFrame = frame.replace(/\.png$/i, '');
      const key = `${theme}_${cleanFrame}`;

      const overrides = PROP_OVERRIDES[key] || {};

      if (overrides.disabled) {
        return;
      }

      entries[key] = {
        key,
        weight: 1,
        size: undefined,
        depth: 1,
        scale: [1, 1],
        rotate: [0, 0],
        tint: null,
        atlas: atlasKey,
        frame,
        ...overrides,
      };
    });
  }

  return entries;
}

export const PropRegistry = createPropEntries();
export const PropRegistries = (() => {
  const registries = { all: PropRegistry };
  const themes = new Set(PROP_ATLASES.map((atlas) => atlas.theme).filter(Boolean));
  for (const theme of themes) {
    registries[theme] = createPropEntries(theme);
  }
  return registries;
})();

/**
 * Picks a random prop definition from the registry using weighted probability.
 *
 * @param {Record<string, object>} registry - Prop definitions to sample from.
 * @param {() => number} rng - Deterministic RNG that returns [0, 1).
 * @returns {object} A single prop configuration object.
 */
export function weightedPick(registry, rng) {
  const items = Object.values(registry);
  // Total spawn weight; default to 1 so empty registries still return something.
  const total = items.reduce((sum, it) => sum + (it.weight || 0), 0) || 1;
  let r = rng() * total;

  for (const it of items) {
    r -= (it.weight || 0);
    if (r <= 0) return it;
  }

  // Fallback in case of floating point slop: return the final entry.
  return items[items.length - 1];
}

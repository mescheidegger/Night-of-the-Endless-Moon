export const HERO_ATLAS_KEY = 'heros_atlas';
export const HERO_ATLAS_IMAGE_PATH = '/assets/sprites/heros/heros.png';
export const HERO_ATLAS_JSON_PATH = '/assets/sprites/heros/heros.json';

/**
 * Build a consistent atlas-derived texture key so hero sheets are predictable
 * across loaders, animation registration, and runtime lookups.
 */
export function buildHeroSheetKey(heroKey, sheetName) {
  return `hero_${heroKey}_${sheetName}`;
}

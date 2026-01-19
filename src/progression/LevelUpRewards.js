import { WeaponRegistry } from '../weapons/WeaponRegistry.js';
import { PassiveRegistry, isValidPassive } from '../passives/PassiveRegistry.js';
import { CONFIG } from '../config/gameConfig.js';
import * as WeaponProgression from '../weapons/WeaponProgression.js';

const PASSIVE_SEED_OFFSET = 0x9e3779b9;
const WEAPON_RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * Collect all weapon keys in the hero's progression table that unlock at or before
 * the current level.
 *
 * progression example:
 * {
 *   2: ["fireball"],
 *   4: ["shuriken", "bolt"]
 * }
 */
function collectProgressionKeys(progression, level) {
  if (!progression || typeof progression !== 'object') {
    return [];
  }

  const keys = [];

  for (const [lvlKey, weaponKeys] of Object.entries(progression)) {
    // Convert level key to integer (keys are stored as strings)
    const unlockLevel = Number.parseInt(lvlKey, 10);
    // Ignore invalid or future unlocks
    if (!Number.isFinite(unlockLevel) || unlockLevel > level) continue;
    // Only accept arrays at each progression step
    if (!Array.isArray(weaponKeys)) continue;
    // Add the eligible weapon keys
    keys.push(...weaponKeys);
  }

  return keys;
}

/**
 * Creates a deterministic pseudo-random generator from a given numeric seed.
 * This ensures that level-up choices are stable per run (not random every time).
 */
function makeSeededRandom(seed) {
  // Ensure seed is a uint32
  let state = seed >>> 0;

  return () => {
    // Xorshift-like PRNG
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // Convert to [0, 1) float
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle an array *deterministically* using a seeded RNG so that the
 * same seed yields the same shuffled ordering.
 */
function deterministicShuffle(array, seed) {
  const result = array.slice();
  const rnd = makeSeededRandom(seed);

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]; // Swap using destructuring
  }

  return result;
}

/**
 * Get a human-readable name for a weapon from the registry UI data.
 * Falls back to the weapon key if no UI name is set.
 */
function toDisplayName(entry, key) {
  const uiName = entry?.ui?.name;
  if (typeof uiName === 'string' && uiName.trim().length > 0) {
    return uiName;
  }
  return key;
}

/**
 * Filter + dedupe weapon candidates:
 * - Must be in the allowed list
 * - Must exist in WeaponRegistry
 * - Must NOT already be owned
 */
function normalizeWeaponCandidates(candidates, allowedSet, ownedSet) {
  const unique = new Set();
  const filtered = [];

  candidates.forEach((key) => {
    if (unique.has(key)) return; // skip duplicates
    unique.add(key);

    if (!allowedSet.has(key)) return; // hero isn't allowed to use it
    if (!WeaponRegistry[key]) return; // missing registry entry
    if (ownedSet.has(key)) return; // player already has it

    filtered.push(key);
  });

  return filtered;
}

/**
 * Filter and dedupe passive candidates while respecting stack caps and allowlists.
 */
function normalizePassiveCandidates(candidates, allowedSet, ownedCounts) {
  const unique = new Set();
  const filtered = [];

  candidates.forEach((key) => {
    if (unique.has(key)) return;
    if (!allowedSet.has(key)) return;
    if (!PassiveRegistry[key]) return;

    const maxStacks = Math.max(1, PassiveRegistry[key]?.maxStacks ?? 1);
    const owned = ownedCounts.get(key) ?? 0;
    if (owned >= maxStacks) return;

    unique.add(key);
    filtered.push(key);
  });

  return filtered;
}

/**
 * Build a passive stack count map using the loadout and optional resolver.
 */
function buildOwnedPassiveCounts(currentPassives, resolver) {
  const counts = new Map();
  const keys = Array.isArray(currentPassives) ? currentPassives : [];
  const getCount = typeof resolver === 'function' ? resolver : null;

  keys.forEach((key) => {
    if (!isValidPassive(key)) return;
    if (!counts.has(key) && getCount) {
      const resolved = getCount(key);
      if (Number.isFinite(resolved) && resolved > 0) {
        counts.set(key, resolved);
        return;
      }
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
}

/**
 * Build a deterministic seed from run start time and level for stable rolls.
 */
function buildSeed(scene, level, offset = 0) {
  const base = Number(scene?._runStartedAt ?? 0);
  const levelSeed = Number.isFinite(base) ? base + level : level;
  return (levelSeed + offset) >>> 0;
}

/**
 * Given a list of *new* weapon keys, gate them by rarity so that:
 * - Only the lowest rarity with any candidates is eligible.
 * - Higher-rarity weapons will not appear as "new" until lower tiers are owned.
 */
function gateNewWeaponsByRarity(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const buckets = new Map();

  candidates.forEach((key) => {
    const entry = WeaponRegistry[key];
    const rarityRaw = entry?.ui?.rarity ?? 'common';
    const rarity = typeof rarityRaw === 'string' ? rarityRaw.toLowerCase() : 'common';

    if (!buckets.has(rarity)) {
      buckets.set(rarity, []);
    }
    buckets.get(rarity).push(key);
  });

  // Find the first rarity tier that has any candidates.
  for (const rarity of WEAPON_RARITY_ORDER) {
    const bucket = buckets.get(rarity);
    if (bucket && bucket.length > 0) {
      return bucket;
    }
  }

  // Fallback: return the first non-empty bucket if rarities are non-standard.
  const firstEntry = buckets.entries().next();
  if (!firstEntry.done) {
    const [, bucket] = firstEntry.value;
    return bucket || [];
  }

  return [];
}

/**
 * Create weapon reward choices, mixing new items and upgrades deterministically.
 */
function getWeaponChoicesInternal({
  scene,
  heroEntry,
  level,
  currentLoadout = [],
  maxChoices = 3,
  getWeaponLevel
}) {
  // Determine which weapons the hero is allowed to ever equip
  const allowedKeys = Array.isArray(heroEntry?.weapons?.allowed)
    ? heroEntry.weapons.allowed
    : // fallback: all registered weapons
      Object.keys(WeaponRegistry);

  const allowedSet = new Set(allowedKeys.filter((key) => WeaponRegistry[key]));
  const ownedSet = new Set(currentLoadout);

  const ownedLevels = new Map();
  currentLoadout.forEach((key) => {
    const lvl = getWeaponLevel ? getWeaponLevel(key) : CONFIG.WEAPONS.DEFAULT_LEVEL;
    ownedLevels.set(key, lvl);
  });

  const maxLevel = CONFIG.WEAPONS.MAX_LEVEL ?? 5;

  // Detect if the hero has an explicit progression table
  const hasProgressionTable =
    heroEntry?.progression &&
    typeof heroEntry.progression === 'object' &&
    Object.keys(heroEntry.progression).length > 0;

  // Get all weapons unlocked up to this level
  let candidates = collectProgressionKeys(heroEntry?.progression, level);

  // Only fall back to all allowed weapons if there is NO progression table at all
  if (!candidates.length && !hasProgressionTable) {
    candidates = allowedKeys.slice();
  }

  // Filter out missing / disallowed / already owned weapons
  const newFiltered = normalizeWeaponCandidates(candidates, allowedSet, ownedSet);

  // RARITY GATE: only the lowest-rarity unowned weapons are eligible as "new"
  const gatedNew = gateNewWeaponsByRarity(newFiltered);

  const upgradeCandidates = [];
  ownedSet.forEach((key) => {
    const lvl = ownedLevels.get(key) ?? CONFIG.WEAPONS.DEFAULT_LEVEL;
    if (lvl < maxLevel && allowedSet.has(key) && WeaponRegistry[key]) {
      upgradeCandidates.push(key);
    }
  });

  const seedBase = buildSeed(scene, level, 0);
  const shuffledNew = deterministicShuffle(gatedNew, seedBase);
  const shuffledUpgrade = deterministicShuffle(upgradeCandidates, seedBase + 1337);

  const picks = [];
  const want = Math.max(0, maxChoices);
  const hasManyWeapons = currentLoadout.length >= 2;

  // IMPORTANT BEHAVIOR:
  // - Always prefer NEW weapons over upgrades when assembling weapon choices.
  if (hasManyWeapons) {
    // Fill with NEW weapons first (respecting rarity gate), then upgrades.
    shuffledNew.slice(0, want).forEach((key) => {
      const entry = WeaponRegistry[key];
      picks.push({
        type: 'weapon',
        subtype: 'new',
        key,
        name: toDisplayName(entry, key),
        rarity: entry?.ui?.rarity ?? 'common',
        description: entry?.ui?.description ?? '',
        ui: entry?.ui ?? null
      });
    });

    if (picks.length < want) {
      const remaining = want - picks.length;
      shuffledUpgrade.slice(0, remaining).forEach((key) => {
        const entry = WeaponRegistry[key];
        const nextLevel = (ownedLevels.get(key) ?? CONFIG.WEAPONS.DEFAULT_LEVEL) + 1;
        const description = WeaponProgression.describeLevelUpgrade(entry, nextLevel - 1, nextLevel);
        picks.push({
          type: 'weapon',
          subtype: 'upgrade',
          key,
          nextLevel,
          name: toDisplayName(entry, key),
          rarity: entry?.ui?.rarity ?? 'common',
          description,
          ui: entry?.ui ?? null
        });
      });
    }
  } else {
    // Early game: still prefer new weapons, then upgrades as filler.
    shuffledNew.slice(0, want).forEach((key) => {
      const entry = WeaponRegistry[key];
      picks.push({
        type: 'weapon',
        subtype: 'new',
        key,
        name: toDisplayName(entry, key),
        rarity: entry?.ui?.rarity ?? 'common',
        description: entry?.ui?.description ?? '',
        ui: entry?.ui ?? null
      });
    });

    if (picks.length < want) {
      const remaining = want - picks.length;
      shuffledUpgrade.slice(0, remaining).forEach((key) => {
        const entry = WeaponRegistry[key];
        const nextLevel = (ownedLevels.get(key) ?? CONFIG.WEAPONS.DEFAULT_LEVEL) + 1;
        const description = WeaponProgression.describeLevelUpgrade(entry, nextLevel - 1, nextLevel);
        picks.push({
          type: 'weapon',
          subtype: 'upgrade',
          key,
          nextLevel,
          name: toDisplayName(entry, key),
          rarity: entry?.ui?.rarity ?? 'common',
          description,
          ui: entry?.ui ?? null
        });
      });
    }
  }

  return picks;
}

/**
 * Build passive reward choices based on hero allowlists and current stacks.
 */
export function getPassiveChoices({
  scene,
  heroEntry,
  level,
  currentPassives = [],
  getStackCount,
  maxChoices = 3
}) {
  const allowedKeys = Array.isArray(heroEntry?.passives?.allowed)
    ? heroEntry.passives.allowed
    : Object.keys(PassiveRegistry);

  const allowedSet = new Set(allowedKeys.filter((key) => PassiveRegistry[key]));
  const ownedCounts = buildOwnedPassiveCounts(currentPassives, getStackCount);

  const maxSlots = CONFIG?.PASSIVES?.maxSlots ?? Infinity;
  const ownedTotal = Array.from(ownedCounts.values()).reduce((sum, value) => sum + value, 0);
  if (Number.isFinite(maxSlots) && ownedTotal >= maxSlots) {
    return [];
  }

  // Detect if hero has a passive progression table
  const hasPassiveProgressionTable =
    heroEntry?.passives?.progression &&
    typeof heroEntry.passives.progression === 'object' &&
    Object.keys(heroEntry.passives.progression).length > 0;

  let candidates = collectProgressionKeys(heroEntry?.passives?.progression, level);

  // Only fall back to allowedKeys if there is NO passive progression table
  if (!candidates.length && !hasPassiveProgressionTable) {
    candidates = allowedKeys.slice();
  }

  const filtered = normalizePassiveCandidates(candidates, allowedSet, ownedCounts);
  if (!filtered.length) {
    return [];
  }

  const seed = buildSeed(scene, level, PASSIVE_SEED_OFFSET);
  const shuffled = deterministicShuffle(filtered, seed);
  const picks = shuffled.slice(0, Math.max(0, maxChoices));

  return picks.map((key) => {
    const entry = PassiveRegistry[key];
    return {
      type: 'passive',
      key,
      name: toDisplayName(entry, key),
      rarity: entry?.ui?.rarity ?? 'common',
      description: entry?.ui?.description ?? '',
      ui: entry?.ui ?? null
    };
  });
}

/**
 * Combine weapon and passive choices into a final level-up reward set.
 */
export function getLevelUpChoices({
  scene,
  heroEntry,
  level,
  currentLoadout = [],
  currentPassives = [],
  getPassiveStackCount,
  maxChoices = 3
}) {
  const total = Math.max(0, maxChoices);
  if (total === 0) return [];

  const weaponChoices = getWeaponChoicesInternal({
    scene,
    heroEntry,
    level,
    currentLoadout,
    maxChoices: total,
    getWeaponLevel: (key) => scene.weaponManager?.getWeaponLevel?.(key)
  });

  const passiveChoices = getPassiveChoices({
    scene,
    heroEntry,
    level,
    currentPassives,
    getStackCount: getPassiveStackCount,
    maxChoices: total
  });

  const upgrades = weaponChoices.filter((c) => c.subtype === 'upgrade');
  const newWeapons = weaponChoices.filter((c) => c.subtype !== 'upgrade');
  const passives = passiveChoices.slice();

  const picks = [];

  const weaponsAvailable = () => (upgrades.length + newWeapons.length) > 0;
  const passivesAvailable = () => passives.length > 0;

  // NEW PRIORITY: prefer NEW weapons first, then upgrades.
  const takeWeapon = () => {
    if (newWeapons.length) return newWeapons.shift();
    if (upgrades.length) return upgrades.shift();
    return null;
  };

  const takePassive = () => {
    if (!passives.length) return null;
    return passives.shift();
  };

  if (!weaponsAvailable() && !passivesAvailable()) {
    return [];
  }

  // If only one category is available, just use that.
  if (!weaponsAvailable()) {
    return passives.slice(0, total);
  }

  if (!passivesAvailable()) {
    // Respect new-then-upgrade ordering even when only weapons exist
    const allWeaponsOrdered = [...newWeapons, ...upgrades];
    return allWeaponsOrdered.slice(0, total);
  }

  // Mixed case: both weapons and passives exist.
  const rng = makeSeededRandom(buildSeed(scene, level, 0x1234abcd));

  if (total === 1) {
    const roll = rng();
    if (roll < 0.5) {
      const w = takeWeapon();
      if (w) return [w];
      const pFallback = takePassive();
      return pFallback ? [pFallback] : [];
    }
    const p = takePassive();
    if (p) return [p];
    const wFallback = takeWeapon();
    return wFallback ? [wFallback] : [];
  }

  // total >= 2, both categories available:
  let weaponSlots = 1;   // ensure at least one weapon slot
  let passiveSlots = 1;  // ensure at least one passive slot
  let remaining = total - 2;

  while (remaining > 0 && (weaponsAvailable() || passivesAvailable())) {
    const roll = rng();
    if (!weaponsAvailable()) {
      passiveSlots += 1;
    } else if (!passivesAvailable()) {
      weaponSlots += 1;
    } else if (roll < 0.5) {
      weaponSlots += 1;
    } else {
      passiveSlots += 1;
    }
    remaining -= 1;
  }

  // Fill weapon slots (NEW weapons first, then upgrades)
  for (let i = 0; i < weaponSlots; i += 1) {
    const w = takeWeapon();
    if (!w) break;
    picks.push(w);
  }

  // Fill passive slots
  for (let i = 0; i < passiveSlots; i += 1) {
    const p = takePassive();
    if (!p) break;
    picks.push(p);
  }

  // Guard against overshooting due to exhausted pools
  return picks.slice(0, total);
}

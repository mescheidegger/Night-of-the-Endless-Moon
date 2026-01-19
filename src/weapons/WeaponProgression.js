import { CONFIG } from '../config/gameConfig.js';

/** Provide deepMerge so callers can reuse shared logic safely. */
function deepMerge(target, source) {
  const out = target || {};
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(out[key] ? { ...out[key] } : {}, value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

/** Provide accumulateLevelSpec so callers can reuse shared logic safely. */
export function accumulateLevelSpec(entry, level) {
  const result = {};
  const prog = entry?.progression || {};
  const max = CONFIG.WEAPONS?.MAX_LEVEL ?? 5;
  const clampedLevel = Math.min(Math.max(1, level | 0), max);
  for (let lvl = 2; lvl <= clampedLevel; lvl += 1) {
    const spec = prog[lvl];
    if (!spec) continue;
    deepMerge(result, spec);
  }
  return result;
}

/** Provide pushModifier so callers can reuse shared logic safely. */
function pushModifier(mods, op, path, value) {
  if (value === undefined || value === null) return;
  mods.push({ op, path, value });
}

/** Provide getLevelModifiers so callers can reuse shared logic safely. */
export function getLevelModifiers(entry, level) {
  const spec = accumulateLevelSpec(entry, level);
  const mods = [];

  if (spec.damage?.baseMult !== undefined) {
    pushModifier(mods, 'mult', 'damage.base', spec.damage.baseMult);
  }
  if (spec.damage?.baseAdd !== undefined) {
    pushModifier(mods, 'add', 'damage.base', spec.damage.baseAdd);
  }

  if (spec.cadence?.delayMsMult !== undefined) {
    pushModifier(mods, 'mult', 'cadence.delayMs', spec.cadence.delayMsMult);
  }
  if (spec.cadence?.delayMsAdd !== undefined) {
    pushModifier(mods, 'add', 'cadence.delayMs', spec.cadence.delayMsAdd);
  }

  if (spec.projectile?.speedMult !== undefined) {
    pushModifier(mods, 'mult', 'projectile.speed', spec.projectile.speedMult);
  }
  if (spec.projectile?.speedAdd !== undefined) {
    pushModifier(mods, 'add', 'projectile.speed', spec.projectile.speedAdd);
  }
  if (spec.projectile?.pierceAdd !== undefined) {
    pushModifier(mods, 'add', 'projectile.pierce', spec.projectile.pierceAdd);
  }
  if (spec.projectile?.lifetimeMsMult !== undefined) {
    pushModifier(mods, 'mult', 'projectile.lifetimeMs', spec.projectile.lifetimeMsMult);
  }
  if (spec.projectile?.lifetimeMsAdd !== undefined) {
    pushModifier(mods, 'add', 'projectile.lifetimeMs', spec.projectile.lifetimeMsAdd);
  }
  if (spec.projectile?.maxDistanceAdd !== undefined) {
    pushModifier(mods, 'add', 'projectile.maxDistance', spec.projectile.maxDistanceAdd);
  }

  if (spec.aoe?.radiusAdd !== undefined) {
    pushModifier(mods, 'add', 'aoe.radius', spec.aoe.radiusAdd);
  }
  if (spec.aoe?.damageMultMult !== undefined) {
    pushModifier(mods, 'mult', 'aoe.damageMult', spec.aoe.damageMultMult);
  }

  if (spec.cluster?.countAdd !== undefined) {
    pushModifier(mods, 'add', 'archetype.cluster.count', spec.cluster.countAdd);
  }
  if (spec.cluster?.spreadRadiusAdd !== undefined) {
    pushModifier(mods, 'add', 'archetype.cluster.spreadRadius', spec.cluster.spreadRadiusAdd);
  }

  if (spec.chain?.maxHopsAdd !== undefined) {
    pushModifier(mods, 'add', 'archetype.chain.maxHops', spec.chain.maxHopsAdd);
  }
  if (spec.chain?.hopRadiusAdd !== undefined) {
    pushModifier(mods, 'add', 'archetype.chain.hopRadius', spec.chain.hopRadiusAdd);
  }
  if (spec.chain?.falloffPerHopAdd !== undefined) {
    pushModifier(mods, 'add', 'archetype.chain.falloffPerHop', spec.chain.falloffPerHopAdd);
  }

  if (spec.burst?.countAdd !== undefined) {
    pushModifier(mods, 'add', 'burst.count', spec.burst.countAdd);
  }
  if (spec.burst?.spreadDegAdd !== undefined) {
    pushModifier(mods, 'add', 'burst.spreadDeg', spec.burst.spreadDegAdd);
  }

  if (spec.cross?.stepPxPerFrameAdd !== undefined) {
    pushModifier(mods, 'add', 'archetype.cross.stepPxPerFrame', spec.cross.stepPxPerFrameAdd);
  }

  return mods;
}

/** Provide getPath so callers can reuse shared logic safely. */
function getPath(obj, path, fallback) {
  const segments = path.split('.');
  let current = obj;
  for (let i = 0; i < segments.length; i += 1) {
    current = current?.[segments[i]];
    if (current === undefined || current === null) {
      return fallback;
    }
  }
  return current;
}

/** Provide describeDelta so callers can reuse shared logic safely. */
function describeDelta(changes, label, prevVal, nextVal, { type = 'add', unit = '' } = {}) {
  if (!Number.isFinite(prevVal)) prevVal = type === 'mult' ? 1 : 0; // eslint-disable-line no-param-reassign
  if (!Number.isFinite(nextVal)) nextVal = type === 'mult' ? 1 : 0; // eslint-disable-line no-param-reassign
  const delta = nextVal - prevVal;
  if (Math.abs(delta) < Number.EPSILON) return;

  let text = '';
  if (type === 'mult') {
    const pct = Math.round(delta * 100);
    if (pct === 0) return;
    text = `${pct > 0 ? '+' : ''}${pct}% ${label}`;
  } else {
    const rounded = Number.isInteger(delta) ? delta : Math.round(delta * 100) / 100;
    if (rounded === 0) return;
    text = `${rounded > 0 ? '+' : ''}${rounded}${unit ? ` ${unit}` : ''} ${label}`;
  }

  if (text) changes.push(text.trim());
}

/** Provide describeLevelUpgrade so callers can reuse shared logic safely. */
export function describeLevelUpgrade(entry, currentLevel, nextLevel) {
  const specCurrent = accumulateLevelSpec(entry, currentLevel);
  const specNext = accumulateLevelSpec(entry, nextLevel);
  const changes = [];

  describeDelta(changes, 'damage', getPath(specCurrent, 'damage.baseMult', 1), getPath(specNext, 'damage.baseMult', 1), { type: 'mult' });
  describeDelta(changes, 'damage', getPath(specCurrent, 'damage.baseAdd', 0), getPath(specNext, 'damage.baseAdd', 0));

  describeDelta(changes, 'attack delay', getPath(specCurrent, 'cadence.delayMsMult', 1), getPath(specNext, 'cadence.delayMsMult', 1), { type: 'mult' });
  describeDelta(changes, 'attack delay (ms)', getPath(specCurrent, 'cadence.delayMsAdd', 0), getPath(specNext, 'cadence.delayMsAdd', 0));

  describeDelta(changes, 'projectile speed', getPath(specCurrent, 'projectile.speedMult', 1), getPath(specNext, 'projectile.speedMult', 1), { type: 'mult' });
  describeDelta(changes, 'projectile speed', getPath(specCurrent, 'projectile.speedAdd', 0), getPath(specNext, 'projectile.speedAdd', 0));
  describeDelta(changes, 'pierce', getPath(specCurrent, 'projectile.pierceAdd', 0), getPath(specNext, 'projectile.pierceAdd', 0));
  describeDelta(changes, 'projectile lifetime', getPath(specCurrent, 'projectile.lifetimeMsMult', 1), getPath(specNext, 'projectile.lifetimeMsMult', 1), { type: 'mult' });
  describeDelta(changes, 'projectile lifetime (ms)', getPath(specCurrent, 'projectile.lifetimeMsAdd', 0), getPath(specNext, 'projectile.lifetimeMsAdd', 0));
  describeDelta(changes, 'range', getPath(specCurrent, 'projectile.maxDistanceAdd', 0), getPath(specNext, 'projectile.maxDistanceAdd', 0), { unit: 'px' });

  describeDelta(changes, 'AOE radius', getPath(specCurrent, 'aoe.radiusAdd', 0), getPath(specNext, 'aoe.radiusAdd', 0), { unit: 'px' });
  describeDelta(changes, 'AOE damage', getPath(specCurrent, 'aoe.damageMultMult', 1), getPath(specNext, 'aoe.damageMultMult', 1), { type: 'mult' });

  describeDelta(changes, 'cluster count', getPath(specCurrent, 'cluster.countAdd', 0), getPath(specNext, 'cluster.countAdd', 0));
  describeDelta(changes, 'cluster spread', getPath(specCurrent, 'cluster.spreadRadiusAdd', 0), getPath(specNext, 'cluster.spreadRadiusAdd', 0), { unit: 'px' });

  describeDelta(changes, 'max hops', getPath(specCurrent, 'chain.maxHopsAdd', 0), getPath(specNext, 'chain.maxHopsAdd', 0));
  describeDelta(changes, 'hop radius', getPath(specCurrent, 'chain.hopRadiusAdd', 0), getPath(specNext, 'chain.hopRadiusAdd', 0), { unit: 'px' });
  describeDelta(changes, 'hop falloff', getPath(specCurrent, 'chain.falloffPerHopAdd', 0), getPath(specNext, 'chain.falloffPerHopAdd', 0));

  describeDelta(changes, 'burst count', getPath(specCurrent, 'burst.countAdd', 0), getPath(specNext, 'burst.countAdd', 0));
  describeDelta(changes, 'burst spread', getPath(specCurrent, 'burst.spreadDegAdd', 0), getPath(specNext, 'burst.spreadDegAdd', 0), { unit: 'deg' });

  describeDelta(changes, 'cross stride', getPath(specCurrent, 'cross.stepPxPerFrameAdd', 0), getPath(specNext, 'cross.stepPxPerFrameAdd', 0), { unit: 'px/frame' });

  if (!changes.length) return 'No additional bonuses';
  return changes.join(', ');
}

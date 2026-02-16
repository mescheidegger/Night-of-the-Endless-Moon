import { LEVEL_UP } from '../config/gameConfig.js';
import { PassiveRegistry } from './PassiveRegistry.js';

function toPositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.floor(numeric));
}

function normalizeTable(rawTable) {
  const normalized = {};
  if (!rawTable || typeof rawTable !== 'object') return normalized;

  for (const [stackKey, levelValue] of Object.entries(rawTable)) {
    const stack = Number.parseInt(stackKey, 10);
    if (!Number.isFinite(stack) || stack <= 1) continue;
    const requiredLevel = toPositiveInt(levelValue, 1);
    normalized[stack] = requiredLevel;
  }

  return normalized;
}

function getPassiveUnlockPolicy(passiveKey, levelUpConfig = LEVEL_UP) {
  const passiveUnlock = PassiveRegistry?.[passiveKey]?.unlock;
  const firstEligibleLevel = toPositiveInt(passiveUnlock?.firstEligibleLevel, 1);

  const globalInterval = toPositiveInt(levelUpConfig?.passiveStackLevelInterval, 1);
  const globalStartAtStack = toPositiveInt(levelUpConfig?.passiveStackGateStartAtStack, 2);

  const stackUnlock = passiveUnlock?.stackUnlock ?? {};
  const mode = stackUnlock?.mode === 'table' ? 'table' : 'interval';
  const intervalLevels = toPositiveInt(stackUnlock?.intervalLevels, globalInterval);
  const startAtStack = toPositiveInt(stackUnlock?.startAtStack, globalStartAtStack);
  const levelsByStack = normalizeTable(stackUnlock?.levelsByStack);

  return {
    firstEligibleLevel,
    stackUnlock: {
      mode,
      intervalLevels,
      startAtStack,
      levelsByStack
    }
  };
}

export function getPassiveFirstEligibleLevel(passiveKey, levelUpConfig = LEVEL_UP) {
  return getPassiveUnlockPolicy(passiveKey, levelUpConfig).firstEligibleLevel;
}

/**
 * Resolve the level needed to grant the next stack for a passive.
 *
 * Policy:
 * - stack 1: gated by per-passive unlock.firstEligibleLevel (fallback level 1)
 * - stack N>1: per-passive table/interval policy with global LEVEL_UP fallback
 */
export function getRequiredLevelForNextStack(passiveKey, currentCount, levelUpConfig = LEVEL_UP) {
  const count = Number.isFinite(currentCount) ? Math.max(0, Math.floor(currentCount)) : 0;
  const nextStackIndex = count + 1;

  const { firstEligibleLevel, stackUnlock } = getPassiveUnlockPolicy(passiveKey, levelUpConfig);

  if (nextStackIndex <= 1) {
    return firstEligibleLevel;
  }

  if (stackUnlock.mode === 'table') {
    const directLevel = stackUnlock.levelsByStack[nextStackIndex];
    if (Number.isFinite(directLevel)) {
      return Math.max(1, Math.floor(directLevel));
    }

    const fallbackLevel = stackUnlock.levelsByStack[count];
    if (Number.isFinite(fallbackLevel)) {
      return Math.max(1, Math.floor(fallbackLevel));
    }
  }

  if (nextStackIndex < stackUnlock.startAtStack) {
    return 1;
  }

  const interval = toPositiveInt(stackUnlock.intervalLevels, 1);
  return Math.max(1, Math.floor((nextStackIndex - 1) * interval));
}

/**
 * Determine if a passive's next stack can be granted at the current level.
 */
export function canGrantNextStack({ passiveKey, level, currentCount, config = LEVEL_UP } = {}) {
  const resolvedLevel = Number.isFinite(level) ? Math.floor(level) : 1;
  const requiredLevel = getRequiredLevelForNextStack(passiveKey, currentCount, config);
  return resolvedLevel >= requiredLevel;
}

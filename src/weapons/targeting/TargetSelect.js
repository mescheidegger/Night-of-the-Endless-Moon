import { TargetingService } from '../TargetingService.js';

/** Provide nearest so callers can reuse shared logic safely. */
export function nearest(enemyGroup, origin, range) {
  return TargetingService.nearestEnemy(enemyGroup, origin, range);
}

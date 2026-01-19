import Phaser from 'phaser';

/**
 * Iterates over all active enemies in a group and executes a callback for each.
 * Safely guards against missing groups or inactive children.
 */
function forEachEnemy(enemyGroup, cb) {
  if (!enemyGroup) return;
  enemyGroup.children?.iterate?.((child) => {
    if (!child || !child.active) return;
    cb(child);
  });
}

/**
 * TargetingService provides common enemy-selection utilities.
 * Useful for weapons, skills, homing projectiles, etc.
 */
export const TargetingService = {
  /**
   * Find the closest enemy to a given origin, optionally within a max range.
   * @param {Phaser.Physics.Arcade.Group} enemyGroup - Group of enemies to search.
   * @param {Phaser.Math.Vector2|{x:number,y:number}} origin - Position to test from.
   * @param {number} range - Maximum allowed distance (optional).
   * @returns {Phaser.GameObjects.Sprite|null} The closest enemy or null if none found.
   */
  nearestEnemy(enemyGroup, origin, range) {
    if (!enemyGroup || !origin) return null;

    // Convert to squared range for faster comparison
    const maxRange = Number.isFinite(range) ? range : Infinity;
    const maxRangeSq = maxRange * maxRange;

    let best = Infinity; // best (smallest) squared distance found
    let target = null;

    forEachEnemy(enemyGroup, (enemy) => {
      const dx = enemy.x - origin.x;
      const dy = enemy.y - origin.y;
      const d2 = dx * dx + dy * dy;
      // Check if within range and closer than previous best
      if (d2 < best && d2 <= maxRangeSq) {
        best = d2;
        target = enemy;
      }
    });

    return target;
  },

  /**
   * Returns all enemies within a cone in front of an origin point.
   * @param {Phaser.Physics.Arcade.Group} enemyGroup
   * @param {Phaser.Math.Vector2|{x:number,y:number}} origin
   * @param {number} facing - Facing angle in radians (direction of the cone).
   * @param {number} angleDeg - Total cone angle in degrees.
   * @param {number} range - Maximum cone distance.
   * @returns {Array} List of enemies inside the cone.
   */
  coneEnemies(enemyGroup, origin, facing, angleDeg, range) {
    if (!enemyGroup || !origin) return [];

    // Convert half-angle to radians for comparison
    const half = Phaser.Math.DegToRad(Math.max(0, angleDeg ?? 0) / 2);

    // Direction vector based on facing angle
    const dir = facing
      ? new Phaser.Math.Vector2(Math.cos(facing), Math.sin(facing)).normalize()
      : null;

    const results = [];

    forEachEnemy(enemyGroup, (enemy) => {
      const dx = enemy.x - origin.x;
      const dy = enemy.y - origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Skip enemies outside max distance
      if (dist > range) return;

      // If no direction specified, just include any enemy in range
      if (!dir) {
        results.push(enemy);
        return;
      }

      // Determine angle between facing direction and vector to enemy
      const dot = dir.dot(new Phaser.Math.Vector2(dx, dy).normalize());
      const angle = Math.acos(Phaser.Math.Clamp(dot, -1, 1));

      // Enemy is inside the cone if its angle difference is small enough
      if (angle <= half) {
        results.push(enemy);
      }
    });

    return results;
  },

  /**
   * Chain-target selection (e.g., lightning that jumps between enemies).
   * Starts from a given enemy, then repeatedly picks the nearest enemy
   * within `radius`, avoiding revisiting already-selected ones.
   * @param {Phaser.Physics.Arcade.Group} enemyGroup
   * @param {Object} start - Starting enemy object.
   * @param {number} count - Maximum number of chained targets.
   * @param {number} radius - Max jump distance between links.
   * @returns {Array} Ordered list of chained targets.
   */
  chainTargets(enemyGroup, start, count, radius) {
    if (!enemyGroup || !start || count <= 0) return [];

    const visited = new Set();
    const results = [];
    let current = start;

    // Continue adding targets until count reached or no new target found
    while (current && results.length < count) {
      results.push(current);
      visited.add(current);

      // Find next nearest enemy from current
      current = TargetingService.nearestEnemy(
        enemyGroup,
        { x: current.x, y: current.y },
        radius
      );

      // Stop chain if next target was already included (prevents loops)
      if (visited.has(current)) break;
    }

    return results;
  }
};

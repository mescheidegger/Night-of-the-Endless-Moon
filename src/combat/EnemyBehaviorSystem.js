import { ENEMY_BEHAVIORS } from '../mob/MobAI.js';

/**
 * EnemyBehaviorSystem keeps the per-frame AI loop out of GameScene. The runner
 * simply iterates the active enemy pool and invokes the appropriate behaviour
 * function defined in `MobAI`.
 */
export class EnemyBehaviorSystem {
  /**
   * Create a lightweight runner that decouples AI iteration from the scene.
   * Centralizing the loop here keeps mob updates consistent and testable.
   */
  constructor(scene, { enemyGroup, hero } = {}) {
    this.scene = scene;
    this.enemyGroup = enemyGroup ?? null;
    this.hero = hero ?? null;
  }

  /**
   * Swap the hero target at runtime (useful if the hero respawns or we switch
   * to split-screen in the future).
   */
  setHero(hero) {
    this.hero = hero;
  }

  /**
   * Allow the scene to hot-swap the enemy group—handy for testing alternate
   * pool implementations without changing the AI loop.
   */
  setEnemyGroup(group) {
    this.enemyGroup = group;
  }

  /**
   * Iterate every active enemy and run its configured AI behaviour.
   */
  update(dt) {
    const group = this.enemyGroup;
    const heroSprite = this.hero ?? this.scene?.hero?.sprite;
    if (!group || !heroSprite) return;

    group.children?.iterate?.((enemy) => {
      if (!enemy || !enemy.active || enemy._isDying) return;
      if (enemy._bossController) return;
      const behavior = ENEMY_BEHAVIORS[enemy.aiBehavior] ?? ENEMY_BEHAVIORS.seekPlayer;
      behavior(enemy, heroSprite, this.scene, dt);
    });
  }

  /**
   * Clear references so the garbage collector can reclaim the runner during
   * scene shutdown.
   */
  destroy() {
    this.scene = null;
    this.enemyGroup = null;
    this.hero = null;
  }
}

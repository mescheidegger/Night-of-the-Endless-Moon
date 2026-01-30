// Tiny wrapper over Phaser Groups for object pooling with classType support.
export class Pool {
  /**
   * Configure a reusable pool backed by a Phaser group.
   * This keeps hot-path spawning fast while protecting memory with a max cap.
   */
  constructor(scene, classType, key, maxSize = 2000, usePhysics = true) {
    this.scene = scene;

    /*
      We configure a Phaser Group that automatically creates objects of `classType`
      when the pool needs them.

      - classType: constructor used when new pooled items are needed
      - maxSize: hard cap to prevent runaway memory/spawn floods
      - runChildUpdate: disabled because we don’t rely on update() inside objects
    */
    const config = {
      classType,
      maxSize,
      runChildUpdate: false,
    };

    /*
      Optionally attach physics bodies:
        - physics.add.group() → pooled objects get Arcade Physics bodies
        - add.group()         → non-physics / UI / FX sprites
    */
    this.group = usePhysics
      ? scene.physics.add.group(config)
      : scene.add.group(config);

    // Optional default texture key (for objects that draw using images)
    this.key = key;

    // Optional activation/release hooks (configured via setHooks)
    this._onActivate = null;
    this._onRelease = null;
  }

  /*
    Acquire an object at (x, y).
    - If the pool has an inactive object, we reuse it.
    - If not, and pool isn't at maxSize, Phaser auto-constructs a new one.
    - If pool is exhausted, returns null.
  */
  /**
   * Fetch or create a pooled object at the requested position.
   * This is the main entry point that keeps spawn logic centralized.
   */
  get(x, y) {
    const obj = this.group.get(x, y, this.key);
    if (!obj) return null; // maxSize reached → do nothing safely

    // Reactivate + show
    obj.setActive(true).setVisible(true);

    // If object uses physics, re-enable its body
    if (obj.body && obj.body.enable === false) {
      // enableBody(exists, x, y, reset, display)
      obj.enableBody?.(true, x, y, true, true);
    }

    // Direct-positioning is safe here because we just activated/reset
    obj.x = x;
    obj.y = y;
    this._onActivate?.(obj);

    return obj;
  }

  /*
    Return object to pool instead of destroying it.
    - Physics objects: disable the body (removes from world, hides, resets flags)
    - Non-physics objects: just deactivate visibility
  */
  /**
   * Recycle an object so future spawns can reuse its memory and GPU state.
   * This prevents frequent allocations during combat-heavy scenes.
   */
  release(obj) {
    if (!obj) return;

    // During scene shutdown, Arcade bodies can already be removed.
    if (obj.disableBody && obj.body) {
      obj.disableBody(true, true);
    } else {
      obj.setActive?.(false);
      obj.setVisible?.(false);
    }

    obj.onRelease?.();
    this._onRelease?.(obj);
  }


  /**
   * Register pool-level hooks that run when objects are activated or released.
   * These callbacks enforce shared reset rules across pooled instances.
   */
  setHooks({ onActivate = null, onRelease = null } = {}) {
    this._onActivate = typeof onActivate === 'function' ? onActivate : null;
    this._onRelease = typeof onRelease === 'function' ? onRelease : null;
  }

  /**
   * Update the hard cap for the pool to tune spawn pressure safely.
   * This allows dynamic scaling without rebuilding the pool.
   */
  setMaxSize(size) {
    const max = Number.isFinite(size) ? Math.max(0, size) : this.group.maxSize;
    this.group.maxSize = max;
  }
}

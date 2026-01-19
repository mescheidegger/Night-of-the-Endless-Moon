export class CollectSystem {
  /**
   * Handles detecting when drops should be collected by the player.
   * Designed to work either via proximity checks or physics overlap.
   *
   * @param {Phaser.Scene} scene
   * @param {{ group: Phaser.Physics.Arcade.Group, player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody }} deps
   */
  constructor(scene, { group, player, passiveManager  } = {}) {
    this.scene = scene;   // reference to the scene for callbacks (e.g., collectXP)
    this.group = group;   // arcade group containing drop instances (XP, items, etc)
    this.player = player; // the hero/player sprite to attract to / collect around
    this.passiveManager = passiveManager ?? scene.passiveManager ?? null;
  }

  /**
   * Update the passive manager hook so pickup radius buffs stay current.
   * This keeps snap calculations in sync with runtime upgrades.
   */
  setPassiveManager(pm) {
    this.passiveManager = pm;
  }

  /**
   * Allows the player reference to be swapped dynamically
   * (useful if player respawns or changes characters).
   */
  setPlayer(player) {
    this.player = player;
  }

  /**
   * Allows swapping the drop group (e.g., after scene reset or pool rebuild).
   */
  setGroup(group) {
    this.group = group;
  }

  /**
   * Called every frame.
   * Loops over all active drops and checks if the player is close enough
   * to trigger instant-collect ("snap").
   */
  update() {
    const group = this.group;
    const player = this.player;
    if (!group || !player) return;

    const pX = player.body?.center?.x ?? player.x ?? 0;
    const pY = player.body?.center?.y ?? player.y ?? 0;

    const pm = this.passiveManager ?? this.scene.passiveManager ?? null;
    let snapMult = 1;
    if (pm?.getXpMagnetMultipliers) {
      const m = pm.getXpMagnetMultipliers();
      snapMult = m.snapMult ?? 1;
    }

    group.children.iterate((drop) => {
      if (!drop || !drop.active || !drop.body) return;

      const dX = drop.body?.center?.x ?? drop.x ?? 0;
      const dY = drop.body?.center?.y ?? drop.y ?? 0;

      const dx = pX - dX;
      const dy = pY - dY;
      const distSq = dx * dx + dy * dy;

      const baseSnapSq = drop.snapRadiusSq ?? 0;
      if (baseSnapSq <= 0) return;

      // (r * k)^2 again
      const effectiveSnapSq = baseSnapSq * (snapMult * snapMult);

      if (distSq <= effectiveSnapSq) {
        this._collect(drop);
      }
    });
  }


  /**
   * Optional hook for use with `scene.physics.add.overlap(group, player, system.onOverlap)`
   * This bypasses distance checks and collects immediately on contact.
   */
  onOverlap = (_player, drop) => {
    this._collect(drop);
  };

  /**
   * Internal standardized collect handler.
   * Calls into the scene-level collect function so XP values, UI, etc
   * can be handled outside this system.
   */
  _collect(drop) {
    if (!drop || !drop.active) return;

    this.scene.events?.emit('drop:collected', {
      drop,
      type: drop.type,
      value: drop.value
    });

    // Scene must implement collectXP(drop) to handle awarding the value and releasing the drop.
    this.scene.collectXP?.(drop);
  }
}

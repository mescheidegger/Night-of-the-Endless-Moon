import Phaser from 'phaser';
import { CONFIG } from '../config/gameConfig.js';
import { DEFAULT_DROP_TYPE } from '../drops/DropRegistry.js';

export class WeaponSystem {
  /** Initialize WeaponSystem state so runtime dependencies are ready. */
  constructor(scene) {
    this.scene = scene;

    // Core weapon params (simple auto-target bolt)
    this.range  = 420;  // max targeting distance
    this.delayMs = 600; // fire rate (ms)
    this.damage = 1;

    // Auto-fire loop
    scene.time.addEvent({
      delay: this.delayMs,
      loop: true,
      callback: () => this.autoAttack()
    });
  }

  /** Handle autoAttack so this system stays coordinated. */
  autoAttack() {
    // Bail immediately during the death sequence so no bolts fire while the
    // player is frozen or the Game Over menu is showing.
    if (this.scene.playerDeathController?.isActive?.() || this.scene.playerHealth?.isDead?.()) {
      return;
    }

    const { player, enemies } = this.scene;
    let target = null, best = Infinity;

    // Pick nearest active enemy
    enemies.group.children.iterate(e => {
      if (!e || !e.active) return;
      const dx = e.x - player.x, dy = e.y - player.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < best) { best = d2; target = e; }
    });

    // Out of range → do nothing
    if (!target || best > this.range * this.range) return;

    // Draw a one-frame bolt and apply damage
    // (Handles zero-length defensively to avoid WebGL/Canvas errors)
    this.drawBolt(this.scene.player.x, this.scene.player.y, target.x, target.y);
    this.hit(target, this.damage);
  }

  /** Handle hit so this system stays coordinated. */
  hit(enemy, dmg) {
    enemy.hp -= dmg;

    // Quick hit flash
    enemy.setTintFill(0xffffff);
    this.scene.time.delayedCall(40, () => enemy.clearTint());

    // Death: spawn FX + XP, then release to pool
    if (enemy.hp <= 0) {
      this.scene.fx?.explode(enemy.x, enemy.y, 14);

      // XP drops come from the shared registry so special mobs can swap types
      // or values without changing the weapon logic.
      const xpType = enemy.rewards?.xpType ?? DEFAULT_DROP_TYPE;
      const xpValue = enemy.rewards?.xp ?? CONFIG.XP.VALUE_DEFAULT;
      this.scene.dropSpawner?.spawnFromTable?.(enemy.mobKey, enemy.x, enemy.y, {
        type: xpType,
        value: { currency: 'xp', amount: xpValue }
      });

      this.scene.enemies.release(enemy);
    }
  }

  /** Handle drawBolt so this system stays coordinated. */
  drawBolt(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;

    // If numbers go weird (NaN/Infinity) bail out early
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;

    const length = Math.hypot(dx, dy);

    // EXTREMELY SHORT SHOTS:
    // Creating a tileSprite with a ~0 width can trigger:
    // - WebGL INVALID_VALUE: texImage2D: no canvas
    // - getImageData IndexSizeError (0-size surface)
    // So: use a tiny spark instead, then exit.
    if (length < 2) {
      const spark = this.scene.add.image(x1, y1, 'spark').setDepth(6);
      spark
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(1)
        .setScale(1.2);

      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0,
        duration: 100,
        onComplete: () => spark.destroy()
      });
      return;
    }

    // Proper bolt:
    // Use a tileSprite stretched to desired length and rotated toward target.
    const angle = Math.atan2(dy, dx);

    // DEFENSIVE: round & clamp width so it’s never 0 or fractional (some
    // platforms/drivers are picky about fractional pixel surfaces).
    const w = Math.max(2, Math.round(length));

    const bolt = this.scene.add
      .tileSprite(x1, y1, w, 2, 'bolt') // 2px tall strip
      .setDepth(6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setOrigin(0, 0.5);               // anchor at start, centered vertically

    bolt.rotation = angle;

    // Quick fade-out then destroy (ephemeral VFX)
    this.scene.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 100,
      onComplete: () => bolt.destroy()
    });
  }

}

import Phaser from 'phaser';

export class FXSystem {
  constructor(scene) {
    this.scene = scene;

    /*
      A pooled group of "spark" image objects.
      - Using a pool avoids constantly creating/destroying GameObjects.
      - `maxSize` limits how many sparks can exist at once.
      - `runChildUpdate` false because we animate sparks using tweens instead of manual updates.
    */
    this.group = scene.add.group({
      classType: Phaser.GameObjects.Image,
      maxSize: 500,
      runChildUpdate: false
    });
  }

  /*
    Fetch a spark from the pool.
    If one is available, activate it and prep for animation.
  */
  _getSpark(x, y) {
    const s = this.group.get(x, y, 'spark'); // pulls or reuses existing
    if (!s) return null;

    s.setActive(true)
     .setVisible(true)
     .setDepth(6) // ensure sparks render above gameplay objects
     .setBlendMode(Phaser.BlendModes.ADD) // glowy additive blending
     .setAlpha(1)
     .setScale(1);

    return s;
  }

  /*
    Return a spark to the pool.
    Just deactivate + hide it — no destroy.
  */
  _release(s) {
    if (!s) return;
    s.setActive(false).setVisible(false);
  }

  /*
    explode(x, y, count)
    Creates a radial burst of sparks that fly outward and fade out.

    This is used for:
      - enemy death
      - hit feedback
      - impact flashes
  */
  explode(x, y, count = 12) {
    const { tweens } = this.scene;

    for (let i = 0; i < count; i++) {
      const s = this._getSpark(x, y);
      if (!s) continue;

      // Choose a random direction + distance
      const ang  = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 120;
      const tx   = x + Math.cos(ang) * dist;
      const ty   = y + Math.sin(ang) * dist;

      // Animate spark movement → fade → shrink → release back into pool
      tweens.add({
        targets: s,
        x: tx,
        y: ty,
        alpha: 0,
        scale: 0,
        duration: 250 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => this._release(s)
      });
    }
  }
}

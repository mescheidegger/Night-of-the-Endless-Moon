/**
 * Plays a chain-throw visual effect that moves a single sprite along a path of
 * targets, invoking callbacks on each hop. The FX handles its own rotation and
 * cleanup so weapons can reuse it without duplicating tween logic.
 *
 * @param {Phaser.Scene} scene
 * @param {string} textureKey - Texture key used for the thrown sprite image.
 * @param {Array<Phaser.GameObjects.GameObject>} path - Ordered list of targets to visit.
 * @param {Object} options
 * @param {number} [options.depth=7]
 * @param {{x:number, y:number}} [options.originPos=null] - Optional starting point.
 * @param {number} [options.rotationSpeed=4 * Math.PI] - Spin rate in radians/sec.
 * @param {number} [options.perHopDurationMs=120] - Travel time between hops in ms.
 * @param {Function} [options.onHopHit] - Called with (enemy, hopIndex) on arrival.
 * @param {Function} [options.onComplete] - Called once when the sequence ends.
 * @returns {{ cancel: Function, sprite: Phaser.GameObjects.Image|null }}
 */
export function playChainThrowFx(
  scene,
  textureKey,
  path,
  {
    depth = 7,
    originPos = null,
    rotationSpeed = 4 * Math.PI,
    perHopDurationMs = 350,
    onHopHit,
    onComplete
  } = {}
) {
  if (!scene || !textureKey) {
    return { cancel() {}, sprite: null };
  }

  const targets = Array.isArray(path) ? path.filter(Boolean) : [];
  if (targets.length === 0) {
    if (typeof onComplete === 'function') {
      onComplete();
    }
    return { cancel() {}, sprite: null };
  }

  const first = targets[0];
  const startX = originPos?.x ?? first?.x ?? 0;
  const startY = originPos?.y ?? first?.y ?? 0;

  const sprite = scene.add.image(startX, startY, textureKey).setDepth(depth).setOrigin(0.5, 0.5);

  const tweens = [];

  // Use a small non-zero delay so Phaser doesn't think this is an infinite loop.
  const rotationEvent = scene.time.addEvent({
    delay: 16,            // ~60 FPS; anything > 0 is fine
    loop: true,
    callback: () => {
      if (!sprite?.active || !sprite.scene) return;
      const deltaSec = (scene.game?.loop?.delta ?? 16) / 1000;
      sprite.rotation += rotationSpeed * deltaSec;
    }
  });

  let finished = false;

  const finalize = (invokeComplete = true) => {
    if (finished) return;
    finished = true;

    tweens.forEach((tween) => tween?.stop?.());
    tweens.length = 0;

    rotationEvent?.remove?.();

    if (sprite && sprite.scene) {
      sprite.destroy();
    }

    if (invokeComplete && typeof onComplete === 'function') {
      onComplete();
    }
  };

  const startHopFrom = (index) => {
    if (finished) return;

    if (index >= targets.length) {
      finalize(true);
      return;
    }

    const target = targets[index];
    if (!target) {
      startHopFrom(index + 1);
      return;
    }

    const toX = target.x;
    const toY = target.y;

    const tween = scene.tweens.add({
      targets: sprite,
      x: toX,
      y: toY,
      duration: perHopDurationMs,
      onComplete: () => {
        if (finished) return;
        if (typeof onHopHit === 'function') {
          onHopHit(target, index);
        }
        startHopFrom(index + 1);
      }
    });

    tweens.push(tween);
  };

  if (!originPos) {
    sprite.setPosition(first?.x ?? sprite.x, first?.y ?? sprite.y);
    if (typeof onHopHit === 'function') {
      onHopHit(first, 0);
    }
    startHopFrom(1);
  } else {
    startHopFrom(0);
  }

  return {
    cancel() {
      finalize(true);
    },
    get sprite() {
      return sprite;
    }
  };
}

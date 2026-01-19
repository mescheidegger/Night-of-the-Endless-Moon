import Phaser from 'phaser';

/**
 * Safely attempt to play an animation on a sprite if the animation key exists.
 *
 * - Wires optional update/complete listeners from `handlers`
 * - Returns `{ played: boolean }` so callers can fall back when the anim doesn't exist
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {string} animKey - Animation key to play
 * @param {Object} handlers
 * @param {Function} [handlers.onUpdate]   - Called on ANIMATION_UPDATE
 * @param {Function} [handlers.onComplete] - Called on ANIMATION_COMPLETE
 * @returns {{ played: boolean }}
 */
export function playIfExists(sprite, animKey, handlers = {}) {
  // If sprite has no animation component or no key was passed, report "not played"
  if (!sprite?.anims || !animKey) {
    return { played: false };
  }

  // Ensure the animation is actually registered on the scene animation manager
  const exists = sprite.scene?.anims?.exists?.(animKey) ?? false;
  if (!exists) {
    return { played: false };
  }

  // Pull optional handler callbacks out of the handlers object
  const { onUpdate, onComplete } = handlers;

  // Hook frame-by-frame updates if provided
  if (onUpdate) {
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, onUpdate);
  }

  // Hook completion if provided. We wrap it so we can reliably detach just this listener later.
  if (onComplete) {
    const wrappedComplete = (...args) => {
      // Remove THIS wrapped listener so it only runs once.
      sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, wrappedComplete);
      onComplete(...args);
    };
    // Stash the wrapper so `detach` knows exactly which function to remove.
    handlers._onCompleteWrapper = wrappedComplete;
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, wrappedComplete);
  }

  // Start the animation. If the animation is configured with repeat = -1, COMPLETE will never fire.
  sprite.play(animKey);
  return { played: true };
}

/**
 * Detach any listeners previously attached in playIfExists().
 *
 * - Removes ANIMATION_UPDATE if `handlers.onUpdate` was provided
 * - Removes the wrapped ANIMATION_COMPLETE listener if present, otherwise tries the raw onComplete
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {Object} handlers
 */
export function detach(sprite, handlers = {}) {
  if (!sprite?.anims) return;

  // Remove frame-update listener if it was attached
  if (handlers.onUpdate) {
    sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, handlers.onUpdate);
  }

  // Prefer removing the wrapped complete listener; fall back to raw onComplete if no wrapper exists
  if (handlers._onCompleteWrapper) {
    sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, handlers._onCompleteWrapper);
    handlers._onCompleteWrapper = null;
  } else if (handlers.onComplete) {
    sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, handlers.onComplete);
  }
}

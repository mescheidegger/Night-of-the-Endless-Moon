import { detach as detachAnim } from './AnimSafe.js';

/**
 * Attach AoE timing behavior to an optional sprite animation.
 *
 * Purpose:
 *  - Centralize "when should the AoE trigger?" logic for strike/explosion effects.
 *  - Support multiple timing modes:
 *      - 'impact'   → trigger immediately
 *      - 'animation'→ trigger when animation reaches a target frame (or defaultFrameIndex)
 *      - 'expire'   → trigger on animation completion only
 *
 * Usage:
 *  const aoe = attach(sprite, aoeCfg, { trigger: () => runAoe(...), defaultFrameIndex: 10 });
 *  // later (if needed)
 *  aoe.detach();
 *  if (!aoe.triggered) aoe.trigger();
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {Object} aoeCfg
 * @param {boolean} [aoeCfg.enabled]                - Master enable switch
 * @param {'impact'|'animation'|'expire'} [aoeCfg.timing='animation']
 * @param {number} [aoeCfg.animationFrameIndex]     - Frame index to trigger on when timing='animation'
 * @param {Object} options
 * @param {Function} options.trigger                - Callback to execute once when AoE should fire
 * @param {number} [options.defaultFrameIndex=0]    - Fallback frame index if config omits one
 * @returns {{
 *   readonly triggered: boolean,                   // Has the AoE already fired?
 *   detach: Function,                              // Remove any animation listeners
 *   trigger: Function,                             // Manually fire (idempotent)
 *   listeners: { onUpdate?: Function, onComplete?: Function, _onCompleteWrapper?: Function }
 * }}
 */
export function attach(sprite, aoeCfg, { trigger, defaultFrameIndex = 0 } = {}) {
  let triggered = false;          // Guards the trigger so it only fires once
  const listeners = {};           // Holder for bound animation callbacks (used by detach)

  // Invoke the AoE trigger exactly once
  const invoke = () => {
    if (triggered) return;
    triggered = true;
    trigger?.();
  };

  // Small helper to build the object we return to callers
  const buildReturn = (detachFn) => ({
    get triggered() {
      return triggered;
    },
    detach: detachFn,
    trigger: invoke,
    listeners
  });

  // If AoE is disabled, return a no-op attachment object
  if (!aoeCfg?.enabled) {
    return buildReturn(() => {});
  }

  const timing = aoeCfg.timing ?? 'animation';

  // 'impact' → fire immediately, no listeners needed
  if (timing === 'impact') {
    invoke();
    return buildReturn(() => {});
  }

  // 'animation' → fire when reaching a specific frame (or default)
  if (timing === 'animation') {
    const frameIndex = Number.isFinite(aoeCfg.animationFrameIndex)
      ? aoeCfg.animationFrameIndex
      : defaultFrameIndex;

    // Fire as soon as we reach (or pass) the target frame; then detach update listener
    listeners.onUpdate = (_anim, frame) => {
      if (!frame) return;
      if (frame.index >= frameIndex) {
        invoke();
        sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, listeners.onUpdate);
        listeners.onUpdate = null; // leave listeners.onComplete intact
      }
    };

    // Safety: if animation completes before update reaches the frame, ensure we still fire
    listeners.onComplete = () => {
      invoke();
    };
  }
  // 'expire' → only fire when the animation completes
  else if (timing === 'expire') {
    listeners.onComplete = () => {
      invoke();
    };
  }

  // Detach function for callers (removes any listeners we attached here)
  const detach = () => detachAnim(sprite, listeners);

  return buildReturn(detach);
}

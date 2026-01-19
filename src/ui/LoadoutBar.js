import { WeaponRegistry } from '../weapons/WeaponRegistry.js';

/**
 * Simple fixed-position bar that shows the player's current weapon loadout.
 * Each slot renders an icon (optionally from a spritesheet frame) with a rarity-colored border.
 *
 * Fixes:
 * - Supports spritesheet icons by passing the `frame` from `ui.icon` to `scene.add.image`.
 * - Centers icons within their slot by default (origin 0.5, 0.5).
 * - Adds optional per-icon nudges via `ui.icon.offsetX` / `ui.icon.offsetY`.
 * - Right-anchored layout — as weapons are added, existing slots shift left so the newest stays on the right.
 * - NEW: true fixed right anchor — newest slot’s RIGHT EDGE is fixed (respects rightInset), no drift when bar fills.
 */
export class LoadoutBar {
  /** Initialize LoadoutBar state so runtime dependencies are ready. */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.events = options.events ?? scene.events;

    // Layout / presentation
    this.maxSlots = options.maxSlots ?? 10;
    this.spacing = options.spacing ?? 40; // px between slots
    this.scale = options.scale ?? 1;
    this.cooldownColor = options.cooldownColor ?? 0x000000;
    this.cooldownAlpha = options.cooldownAlpha ?? 0.55;
    this.cooldownBlend = options.cooldownBlend ?? Phaser.BlendModes.NORMAL; // or MULTIPLY/ADD

    // Optional global slot offsets (do nothing unless provided)
    this.slotOffsetX = options.slotOffsetX ?? 0;
    this.slotOffsetY = options.slotOffsetY ?? 0;

    // How far from the right edge the bar should sit (keeps a consistent margin)
    this.rightInset = options.rightInset ?? 16;

    // Root container pinned to the camera
    const iconSize = 36 * this.scale;
    const width = scene.scale.width;
    const height = scene.scale.height;

    // Anchor the container at the desired right inset.
    // Slots will extend left into negative X, with the newest slot's RIGHT EDGE at x = 0.
    const defaultX = options.x ?? (width - this.rightInset);
    const defaultY = options.y ?? (height - (iconSize * 0.5 + 8));

    this.container = scene.add
      .container(defaultX, defaultY)
      .setScrollFactor(0)
      .setDepth(options.depth ?? 30);

    this.icons = [];
    this._lastLoadout = []; // Remember last loadout so re-renders (e.g., scale change) preserve contents
    this.slotState = {};

    // Re-render when the loadout changes
    this._onWeaponsChanged = (loadout) => this.render(loadout);
    this.events.on('weapons:changed', this._onWeaponsChanged);

    // Cooldown tracking for individual slots
    this._onWeaponTriggered = ({ key, delayMs, nextFireAt }) => {
      const slot = this.slotState[key];
      if (!slot) return;

      if (!Number.isFinite(delayMs) || delayMs <= 0 || !Number.isFinite(nextFireAt)) {
        slot.delayMs = 0;
        slot.nextFireAt = 0;
        slot.overlay.visible = false;
        slot.overlay.scaleY = 0;
        return;
      }

      slot.delayMs = delayMs;
      slot.nextFireAt = nextFireAt;
      slot.overlay.visible = true;
      slot.overlay.scaleY = 1;
    };
    this.events.on('weapon:triggered', this._onWeaponTriggered);

    this._onSceneUpdate = () => this._updateCooldown();
    this.scene.events.on('update', this._onSceneUpdate);
  }

  /** Reposition the entire bar. */
  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  /**
   * Rescale icons (e.g., for different UI zooms).
   * Uses the most recent loadout if none is provided.
   */
  setScale(scale) {
    this.scale = scale;
    this.render(); // re-render with last known loadout
  }

  /**
   * Render the loadout icons. If no loadout passed, reuse the last one we rendered.
   * @param {string[]} loadout - array of weapon registry keys
   */
  render(loadout = undefined) {
    // Clear old display objects
    this.icons.forEach((icon) => icon.destroy());
    this.icons = [];
    this.slotState = {};

    const keys = Array.isArray(loadout) ? loadout : this._lastLoadout;
    this._lastLoadout = keys || [];

    const shown = Array.isArray(keys)
      ? keys.slice(Math.max(0, keys.length - this.maxSlots))
      : [];

    const n = shown.length;

    shown.forEach((weaponKey, index) => {
      const entry = WeaponRegistry[weaponKey];

      // Fallbacks if the registry entry is missing/malformed
      const iconMeta = entry?.ui?.icon || {};
      const atlasKey = iconMeta.atlas ?? null;
      const iconKey = atlasKey || iconMeta.key || 'bolt';
      const iconFrame = iconMeta.frame ?? undefined; // pass spritesheet frame if present
      const offsetX = iconMeta.offsetX ?? 0; // optional per-icon nudges
      const offsetY = iconMeta.offsetY ?? 0;

      // Rarity-colored border behind the icon
      const rarity = entry?.ui?.rarity ?? 'common';
      const color = this._rarityColor(rarity);

      // Border size respects icon scale; tweak as desired
      const baseBorder = 36;
      const w = baseBorder * this.scale;
      const h = baseBorder * this.scale;

      /**
       * Slot positioning (RIGHT-EDGE ANCHORED)
       * - Container sits at (screenRight - rightInset).
       * - Newest weapon's slot RIGHT EDGE is always at local x = 0.
       * - Earlier weapons extend left into negative x by spacing increments.
       *
       * Rightmost slot:
       *   rect spans [-w, 0]
       */
      const slotIndexFromRight = index - (n - 1); // last item => 0, earlier => negative
      const slotRight = slotIndexFromRight * this.spacing + this.slotOffsetX; // right edge of slot
      const slotLeft = slotRight - w; // rect origin is left edge
      const slotCenterX = slotLeft + w * 0.5;
      const slotCenterY = 0 + this.slotOffsetY;

      // Create the icon image centered within the slot; `frame` enables spritesheet support
      const icon = this.scene.add
        .image(slotCenterX + offsetX, slotCenterY + offsetY, iconKey, iconFrame)
        .setScale(this.scale)
        .setScrollFactor(0)
        .setOrigin(0.5, 0.5);

      // Border rectangle (behind icon)
      const rect = this.scene.add
        .rectangle(slotLeft, slotCenterY, w, h)
        .setStrokeStyle(2, color)
        .setOrigin(0, 0.5)
        .setAlpha(0.9)
        .setScrollFactor(0)
        .setDepth((icon.depth ?? 0) - 1);

      // Cooldown overlay (above icon)
      const overlay = this.scene.add
        .rectangle(slotLeft, slotCenterY, w, h, this.cooldownColor, this.cooldownAlpha)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth((icon.depth ?? 0) + 1)
        .setBlendMode(this.cooldownBlend)
        .setVisible(false);

      this.container.add(rect);
      this.container.add(icon);
      this.container.add(overlay);
      this.icons.push(rect, icon, overlay);

      this.slotState[weaponKey] = {
        overlay,
        delayMs: 0,
        nextFireAt: 0
      };
    });
  }

  /** Map rarity string → hex color. */
  _rarityColor(rarity) {
    switch (rarity) {
      case 'rare':
        return 0x4ea3ff;
      case 'epic':
        return 0xb472ff;
      case 'legendary':
        return 0xffcc4d;
      default:
        return 0x9aa1bf; // common
    }
  }

  /** Clean up listeners and display objects. */
  destroy() {
    this.events.off('weapons:changed', this._onWeaponsChanged);
    this.events.off('weapon:triggered', this._onWeaponTriggered);
    this.scene.events.off('update', this._onSceneUpdate);
    this.icons.forEach((icon) => icon.destroy());
    this.container?.destroy();
  }

  /** Handle _updateCooldown so this system stays coordinated. */
  _updateCooldown() {
    const now = this.scene?.time?.now ?? Date.now();
    Object.values(this.slotState).forEach((state) => {
      if (!state || !state.overlay) return;

      if (!state.nextFireAt || !state.delayMs || state.delayMs <= 0) {
        state.overlay.visible = false;
        state.overlay.scaleY = 0;
        state.nextFireAt = 0;
        return;
      }

      const remaining = state.nextFireAt - now;
      if (remaining <= 0) {
        state.overlay.visible = false;
        state.overlay.scaleY = 0;
        state.nextFireAt = 0;
        return;
      }

      const f = Math.min(1, Math.max(0, remaining / state.delayMs));
      state.overlay.scaleY = f;
    });
  }
}

import { PassiveRegistry, isValidPassive } from '../passives/PassiveRegistry.js';

/**
 * PassiveLoadoutBar
 *
 * Displays passive icons similar to the weapon LoadoutBar.
 *
 * Fixes:
 * - Supports atlas-based icons + legacy single-texture icons.
 * - Optional global slot offsets (slotOffsetX/slotOffsetY).
 * - Right-anchored layout — as passives are added, existing slots shift left so the newest stays on the right.
 * - NEW: true fixed right anchor — newest slot’s RIGHT EDGE is fixed (respects rightInset), no drift when bar fills.
 */
export class PassiveLoadoutBar {
  /** Initialize PassiveLoadoutBar state so runtime dependencies are ready. */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.events = options.events ?? scene.events;
    this.maxSlots = options.maxSlots ?? 10;
    this.spacing = options.spacing ?? 40;
    this.scale = options.scale ?? 1;
    this.depth = options.depth ?? 30;
    this.getStackCount = typeof options.getStackCount === 'function'
      ? options.getStackCount
      : null;

    // Optional global slot offsets (to mirror weapons bar behavior)
    this.slotOffsetX = options.slotOffsetX ?? 0;
    this.slotOffsetY = options.slotOffsetY ?? 0;

    // How far from the right edge the bar should sit (keeps a consistent margin)
    this.rightInset = options.rightInset ?? 16;

    const iconSize = 36 * this.scale;
    const width = scene.scale.width;
    const height = scene.scale.height;

    // Anchor the container at the desired right inset.
    // Slots will extend left into negative X, with the newest slot's RIGHT EDGE at x = 0.
    const defaultX = options.x ?? (width - this.rightInset);
    const defaultY = options.y ?? (height - (iconSize * 1.5 + 12));

    this.container = scene.add
      .container(defaultX, defaultY)
      .setScrollFactor(0)
      .setDepth(this.depth);

    this.icons = [];
    this._lastLoadout = [];

    this._onPassivesChanged = (loadout) => this.render(loadout);
    this.events.on('passives:changed', this._onPassivesChanged);
  }

  /** Handle setPosition so this system stays coordinated. */
  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  /** Handle setScale so this system stays coordinated. */
  setScale(scale) {
    this.scale = scale;
    this.render();
  }

  /** Handle render so this system stays coordinated. */
  render(loadout = undefined) {
    // Clear old display objects
    this.icons.forEach((obj) => obj.destroy());
    this.icons = [];

    const keys = Array.isArray(loadout) ? loadout : this._lastLoadout;
    this._lastLoadout = keys || [];

    // Collapse to unique keys + compute stack counts
    const counts = new Map();
    const ordered = [];
    const resolver = this.getStackCount;

    (keys ?? []).forEach((key) => {
      if (!isValidPassive(key)) return;

      if (!counts.has(key)) {
        let resolved = resolver ? resolver(key) : NaN;
        if (!Number.isFinite(resolved) || resolved <= 0) resolved = 1;
        counts.set(key, resolved);
        ordered.push(key);
      } else if (!resolver) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

    const shown = ordered.slice(0, this.maxSlots);

    // Match the weapon bar’s box model
    const baseBorder = 36;
    const w = baseBorder * this.scale;
    const h = baseBorder * this.scale;
    const spacing = this.spacing; // align with weapons, but allow override

    const n = shown.length;

    shown.forEach((passiveKey, index) => {
      const entry = PassiveRegistry[passiveKey];
      const iconMeta = entry?.ui?.icon ?? {};

      // Support both atlas-based icons and legacy single-texture icons:
      const atlasKey = iconMeta.atlas ?? null;
      const textureKey = atlasKey || iconMeta.key || 'xpgem';
      const frame = iconMeta.frame ?? undefined;

      const rarity = entry?.ui?.rarity ?? 'common';
      const color = this._rarityColor(rarity);

      /**
       * Slot positioning (RIGHT-EDGE ANCHORED)
       * - Container sits at (screenRight - rightInset).
       * - Newest passive's slot RIGHT EDGE is always at local x = 0.
       * - Earlier passives extend left into negative x by spacing increments.
       *
       * Rightmost slot:
       *   rect spans [-w, 0]
       */
      const slotIndexFromRight = index - (n - 1); // last item => 0, earlier => negative
      const slotRight = slotIndexFromRight * spacing + this.slotOffsetX; // right edge of slot
      const slotLeft = slotRight - w; // rect origin is left edge
      const slotCenterX = slotLeft + w * 0.5;
      const slotCenterY = 0 + this.slotOffsetY;

      const rect = this.scene.add
        .rectangle(slotLeft, slotCenterY, w, h)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setStrokeStyle(2, color)
        .setAlpha(0.9);

      // Center the icon within the rect and fit it with padding
      const icon = this.scene.add
        .image(slotCenterX, slotCenterY, textureKey, frame)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0);

      // Compute a pixel-art-friendly fit (2px padding each side at current scale)
      const innerW = Math.max(0, w - 4 * this.scale);
      const innerH = Math.max(0, h - 4 * this.scale);
      const sx = innerW / (icon.width || innerW);
      const sy = innerH / (icon.height || innerH);
      const fit = Math.min(sx, sy);
      icon.setScale(fit); // preserves aspect, centers nicely

      this.container.add(rect);
      this.container.add(icon);
      this.icons.push(rect, icon);

      // Stack badge at top-right of the rect
      const stacks = counts.get(passiveKey) ?? 0;
      if (stacks > 1) {
        const badge = this.scene.add.text(
          slotRight - 4 * this.scale,     // right edge minus padding (slotRight is the rect's right edge)
          slotCenterY - h * 0.33,         // slightly above center
          `x${stacks}`,
          {
            font: `${Math.max(10, Math.floor(12 * this.scale))}px monospace`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'right'
          }
        )
          .setOrigin(1, 0.5)
          .setScrollFactor(0)
          .setDepth((icon.depth ?? 0) + 2);

        this.container.add(badge);
        this.icons.push(badge);
      }
    });
  }

  /** Handle destroy so this system stays coordinated. */
  destroy() {
    this.events.off('passives:changed', this._onPassivesChanged);
    this.icons.forEach((icon) => icon.destroy());
    this.container?.destroy();
    this.icons = [];
    this.container = null;
    this.events = null;
    this.scene = null;
  }

  /** Handle _rarityColor so this system stays coordinated. */
  _rarityColor(rarity) {
    switch (rarity) {
      case 'rare': return 0x4ea3ff;
      case 'epic': return 0xb472ff;
      case 'legendary': return 0xffcc4d;
      default: return 0x9aa1bf;
    }
  }
}

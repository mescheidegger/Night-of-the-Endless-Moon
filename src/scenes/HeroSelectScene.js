import Phaser from 'phaser';
import { DEFAULT_HERO_KEY, listHeroes } from '../hero/HeroRegistry.js';

// --- Layout constants ------------------------------------------------------
// Card dimensions were tuned against the base 960×540 resolution.  Keeping
// them centralised makes it easier to tweak the grid later (e.g., responsive
// layouts or controller support).
const CARD_WIDTH = 120;
const CARD_HEIGHT = 160;
const CARD_PADDING = 20;
const MAX_COLUMNS = 3;

/**
 * Utility that capitalises the first letter of a string.  Used as a fallback
 * when the registry does not provide a `ui.name` field.
 */
function uppercaseFirst(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Interactive grid that lets the player choose a hero before gameplay.
 * Supports keyboard navigation, pointer hover/click, and persists the last
 * choice via localStorage so the menu can default to the previous hero.
 */
export class HeroSelectScene extends Phaser.Scene {
  /** Initialize HeroSelectScene state so runtime dependencies are ready. */
  constructor() {
    super('hero-select');
    this.heroes = [];
    this.cards = [];
    this.cols = 1;
    this.focusIndex = 0;
    this._transitioning = false;
  }

  /**
   * `init` runs before assets are created.  We reset transient state here so
   * returning from the menu yields a clean scene (no stuck transitions).
   */
  init(data) {
    this._transitioning = false;
    this.initialHeroKey = data?.heroKey ?? null;
  }

  /** Handle create so this system stays coordinated. */
  create() {
    // Pull hero data once.  This stays stable for the lifetime of the scene.
    const registeredHeroes = listHeroes();
    this.heroes = registeredHeroes.filter((hero) => !hero.hidden);

    if (!this.heroes.length) {
      console.warn('[HeroSelectScene] No visible heroes registered; skipping select screen.');
      this.scene.start('game');
      return;
    }

    this.cols = Math.min(MAX_COLUMNS, Math.max(1, this.heroes.length));

    const desiredKey = this.initialHeroKey ?? this._getLastHeroKey() ?? DEFAULT_HERO_KEY;
    const initialIndex = Math.max(0, this.heroes.findIndex(hero => hero.key === desiredKey));
    this.focusIndex = initialIndex >= 0 ? initialIndex : 0;

    // Scene content is split into small helpers for clarity/testability.
    this._buildBackground();
    this._buildLayout();
    this._bindInput();

    this._layoutCards(this.scale.width, this.scale.height);
    this._updateFocus();
  }

  /**
   * Builds the animated backdrop + static instructions shared by the entire
   * hero selection scene.
   */
  _buildBackground() {
    this.ground = this.add.tileSprite(0, 0, 4096, 4096, 'ground')
      .setOrigin(0.5)
      .setDepth(0)
      .setScrollFactor(0);

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.ground.tilePositionX += 0.15;
        this.ground.tilePositionY += 0.10;
      }
    });

    this.tintOverlay = this.add.rectangle(0, 0, 4000, 4000, 0x8a143a, 0.10)
      .setScrollFactor(0)
      .setDepth(1)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.title = this.add.text(this.scale.width / 2, this.scale.height * 0.18, 'Select Your Hero', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#e9e2ff',
      stroke: '#8a143a',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(5);

    this.hintText = this.add.text(this.scale.width / 2, this.scale.height - 32,
      'Arrows / WASD to move · Enter/Space to confirm · Esc to return',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c8d0ff'
      }
    ).setOrigin(0.5).setDepth(5);
  }

  /**
   * Creates hero cards, the detail panel, and registers resize/dispose hooks.
   */
  _buildLayout() {
    this.cards = this.heroes.map((hero, index) => this._createHeroCard(hero, index));

    this.detailPanel = this._createDetailPanel();

    this._onResize = (gameSize) => {
      const width = gameSize.width;
      const height = gameSize.height;
      this._layoutCards(width, height);
    };

    this.scale.on('resize', this._onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this._onResize) {
        this.scale.off('resize', this._onResize);
      }
      this._unbindInput();
    });
  }

  /**
   * Register keyboard handlers so players can navigate entirely via keys.
   * Pointer interactivity is wired directly on the card containers.
   */
  _bindInput() {
    this._handleLeft = () => this._moveFocusHorizontal(-1);
    this._handleRight = () => this._moveFocusHorizontal(1);
    this._handleUp = () => this._moveFocusVertical(-1);
    this._handleDown = () => this._moveFocusVertical(1);
    this._handleConfirm = () => this._confirmSelection();
    this._handleBack = () => this._returnToMenu();

    const keyboard = this.input.keyboard;
    keyboard.on('keydown-LEFT', this._handleLeft);
    keyboard.on('keydown-A', this._handleLeft);
    keyboard.on('keydown-RIGHT', this._handleRight);
    keyboard.on('keydown-D', this._handleRight);
    keyboard.on('keydown-UP', this._handleUp);
    keyboard.on('keydown-W', this._handleUp);
    keyboard.on('keydown-DOWN', this._handleDown);
    keyboard.on('keydown-S', this._handleDown);
    keyboard.on('keydown-ENTER', this._handleConfirm);
    keyboard.on('keydown-SPACE', this._handleConfirm);
    keyboard.on('keydown-ESC', this._handleBack);
  }

  /**
   * Phaser does not remove keyboard listeners automatically, so do it when
   * the scene shuts down to avoid duplicate handlers on restart.
   */
  _unbindInput() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.off('keydown-LEFT', this._handleLeft);
    keyboard.off('keydown-A', this._handleLeft);
    keyboard.off('keydown-RIGHT', this._handleRight);
    keyboard.off('keydown-D', this._handleRight);
    keyboard.off('keydown-UP', this._handleUp);
    keyboard.off('keydown-W', this._handleUp);
    keyboard.off('keydown-DOWN', this._handleDown);
    keyboard.off('keydown-S', this._handleDown);
    keyboard.off('keydown-ENTER', this._handleConfirm);
    keyboard.off('keydown-SPACE', this._handleConfirm);
    keyboard.off('keydown-ESC', this._handleBack);
  }

  /**
   * Construct a selectable hero card (icon + name + focus ring).
   * Each card is a container so pointer handlers and depth changes move as one.
   */
  _createHeroCard(hero, index) {
    const container = this.add.container(0, 0).setDepth(5);
    container.setSize(CARD_WIDTH, CARD_HEIGHT).setInteractive({ useHandCursor: true });

    const background = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x111522, 0.92)
      .setStrokeStyle(2, 0x303850, 1);

    const iconElements = this._buildCardIcon(hero);

    const nameText = this.add.text(0, CARD_HEIGHT / 2 - 10, hero.ui?.name ?? uppercaseFirst(hero.key ?? 'Hero'), {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e9e2ff'
    }).setOrigin(0.5);

    const highlight = this.add.rectangle(0, 0, CARD_WIDTH + 12, CARD_HEIGHT + 12)
      .setStrokeStyle(3, 0xffc857, 1)
      .setFillStyle(0x000000, 0)
      .setVisible(false);

    const children = [background, ...iconElements.nodes, nameText, highlight];
    container.add(children);

    container.on('pointerover', () => {
      this._setFocus(index);
    });

    container.on('pointerup', (pointer) => {
      if (pointer.leftButtonReleased()) {
        this._confirmSelection();
      }
    });

    return {
      container,
      hero,
      background,
      highlight,
      name: nameText,
      iconImage: iconElements.icon,
      fallbackRect: iconElements.fallbackRect,
      fallbackText: iconElements.fallbackText
    };
  }

  /**
 * Builds the hero portrait/icon that appears on each hero-select card.
 * 
 * If the hero has `hero.ui.icon` defined *and* the texture exists, we show
 * that frame from the spritesheet, scaled to fit the card.
 * Otherwise, we show a fallback rectangle with the hero name centered inside.
 *
 * Returns:
 *   {
 *     nodes: [all display objects to add to the card container],
 *     icon?: Phaser.GameObjects.Image,            // if using real art
 *     fallbackRect?: Phaser.GameObjects.Rectangle, // if using fallback
 *     fallbackText?: Phaser.GameObjects.Text      // if using fallback
 *   }
  */
  _buildCardIcon(hero) {
    const nodes = []; // Collect elements to attach to the hero card container
    const iconConfig = hero?.ui?.icon;
    const iconKey = iconConfig?.key;
    const frameVal = iconConfig?.frame ?? 0;
    const frame = iconKey && this.textures.exists(iconKey)
      ? this.textures.getFrame(iconKey, frameVal)
      : null;

    if (frame) {
      const image = this.add.image(0, -10, iconKey, frameVal);

      const frameWidth = frame.width;
      const frameHeight = frame.height;
      if (frameWidth && frameHeight) {
        // Max space we want the image to occupy inside the card
        const maxWidth = CARD_WIDTH;
        const maxHeight = CARD_HEIGHT;

        // Compute a uniform scale that fits within both width & height constraints
        const scale = Math.min(maxWidth / frameWidth, maxHeight / frameHeight);
        image.setScale(scale);
      }

      nodes.push(image);
      return { nodes, icon: image };
    }

    // --- Fallback case: no valid art → draw a labeled rectangle ---
    const rect = this.add.rectangle(
      0,
      -24,
      CARD_WIDTH - 32,     // rectangle width slightly smaller than the card
      CARD_HEIGHT - 70,    // rectangle height smaller to leave breathing room
      0x1b2336,            // dark bluish fill
      0.85                 // alpha for subtle transparency
    ).setStrokeStyle(2, 0x303850, 1); // thin border for definition

    const label = this.add.text(
      0,
      -24,
      hero.ui?.name ?? uppercaseFirst(hero.key ?? 'Hero'),
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c8d0ff',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 60 } // prevent long names from overflowing
      }
    ).setOrigin(0.5); // center text on the rectangle

    nodes.push(rect, label);
    return { nodes, fallbackRect: rect, fallbackText: label };
  }

  /**
   * Builds the right-hand detail panel that mirrors the current selection.
   * Elements are cached on `this.*` so `_updateDetailPanel` can toggle them
   * without re-allocating display objects each focus change.
   */
  _createDetailPanel() {
    const width = 320;
    const height = 342;
    const container = this.add.container(this.scale.width * 0.78, this.scale.height * 0.55).setDepth(7);

    const bg = this.add.rectangle(0, 0, width, height, 0x0e1422, 0.95)
      .setStrokeStyle(2, 0x8a143a, 1);

    const glow = this.add.image(0, -height / 2 + 120, 'player_glow')
      .setScale(5)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.detailIcon = this.add.image(0, -height / 2 + 110, 'player_glow')
      .setVisible(false);

    this.detailFallbackRect = this.add.rectangle(0, -height / 2 + 120, 136, 136, 0x1b2336, 0.85)
      .setStrokeStyle(2, 0x303850, 1)
      .setVisible(false);

    this.detailFallbackText = this.add.text(0, -height / 2 + 120, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c8d0ff',
      align: 'center',
      wordWrap: { width: 160 }
    }).setOrigin(0.5).setVisible(false);

    this.detailName = this.add.text(0, -height / 2 + 10, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffd6e7'
    }).setOrigin(0.5, 0);

    this.detailBlurb = this.add.text(-width / 2 + 20, -height / 2 + 190, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c8d0ff',
      wordWrap: { width: width - 40 },
      lineSpacing: 4
    });

    this.detailStats = this.add.text(-width / 2 + 20, height / 2 - 110, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fb2ff',
      lineSpacing: 6
    });

    container.add([bg, glow, this.detailFallbackRect, this.detailIcon, this.detailFallbackText, this.detailName, this.detailBlurb, this.detailStats]);
    return container;
  }

  /**
   * Positions cards into a centred grid and keeps HUD text anchored to the
   * viewport so resizing or fullscreen transitions look correct.
   */
  _layoutCards(width, height) {
    if (!this.cards?.length) {
      return;
    }

    const rows = Math.ceil(this.cards.length / this.cols);
    const totalWidth = this.cols * CARD_WIDTH + (this.cols - 1) * CARD_PADDING;
    const totalHeight = rows * CARD_HEIGHT + (rows - 1) * CARD_PADDING;
    const startX = width * 0.5 - totalWidth / 2 - 120;
    const startY = height * 0.5 - totalHeight / 2 + 30;

    this.cards.forEach((card, index) => {
      const col = index % this.cols;
      const row = Math.floor(index / this.cols);
      const x = startX + col * (CARD_WIDTH + CARD_PADDING) + CARD_WIDTH / 2;
      const y = startY + row * (CARD_HEIGHT + CARD_PADDING) + CARD_HEIGHT / 2;
      card.container.setPosition(x, y);
    });

    this.detailPanel.setPosition(width * 0.78, height * 0.55 + 4);
    this.title.setPosition(width / 2, height * 0.18);
    this.hintText.setPosition(width / 2, height - 32);
  }

  /**
   * Toggle card visuals based on the focused index and refresh the detail
   * panel with the newly selected hero.
   */
  _updateFocus() {
    this.cards.forEach((card, index) => {
      const active = index === this.focusIndex;
      card.highlight.setVisible(active);
      card.background.setFillStyle(active ? 0x181f33 : 0x111522, active ? 1 : 0.92);
      card.name.setColor(active ? '#ffffff' : '#e9e2ff');
      card.container.setDepth(active ? 6 : 5);
    });

    const hero = this.heroes[this.focusIndex];
    if (hero) {
      this._updateDetailPanel(hero);
    }
  }

  /**
   * Populate the detail panel widgets for the current hero.  Stats are drawn
   * straight from the registry so the menu always reflects gameplay tuning.
   */
  _updateDetailPanel(hero) {
    const displayName = hero.ui?.name ?? uppercaseFirst(hero.key ?? 'Hero');
    this.detailName.setText(displayName);
    this.detailBlurb.setText(hero.ui?.blurb ?? 'Ready for battle.');

    const stats = hero.stats ?? {};
    const statLines = [];
    if (stats.speed !== undefined) statLines.push(`Speed: ${stats.speed}`);
    if (stats.maxHealth !== undefined) statLines.push(`Health: ${stats.maxHealth}`);
    if (stats.maxVelocity !== undefined) statLines.push(`Max Velocity: ${stats.maxVelocity}`);
    if (stats.iframeMs !== undefined) statLines.push(`I-Frames: ${stats.iframeMs}ms`);
    const starter = hero.weapons?.starter ?? [];
    const starterLabel = hero.weapons?.starterlabel || (starter.length ? starter.join(', ') : '—');
    statLines.push(`Starter: ${starterLabel}`);
    this.detailStats.setText(statLines.join('\n'));

    const iconConfig = hero?.ui?.icon;
    const iconKey = iconConfig?.key;
    const frameVal = iconConfig?.frame ?? 0;
    const frame = iconKey && this.textures.exists(iconKey)
      ? this.textures.getFrame(iconKey, frameVal)
      : null;

    if (frame) {
      this.detailIcon.setTexture(iconKey, frameVal);

      const frameWidth = frame.width;
      const frameHeight = frame.height;
      if (frameWidth && frameHeight) {
        const max = 150;
        const scale = Math.min(max / frameWidth, max / frameHeight);
        this.detailIcon.setScale(scale);
      } else {
        this.detailIcon.setScale(1);
      }

      this.detailIcon.setVisible(true);
      this.detailFallbackRect.setVisible(false);
      this.detailFallbackText.setVisible(false);
    } else {
      this.detailIcon.setVisible(false);
      this.detailFallbackRect.setVisible(true);
      this.detailFallbackText.setText(displayName).setVisible(true);
    }
  }

  /**
   * Apply bounds checking before committing to the new focus index.
   */
  _setFocus(index) {
    if (index < 0 || index >= this.heroes.length) {
      return;
    }
    if (this.focusIndex === index) {
      return;
    }
    this.focusIndex = index;
    this._updateFocus();
  }

  /**
   * Horizontal navigation stays within the current row.  We search along the
   * row in case the final row has fewer columns than `MAX_COLUMNS`.
   */
  _moveFocusHorizontal(delta) {
    if (!this.heroes.length) {
      return;
    }
    const row = Math.floor(this.focusIndex / this.cols);
    let newCol = (this.focusIndex % this.cols) + delta;

    while (newCol >= 0 && newCol < this.cols) {
      const candidate = row * this.cols + newCol;
      if (candidate < this.heroes.length) {
        this._setFocus(candidate);
        return;
      }
      newCol += delta > 0 ? 1 : -1;
    }
  }

  /**
   * Vertical navigation jumps by full rows while clamping to the list length.
   */
  _moveFocusVertical(delta) {
    if (!this.heroes.length) {
      return;
    }
    const currentRow = Math.floor(this.focusIndex / this.cols);
    const targetRow = currentRow + delta;
    const maxRow = Math.floor((this.heroes.length - 1) / this.cols);
    if (targetRow < 0 || targetRow > maxRow) {
      return;
    }
    const col = this.focusIndex % this.cols;
    let candidate = targetRow * this.cols + col;
    if (candidate >= this.heroes.length) {
      candidate = this.heroes.length - 1;
    }
    this._setFocus(candidate);
  }

  /**
   * Persist the last chosen hero (for menu defaults) and transition to gameplay.
   * The `_transitioning` guard prevents double activations from rapid clicks.
   */
  _confirmSelection() {
    if (this._transitioning || !this.heroes.length) {
      return;
    }
    const hero = this.heroes[this.focusIndex];
    if (!hero) {
      return;
    }

    this._transitioning = true;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('NOTBM:lastHero', hero.key);
      } catch (err) {
        console.warn('[HeroSelectScene] Failed to persist hero key:', err);
      }
    }

    // Brief delay lets the guard latch before `scene.start` tears the scene down.
    this.time.delayedCall(150, () => {
      this.scene.start('game', { heroKey: hero.key });
    });
  }

  /**
   * Return to the menu screen.  Guarded by `_transitioning` so Esc cannot be
   * spammed and interrupt the scene switch.
   */
  _returnToMenu() {
    if (this._transitioning) {
      return;
    }
    this._transitioning = true;
    this.scene.start('menu');
  }

  /**
   * Helper to read the last selected hero from localStorage.  Wrapped in
   * try/catch to tolerate Safari private browsing and other storage failures.
   */
  _getLastHeroKey() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage?.getItem('NOTBM:lastHero');
    } catch (err) {
      console.warn('[HeroSelectScene] Failed to read stored hero key:', err);
      return null;
    }
  }
}

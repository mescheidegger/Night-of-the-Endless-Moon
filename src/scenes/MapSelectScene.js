import Phaser from 'phaser';
import { DEFAULT_MAP_KEY, listMaps } from '../maps/MapRegistry.js';

// --- Layout constants ------------------------------------------------------
const CARD_WIDTH = 170;
const CARD_HEIGHT = 140;
const CARD_PADDING = 20;
const MAX_COLUMNS = 3;

/**
 * Utility that capitalises the first letter of a string. Used as a fallback
 * when the registry does not provide a `ui.name` field.
 */
function uppercaseFirst(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Interactive grid that lets the player choose a map before gameplay.
 * Supports keyboard navigation, pointer hover/click, and persists the last
 * choice via localStorage so the menu can default to the previous map.
 */
export class MapSelectScene extends Phaser.Scene {
  /** Initialize MapSelectScene state so runtime dependencies are ready. */
  constructor() {
    super('map-select');
    this.maps = [];
    this.cards = [];
    this.cols = 1;
    this.focusIndex = 0;
    this.heroKey = null;
    this.initialMapKey = null;
    this._transitioning = false;
  }

  /**
   * `init` runs before assets are created. We reset transient state here so
   * returning from the hero select yields a clean scene (no stuck transitions).
   */
  init(data) {
    this._transitioning = false;
    this.heroKey = data?.heroKey ?? null;
    this.initialMapKey = data?.mapKey ?? null;
  }

  /** Handle create so this system stays coordinated. */
  create() {
    const registeredMaps = listMaps();
    this.maps = registeredMaps.filter((mapEntry) => !mapEntry.hidden);

    if (!this.maps.length) {
      console.warn('[MapSelectScene] No visible maps registered; skipping select screen.');
      this.scene.start('game', {
        heroKey: this.heroKey ?? undefined,
        mapKey: DEFAULT_MAP_KEY,
      });
      return;
    }

    this.cols = Math.min(MAX_COLUMNS, Math.max(1, this.maps.length));

    const desiredKey = this.initialMapKey ?? this._getLastMapKey() ?? DEFAULT_MAP_KEY;
    const initialIndex = Math.max(0, this.maps.findIndex(mapEntry => mapEntry.key === desiredKey));
    this.focusIndex = initialIndex >= 0 ? initialIndex : 0;

    this._buildBackground();
    this._buildLayout();
    this._bindInput();

    this._layoutCards(this.scale.width, this.scale.height);
    this._updateFocus();
  }

  /**
   * Builds the animated backdrop + static instructions shared by the entire
   * map selection scene.
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

    this.title = this.add.text(this.scale.width / 2, this.scale.height * 0.18, 'Select a Map', {
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
   * Creates map cards, the detail panel, and registers resize/dispose hooks.
   */
  _buildLayout() {
    this.cards = this.maps.map((mapEntry, index) => this._createMapCard(mapEntry, index));

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
    this._handleBack = () => this._returnToHeroSelect();

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
   * Construct a selectable map card (thumbnail + name + focus ring).
   */
  _createMapCard(mapEntry, index) {
    const container = this.add.container(0, 0).setDepth(5);
    container.setSize(CARD_WIDTH, CARD_HEIGHT).setInteractive({ useHandCursor: true });

    const background = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x111522, 0.92)
      .setStrokeStyle(2, 0x303850, 1);

    const previewElements = this._buildCardPreview(mapEntry);

    const nameText = this.add.text(0, CARD_HEIGHT / 2 - 18,
      mapEntry.ui?.name ?? uppercaseFirst(mapEntry.key ?? 'Map'),
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e9e2ff',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 12 }
      }
    ).setOrigin(0.5);

    const highlight = this.add.rectangle(0, 0, CARD_WIDTH + 12, CARD_HEIGHT + 12)
      .setStrokeStyle(3, 0xffc857, 1)
      .setFillStyle(0x000000, 0)
      .setVisible(false);

    const children = [background, ...previewElements.nodes, nameText, highlight];
    container.add(children);

    container.on('pointerover', () => {
      this._setFocus(index);
    });

    container.on('pointerup', (pointer) => {
      if (pointer.leftButtonReleased()) {
        this._setFocus(index);
        this._confirmSelection();
      }
    });

    return {
      container,
      background,
      name: nameText,
      highlight,
      preview: previewElements
    };
  }

  /**
   * Builds either a thumbnail preview or a fallback block + label.
   */
  _buildCardPreview(mapEntry) {
    const thumbnailKey = mapEntry?.ui?.thumbnailKey;
    const frame = thumbnailKey && this.textures.exists(thumbnailKey)
      ? this.textures.getFrame(thumbnailKey)
      : null;

    if (frame) {
      const image = this.add.image(0, -8, thumbnailKey);
      const maxWidth = CARD_WIDTH - 24;
      const maxHeight = CARD_HEIGHT - 60;
      const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height);
      image.setScale(scale).setOrigin(0.5);
      return { nodes: [image], image };
    }

    const fallbackRect = this.add.rectangle(0, -8, CARD_WIDTH - 24, CARD_HEIGHT - 60, 0x20283a, 0.95)
      .setStrokeStyle(1, 0x39425a, 1);
    const fallbackText = this.add.text(0, -8, mapEntry.ui?.name ?? 'Map', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c8d0ff',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 30 }
    }).setOrigin(0.5);

    return { nodes: [fallbackRect, fallbackText], fallbackRect, fallbackText };
  }

  /**
   * Create the detail panel that highlights the current map selection.
   */
  _createDetailPanel() {
    const width = 260;
    const height = 320;
    const container = this.add.container(0, 0).setDepth(5);
    const bg = this.add.rectangle(0, 0, width, height, 0x121725, 0.95)
      .setStrokeStyle(2, 0x303850, 1);

    const glow = this.add.rectangle(0, 0, width + 6, height + 6)
      .setStrokeStyle(3, 0x5b376a, 0.4)
      .setFillStyle(0x000000, 0);

    this.detailThumbnail = this.add.image(0, -height / 2 + 90, '')
      .setVisible(false);

    this.detailFallbackRect = this.add.rectangle(0, -height / 2 + 90, 180, 120, 0x1d2433, 0.95)
      .setStrokeStyle(1, 0x39425a, 1)
      .setVisible(false);

    this.detailFallbackText = this.add.text(0, -height / 2 + 90, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c8d0ff',
      align: 'center',
      wordWrap: { width: 160 }
    }).setOrigin(0.5).setVisible(false);

    this.detailName = this.add.text(0, -height / 2 + 160, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffd6e7',
      align: 'center',
      wordWrap: { width: width - 30 }
    }).setOrigin(0.5, 0);

    this.detailType = this.add.text(0, -height / 2 + 200, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fb2ff'
    }).setOrigin(0.5, 0);

    this.detailBlurb = this.add.text(-width / 2 + 18, -height / 2 + 230, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#c8d0ff',
      wordWrap: { width: width - 36 },
      lineSpacing: 4
    });

    container.add([
      bg,
      glow,
      this.detailThumbnail,
      this.detailFallbackRect,
      this.detailFallbackText,
      this.detailName,
      this.detailType,
      this.detailBlurb
    ]);

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
   * panel with the newly selected map.
   */
  _updateFocus() {
    this.cards.forEach((card, index) => {
      const active = index === this.focusIndex;
      card.highlight.setVisible(active);
      card.background.setFillStyle(active ? 0x181f33 : 0x111522, active ? 1 : 0.92);
      card.name.setColor(active ? '#ffffff' : '#e9e2ff');
      card.container.setDepth(active ? 6 : 5);
    });

    const mapEntry = this.maps[this.focusIndex];
    if (mapEntry) {
      this._updateDetailPanel(mapEntry);
    }
  }

  /**
   * Populate the detail panel widgets for the current map.
   */
  _updateDetailPanel(mapEntry) {
    const displayName = mapEntry.ui?.name ?? uppercaseFirst(mapEntry.key ?? 'Map');
    this.detailName.setText(displayName);
    this.detailBlurb.setText(mapEntry.ui?.blurb ?? 'Survive the night.');

    const typeLabel = mapEntry.ui?.typeLabel ?? (mapEntry.type === 'bounded' ? 'Bounded' : 'Endless');
    this.detailType.setText(`Type: ${typeLabel}`);

    const thumbnailKey = mapEntry.ui?.thumbnailKey;
    const frame = thumbnailKey && this.textures.exists(thumbnailKey)
      ? this.textures.getFrame(thumbnailKey)
      : null;

    if (frame) {
      this.detailThumbnail.setTexture(thumbnailKey);
      const maxWidth = 180;
      const maxHeight = 120;
      const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height);
      this.detailThumbnail.setScale(scale);
      this.detailThumbnail.setVisible(true);
      this.detailFallbackRect.setVisible(false);
      this.detailFallbackText.setVisible(false);
    } else {
      this.detailThumbnail.setVisible(false);
      this.detailFallbackRect.setVisible(true);
      this.detailFallbackText.setText(displayName).setVisible(true);
    }
  }

  /**
   * Apply bounds checking before committing to the new focus index.
   */
  _setFocus(index) {
    if (index < 0 || index >= this.maps.length) {
      return;
    }
    if (this.focusIndex === index) {
      return;
    }
    this.focusIndex = index;
    this._updateFocus();
  }

  /**
   * Horizontal navigation switches within the current row.
   */
  _moveFocusHorizontal(delta) {
    if (!this.maps.length) {
      return;
    }
    const row = Math.floor(this.focusIndex / this.cols);
    let newCol = (this.focusIndex % this.cols) + delta;

    while (newCol >= 0 && newCol < this.cols) {
      const candidate = row * this.cols + newCol;
      if (candidate < this.maps.length) {
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
    if (!this.maps.length) {
      return;
    }
    const currentRow = Math.floor(this.focusIndex / this.cols);
    const targetRow = currentRow + delta;
    const maxRow = Math.floor((this.maps.length - 1) / this.cols);
    if (targetRow < 0 || targetRow > maxRow) {
      return;
    }
    const col = this.focusIndex % this.cols;
    let candidate = targetRow * this.cols + col;
    if (candidate >= this.maps.length) {
      candidate = this.maps.length - 1;
    }
    this._setFocus(candidate);
  }

  /**
   * Persist the last chosen map (for menu defaults) and transition to gameplay.
   */
  _confirmSelection() {
    if (this._transitioning || !this.maps.length) {
      return;
    }
    const mapEntry = this.maps[this.focusIndex];
    if (!mapEntry) {
      return;
    }

    this._transitioning = true;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('NOTBM:lastMap', mapEntry.key);
      } catch (err) {
        console.warn('[MapSelectScene] Failed to persist map key:', err);
      }
    }

    this.time.delayedCall(150, () => {
      this.scene.start('game', {
        heroKey: this.heroKey ?? undefined,
        mapKey: mapEntry.key
      });
    });
  }

  /**
   * Return to the hero selection screen.
   */
  _returnToHeroSelect() {
    if (this._transitioning) {
      return;
    }
    this._transitioning = true;
    this.scene.start('hero-select', { heroKey: this.heroKey ?? undefined });
  }

  /**
   * Helper to read the last selected map from localStorage.
   */
  _getLastMapKey() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage?.getItem('NOTBM:lastMap');
    } catch (err) {
      console.warn('[MapSelectScene] Failed to read stored map key:', err);
      return null;
    }
  }
}

import Phaser from 'phaser';
import { TreasureModalFx } from '../fx/index.js';

const PANEL_WIDTH = 520;
const PANEL_HEIGHT = 250;
const PANEL_DEPTH = 50;
const BUTTON_WIDTH = 180;
const BUTTON_HEIGHT = 56;

export class TreasurePickupModal {
  constructor(scene, { onClose, depthBase = 0, treasureType = 'default' } = {}) {
    this.scene = scene;
    this.onClose = onClose;
    this._closed = false;
    this._keyListeners = [];
    this._pauseSource = 'treasurePickupModal';

    // ✅ IMPORTANT: actually pause the simulation (what LevelUpFlow does)
    this.scene?._acquireSimulationPause?.(this._pauseSource);

    const { width, height } = scene.scale;
    const baseDepth = Number.isFinite(depthBase) ? depthBase : 0;
    const panelDepth = baseDepth + PANEL_DEPTH;

    // Backdrop: purely visual (no input)
    this.backdrop = scene.add
      .rectangle(0, 0, width, height, 0x040108, 0.68)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(panelDepth);

    this.container = scene.add
      .container(width / 2, height / 2)
      .setDepth(panelDepth + 1)
      .setScrollFactor(0);

    const panel = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x1a0c1f, 0.96)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xffd166, 0.95);

    const title = scene.add
      .text(0, -62, 'TREASURE FOUND', {
        font: '28px monospace',
        color: '#ffe599',
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const body = scene.add
      .text(0, -12, 'A mysterious chest has been opened.', {
        font: '17px monospace',
        color: '#f4e8ff',
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.okButton = this._createOkButton(panelDepth + 2);
    this.okButton.setPosition(0, 70);

    this.container.add([panel, title, body, this.okButton]);

    this.treasureFx = new TreasureModalFx();
    this.treasureFx.attach({
      scene,
      anchorContainer: this.container,
      depthBase: panelDepth,
      variant: treasureType
    });

    this._onResize = (size) => {
      if (!size) return;
      this.backdrop.setSize(size.width, size.height);
      this.container.setPosition(size.width / 2, size.height / 2);
      this.treasureFx?.onResize?.();
    };
    scene.scale.on('resize', this._onResize);

    this._bindKeys();
  }

  _createOkButton(depth) {
    const root = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(depth)
      .setSize(BUTTON_WIDTH, BUTTON_HEIGHT);

    const bg = this.scene.add
      .rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 0x4d1b5e, 0.98)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xffd166, 0.95);

    const label = this.scene.add
      .text(0, 0, 'OK', {
        font: '22px monospace',
        color: '#fff0c2',
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const hit = this.scene.add
      .zone(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT)
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const reset = () => bg.setFillStyle(0x4d1b5e, 0.98);

    hit.on('pointerover', () => bg.setFillStyle(0x63307a, 1));
    hit.on('pointerout', reset);
    hit.on('pointerdown', () => bg.setFillStyle(0x351046, 1));
    hit.on('pointerup', () => {
      reset();
      this.close();
    });
    hit.on('pointerupoutside', reset);

    root.add([bg, label, hit]);
    return root;
  }

  _bindKeys() {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    const closeHandler = (event) => {
      event?.stopPropagation?.();
      event?.preventDefault?.();
      this.close();
    };

    ['keydown-ENTER', 'keydown-SPACE', 'keydown-ESC'].forEach((evt) => {
      keyboard.on(evt, closeHandler);
      this._keyListeners.push({ evt, handler: closeHandler });
    });
  }

  close() {
    if (this._closed) return;
    this._closed = true;

    // ✅ IMPORTANT: resume simulation
    this.scene?._releaseSimulationPause?.(this._pauseSource);

    this.onClose?.();
    this.destroy();
  }

  destroy() {
    const keyboard = this.scene?.input?.keyboard;
    if (keyboard) {
      this._keyListeners.forEach(({ evt, handler }) => keyboard.off(evt, handler));
    }
    this._keyListeners.length = 0;

    this.scene?.scale?.off?.('resize', this._onResize);

    // Kill FX first (so it can't reference a torn-down scene/container)
    this.treasureFx?.destroy?.();

    this.okButton?.destroy(true);
    this.container?.destroy(true);
    this.backdrop?.destroy();

    this.okButton = null;
    this.container = null;
    this.backdrop = null;
    this.treasureFx = null;
    this.onClose = null;
    this.scene = null;
  }
}

export class DebugOverlay {
  /** Initialize DebugOverlay state so runtime dependencies are ready. */
  constructor(
    scene,
    { x = 8, y = 8, width = 90, padding = 6, depth = 65 } = {}
  ) {
    this.scene = scene;
    this.padding = padding;
    this.width = width;

    this.container = scene.add.container(x, y)
      .setScrollFactor(0)
      .setDepth(depth);

    // Smaller, compact text styles
    const labelStyle = { font: '10px Arial', color: '#b7c2ff' };
    const valueStyle = { font: '10px Arial', color: '#ffffff' };

    const labels = ['Time', 'Enemies', 'Drops', 'XP'];
    const lineHeight = 14;

    this.labelTexts = [];
    this.valueTexts = [];

    labels.forEach((label, index) => {
      const yPos = padding + index * lineHeight;

      const labelText = scene.add.text(
        padding,
        yPos,
        `${label}:`,
        labelStyle
      );

      const valueText = scene.add.text(
        width - padding,
        yPos,
        '--',
        valueStyle
      ).setOrigin(1, 0);

      this.labelTexts.push(labelText);
      this.valueTexts.push(valueText);
    });

    const panelHeight = padding * 2 + labels.length * lineHeight;

    this.background = scene.add.graphics();
    this.background.fillStyle(0x0b1024, 0.7);
    this.background.lineStyle(1, 0x3a4775, 0.9);
    this.background.fillRoundedRect(0, 0, width, panelHeight, 5);
    this.background.strokeRoundedRect(0, 0, width, panelHeight, 5);

    this.container.add([
      this.background,
      ...this.labelTexts,
      ...this.valueTexts,
    ]);

    this.setPosition(x, y);
  }

  /** Handle setPosition so this system stays coordinated. */
  setPosition(x, y) {
    this.container?.setPosition(x, y);
  }

  /** Handle setVisible so this system stays coordinated. */
  setVisible(isVisible) {
    this.container?.setVisible(isVisible);
  }

  /** Handle setStats so this system stays coordinated. */
  setStats({ elapsedSeconds = 0, enemies = 0, drops = 0, xp = 0 } = {}) {
    if (!this.container) return;

    const values = [
      `${elapsedSeconds.toFixed(1)}s`,
      enemies.toString(),
      drops.toString(),
      xp.toString(),
    ];

    this.valueTexts.forEach((text, index) => {
      text.setText(values[index] ?? '--');
    });
  }

  /** Handle destroy so this system stays coordinated. */
  destroy() {
    this.background?.destroy();
    this.labelTexts?.forEach((text) => text.destroy());
    this.valueTexts?.forEach((text) => text.destroy());
    this.container?.destroy();

    this.scene = null;
    this.background = null;
    this.labelTexts = null;
    this.valueTexts = null;
    this.container = null;
  }
}

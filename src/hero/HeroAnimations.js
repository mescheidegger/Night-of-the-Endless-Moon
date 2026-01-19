/**
 * Register the walk/idle/die animation sets for a hero based on the registry
 * metadata.  Animation keys are namespaced (`${heroKey}:walk-down`) so multiple
 * heroes can coexist without clobbering each other.
 */
export function registerHeroAnimations(scene, heroEntry) {
  if (!scene || !heroEntry) {
    return;
  }

  const { key, sheets, animations } = heroEntry;
  if (!sheets || !animations) {
    return;
  }

  const prefix = `${key}`;
  const {
    singleDirection = false,
    framesPerRow = 8,
    framesPerRowBySheet = {},
    rowByDirection = {},
    frameRate = {}
  } = animations;
  const walkRate = frameRate.walk ?? 10;
  const dieRate = frameRate.die ?? 9;

  // Helper to convert a row index into the start/end frame range within the sheet.
  /**
   * Resolve how many frames per row a sheet uses so row math stays consistent
   * even when some sheets override the global animation metadata.
   */
  const resolveFramesPerRow = (sheetName) => {
    const perSheet = framesPerRowBySheet?.[sheetName];
    const fallback = framesPerRow;
    const value = typeof perSheet === 'number' && perSheet > 0 ? perSheet : fallback;
    return Math.max(1, value || 1);
  };

  /**
   * Look up the total frame count for a sheet so we can clamp ranges to valid frames.
   */
  const sheetFrameCount = (sheetName) => {
    const frames = sheets?.[sheetName]?.frameCount;
    return typeof frames === 'number' ? frames : null;
  };

  /**
   * Calculate the frame start/end for a given row so animation generation stays safe.
   */
  const rowRange = (sheetName, rowIndex = 0) => {
    const perRow = resolveFramesPerRow(sheetName);
    const start = rowIndex * perRow;
    const totalFrames = sheetFrameCount(sheetName);

    if (typeof totalFrames === 'number' && start >= totalFrames) {
      return null;
    }

    const end = typeof totalFrames === 'number'
      ? Math.min(start + (perRow - 1), totalFrames - 1)
      : start + (perRow - 1);

    if (end < start) {
      return null;
    }

    return { start, end };
  };

  // Each direction reuses the same sprite sheet rows so generate animations lazily.
  /**
   * Register a looping walk animation for a direction if it is not already defined.
   */
  const createWalk = (direction, rowIndex) => {
    if (!sheets.walk?.key) return;
    const keyName = `${prefix}:walk-${direction}`;
    if (scene.anims.exists(keyName)) return;
    const range = rowRange('walk', rowIndex);
    if (!range) return;
    scene.anims.create({
      key: keyName,
      frames: scene.anims.generateFrameNumbers(sheets.walk.key, range),
      frameRate: walkRate,
      repeat: -1
    });
  };

  /**
   * Register a static idle animation for a direction to keep facing stable at rest.
   */
  const createIdle = (direction, rowIndex) => {
    if (!sheets.idle?.key) return;
    const keyName = `${prefix}:idle-${direction}`;
    if (scene.anims.exists(keyName)) return;
    const range = rowRange('idle', rowIndex) ?? { start: 0 };
    scene.anims.create({
      key: keyName,
      frames: [{ key: sheets.idle.key, frame: range.start }]
    });
  };

  /**
   * Register the death animation so defeat sequences can play the correct row.
   */
  const createDeath = (direction, rowIndex) => {
    if (!sheets.die?.key) return;
    const keyName = `${prefix}:die-${direction}`;
    if (scene.anims.exists(keyName)) return;
    const range = rowRange('die', rowIndex);
    if (!range) return;
    scene.anims.create({
      key: keyName,
      frames: scene.anims.generateFrameNumbers(sheets.die.key, range),
      frameRate: dieRate,
      repeat: 0
    });
  };

  if (singleDirection) {
    const baseDirection = Object.keys(rowByDirection)[0] ?? 'right';
    const rowIndex = rowByDirection[baseDirection] ?? 0;
    const directions = [
      'right',
      'left',
      'down',
      'up',
      'leftup',
      'leftdown',
      'rightup',
      'rightdown'
    ];
    directions.forEach((direction) => {
      createWalk(direction, rowIndex);
      createIdle(direction, rowIndex);
      createDeath(direction, rowIndex);
    });
    return;
  }

  Object.entries(rowByDirection).forEach(([direction, rowIndex]) => {
    createWalk(direction, rowIndex);
    createIdle(direction, rowIndex);
    createDeath(direction, rowIndex);
  });
}

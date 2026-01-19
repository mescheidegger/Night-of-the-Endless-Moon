//main.js
import Phaser from 'phaser';
import { BootScene } from './src/scenes/BootScene.js';
import { MenuScene } from './src/scenes/MenuScene.js';
import { GameScene } from './src/scenes/GameScene.js';
import { HeroSelectScene } from './src/scenes/HeroSelectScene.js';

// Register the PWA service worker once the window finishes loading.
// Registration is guarded so local dev without HTTPS (or older browsers)
// simply skips the PWA bootstrap.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      // console.log('[PWA] service worker registered');
    } catch (err) {
      console.warn('[PWA] service worker registration failed', err);
    }
  });
}

/*
  Create the Phaser game instance.
  - type: AUTO picks WebGL if available, otherwise Canvas fallback.
  - parent: attaches the game canvas to the <div id="app"> in index.html.
  - width/height: the internal resolution of the game world (NOT CSS size).
  - backgroundColor: used when no scene background is set.
  - pixelArt: disables texture smoothing; keeps sprites crisp when scaled.
  - physics: using Arcade Physics with no gravity (top-down style).
  - scene: ordered list of scenes that Phaser loads/initializes.
*/
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,  // Base resolution width
  height: 540, // Base resolution height (16:9 ratio)
  backgroundColor: '#0b0f18',

  // Ensures pixel-art stays sharp (critical for retro style)
  pixelArt: true,

  physics: { 
    default: 'arcade', 
    arcade: { 
      gravity: { y: 0 }, // No gravity for top-down movement
      debug: false       // Toggle this to true while tuning collisions
    } 
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  // BootScene typically loads assets → GameScene runs the actual gameplay
  scene: [BootScene, MenuScene, HeroSelectScene, GameScene]
});

import Phaser from 'phaser';

export class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.lastPlayTimes = new Map();  // key -> timestamp
    this.activeCounts = new Map();   // key -> count
    this.busVolumes = {
      sfx: 1.0,
      ui: 1.0,
      music: 1.0
    };
    this.music = null;
    this.musicKey = null;
    this.musicBus = 'music';
    this.musicBaseVolume = 1.0;
    this._hasLoadedFromStorage = false;
    this._pendingMusicRequest = null;
  }

  setScene(scene) {
    this.scene = scene;
  }

  playSfx(key, config = {}) {
    if (!key || !this.scene) return null;

    if (!this.scene.cache?.audio?.exists(key)) {
      return null;
    }

    const now = this.scene.time?.now ?? 0;

    const volume = config.volume ?? 1.0;
    const bus = config.bus ?? 'sfx';
    const maxSimultaneous = config.maxSimultaneous ?? 8;
    const minIntervalMs = config.minIntervalMs ?? 0;
    const pitchJitter = config.pitchJitter ?? 0;

    const lastTime = this.lastPlayTimes.get(key) ?? 0;
    if (minIntervalMs > 0 && now - lastTime < minIntervalMs) return null;

    const currentCount = this.activeCounts.get(key) ?? 0;
    if (currentCount >= maxSimultaneous) return null;

    const baseVolume = this.busVolumes[bus] ?? 1.0;
    const finalVolume = baseVolume * volume;

    const sound = this.scene.sound.add(key);
    this.lastPlayTimes.set(key, now);
    this.activeCounts.set(key, currentCount + 1);

    if (pitchJitter !== 0) {
      const detuneCents = (Math.random() * 2 - 1) * pitchJitter * 100;
      sound.setDetune(detuneCents);
    }

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;

      const count = this.activeCounts.get(key) ?? 1;
      this.activeCounts.set(key, Math.max(0, count - 1));

      sound.destroy();
    };

    sound.once('complete', cleanup);
    sound.once('stop', cleanup);
    sound.once('destroy', cleanup);

    sound.play({ volume: finalVolume });
    return sound;
  }


  playMusic(key, config = {}) {
    if (!key || !this.scene) {
      return;
    }

    if (!this.scene.cache?.audio?.exists(key)) {
      this._pendingMusicRequest = { key, config };
      return;
    }

    this._pendingMusicRequest = null;
    const requestedBus = config.bus ?? 'music';
    const baseVolume = config.volume ?? 1.0;

    // If the requested track is already playing, just update volume/bus.
    if (this.music && this.musicKey === key && this.music.isPlaying) {
      this.musicBus = requestedBus;
      this.musicBaseVolume = baseVolume;
      this._updateMusicVolume();
      return;
    }

    // Stop any existing track before switching.
    this.stopMusic();

    this.musicKey = key;
    this.musicBus = requestedBus;
    this.musicBaseVolume = baseVolume;
    this.music = this.scene.sound.add(key, { loop: true });
    this._updateMusicVolume();
    this.music.play();
  }

  tryPlayPendingMusic() {
    if (!this._pendingMusicRequest) {
      return;
    }

    const { key, config } = this._pendingMusicRequest;
    if (!this.scene?.cache?.audio?.exists(key)) {
      return;
    }

    this._pendingMusicRequest = null;
    this.playMusic(key, config);
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
    }
    this.music = null;
    this.musicKey = null;
    this.musicBus = 'music';
    this.musicBaseVolume = 1.0;
  }

  setBusVolume(bus, value) {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    this.busVolumes[bus] = clamped;

    if (bus === 'music') {
      this._updateMusicVolume();
    }
  }

  getBusVolume(bus) {
    return this.busVolumes[bus] ?? 1.0;
  }

  saveToStorage() {
    try {
      const data = {
        sfx: this.busVolumes.sfx ?? 1.0,
        ui: this.busVolumes.ui ?? 1.0,
        music: this.busVolumes.music ?? 1.0
      };
      window.localStorage.setItem('NOTBM:audio', JSON.stringify(data));
    } catch (err) {
      // ignore storage failures
    }
  }

  loadFromStorage() {
    if (this._hasLoadedFromStorage) return;
    this._hasLoadedFromStorage = true;

    try {
      const raw = window.localStorage.getItem('NOTBM:audio');
      if (!raw) return;

      const data = JSON.parse(raw);
      if (typeof data.sfx === 'number') this.setBusVolume('sfx', data.sfx);
      if (typeof data.ui === 'number') this.setBusVolume('ui', data.ui);
      if (typeof data.music === 'number') this.setBusVolume('music', data.music);
    } catch (err) {
      // ignore parse / storage errors
    }
  }

  _updateMusicVolume() {
    if (!this.music) {
      return;
    }

    const busVolume = this.busVolumes[this.musicBus] ?? 1.0;
    const finalVolume = busVolume * this.musicBaseVolume;
    this.music.setVolume(finalVolume);
  }
}

export function getOrCreateSoundManager(scene) {
  const game = scene?.game;
  if (!game) return null;

  if (!game.__soundManager) {
    game.__soundManager = new SoundManager(scene);
  } else {
    game.__soundManager.setScene(scene);
  }

  return game.__soundManager;
}

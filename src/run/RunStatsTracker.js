export class RunStatsTracker {
  constructor(scene, { events, startTime = null } = {}) {
    this.scene = scene;
    this.events = events ?? scene?.events ?? null;
    this.startTime = startTime;
    this.kills = 0;

    this._onEnemyDied = () => {
      this.kills += 1;
    };

    this.events?.on?.('enemy:died', this._onEnemyDied);
  }

  setStartTime(startTime) {
    this.startTime = startTime;
  }

  reset({ startTime = null } = {}) {
    this.kills = 0;
    this.startTime = startTime;
  }

  getElapsedMs(now = null) {
    if (typeof this.scene?.getRunElapsedMs === 'function') {
      return this.scene.getRunElapsedMs();
    }

    const nowMs = Number.isFinite(now) ? now : (this.scene?.time?.now ?? 0);
    const effectiveStart = Number.isFinite(this.startTime) ? this.startTime : nowMs;
    return Math.max(0, nowMs - effectiveStart);
  }

  getSnapshot() {
    const elapsedMs = this.getElapsedMs();
    const xpEarned = this.scene?.playerXP ?? 0;

    return {
      timeSurvivedSeconds: elapsedMs / 1000,
      timeSurvivedMs: elapsedMs,
      kills: this.kills,
      xpEarned
    };
  }

  destroy() {
    this.events?.off?.('enemy:died', this._onEnemyDied);
    this._onEnemyDied = null;
    this.scene = null;
    this.events = null;
  }
}

export class PlayerDerivedStatsApplier {
  constructor(scene, {
    events,
    hero,
    heroEntry,
    passiveManager
  } = {}) {
    this.scene = scene ?? null;
    this.events = events ?? scene?.events ?? null;
    this.hero = hero ?? scene?.hero ?? null;
    this.heroEntry = heroEntry ?? scene?.heroEntry ?? null;
    this.passiveManager = passiveManager ?? scene?.passiveManager ?? null;

    this._onPlayerStatsChanged = (payload = {}) => {
      if (payload?.source !== 'passives') return;
      this.applyAggregate(payload.aggregate ?? {});
    };

    this.events?.on?.('player:stats:changed', this._onPlayerStatsChanged);
  }

  applyAggregate(aggregate = {}) {
    const health = this.hero?.health;
    if (!health?.setIFrameDurationMs) return;

    const baseIFrame = this.heroEntry?.stats?.iframeMs ?? 0;
    const bonus = aggregate?.iframeMsBonus ?? 0;
    if (!Number.isFinite(baseIFrame) || !Number.isFinite(bonus)) return;

    health.setIFrameDurationMs(baseIFrame + bonus);
  }

  applyNow() {
    const aggregate = this.passiveManager?.getAggregate?.() ?? {};
    this.applyAggregate(aggregate);
  }

  destroy() {
    this.events?.off?.('player:stats:changed', this._onPlayerStatsChanged);
    this.scene = null;
    this.events = null;
    this.hero = null;
    this.heroEntry = null;
    this.passiveManager = null;
  }
}

const FALLBACK_NOW = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

/**
 * Tracks short lived reservations representing projectiles that are already en route to a target.
 * The coordinator provides a lightweight heuristic so different weapons can avoid "dog piling"
 * the same enemy unless necessary.
 *
 * Each reservation records:
 *  - `weaponId` → which weapon claimed the shot (used so we can release everything when a weapon is unequipped).
 *  - `enemy` → the target instance (used as the map key as well).
 *  - `impactTime` → when we expect the projectile to land.
 *  - `damage` → how much damage we believe the projectile will apply.
 *  - `expiresAt` → impact time plus a small buffer to tolerate timing drift.
 */
export class TargetingCoordinator {
  /**
   * @param {Object} options - Optional tuning overrides for heuristic knobs.
   * @param {number} options.candidateCount - How many enemies per weapon we score per update.
   * @param {number} options.etaToleranceMs - Extra ms added to impact ETAs to account for latency.
   * @param {number} options.expiryBufferMs - Lifespan after impact when reservations are still valid.
   * @param {number} options.overkillTolerance - How much negative HP is allowed before penalizing.
   * @param {number} options.overkillPenaltyWeight - Strength of the dog-pile penalty.
   * @param {number} options.killshotWindow - HP threshold that counts as a high value "kill shot".
   * @param {number} options.killshotBonus - How much we bias toward low-HP enemies still alive.
   */
  constructor(options = {}) {
    this.config = {
      candidateCount: Math.max(1, options.candidateCount ?? 6),
      etaToleranceMs: Math.max(0, options.etaToleranceMs ?? 120),
      expiryBufferMs: Math.max(0, options.expiryBufferMs ?? 150),
      overkillTolerance: Math.max(0, options.overkillTolerance ?? 0),
      overkillPenaltyWeight: Math.max(0, options.overkillPenaltyWeight ?? 40),
      killshotWindow: Math.max(0, options.killshotWindow ?? 3),
      killshotBonus: Math.max(0, options.killshotBonus ?? 120)
    };

    // Internally we index reservations by the enemy instance for constant time lookup.
    // The map value is an array because multiple weapons can be aiming at the same enemy.
    this._reservations = new Map(); // Map<enemy, Array<reservation>>
    this._nextId = 1;
  }

  /**
   * Remove any reservations that have expired or reference an inactive enemy.
   */
  prune(now = FALLBACK_NOW()) {
    this._reservations.forEach((reservations, enemy) => {
      if (!enemy || !enemy.active) {
        this._reservations.delete(enemy);
        return;
      }

      // Only retain reservations that are still in the future so we do not overcount damage.
      const filtered = reservations.filter((res) => res && res.expiresAt > now);
      if (filtered.length === reservations.length) return;

      if (filtered.length === 0) {
        this._reservations.delete(enemy);
      } else {
        this._reservations.set(enemy, filtered);
      }
    });
  }

  /**
   * Reserve predicted damage for a future projectile impact.
   * Returns the reservation object so the caller can explicitly release it on hit or expiry.
   */
  reserve(weaponId, enemy, impactTimeMs, predictedDamage) {
    if (!enemy || !weaponId) return null;

    const impactTime = Number.isFinite(impactTimeMs) ? impactTimeMs : FALLBACK_NOW();
    const damage = Number.isFinite(predictedDamage) ? predictedDamage : 0;
    const expiresAt = impactTime + this.config.expiryBufferMs;

    const reservation = {
      id: this._nextId,
      weaponId,
      enemy,
      impactTime,
      damage,
      expiresAt
    };
    this._nextId += 1;

    // Store reservation with the enemy so future targeting passes can look it up.
    const list = this._reservations.get(enemy) ?? [];
    list.push(reservation);
    this._reservations.set(enemy, list);

    return reservation;
  }

  /**
   * Sum predicted incoming damage that will land on the enemy before the supplied time.
   *
   * The optional tolerance lets callers pad ETAs when they have lower confidence in their
   * projectile speed calculation (e.g., moving targets or network latency).
   */
  predictedDamageBefore(enemy, timeMs, toleranceMs = 0) {
    if (!enemy) return 0;
    const list = this._reservations.get(enemy);
    if (!list || list.length === 0) return 0;

    const horizon = (Number.isFinite(timeMs) ? timeMs : FALLBACK_NOW()) + Math.max(0, toleranceMs);
    let total = 0;
    list.forEach((reservation) => {
      if (!reservation) return;
      // Include any reservation that resolves before the padded horizon.
      if (reservation.impactTime <= horizon) {
        total += reservation.damage ?? 0;
      }
    });
    return total;
  }

  /**
   * Compute the predicted HP remaining when all known reservations land up to the given impact time.
   * Essentially `currentHp - predictedDamageBefore(...)` but wrapped here for clarity.
   */
  predictedHpAtImpact(enemy, currentHp, impactTime, toleranceMs = 0) {
    const hp = Number.isFinite(currentHp) ? currentHp : 0;
    const predictedDamage = this.predictedDamageBefore(enemy, impactTime, toleranceMs);
    return hp - predictedDamage;
  }

  /**
   * Remove all reservations placed by a weapon (e.g., when unequipped).
   * This prevents stale reservations from skewing predictions after a weapon leaves the loadout.
   */
  releaseByWeapon(weaponId) {
    if (!weaponId) return;
    this._reservations.forEach((reservations, enemy) => {
      const filtered = reservations.filter((reservation) => reservation.weaponId !== weaponId);
      if (filtered.length === 0) {
        this._reservations.delete(enemy);
      } else if (filtered.length !== reservations.length) {
        this._reservations.set(enemy, filtered);
      }
    });
  }

  /**
   * Remove all reservations for a specific enemy.
   */
  clearForEnemy(enemy) {
    if (!enemy) return;
    this._reservations.delete(enemy);
  }

  /**
   * Consume a specific reservation object (typically when the projectile lands or despawns early).
   * Returns true when the reservation was found and removed so callers can log/telemetry if needed.
   */
  consumeReservation(reservation) {
    if (!reservation || !reservation.enemy) return false;

    const list = this._reservations.get(reservation.enemy);
    if (!list || list.length === 0) return false;

    const idx = list.findIndex((entry) => entry && entry.id === reservation.id);
    if (idx === -1) return false;

    list.splice(idx, 1);
    if (list.length === 0) {
      this._reservations.delete(reservation.enemy);
    }

    return true;
  }

  /**
   * Helper to expose the heuristic tuning knobs to consumers without allowing mutation.
   * External callers (like the weapon controller) can inspect current values without risking
   * accidental mutation of the internal config object.
   */
  getConfig() {
    return { ...this.config };
  }
}


export type PoliceState = 'PATROL' | 'SEARCH' | 'CHASE' | 'CONTROL';

export class PoliceSystem {
  private heat = 0;
  private cooldownMs = 0;
  private controlCooldownMs = 0;
  private controlPending = false;
  private state: PoliceState = 'PATROL';

  setHeat(value: number): void {
    this.heat = this.clamp(value);
    if (this.heat <= 0) {
      this.state = 'PATROL';
      this.controlPending = false;
    } else if (this.state === 'PATROL') {
      this.state = 'SEARCH';
    }
  }

  getHeat(): number {
    return this.heat;
  }

  getLevel(): number {
    if (this.heat < 15) return 0;
    if (this.heat < 30) return 1;
    if (this.heat < 50) return 2;
    if (this.heat < 70) return 3;
    if (this.heat < 90) return 4;
    return 5;
  }

  getState(): PoliceState {
    return this.state;
  }

  addHeat(amount: number, holdMs = 3500): number {
    this.heat = this.clamp(this.heat + Math.max(0, amount));
    this.cooldownMs = Math.max(this.cooldownMs, holdMs);
    if (this.heat > 0 && this.state === 'PATROL') this.state = 'SEARCH';
    return this.heat;
  }

  clear(): void {
    this.heat = 0;
    this.cooldownMs = 0;
    this.controlPending = false;
    this.state = 'PATROL';
  }

  update(
    deltaMs: number,
    observed: boolean,
    distanceToPolice = Number.POSITIVE_INFINITY,
    actorSpeed = 0
  ): PoliceState {
    const safeDelta = Number.isFinite(deltaMs) ? Math.max(0, Math.min(250, deltaMs)) : 0;
    this.controlCooldownMs = Math.max(0, this.controlCooldownMs - safeDelta);

    if (this.heat <= 0) {
      this.clear();
      return this.state;
    }

    if (observed) {
      this.cooldownMs = Math.max(this.cooldownMs, 1800);
      const canControl = this.getLevel() >= 1
        && distanceToPolice <= 82
        && Math.abs(actorSpeed) <= 55
        && this.controlCooldownMs <= 0;

      if (canControl) {
        this.state = 'CONTROL';
        this.controlPending = true;
        this.controlCooldownMs = 9000;
      } else {
        this.state = 'CHASE';
      }
      return this.state;
    }

    this.state = 'SEARCH';

    if (this.cooldownMs > 0) {
      this.cooldownMs = Math.max(0, this.cooldownMs - safeDelta);
      return this.state;
    }

    const level = this.getLevel();
    const decayPerSecond = level >= 4 ? 1.0 : level >= 2 ? 1.6 : 2.4;
    this.heat = this.clamp(this.heat - decayPerSecond * (safeDelta / 1000));

    if (this.heat <= 0) {
      this.clear();
    }

    return this.state;
  }

  consumeControl(): boolean {
    if (!this.controlPending) return false;
    this.controlPending = false;
    return true;
  }

  resolveControl(): { previousLevel: number; remainingHeat: number } {
    const previousLevel = this.getLevel();
    this.heat = this.clamp(this.heat - 45);
    this.cooldownMs = Math.max(this.cooldownMs, 2500);
    this.state = this.heat > 0 ? 'SEARCH' : 'PATROL';
    return { previousLevel, remainingHeat: this.heat };
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }
}

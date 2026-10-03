export type PerformanceProfile = 'high' | 'balanced' | 'low';

export type AppSettings = {
  textScale: number;
  reducedMotion: boolean;
  performance: PerformanceProfile;
  largeTouchTargets: boolean;
};

const KEY = 'freistadt_settings_v1';

const DEFAULTS: AppSettings = {
  textScale: 1,
  reducedMotion: false,
  performance: 'balanced',
  largeTouchTargets: false
};

export class SettingsSystem {
  static load(): AppSettings {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<AppSettings>;

      return {
        textScale: this.clampNumber(parsed.textScale, 0.9, 1.4, 1),
        reducedMotion: parsed.reducedMotion === true,
        performance: parsed.performance === 'high' || parsed.performance === 'low'
          ? parsed.performance
          : 'balanced',
        largeTouchTargets: parsed.largeTouchTargets === true
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  static save(settings: AppSettings): void {
    const safe: AppSettings = {
      textScale: this.clampNumber(settings.textScale, 0.9, 1.4, 1),
      reducedMotion: settings.reducedMotion === true,
      performance: settings.performance === 'high' || settings.performance === 'low'
        ? settings.performance
        : 'balanced',
      largeTouchTargets: settings.largeTouchTargets === true
    };

    try {
      localStorage.setItem(KEY, JSON.stringify(safe));
    } catch {
      // Settings remain active for the current session through the caller.
    }
  }

  static defaults(): AppSettings {
    return { ...DEFAULTS };
  }

  private static clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : fallback;
  }
}

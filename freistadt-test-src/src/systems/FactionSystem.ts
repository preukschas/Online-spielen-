export type FactionId = 'metroexpress' | 'velocity' | 'kulturverein';

export type ReputationState = Record<FactionId, number>;

export const FACTIONS: Record<FactionId, { name: string; shortName: string }> = {
  metroexpress: { name: 'MetroExpress', shortName: 'Metro' },
  velocity: { name: 'Velocity Club', shortName: 'Velocity' },
  kulturverein: { name: 'Westend Kulturverein', shortName: 'Kultur' }
};

export function createDefaultReputation(): ReputationState {
  return {
    metroexpress: 0,
    velocity: 0,
    kulturverein: 0
  };
}

export function clampReputation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function sanitizeReputation(input: Partial<ReputationState> | null | undefined): ReputationState {
  const defaults = createDefaultReputation();
  return {
    metroexpress: clampReputation(input?.metroexpress ?? defaults.metroexpress),
    velocity: clampReputation(input?.velocity ?? defaults.velocity),
    kulturverein: clampReputation(input?.kulturverein ?? defaults.kulturverein)
  };
}

export function reputationTier(value: number): string {
  const score = clampReputation(value);
  if (score <= -51) return 'Feindselig';
  if (score <= -11) return 'Misstrauisch';
  if (score <= 9) return 'Neutral';
  if (score <= 39) return 'Bekannt';
  if (score <= 69) return 'Respektiert';
  return 'Vertraut';
}

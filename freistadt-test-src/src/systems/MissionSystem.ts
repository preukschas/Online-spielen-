import { MISSION_BY_ID, MISSIONS, type MissionDefinition, type MissionStage } from '../data/missions';

export type MissionRuntimeState = {
  activeMissionId: string | null;
  stageIndex: number;
  completedMissionIds: string[];
};

export type MissionContext = {
  x: number;
  y: number;
  mode: 'on-foot' | 'vehicle';
  heat: number;
  actionPressed: boolean;
};

export type MissionProgressEvent =
  | { type: 'none' }
  | { type: 'stage-complete'; mission: MissionDefinition; stage: MissionStage; nextStage: MissionStage | null }
  | { type: 'mission-complete'; mission: MissionDefinition }
  | { type: 'mission-started'; mission: MissionDefinition };

export class MissionSystem {
  private state: MissionRuntimeState = {
    activeMissionId: null,
    stageIndex: 0,
    completedMissionIds: []
  };

  load(state: Partial<MissionRuntimeState> | null | undefined): void {
    const completed = Array.isArray(state?.completedMissionIds)
      ? state!.completedMissionIds.filter((id): id is string => typeof id === 'string' && MISSION_BY_ID.has(id))
      : [];

    const activeMissionId = typeof state?.activeMissionId === 'string' && MISSION_BY_ID.has(state.activeMissionId)
      ? state.activeMissionId
      : null;

    const mission = activeMissionId ? MISSION_BY_ID.get(activeMissionId) ?? null : null;
    const maxStage = mission ? Math.max(0, mission.stages.length - 1) : 0;
    const stageIndex = Number.isFinite(state?.stageIndex)
      ? Math.max(0, Math.min(maxStage, Math.floor(state!.stageIndex as number)))
      : 0;

    this.state = {
      activeMissionId,
      stageIndex,
      completedMissionIds: [...new Set(completed)]
    };
  }

  snapshot(): MissionRuntimeState {
    return {
      activeMissionId: this.state.activeMissionId,
      stageIndex: this.state.stageIndex,
      completedMissionIds: [...this.state.completedMissionIds]
    };
  }

  getActiveMission(): MissionDefinition | null {
    return this.state.activeMissionId
      ? MISSION_BY_ID.get(this.state.activeMissionId) ?? null
      : null;
  }

  getActiveStage(): MissionStage | null {
    const mission = this.getActiveMission();
    if (!mission) return null;
    return mission.stages[this.state.stageIndex] ?? null;
  }

  getNextAvailableMission(): MissionDefinition | null {
    for (const mission of MISSIONS) {
      if (this.state.completedMissionIds.includes(mission.id)) continue;
      if (mission.id === this.state.activeMissionId) continue;
      if (mission.prerequisite && !this.state.completedMissionIds.includes(mission.prerequisite)) continue;
      return mission;
    }
    return null;
  }

  canStart(missionId: string): boolean {
    const mission = MISSION_BY_ID.get(missionId);
    if (!mission) return false;
    if (this.state.activeMissionId) return false;
    if (this.state.completedMissionIds.includes(mission.id)) return false;
    if (mission.prerequisite && !this.state.completedMissionIds.includes(mission.prerequisite)) return false;
    return true;
  }

  start(missionId: string): MissionProgressEvent {
    if (!this.canStart(missionId)) return { type: 'none' };
    const mission = MISSION_BY_ID.get(missionId)!;
    this.state.activeMissionId = mission.id;
    this.state.stageIndex = 0;
    return { type: 'mission-started', mission };
  }

  cancelActive(): void {
    this.state.activeMissionId = null;
    this.state.stageIndex = 0;
  }

  update(context: MissionContext): MissionProgressEvent {
    const mission = this.getActiveMission();
    const stage = this.getActiveStage();
    if (!mission || !stage) return { type: 'none' };

    if (!this.stageSatisfied(stage, context)) return { type: 'none' };

    const nextIndex = this.state.stageIndex + 1;
    if (nextIndex >= mission.stages.length) {
      if (!this.state.completedMissionIds.includes(mission.id)) {
        this.state.completedMissionIds.push(mission.id);
      }
      this.state.activeMissionId = null;
      this.state.stageIndex = 0;
      return { type: 'mission-complete', mission };
    }

    this.state.stageIndex = nextIndex;
    return {
      type: 'stage-complete',
      mission,
      stage,
      nextStage: mission.stages[nextIndex] ?? null
    };
  }

  private stageSatisfied(stage: MissionStage, context: MissionContext): boolean {
    if (stage.type === 'ENTER_VEHICLE') return context.mode === 'vehicle';
    if (stage.type === 'LOSE_HEAT') return context.heat <= 0.01;

    if (typeof stage.x !== 'number' || typeof stage.y !== 'number') return false;

    const radius = stage.radius ?? 100;
    const distance = Math.hypot(context.x - stage.x, context.y - stage.y);
    if (distance > radius) return false;

    if (stage.type === 'DRIVE_TO') return context.mode === 'vehicle';
    if (stage.type === 'INTERACT') return context.actionPressed;
    return true;
  }
}

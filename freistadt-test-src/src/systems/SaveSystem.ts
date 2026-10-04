import { getVehicleProfile, sanitizeOwnedVehicles, type VehicleId } from '../data/vehicles';
import { sanitizeCollectedIds } from '../data/collectibles';

export type SavedDriveMode = 'on-foot' | 'vehicle';

export interface FreistadtSaveData {
  version: 4;
  credits: number;
  mapUnlocked: boolean;
  mode: SavedDriveMode;
  player: { x: number; y: number };
  vehicle: { x: number; y: number; rotation: number; condition: number };
  garage: {
    currentVehicleId: VehicleId;
    ownedVehicleIds: VehicleId[];
  };
  collectibles: string[];
  reputation: {
    metroexpress: number;
    velocity: number;
    kulturverein: number;
  };
  heat: number;
  missions: {
    activeMissionId: string | null;
    stageIndex: number;
    completedMissionIds: string[];
  };
  timestamp: number;
}

type LegacySaveV1 = {
  version: 1;
  credits?: unknown;
  player?: { x?: unknown; y?: unknown };
  vehicle?: { x?: unknown; y?: unknown; rotation?: unknown; condition?: unknown };
  timestamp?: unknown;
};

const DB_NAME = 'freistadt_save';
const STORE_NAME = 'profile';
const KEY = 'autosave';
const FALLBACK_KEY = 'freistadt_save_fallback';

export class SaveSystem {
  private static writeQueue: Promise<void> = Promise.resolve();

  private static openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
        request.onblocked = () => reject(new Error('IndexedDB ist blockiert.'));
      } catch (error) {
        reject(error);
      }
    });
  }

  static async load(): Promise<FreistadtSaveData | null> {
    let raw: unknown = null;

    try {
      const db = await this.openDb();
      raw = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(KEY);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error('Spielstand konnte nicht geladen werden.'));
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
      });
    } catch {
      raw = this.readFallback();
    }

    const migratedPrimary = this.migrate(raw);
    if (migratedPrimary) return migratedPrimary;

    return this.migrate(this.readFallback());
  }

  static save(data: FreistadtSaveData): Promise<void> {
    const snapshot: FreistadtSaveData = {
      ...data,
      player: { ...data.player },
      vehicle: { ...data.vehicle },
      garage: {
        currentVehicleId: data.garage.currentVehicleId,
        ownedVehicleIds: [...data.garage.ownedVehicleIds]
      },
      collectibles: [...data.collectibles],
      reputation: { ...data.reputation },
      missions: {
        ...data.missions,
        completedMissionIds: [...data.missions.completedMissionIds]
      }
    };

    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        this.writeFallback(snapshot);

        try {
          const db = await this.openDb();
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(snapshot, KEY);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error ?? new Error('Spielstand konnte nicht gespeichert werden.'));
            };
            tx.onabort = () => {
              db.close();
              reject(tx.error ?? new Error('Speichervorgang wurde abgebrochen.'));
            };
          });
        } catch {
          // Der localStorage-Fallback wurde bereits versucht.
        }
      });

    return this.writeQueue;
  }

  static async clear(): Promise<void> {
    this.writeQueue = this.writeQueue.catch(() => undefined).then(async () => {
      try {
        localStorage.removeItem(FALLBACK_KEY);
      } catch {
        // Ignorieren: IndexedDB bleibt maßgeblich.
      }

      try {
        const db = await this.openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error ?? new Error('Spielstand konnte nicht gelöscht werden.'));
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error ?? new Error('Löschen des Spielstands wurde abgebrochen.'));
          };
        });
      } catch {
        // Wenn IndexedDB nicht verfügbar ist, reicht der entfernte Fallback.
      }
    });

    return this.writeQueue;
  }

  private static readFallback(): unknown {
    try {
      const fallback = localStorage.getItem(FALLBACK_KEY);
      return fallback ? JSON.parse(fallback) : null;
    } catch {
      return null;
    }
  }

  private static writeFallback(data: FreistadtSaveData): void {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
    } catch {
      // IndexedDB bleibt der primäre Speicherweg.
    }
  }

  private static migrate(raw: unknown): FreistadtSaveData | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as {
      version?: unknown;
      credits?: unknown;
      mapUnlocked?: unknown;
      mode?: unknown;
      player?: { x?: unknown; y?: unknown };
      vehicle?: { x?: unknown; y?: unknown; rotation?: unknown; condition?: unknown };
      garage?: {
        currentVehicleId?: unknown;
        ownedVehicleIds?: unknown;
      };
      collectibles?: unknown;
      reputation?: {
        metroexpress?: unknown;
        velocity?: unknown;
        kulturverein?: unknown;
      };
      heat?: unknown;
      missions?: {
        activeMissionId?: unknown;
        stageIndex?: unknown;
        completedMissionIds?: unknown;
      };
      timestamp?: unknown;
    };
    const vehicle = candidate.vehicle;
    const player = candidate.player;

    if (!vehicle || !player) return null;

    const numberOr = (value: unknown, fallback: number): number => {
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    };

    const defaultReputation = {
      metroexpress: 0,
      velocity: 0,
      kulturverein: 0
    };
    const sanitizeReputationValue = (value: unknown): number => {
      return Math.max(-100, Math.min(100, Math.round(numberOr(value, 0))));
    };
    const sanitizeHeat = (value: unknown): number => {
      return Math.max(0, Math.min(100, numberOr(value, 0)));
    };
    const sanitizeMissions = () => {
      const activeMissionId = typeof candidate.missions?.activeMissionId === 'string'
        ? candidate.missions.activeMissionId
        : null;
      const stageIndex = Math.max(0, Math.floor(numberOr(candidate.missions?.stageIndex, 0)));
      const completedMissionIds = Array.isArray(candidate.missions?.completedMissionIds)
        ? candidate.missions.completedMissionIds.filter((id): id is string => typeof id === 'string')
        : [];

      return {
        activeMissionId,
        stageIndex,
        completedMissionIds
      };
    };

    if (candidate.version === 4) {
      const ownedVehicleIds = sanitizeOwnedVehicles(candidate.garage?.ownedVehicleIds);
      const requestedVehicle = getVehicleProfile(candidate.garage?.currentVehicleId).id;
      const currentVehicleId = ownedVehicleIds.includes(requestedVehicle)
        ? requestedVehicle
        : 'city_compact';

      return {
        version: 4,
        credits: numberOr(candidate.credits, 500),
        mapUnlocked: candidate.mapUnlocked === true,
        mode: candidate.mode === 'vehicle' ? 'vehicle' : 'on-foot',
        player: {
          x: numberOr(player.x, 1420),
          y: numberOr(player.y, 810)
        },
        vehicle: {
          x: numberOr(vehicle.x, 1600),
          y: numberOr(vehicle.y, 825),
          rotation: numberOr(vehicle.rotation, 0),
          condition: numberOr(vehicle.condition, 100)
        },
        garage: {
          currentVehicleId,
          ownedVehicleIds
        },
        collectibles: sanitizeCollectedIds(candidate.collectibles),
        reputation: {
          metroexpress: sanitizeReputationValue(candidate.reputation?.metroexpress ?? defaultReputation.metroexpress),
          velocity: sanitizeReputationValue(candidate.reputation?.velocity ?? defaultReputation.velocity),
          kulturverein: sanitizeReputationValue(candidate.reputation?.kulturverein ?? defaultReputation.kulturverein)
        },
        heat: sanitizeHeat(candidate.heat),
        missions: sanitizeMissions(),
        timestamp: numberOr(candidate.timestamp, Date.now())
      };
    }

    if (candidate.version === 3) {
      return {
        version: 4,
        credits: numberOr(candidate.credits, 500),
        mapUnlocked: candidate.mapUnlocked === true,
        mode: candidate.mode === 'vehicle' ? 'vehicle' : 'on-foot',
        player: {
          x: numberOr(player.x, 1420),
          y: numberOr(player.y, 810)
        },
        vehicle: {
          x: numberOr(vehicle.x, 1600),
          y: numberOr(vehicle.y, 825),
          rotation: numberOr(vehicle.rotation, 0),
          condition: numberOr(vehicle.condition, 100)
        },
        garage: {
          currentVehicleId: 'city_compact',
          ownedVehicleIds: ['city_compact']
        },
        collectibles: [],
        reputation: {
          metroexpress: sanitizeReputationValue(candidate.reputation?.metroexpress ?? defaultReputation.metroexpress),
          velocity: sanitizeReputationValue(candidate.reputation?.velocity ?? defaultReputation.velocity),
          kulturverein: sanitizeReputationValue(candidate.reputation?.kulturverein ?? defaultReputation.kulturverein)
        },
        heat: sanitizeHeat(candidate.heat),
        missions: sanitizeMissions(),
        timestamp: numberOr(candidate.timestamp, Date.now())
      };
    }

    if (candidate.version === 2) {
      return {
        version: 4,
        credits: numberOr(candidate.credits, 500),
        mapUnlocked: candidate.mapUnlocked === true,
        mode: candidate.mode === 'vehicle' ? 'vehicle' : 'on-foot',
        player: {
          x: numberOr(player.x, 1420),
          y: numberOr(player.y, 810)
        },
        vehicle: {
          x: numberOr(vehicle.x, 1600),
          y: numberOr(vehicle.y, 825),
          rotation: numberOr(vehicle.rotation, 0),
          condition: numberOr(vehicle.condition, 100)
        },
        garage: {
          currentVehicleId: 'city_compact',
          ownedVehicleIds: ['city_compact']
        },
        collectibles: [],
        reputation: defaultReputation,
        heat: 0,
        missions: {
          activeMissionId: null,
          stageIndex: 0,
          completedMissionIds: []
        },
        timestamp: numberOr(candidate.timestamp, Date.now())
      };
    }

    if (candidate.version === 1) {
      return {
        version: 4,
        credits: numberOr(candidate.credits, 500),
        mapUnlocked: false,
        mode: 'on-foot',
        player: {
          x: numberOr(player.x, 1420),
          y: numberOr(player.y, 810)
        },
        vehicle: {
          x: numberOr(vehicle.x, 1600),
          y: numberOr(vehicle.y, 825),
          rotation: numberOr(vehicle.rotation, 0),
          condition: numberOr(vehicle.condition, 100)
        },
        garage: {
          currentVehicleId: 'city_compact',
          ownedVehicleIds: ['city_compact']
        },
        collectibles: [],
        reputation: {
          metroexpress: 0,
          velocity: 0,
          kulturverein: 0
        },
        heat: 0,
        missions: {
          activeMissionId: null,
          stageIndex: 0,
          completedMissionIds: []
        },
        timestamp: numberOr(candidate.timestamp, Date.now())
      };
    }

    return null;
  }
}

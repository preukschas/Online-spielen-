import Phaser from 'phaser';
import { SaveSystem, type FreistadtSaveData } from '../systems/SaveSystem';
import { MissionSystem } from '../systems/MissionSystem';
import { PoliceSystem } from '../systems/PoliceSystem';
import {
  createDefaultReputation,
  sanitizeReputation,
  reputationTier,
  FACTIONS,
  type ReputationState
} from '../systems/FactionSystem';
import { SettingsSystem, type AppSettings } from '../systems/SettingsSystem';
import { VEHICLES, getVehicleProfile, sanitizeOwnedVehicles } from '../data/vehicles';
import { COLLECTIBLES, sanitizeCollectedIds, type CollectibleDefinition } from '../data/collectibles';
import { AudioSystem } from '../systems/AudioSystem';

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 2200;
const PLAYER_SPEED = 245;
const PLAYER_SPRINT_SPEED = 335;

type DriveMode = 'on-foot' | 'vehicle';
type Axis = 'horizontal' | 'vertical';

type DoorPoint = {
  x: number;
  y: number;
  placeId: string;
  placeName: string;
  marker: Phaser.GameObjects.Rectangle;
};

type TrafficAgent = {
  sprite: Phaser.GameObjects.Image;
  route: Phaser.Math.Vector2[];
  routeIndex: number;
  speed: number;
  color: number;
  label?: Phaser.GameObjects.Text;
  police?: boolean;
};

type PedestrianAgent = {
  sprite: Phaser.GameObjects.Image;
  route: Phaser.Math.Vector2[];
  routeIndex: number;
  speed: number;
  waitUntil: number;
};

type CityEvent = {
  x: number;
  y: number;
  label: string;
  reward: number;
  marker: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
};

type CollectibleMarker = {
  definition: CollectibleDefinition;
  marker: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

export class CityScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private car!: Phaser.Physics.Arcade.Sprite;
  private mode: DriveMode = 'on-foot';

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickOrigin = new Phaser.Math.Vector2();
  private joystickVector = new Phaser.Math.Vector2();

  private actionGlow!: Phaser.GameObjects.Arc;
  private actionButton!: Phaser.GameObjects.Arc;
  private actionLabel!: Phaser.GameObjects.Text;
  private radioShadow!: Phaser.GameObjects.Rectangle;
  private radioButton!: Phaser.GameObjects.Rectangle;
  private radioLabel!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private missionHudText!: Phaser.GameObjects.Text;
  private missionBoard!: Phaser.GameObjects.Arc;
  private missionBoardLabel!: Phaser.GameObjects.Text;
  private missionTargetMarker?: Phaser.GameObjects.Arc;
  private missionTargetLabel?: Phaser.GameObjects.Text;
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapPlayer!: Phaser.GameObjects.Arc;
  private minimapVehicle!: Phaser.GameObjects.Rectangle;
  private minimapMission!: Phaser.GameObjects.Arc;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private carShadow!: Phaser.GameObjects.Ellipse;
  private motionFx!: Phaser.GameObjects.Graphics;
  private vehicleFx!: Phaser.GameObjects.Graphics;
  private tireMarks: Phaser.GameObjects.Rectangle[] = [];

  private readonly missionSystem = new MissionSystem();
  private readonly policeSystem = new PoliceSystem();
  private readonly audioSystem = new AudioSystem();
  private reputation: ReputationState = createDefaultReputation();
  private appSettings: AppSettings = SettingsSystem.load();

  private doors: DoorPoint[] = [];
  private buildingRects: Phaser.GameObjects.Rectangle[] = [];
  private traffic: TrafficAgent[] = [];
  private pedestrians: PedestrianAgent[] = [];
  private currentEvent: CityEvent | null = null;
  private collectedCollectibles = new Set<string>();
  private collectibleMarkers: CollectibleMarker[] = [];

  private carSpeed = 0;
  private lastCarVisualSpeed = 0;
  private lastThrottleInput = 0;
  private lastSteerInput = 0;
  private lastTireMarkAt = -1000;
  private lastActionDown = false;
  private lastRadioDown = false;
  private lastActionAt = -1000;
  private lastCarImpactAt = 0;
  private lastTrafficImpactAt = 0;
  private horizontalSignalGreen = true;
  private visibilityHandler?: () => void;
  private pageHideHandler?: () => void;

  constructor() {
    super('CityScene');
  }

  create(): void {
    this.appSettings = SettingsSystem.load();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.ensureRegistryDefaults();
    this.createTextures();
    this.buildCity();

    this.playerShadow = this.add.ellipse(1425, 824, 34, 16, 0x0b151b, 0.28).setDepth(26);
    this.player = this.physics.add.sprite(1420, 810, 'freistadt-player');
    this.player.setCollideWorldBounds(true).setDepth(30);

    const initialVehicle = getVehicleProfile(this.registry.get('currentVehicleId'));
    this.carShadow = this.add.ellipse(1605, 833, initialVehicle.width * 0.88, initialVehicle.height * 0.58, 0x0b151b, 0.32).setDepth(26);
    this.motionFx = this.add.graphics().setDepth(27);
    this.vehicleFx = this.add.graphics().setDepth(29);
    this.car = this.physics.add.sprite(1600, 825, 'vehicle-' + initialVehicle.id);
    this.car.setCollideWorldBounds(true).setDepth(28).setDrag(250, 250);
    this.setupBuildingCollisions();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,R,SHIFT') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.once('keydown', () => { void this.audioSystem.unlock(); });

    this.createHud();
    this.createMinimap();
    this.createPhaseThreeMarkers();
    this.spawnCollectibles();
    this.bindPointerControls();
    this.spawnTraffic();
    this.spawnPedestrians();
    this.createTrafficSignal();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1.05);

    this.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        this.horizontalSignalGreen = !this.horizontalSignalGreen;
      }
    });

    this.time.delayedCall(12000, () => this.spawnRandomCityEvent());
    this.time.addEvent({
      delay: 48000,
      loop: true,
      callback: () => this.spawnRandomCityEvent()
    });

    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => { void this.saveGame(); }
    });

    this.scale.on('resize', this.layoutHud, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResumeFromInterior, this);

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.resetTransientInput();
        void this.saveGame();
      }
    };
    this.pageHideHandler = () => {
      this.resetTransientInput();
      void this.saveGame();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('pagehide', this.pageHideHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layoutHud, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResumeFromInterior, this);
      if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
      if (this.pageHideHandler) window.removeEventListener('pagehide', this.pageHideHandler);
      this.audioSystem.dispose();
      this.removeDebugBridge();
    });

    void this.restoreGame();
    this.installDebugBridge();
    this.layoutHud();
    this.updateHint();
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    if (this.mode === 'on-foot') {
      this.updatePlayer();
    } else {
      this.updateCar(dt);
    }

    this.updateTraffic(time, dt);
    this.updatePedestrians(time, dt);
    const policeDistance = this.getNearestPoliceDistance();
    const actorSpeed = this.mode === 'vehicle' ? Math.abs(this.carSpeed) : 0;
    this.policeSystem.update(delta, policeDistance < 310, policeDistance, actorSpeed);
    if (this.policeSystem.consumeControl()) this.handlePoliceControl();
    this.progressMission(false);
    this.updateActionInput();
    this.updateAudio();
    this.updateActorVisuals();
    this.updateCamera();
    this.updateHint();
    this.updateStatus();
    this.updateMinimap();
    this.updateToast();
  }

  private ensureRegistryDefaults(): void {
    if (this.registry.get('credits') === undefined) this.registry.set('credits', 500);
    if (this.registry.get('vehicleCondition') === undefined) this.registry.set('vehicleCondition', 100);
    if (this.registry.get('mapUnlocked') === undefined) this.registry.set('mapUnlocked', false);
    if (this.registry.get('currentVehicleId') === undefined) this.registry.set('currentVehicleId', 'city_compact');
    if (this.registry.get('ownedVehicleIds') === undefined) this.registry.set('ownedVehicleIds', ['city_compact']);
    if (this.registry.get('toast') === undefined) this.registry.set('toast', '');
  }

  private createTextures(): void {
    if (!this.textures.exists('freistadt-player')) {
      const g = this.add.graphics();

      // Kleine Cartoon-Figur aus der Vogelperspektive mit klarer Silhouette.
      g.fillStyle(0x17232d, 0.28);
      g.fillEllipse(21, 31, 30, 14);
      g.fillStyle(0x1c6f9d, 1);
      g.fillRoundedRect(10, 15, 22, 20, 7);
      g.fillStyle(0xf2c8a4, 1);
      g.fillCircle(21, 12, 9);
      g.fillStyle(0x2a3440, 1);
      g.fillCircle(21, 9, 9);
      g.fillStyle(0xf2c8a4, 1);
      g.fillCircle(21, 13, 7);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(18, 12, 1.8);
      g.fillCircle(24, 12, 1.8);
      g.fillStyle(0x173041, 1);
      g.fillCircle(18, 12, 0.9);
      g.fillCircle(24, 12, 0.9);
      g.fillStyle(0xf4d24b, 1);
      g.fillTriangle(21, 1, 26, 8, 16, 8);
      g.lineStyle(2, 0x14212a, 0.95);
      g.strokeRoundedRect(10, 15, 22, 20, 7);
      g.strokeCircle(21, 12, 9);
      g.generateTexture('freistadt-player', 42, 40);
      g.destroy();
    }

    for (const profile of VEHICLES) {
      const textureKey = 'vehicle-' + profile.id;
      if (this.textures.exists(textureKey)) continue;

      const g = this.add.graphics();
      const w = profile.width;
      const h = profile.height;
      const bodyColor = profile.color;
      const dark = 0x1f2a33;

      // Schlagschatten.
      g.fillStyle(0x0c151b, 0.28);
      g.fillRoundedRect(4, 6, w - 4, h - 4, Math.min(12, h * 0.25));

      // Räder.
      g.fillStyle(0x172027, 1);
      const wheelW = Math.max(8, w * 0.10);
      const wheelH = Math.max(6, h * 0.16);
      g.fillRoundedRect(8, 1, wheelW, wheelH, 3);
      g.fillRoundedRect(w - 8 - wheelW, 1, wheelW, wheelH, 3);
      g.fillRoundedRect(8, h - wheelH - 1, wheelW, wheelH, 3);
      g.fillRoundedRect(w - 8 - wheelW, h - wheelH - 1, wheelW, wheelH, 3);

      // Karosserie.
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(3, 4, w - 8, h - 8, Math.min(12, h * 0.26));
      g.lineStyle(2, 0x17212a, 0.75);
      g.strokeRoundedRect(3, 4, w - 8, h - 8, Math.min(12, h * 0.26));

      // Motorhaube / Heck mit dezentem Highlight.
      g.fillStyle(0xffffff, 0.14);
      g.fillRoundedRect(w * 0.63, 7, w * 0.23, h - 14, 5);
      g.fillStyle(0x000000, 0.11);
      g.fillRoundedRect(8, 7, w * 0.18, h - 14, 5);

      // Kabine und Scheiben.
      const cabinX = Math.max(21, w * 0.28);
      const cabinW = Math.max(30, w * 0.36);
      g.fillStyle(dark, 1);
      g.fillRoundedRect(cabinX, 8, cabinW, h - 16, 7);
      g.fillStyle(0x8ed3ea, 0.88);
      g.fillRoundedRect(cabinX + 4, 11, cabinW * 0.42, h - 22, 4);
      g.fillRoundedRect(cabinX + cabinW * 0.54, 11, cabinW * 0.36, h - 22, 4);

      // Frontscheinwerfer und Rückleuchten.
      g.fillStyle(0xfff0a8, 1);
      g.fillRoundedRect(w - 11, 9, 7, 8, 2);
      g.fillRoundedRect(w - 11, h - 17, 7, 8, 2);
      g.fillStyle(0xe45b54, 1);
      g.fillRoundedRect(4, 9, 6, 8, 2);
      g.fillRoundedRect(4, h - 17, 6, 8, 2);

      // Fahrzeugtyp-spezifische Details.
      if (profile.id === 'taxi') {
        g.fillStyle(0xf7efba, 1);
        g.fillRoundedRect(w * 0.43, 2, w * 0.18, 7, 3);
      } else if (profile.id === 'city_bus') {
        g.fillStyle(0xdce7ee, 0.9);
        for (let x = 19; x < w - 24; x += 18) g.fillRoundedRect(x, 10, 12, h - 20, 3);
      } else if (profile.id === 'tow_truck') {
        g.lineStyle(4, 0xe3bf54, 1);
        g.lineBetween(15, h / 2, 38, h / 2);
        g.lineBetween(15, h / 2, 9, h / 2 + 10);
      } else if (profile.id === 'delivery_van') {
        g.fillStyle(0x425e70, 0.85);
        g.fillRoundedRect(13, 10, w * 0.28, h - 20, 4);
      } else if (profile.id === 'utility_truck') {
        g.fillStyle(0xf2bf4b, 0.95);
        g.fillRect(13, 8, 6, h - 16);
        g.fillRect(25, 8, 6, h - 16);
      } else if (profile.id === 'city_sport') {
        g.lineStyle(3, 0xffffff, 0.72);
        g.lineBetween(w * 0.22, h / 2, w * 0.78, h / 2);
      }

      g.generateTexture(textureKey, w + 2, h + 2);
      g.destroy();
    }

    const trafficPalette = [0x5e93b5, 0xc86b5d, 0xd2b85b, 0x6fa36d, 0x8f70a9, 0xe6e6e6];
    trafficPalette.forEach((bodyColor, index) => {
      const key = 'traffic-car-' + index;
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      g.fillStyle(0x111a20, 0.28);
      g.fillRoundedRect(4, 6, 54, 28, 8);
      g.fillStyle(0x172027, 1);
      g.fillRoundedRect(7, 2, 9, 7, 3);
      g.fillRoundedRect(44, 2, 9, 7, 3);
      g.fillRoundedRect(7, 29, 9, 7, 3);
      g.fillRoundedRect(44, 29, 9, 7, 3);
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(2, 4, 56, 28, 9);
      g.lineStyle(2, 0x17232d, 0.8);
      g.strokeRoundedRect(2, 4, 56, 28, 9);
      g.fillStyle(0x86c9df, 0.9);
      g.fillRoundedRect(20, 8, 21, 20, 5);
      g.fillStyle(0xffefaa, 1);
      g.fillRect(52, 8, 5, 6);
      g.fillRect(52, 22, 5, 6);
      g.fillStyle(0xe45b54, 1);
      g.fillRect(2, 8, 5, 6);
      g.fillRect(2, 22, 5, 6);
      g.generateTexture(key, 60, 36);
      g.destroy();
    });

    if (!this.textures.exists('traffic-police')) {
      const g = this.add.graphics();
      g.fillStyle(0x111a20, 0.28);
      g.fillRoundedRect(4, 6, 58, 30, 9);
      g.fillStyle(0x2d5d9a, 1);
      g.fillRoundedRect(2, 4, 58, 30, 9);
      g.lineStyle(3, 0xffffff, 0.82);
      g.strokeRoundedRect(2, 4, 58, 30, 9);
      g.fillStyle(0x8bcce3, 0.95);
      g.fillRoundedRect(21, 8, 22, 22, 5);
      g.fillStyle(0xffffff, 1);
      g.fillRect(8, 17, 44, 4);
      g.fillStyle(0xdf4c4c, 1);
      g.fillRect(28, 2, 7, 5);
      g.fillStyle(0x5294e5, 1);
      g.fillRect(36, 2, 7, 5);
      g.generateTexture('traffic-police', 64, 38);
      g.destroy();
    }

    const peoplePalette = [0xe4745f, 0x54a57b, 0x6d78c7, 0xd59c48, 0x9a6db2];
    peoplePalette.forEach((shirt, index) => {
      const key = 'pedestrian-' + index;
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      g.fillStyle(0x10181d, 0.22);
      g.fillEllipse(14, 24, 20, 9);
      g.fillStyle(shirt, 1);
      g.fillRoundedRect(7, 10, 14, 15, 5);
      g.fillStyle(index % 2 === 0 ? 0xf0c7a2 : 0xb98261, 1);
      g.fillCircle(14, 7, 6);
      g.fillStyle(0x28323a, 1);
      g.fillRect(8, 24, 5, 5);
      g.fillRect(16, 24, 5, 5);
      g.generateTexture(key, 28, 30);
      g.destroy();
    });
  }

  private buildCity(): void {
    const g = this.add.graphics();
    g.fillStyle(0x6d966b, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Leichte Bodenstruktur statt einer flachen grünen Fläche.
    g.fillStyle(0x5f8b61, 0.42);
    for (let x = 70; x < WORLD_WIDTH; x += 145) {
      for (let y = 55; y < WORLD_HEIGHT; y += 135) {
        const offset = ((x + y) / 10) % 3;
        g.fillCircle(x + offset * 7, y + (offset - 1) * 5, 5 + offset);
      }
    }

    // Vier Hauptachsen bilden bereits ein echtes Stadtviertel statt einer Teststraße.
    g.fillStyle(0x3c444b, 1);
    g.fillRect(0, 680, WORLD_WIDTH, 270);
    g.fillRect(0, 1490, WORLD_WIDTH, 250);
    g.fillRect(960, 0, 270, WORLD_HEIGHT);
    g.fillRect(2210, 0, 270, WORLD_HEIGHT);

    // Gehwege.
    g.fillStyle(0xbdbcae, 1);
    g.fillRect(0, 645, WORLD_WIDTH, 35);
    g.fillRect(0, 950, WORLD_WIDTH, 35);
    g.fillRect(0, 1455, WORLD_WIDTH, 35);
    g.fillRect(0, 1740, WORLD_WIDTH, 35);
    g.fillRect(925, 0, 35, WORLD_HEIGHT);
    g.fillRect(1230, 0, 35, WORLD_HEIGHT);
    g.fillRect(2175, 0, 35, WORLD_HEIGHT);
    g.fillRect(2480, 0, 35, WORLD_HEIGHT);

    // Straßenmarkierungen.
    g.lineStyle(6, 0xe8db8b, 0.9);
    for (let x = 20; x < WORLD_WIDTH; x += 100) {
      g.lineBetween(x, 815, x + 52, 815);
      g.lineBetween(x, 1615, x + 52, 1615);
    }
    for (let y = 20; y < WORLD_HEIGHT; y += 100) {
      g.lineBetween(1095, y, 1095, y + 52);
      g.lineBetween(2345, y, 2345, y + 52);
    }

    this.drawCrosswalk(g, 1095, 815);
    this.drawCrosswalk(g, 2345, 815);
    this.drawCrosswalk(g, 1095, 1615);
    this.drawCrosswalk(g, 2345, 1615);

    this.addRoadPolish();

    this.addBuilding(480, 330, 620, 360, 0xb86f56, 'Werkstatt Westend', 'workshop');
    this.addBuilding(1650, 320, 650, 350, 0x8e6f9d, 'Café Freiraum', 'cafe');
    this.addBuilding(2830, 330, 420, 320, 0x5f8ba8, 'Kiosk 24', 'kiosk');
    this.addBuilding(480, 1210, 620, 340, 0x557a91, 'Polizeistation', 'police');
    this.addBuilding(1650, 1210, 700, 350, 0x8b806d, 'Westend Bahnhof', 'station');
    this.addBuilding(2830, 1210, 430, 320, 0xb28d55, 'Eigene Garage', 'garage');

    // Ostkai erweitert die Stadt um einen zweiten klar unterscheidbaren Bereich.
    g.fillStyle(0x3c444b, 1);
    g.fillRect(3370, 0, 250, WORLD_HEIGHT);
    g.fillRect(4270, 0, 250, WORLD_HEIGHT);
    g.fillStyle(0xbdbcae, 1);
    g.fillRect(3335, 0, 35, WORLD_HEIGHT);
    g.fillRect(3620, 0, 35, WORLD_HEIGHT);
    g.fillRect(4235, 0, 35, WORLD_HEIGHT);
    g.fillRect(4520, 0, 35, WORLD_HEIGHT);

    g.lineStyle(6, 0xe8db8b, 0.9);
    for (let y = 20; y < WORLD_HEIGHT; y += 100) {
      g.lineBetween(3495, y, 3495, y + 52);
      g.lineBetween(4395, y, 4395, y + 52);
    }

    this.drawCrosswalk(g, 3495, 815);
    this.drawCrosswalk(g, 4395, 815);
    this.drawCrosswalk(g, 3495, 1615);
    this.drawCrosswalk(g, 4395, 1615);

    this.addBuilding(3860, 325, 430, 330, 0x725ca5, 'Velocity Autohaus', 'dealer');
    this.addBuilding(4740, 325, 390, 330, 0x658a67, 'Ostkai Markt', 'supermarket');
    this.addBuilding(3860, 1210, 430, 340, 0x4e7f91, 'MetroExpress Depot', 'metro-depot');
    this.addBuilding(4740, 1210, 390, 340, 0xa07355, 'Kai-Café', 'harbor-cafe');

    this.add.rectangle(4148, 1994, 1500, 300, 0x13242d, 0.24).setDepth(1);
    this.add.rectangle(4140, 1985, 1500, 300, 0x397f9f, 1)
      .setStrokeStyle(8, 0x28596f)
      .setDepth(2);
    const water = this.add.graphics().setDepth(2.5);
    water.lineStyle(4, 0x8ed8ee, 0.38);
    for (let y = 1880; y <= 2080; y += 42) {
      for (let x = 3450; x <= 4840; x += 90) {
        water.beginPath();
        water.moveTo(x, y);
        water.lineTo(x + 24, y - 5);
        water.lineTo(x + 48, y);
        water.lineTo(x + 72, y - 5);
        water.strokePath();
      }
    }
    this.add.text(4140, 1985, 'OSTKAI · UFERPROMENADE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '29px',
      fontStyle: 'bold',
      color: '#e9f8ff'
    }).setOrigin(0.5).setDepth(3);

    this.add.text(3315, 715, 'OSTKAI · GTR-KIDS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#17212acc',
      padding: { x: 14, y: 8 }
    }).setDepth(10);

    // Südlicher Park als belebter Kontrast zu den Gebäuden.
    this.add.rectangle(1580, 1970, 980, 320, 0x4f8558, 1).setStrokeStyle(8, 0x376340).setDepth(2);
    this.add.text(1580, 1970, 'WESTEND-PARK', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#e7f3e7'
    }).setOrigin(0.5).setDepth(3);

    this.add.text(65, 715, 'WESTEND · GTR-KIDS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#17212acc',
      padding: { x: 14, y: 8 }
    }).setDepth(10);

    this.addCityDecorations();
  }

  private drawCrosswalk(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xf0f0e8, 0.78);
    for (let i = -3; i <= 3; i += 1) {
      g.fillRect(x - 75 + i * 22, y - 135, 12, 270);
    }
  }

  private addRoadPolish(): void {
    const road = this.add.graphics().setDepth(2.8);

    // Dunkle Asphaltkanten lassen die Fahrbahn sauberer und tiefer wirken.
    road.lineStyle(7, 0x263038, 0.85);
    road.lineBetween(0, 683, WORLD_WIDTH, 683);
    road.lineBetween(0, 947, WORLD_WIDTH, 947);
    road.lineBetween(0, 1493, WORLD_WIDTH, 1493);
    road.lineBetween(0, 1737, WORLD_WIDTH, 1737);

    for (const x of [963, 1227, 2213, 2477, 3373, 3617, 4273, 4517]) {
      road.lineBetween(x, 0, x, WORLD_HEIGHT);
    }

    // Asphaltflicken und Gullys als kleine Details.
    road.fillStyle(0x303940, 0.65);
    const patches = [
      [760, 770, 86, 34], [1740, 870, 72, 28], [2680, 1540, 92, 30],
      [3710, 875, 74, 30], [4610, 1540, 90, 32], [1050, 1320, 34, 72],
      [2320, 410, 34, 82], [3470, 1190, 36, 72], [4370, 520, 36, 78]
    ];
    for (const [x, y, w, h] of patches) {
      road.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    }

    const drains = [
      [890, 705], [1300, 927], [2120, 1515], [2545, 1716],
      [3310, 705], [3658, 927], [4212, 1515], [4560, 1716]
    ];
    for (const [x, y] of drains) {
      road.fillStyle(0x20282e, 0.95);
      road.fillRoundedRect(x - 14, y - 7, 28, 14, 3);
      road.lineStyle(2, 0x77838a, 0.5);
      road.lineBetween(x - 9, y - 3, x + 9, y - 3);
      road.lineBetween(x - 9, y + 3, x + 9, y + 3);
    }

    // Parkbuchten in beiden Stadtteilen.
    const parkingAreas = [
      { x: 250, y: 1022, count: 5, horizontal: true },
      { x: 2580, y: 1022, count: 4, horizontal: true },
      { x: 3670, y: 1040, count: 4, horizontal: true },
      { x: 4480, y: 1040, count: 4, horizontal: true },
      { x: 3160, y: 270, count: 4, horizontal: false }
    ];

    road.lineStyle(4, 0xe8edf0, 0.74);
    for (const area of parkingAreas) {
      for (let i = 0; i < area.count; i += 1) {
        if (area.horizontal) {
          const px = area.x + i * 92;
          road.strokeRect(px, area.y, 78, 52);
        } else {
          const py = area.y + i * 82;
          road.strokeRect(area.x, py, 52, 68);
        }
      }
    }

    // Pfeile geben Kreuzungen und Fahrtrichtung mehr visuelle Lesbarkeit.
    road.lineStyle(5, 0xf2f3ee, 0.62);
    const arrows = [
      [610, 815, 0], [1510, 815, 0], [2840, 815, 0], [3890, 815, 0],
      [1700, 1615, Math.PI], [2910, 1615, Math.PI], [4040, 1615, Math.PI],
      [1095, 420, Math.PI / 2], [2345, 1190, -Math.PI / 2], [3495, 400, Math.PI / 2], [4395, 1210, -Math.PI / 2]
    ];
    for (const [x, y, angle] of arrows) this.drawRoadArrow(road, x, y, angle);

    // Geparkte Fahrzeuge sorgen für mehr Stadtdichte, bleiben aber rein dekorativ.
    const parkedCars = [
      { x: 295, y: 1048, key: 'traffic-car-1', angle: 0 },
      { x: 480, y: 1048, key: 'traffic-car-4', angle: 0 },
      { x: 2670, y: 1048, key: 'traffic-car-2', angle: Math.PI },
      { x: 2855, y: 1048, key: 'traffic-car-5', angle: Math.PI },
      { x: 3760, y: 1066, key: 'traffic-car-0', angle: 0 },
      { x: 3945, y: 1066, key: 'traffic-car-3', angle: 0 },
      { x: 4570, y: 1066, key: 'traffic-car-4', angle: Math.PI },
      { x: 4755, y: 1066, key: 'traffic-car-2', angle: Math.PI },
      { x: 3186, y: 355, key: 'traffic-car-5', angle: Math.PI / 2 }
    ];
    for (const parked of parkedCars) {
      this.add.ellipse(parked.x + 5, parked.y + 6, 52, 23, 0x0b141a, 0.22)
        .setRotation(parked.angle)
        .setDepth(14);
      this.add.image(parked.x, parked.y, parked.key)
        .setRotation(parked.angle)
        .setAlpha(0.94)
        .setDepth(15);
    }

    this.add.text(1590, 705, 'WESTEND RING', {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0.22).setDepth(4);
    this.add.text(3920, 705, 'OSTKAI ALLEE', {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0.22).setDepth(4);

    // Parkplatz-Schilder.
    for (const [x, y] of [[635, 1040], [2910, 1040], [3970, 1055], [4765, 1055]]) {
      this.add.rectangle(x + 3, y + 4, 34, 34, 0x0a1217, 0.25).setDepth(4);
      this.add.rectangle(x, y, 32, 32, 0x367fb2, 1).setStrokeStyle(2, 0xffffff, 0.85).setDepth(5);
      this.add.text(x, y, 'P', {
        fontFamily: 'system-ui', fontSize: '20px', fontStyle: 'bold', color: '#ffffff'
      }).setOrigin(0.5).setDepth(6);
    }
  }

  private drawRoadArrow(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number): void {
    const length = 44;
    const back = new Phaser.Math.Vector2(-Math.cos(angle), -Math.sin(angle));
    const side = new Phaser.Math.Vector2(-Math.sin(angle), Math.cos(angle));
    const tip = new Phaser.Math.Vector2(x, y);
    const tail = tip.clone().add(back.clone().scale(length));
    g.lineBetween(tail.x, tail.y, tip.x, tip.y);
    g.lineBetween(
      tip.x,
      tip.y,
      tip.x + back.x * 15 + side.x * 11,
      tip.y + back.y * 15 + side.y * 11
    );
    g.lineBetween(
      tip.x,
      tip.y,
      tip.x + back.x * 15 - side.x * 11,
      tip.y + back.y * 15 - side.y * 11
    );
  }

  private addBuilding(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    name: string,
    placeId: string
  ): void {
    const accentByPlace: Record<string, number> = {
      workshop: 0xf2a34b,
      cafe: 0xe9b8d5,
      kiosk: 0x7bc5e8,
      police: 0x73a6d2,
      station: 0xd2b36f,
      garage: 0xe0aa55,
      dealer: 0xc3a2ff,
      supermarket: 0x91cf8f,
      'metro-depot': 0x72c6d7,
      'harbor-cafe': 0xe4ad87
    };
    const accent = accentByPlace[placeId] ?? 0xf0d278;

    // Schlagschatten und Dachkörper.
    this.add.rectangle(x + 13, y + 15, width, height, 0x13202a, 0.28)
      .setDepth(6);

    const rect = this.add.rectangle(x, y, width, height, color, 1)
      .setStrokeStyle(7, 0x26343d, 0.92)
      .setDepth(8);
    this.physics.add.existing(rect, true);

    // Dachkante und obere Lichtkante.
    this.add.rectangle(x, y - height * 0.42, width * 0.92, 18, accent, 0.95)
      .setDepth(8.5);
    this.add.rectangle(x, y - height * 0.36, width * 0.84, 7, 0xffffff, 0.13)
      .setDepth(8.6);

    // Dachfenster / Lüfter erzeugen eine lesbare Top-down-Struktur.
    const windowCount = Math.max(2, Math.min(5, Math.floor(width / 140)));
    for (let i = 0; i < windowCount; i += 1) {
      const px = x - width * 0.34 + (windowCount === 1 ? 0 : i * (width * 0.68 / (windowCount - 1)));
      this.add.rectangle(px, y + height * 0.08, Math.min(58, width * 0.11), Math.min(42, height * 0.12), 0x9bd5e8, 0.78)
        .setStrokeStyle(3, 0x26343d, 0.65)
        .setDepth(8.8);
      this.add.rectangle(px - 5, y + height * 0.08 - 5, Math.min(42, width * 0.08), 4, 0xffffff, 0.22)
        .setDepth(8.9);
    }

    // Dachtechnik als kleine Details.
    this.add.circle(x - width * 0.36, y - height * 0.18, 13, 0x4a5660, 1)
      .setStrokeStyle(3, 0x26343d, 0.8)
      .setDepth(9);
    this.add.rectangle(x + width * 0.34, y - height * 0.17, 32, 22, 0x586872, 1)
      .setStrokeStyle(3, 0x26343d, 0.8)
      .setDepth(9);

    const signWidth = Math.min(width * 0.72, 360);
    this.add.rectangle(x, y - height * 0.20, signWidth, 52, 0x17232d, 0.88)
      .setStrokeStyle(3, accent, 0.9)
      .setDepth(9.2);

    this.add.text(x, y - height * 0.20, name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(17, Math.min(23, width * 0.045)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: signWidth * 0.9 }
    }).setOrigin(0.5).setDepth(9.4);

    const doorY = y + height / 2 + 23;
    this.add.ellipse(x + 5, doorY + 8, 88, 30, 0x102029, 0.30).setDepth(10);
    const marker = this.add.rectangle(x, doorY, 82, 38, accent, 0.96)
      .setStrokeStyle(3, 0xffffff, 0.78)
      .setDepth(12);

    this.add.text(x, doorY, 'REIN', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#17232d'
    }).setOrigin(0.5).setDepth(13);

    this.doors.push({ x, y: doorY, placeId, placeName: name, marker });
    this.buildingRects.push(rect);
  }

  private addCityDecorations(): void {
    const addTree = (x: number, y: number, scale = 1): void => {
      this.add.ellipse(x + 8 * scale, y + 10 * scale, 48 * scale, 26 * scale, 0x12241a, 0.22).setDepth(3);
      this.add.circle(x, y, 18 * scale, 0x2f6f43, 1).setStrokeStyle(3, 0x214e31, 0.9).setDepth(4);
      this.add.circle(x - 8 * scale, y - 5 * scale, 12 * scale, 0x4f9b57, 0.9).setDepth(4.1);
      this.add.circle(x + 9 * scale, y - 3 * scale, 10 * scale, 0x65ad63, 0.85).setDepth(4.2);
    };

    const addLamp = (x: number, y: number): void => {
      this.add.circle(x + 3, y + 5, 8, 0x101820, 0.22).setDepth(3);
      this.add.circle(x, y, 7, 0xffe9a8, 0.94).setStrokeStyle(3, 0x38434b, 0.95).setDepth(11);
      this.add.circle(x, y, 15, 0xffefaf, 0.08).setDepth(10);
    };

    const addBench = (x: number, y: number, rotation = 0): void => {
      this.add.rectangle(x + 4, y + 5, 54, 15, 0x172027, 0.22).setRotation(rotation).setDepth(3);
      this.add.rectangle(x, y, 50, 12, 0x9c6a3d, 1).setStrokeStyle(2, 0x5b3c25, 0.9).setRotation(rotation).setDepth(5);
    };

    const trees = [
      [120, 120], [330, 110], [690, 120], [1320, 120], [1930, 120], [2660, 110], [3110, 130],
      [1350, 1880], [1480, 2070], [1710, 1880], [1900, 2070], [2100, 1885],
      [3260, 170], [3720, 180], [4140, 165], [4630, 160],
      [3240, 1870], [3390, 2070], [4920, 1810]
    ];
    trees.forEach(([x, y], index) => addTree(x, y, 0.85 + (index % 3) * 0.08));

    const lamps = [
      [900, 620], [1285, 620], [2150, 620], [2510, 620], [3310, 620], [3650, 620], [4210, 620], [4560, 620],
      [900, 1010], [1285, 1010], [2150, 1010], [2510, 1010], [3310, 1010], [3650, 1010], [4210, 1010], [4560, 1010],
      [900, 1790], [1285, 1790], [2150, 1790], [2510, 1790], [3310, 1790], [3650, 1790], [4210, 1790], [4560, 1790]
    ];
    lamps.forEach(([x, y]) => addLamp(x, y));

    addBench(1380, 1910);
    addBench(1770, 2030, Math.PI / 2);
    addBench(2010, 1900);
    addBench(3820, 1835);
    addBench(4320, 1835);
    addBench(4770, 1835);

    // Kleine Poller am Ostkai.
    for (let x = 3440; x <= 4880; x += 120) {
      this.add.circle(x, 1815, 6, 0x283942, 1).setStrokeStyle(2, 0xd5dde1, 0.6).setDepth(6);
    }
  }

  private setupBuildingCollisions(): void {
    for (const rect of this.buildingRects) {
      this.physics.add.collider(this.player, rect);
      this.physics.add.collider(this.car, rect, () => this.damageVehicleFromImpact());
    }
  }

  private createTrafficSignal(): void {
    const makeSignal = (x: number, y: number): {
      red: Phaser.GameObjects.Arc;
      amber: Phaser.GameObjects.Arc;
      green: Phaser.GameObjects.Arc;
    } => {
      this.add.rectangle(x + 5, y + 7, 34, 82, 0x0a1116, 0.25).setDepth(19);
      this.add.rectangle(x, y, 34, 82, 0x202a31, 1)
        .setStrokeStyle(3, 0x5e6870, 0.9)
        .setDepth(20);
      this.add.rectangle(x, y + 58, 6, 52, 0x303a41, 1).setDepth(19.5);

      const red = this.add.circle(x, y - 25, 9, 0x4e2424, 1).setDepth(21);
      const amber = this.add.circle(x, y, 9, 0x5a4a24, 1).setDepth(21);
      const green = this.add.circle(x, y + 25, 9, 0x204f32, 1).setDepth(21);

      this.add.circle(x - 3, y - 28, 3, 0xffffff, 0.15).setDepth(22);
      this.add.circle(x - 3, y - 3, 3, 0xffffff, 0.12).setDepth(22);
      this.add.circle(x - 3, y + 22, 3, 0xffffff, 0.12).setDepth(22);

      return { red, amber, green };
    };

    const horizontal = makeSignal(2292, 735);
    const vertical = makeSignal(2400, 735);

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const horizontalGreen = this.horizontalSignalGreen;
        horizontal.red.setFillStyle(horizontalGreen ? 0x4e2424 : 0xe14b4b, 1);
        horizontal.green.setFillStyle(horizontalGreen ? 0x4caf50 : 0x204f32, 1);
        vertical.red.setFillStyle(horizontalGreen ? 0xe14b4b : 0x4e2424, 1);
        vertical.green.setFillStyle(horizontalGreen ? 0x204f32 : 0x4caf50, 1);

        const nearSwitch = this.time.now % 7000 > 6100;
        horizontal.amber.setFillStyle(nearSwitch ? 0xf0b83e : 0x5a4a24, 1);
        vertical.amber.setFillStyle(nearSwitch ? 0xf0b83e : 0x5a4a24, 1);
      }
    });
  }

  private pointAlongRoute(route: Phaser.Math.Vector2[], progress: number): { position: Phaser.Math.Vector2; nextIndex: number } {
    const lengths: number[] = [];
    let total = 0;

    for (let i = 0; i < route.length; i += 1) {
      const next = route[(i + 1) % route.length];
      const length = Phaser.Math.Distance.Between(route[i].x, route[i].y, next.x, next.y);
      lengths.push(length);
      total += length;
    }

    let remaining = Phaser.Math.Wrap(progress, 0, 1) * total;
    for (let i = 0; i < route.length; i += 1) {
      const segmentLength = lengths[i];
      if (remaining <= segmentLength) {
        const start = route[i];
        const end = route[(i + 1) % route.length];
        const t = segmentLength > 0 ? remaining / segmentLength : 0;
        return {
          position: new Phaser.Math.Vector2(
            Phaser.Math.Linear(start.x, end.x, t),
            Phaser.Math.Linear(start.y, end.y, t)
          ),
          nextIndex: (i + 1) % route.length
        };
      }
      remaining -= segmentLength;
    }

    return { position: route[0].clone(), nextIndex: 1 % route.length };
  }

  private spawnTraffic(): void {
    const routes: Phaser.Math.Vector2[][] = [
      [
        new Phaser.Math.Vector2(60, 760),
        new Phaser.Math.Vector2(2345, 760),
        new Phaser.Math.Vector2(2345, 1615),
        new Phaser.Math.Vector2(1095, 1615),
        new Phaser.Math.Vector2(1095, 815),
        new Phaser.Math.Vector2(60, 815)
      ],
      [
        new Phaser.Math.Vector2(3140, 870),
        new Phaser.Math.Vector2(1095, 870),
        new Phaser.Math.Vector2(1095, 1540),
        new Phaser.Math.Vector2(2345, 1540),
        new Phaser.Math.Vector2(2345, 870)
      ],
      [
        new Phaser.Math.Vector2(1015, 60),
        new Phaser.Math.Vector2(1015, 815),
        new Phaser.Math.Vector2(2415, 815),
        new Phaser.Math.Vector2(2415, 60)
      ],
      [
        new Phaser.Math.Vector2(3260, 760),
        new Phaser.Math.Vector2(4395, 760),
        new Phaser.Math.Vector2(4395, 1615),
        new Phaser.Math.Vector2(3495, 1615),
        new Phaser.Math.Vector2(3495, 870),
        new Phaser.Math.Vector2(4940, 870),
        new Phaser.Math.Vector2(4940, 1540),
        new Phaser.Math.Vector2(4395, 1540)
      ]
    ];

    const colors = [0x5e93b5, 0xc86b5d, 0xd2b85b, 0x6fa36d, 0x8f70a9, 0xeeeeee];
    const perRoute = this.appSettings.performance === 'high'
      ? 8
      : this.appSettings.performance === 'low'
        ? 3
        : 6;

    for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
      const route = routes[routeIndex];
      for (let slot = 0; slot < perRoute; slot += 1) {
        const seed = (slot + 0.12 * routeIndex) / perRoute;
        const spawn = this.pointAlongRoute(route, seed);
        const i = routeIndex * perRoute + slot;
        const sprite = this.add.image(spawn.position.x, spawn.position.y, 'traffic-car-' + (i % colors.length))
          .setDepth(18);

        this.traffic.push({
          sprite,
          route,
          routeIndex: spawn.nextIndex,
          speed: 90 + (i % 5) * 10,
          color: colors[i % colors.length]
        });
      }
    }

    const policeRoute = routes[0];
    const policeSpawn = this.pointAlongRoute(policeRoute, 0.37);
    const police = this.add.image(policeSpawn.position.x, policeSpawn.position.y, 'traffic-police')
      .setDepth(19);
    const policeLabel = this.add.text(police.x, police.y, 'P', {
      fontFamily: 'system-ui',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(20);

    this.traffic.push({
      sprite: police,
      route: policeRoute,
      routeIndex: policeSpawn.nextIndex,
      speed: 108,
      color: 0x2d5d9a,
      label: policeLabel,
      police: true
    });
  }

  private updateTraffic(_time: number, dt: number): void {
    const signal = new Phaser.Math.Vector2(2345, 815);

    for (const agent of this.traffic) {
      const actor = this.mode === 'vehicle' ? this.car : this.player;
      const pursuit = agent.police
        && this.policeSystem.getHeat() > 0
        && this.policeSystem.getState() !== 'PATROL';

      const routeTarget = agent.route[agent.routeIndex];
      const target = pursuit
        ? new Phaser.Math.Vector2(actor.x, actor.y)
        : routeTarget;
      const dx = target.x - agent.sprite.x;
      const dy = target.y - agent.sprite.y;
      const distance = Math.hypot(dx, dy);

      if (!pursuit && distance < 12) {
        agent.routeIndex = (agent.routeIndex + 1) % agent.route.length;
        continue;
      }

      const axis: Axis = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
      const approachingSignal = !pursuit
        && Phaser.Math.Distance.Between(agent.sprite.x, agent.sprite.y, signal.x, signal.y) < 120
        && Phaser.Math.Distance.Between(routeTarget.x, routeTarget.y, signal.x, signal.y) < 45;
      const red = axis === 'horizontal' ? !this.horizontalSignalGreen : this.horizontalSignalGreen;

      if (approachingSignal && red) continue;

      const angle = Math.atan2(dy, dx);
      const policeSpeed = pursuit
        ? 125 + this.policeSystem.getLevel() * 18
        : agent.speed;
      const stopForControl = agent.police
        && this.policeSystem.getState() === 'CONTROL'
        && distance < 72;
      const moveSpeed = stopForControl ? 0 : policeSpeed;
      const nextX = agent.sprite.x + Math.cos(angle) * moveSpeed * dt;
      const nextY = agent.sprite.y + Math.sin(angle) * moveSpeed * dt;

      const blockedByTraffic = this.traffic.some((other) => {
        if (other === agent) return false;
        const currentDistance = Phaser.Math.Distance.Between(agent.sprite.x, agent.sprite.y, other.sprite.x, other.sprite.y);
        const nextDistance = Phaser.Math.Distance.Between(nextX, nextY, other.sprite.x, other.sprite.y);
        return currentDistance < 68 && nextDistance < currentDistance;
      });

      const distanceToPlayerCar = Phaser.Math.Distance.Between(agent.sprite.x, agent.sprite.y, this.car.x, this.car.y);
      const nextDistanceToPlayerCar = Phaser.Math.Distance.Between(nextX, nextY, this.car.x, this.car.y);
      const blockedByPlayer = this.mode === 'vehicle' && distanceToPlayerCar < 78 && nextDistanceToPlayerCar < distanceToPlayerCar;

      if (!blockedByTraffic && !blockedByPlayer) {
        agent.sprite.rotation = angle;
        agent.sprite.setPosition(nextX, nextY);
      }

      if (agent.label) agent.label.setPosition(agent.sprite.x, agent.sprite.y);

      if (this.mode === 'vehicle') {
        const impactDistance = Phaser.Math.Distance.Between(agent.sprite.x, agent.sprite.y, this.car.x, this.car.y);
        if (impactDistance < 48 && Math.abs(this.carSpeed) > 80) {
          this.damageVehicleFromTraffic();
        }
      }
    }
  }

  private damageVehicleFromTraffic(): void {
    const now = this.time.now;
    if (now - this.lastTrafficImpactAt < 700) return;

    this.lastTrafficImpactAt = now;
    const damage = Phaser.Math.Clamp(Math.abs(this.carSpeed) * 0.012, 1, 7);
    this.applyVehicleDamage(damage, 7, 'Zusammenstoß im Verkehr – Aufmerksamkeit steigt.', 0.28);
  }

  private spawnPedestrians(): void {
    const routes: Phaser.Math.Vector2[][] = [
      [new Phaser.Math.Vector2(150, 620), new Phaser.Math.Vector2(850, 620), new Phaser.Math.Vector2(850, 1010), new Phaser.Math.Vector2(150, 1010)],
      [new Phaser.Math.Vector2(1320, 620), new Phaser.Math.Vector2(2100, 620), new Phaser.Math.Vector2(2100, 1010), new Phaser.Math.Vector2(1320, 1010)],
      [new Phaser.Math.Vector2(2550, 620), new Phaser.Math.Vector2(3080, 620), new Phaser.Math.Vector2(3080, 1010), new Phaser.Math.Vector2(2550, 1010)],
      [new Phaser.Math.Vector2(1280, 1790), new Phaser.Math.Vector2(2100, 1790), new Phaser.Math.Vector2(2100, 2110), new Phaser.Math.Vector2(1280, 2110)],
      [new Phaser.Math.Vector2(3260, 620), new Phaser.Math.Vector2(4140, 620), new Phaser.Math.Vector2(4140, 1010), new Phaser.Math.Vector2(3260, 1010)],
      [new Phaser.Math.Vector2(3690, 1790), new Phaser.Math.Vector2(4890, 1790), new Phaser.Math.Vector2(4890, 2110), new Phaser.Math.Vector2(3690, 2110)]
    ];

    const colors = [0xf4d4b0, 0xd6b08d, 0x8f654b, 0xe2c5aa, 0xb47b5c];

    const pedestrianCount = this.appSettings.performance === 'high'
      ? 34
      : this.appSettings.performance === 'low'
        ? 14
        : 26;

    for (let i = 0; i < pedestrianCount; i += 1) {
      const route = routes[i % routes.length];
      const progress = ((i * 0.61803398875) % 1 + 0.025 * (i % 4)) % 1;
      const spawn = this.pointAlongRoute(route, progress);
      const sprite = this.add.image(spawn.position.x, spawn.position.y, 'pedestrian-' + (i % 5))
        .setDepth(24);

      this.pedestrians.push({
        sprite,
        route,
        routeIndex: spawn.nextIndex,
        speed: 38 + (i % 5) * 6,
        waitUntil: 0
      });
    }
  }

  private updatePedestrians(time: number, dt: number): void {
    for (const pedestrian of this.pedestrians) {
      const distanceToCar = Phaser.Math.Distance.Between(pedestrian.sprite.x, pedestrian.sprite.y, this.car.x, this.car.y);

      if (this.mode === 'vehicle' && distanceToCar < 95 && Math.abs(this.carSpeed) > 55) {
        const away = new Phaser.Math.Vector2(
          pedestrian.sprite.x - this.car.x,
          pedestrian.sprite.y - this.car.y
        );
        if (away.lengthSq() < 0.001) away.set(1, 0);
        away.normalize().scale(105 * dt);
        pedestrian.sprite.x = Phaser.Math.Clamp(pedestrian.sprite.x + away.x, 18, WORLD_WIDTH - 18);
        pedestrian.sprite.y = Phaser.Math.Clamp(pedestrian.sprite.y + away.y, 18, WORLD_HEIGHT - 18);
        pedestrian.waitUntil = time + 250;
        continue;
      }

      if (time < pedestrian.waitUntil) continue;

      const target = pedestrian.route[pedestrian.routeIndex];
      const dx = target.x - pedestrian.sprite.x;
      const dy = target.y - pedestrian.sprite.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 8) {
        pedestrian.routeIndex = (pedestrian.routeIndex + 1) % pedestrian.route.length;
        if (Math.random() < 0.28) pedestrian.waitUntil = time + 800 + Math.random() * 1800;
        continue;
      }

      const angle = Math.atan2(dy, dx);
      pedestrian.sprite.setRotation(angle + Math.PI / 2);
      pedestrian.sprite.x += Math.cos(angle) * pedestrian.speed * dt;
      pedestrian.sprite.y += Math.sin(angle) * pedestrian.speed * dt;
    }
  }

  private createHud(): void {
    this.joystickBase = this.add.circle(110, 600, 58, 0x08131d, 0.40)
      .setStrokeStyle(3, 0xffffff, 0.45).setScrollFactor(0).setDepth(1000).setVisible(false);
    this.joystickKnob = this.add.circle(110, 600, 27, 0xffffff, 0.78)
      .setScrollFactor(0).setDepth(1001).setVisible(false);

    const actionRadius = this.appSettings.largeTouchTargets ? 68 : 56;
    this.actionGlow = this.add.circle(1105, 606, actionRadius + 9, 0x071118, 0.34)
      .setScrollFactor(0).setDepth(999);
    this.actionButton = this.add.circle(1100, 600, actionRadius, 0xf0c94e, 0.97)
      .setStrokeStyle(5, 0xffffff, 0.76).setScrollFactor(0).setDepth(1000).setInteractive();
    this.actionLabel = this.add.text(1100, 600, 'AKTION', {
      fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', fontSize: '16px', color: '#17232d', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.actionLabel.setShadow(0, 1, '#ffffff', 2, false, true);

    this.radioShadow = this.add.rectangle(1104, 155, 132, 42, 0x05090c, 0.28)
      .setScrollFactor(0).setDepth(999);
    this.radioButton = this.add.rectangle(1100, 150, 128, 40, 0x263c4a, 0.96)
      .setStrokeStyle(2, 0xf0c94e, 0.68)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    this.radioLabel = this.add.text(1100, 150, 'RADIO AUS', {
      fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', fontSize: '12px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.hintText = this.add.text(18, 18, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#12232ee8', padding: { x: 13, y: 9 }
    }).setScrollFactor(0).setDepth(1000);
    this.hintText.setShadow(0, 2, '#000000', 4, true, true);

    this.statusText = this.add.text(18, 67, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '14px', color: '#dce8ef',
      backgroundColor: '#101b23dc', padding: { x: 11, y: 7 }
    }).setScrollFactor(0).setDepth(1000);

    this.missionHudText = this.add.text(18, 112, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff1a6',
      backgroundColor: '#342a14e8', padding: { x: 11, y: 8 },
      wordWrap: { width: 520 }
    }).setScrollFactor(0).setDepth(1000);

    this.toastText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#17232d',
      backgroundColor: '#f0cf62f2', padding: { x: 15, y: 10 }, align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1100).setVisible(false);
    this.toastText.setShadow(0, 2, '#000000', 4, false, true);

    this.actionButton.on('pointerdown', () => this.performAction());
  }

  private createMinimap(): void {
    const mapWidth = 190;
    const mapHeight = 96;
    const shadow = this.add.rectangle(5, 6, mapWidth + 8, mapHeight + 8, 0x05090c, 0.28);
    const background = this.add.rectangle(0, 0, mapWidth, mapHeight, 0x101921, 0.93)
      .setStrokeStyle(3, 0xf0c94e, 0.58);
    const accent = this.add.rectangle(0, -mapHeight / 2 + 5, mapWidth - 8, 6, 0x56b9d4, 0.85);
    const roads = this.add.graphics();
    roads.lineStyle(5, 0x6d767d, 0.95);
    const sx = mapWidth / WORLD_WIDTH;
    const sy = mapHeight / WORLD_HEIGHT;

    const drawLine = (x1: number, y1: number, x2: number, y2: number): void => {
      roads.lineBetween(
        -mapWidth / 2 + x1 * sx,
        -mapHeight / 2 + y1 * sy,
        -mapWidth / 2 + x2 * sx,
        -mapHeight / 2 + y2 * sy
      );
    };

    drawLine(0, 815, WORLD_WIDTH, 815);
    drawLine(0, 1615, WORLD_WIDTH, 1615);
    for (const x of [1095, 2345, 3495, 4395]) drawLine(x, 0, x, WORLD_HEIGHT);

    const westendLabel = this.add.text(-mapWidth * 0.30, -mapHeight * 0.38, 'WEST', {
      fontFamily: 'system-ui', fontSize: '9px', fontStyle: 'bold', color: '#a9c4d2'
    }).setOrigin(0.5);
    const ostkaiLabel = this.add.text(mapWidth * 0.29, -mapHeight * 0.38, 'OSTKAI', {
      fontFamily: 'system-ui', fontSize: '9px', fontStyle: 'bold', color: '#a9c4d2'
    }).setOrigin(0.5);

    this.minimapPlayer = this.add.circle(0, 0, 4, 0x8ce6ff, 1).setStrokeStyle(1, 0xffffff, 1);
    this.minimapVehicle = this.add.rectangle(0, 0, 8, 5, 0xffb34f, 1).setStrokeStyle(1, 0xffffff, 0.8);
    this.minimapMission = this.add.circle(0, 0, 5, 0xffdf5f, 0.95)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setVisible(false);

    this.minimapContainer = this.add.container(0, 0, [
      shadow,
      background,
      accent,
      roads,
      westendLabel,
      ostkaiLabel,
      this.minimapPlayer,
      this.minimapVehicle,
      this.minimapMission
    ]).setScrollFactor(0).setDepth(1002);
  }

  private updateMinimap(): void {
    if (!this.minimapContainer) return;

    const unlocked = this.registry.get('mapUnlocked') === true;
    this.minimapContainer.setVisible(unlocked);
    if (!unlocked) return;

    const mapWidth = 190;
    const mapHeight = 96;
    const toLocalX = (x: number): number => -mapWidth / 2 + Phaser.Math.Clamp(x, 0, WORLD_WIDTH) / WORLD_WIDTH * mapWidth;
    const toLocalY = (y: number): number => -mapHeight / 2 + Phaser.Math.Clamp(y, 0, WORLD_HEIGHT) / WORLD_HEIGHT * mapHeight;

    this.minimapPlayer
      .setPosition(toLocalX(this.player.x), toLocalY(this.player.y))
      .setVisible(this.mode === 'on-foot');
    this.minimapVehicle
      .setPosition(toLocalX(this.car.x), toLocalY(this.car.y))
      .setRotation(this.car.rotation)
      .setVisible(true);

    const stage = this.missionSystem.getActiveStage();
    if (stage && typeof stage.x === 'number' && typeof stage.y === 'number') {
      this.minimapMission.setPosition(toLocalX(stage.x), toLocalY(stage.y)).setVisible(true);
    } else {
      this.minimapMission.setVisible(false);
    }
  }

  private bindPointerControls(): void {
    this.input.addPointer(2);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      void this.audioSystem.unlock();

      if (this.radioButton) {
        const bounds = this.radioButton.getBounds();
        if (Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
          void this.cycleRadio();
          return;
        }
      }

      if (this.actionButton) {
        const actionDistance = Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          this.actionButton.x,
          this.actionButton.y
        );
        if (actionDistance <= this.actionButton.radius + 18) {
          this.performAction();
          return;
        }
      }

      if (pointer.x >= this.scale.width * 0.58 || this.joystickPointerId !== null) return;

      this.joystickPointerId = pointer.id;
      this.joystickOrigin.set(pointer.x, pointer.y);
      this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
      this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true);
      this.joystickVector.set(0, 0);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== pointer.id) return;

      const dx = pointer.x - this.joystickOrigin.x;
      const dy = pointer.y - this.joystickOrigin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = 58;
      const scale = distance > radius ? radius / distance : 1;
      const clampedX = dx * scale;
      const clampedY = dy * scale;

      this.joystickKnob.setPosition(this.joystickOrigin.x + clampedX, this.joystickOrigin.y + clampedY);
      this.joystickVector.set(Phaser.Math.Clamp(dx / radius, -1, 1), Phaser.Math.Clamp(dy / radius, -1, 1));
      if (this.joystickVector.lengthSq() > 1) this.joystickVector.normalize();
    });

    const releasePointer = (pointer: Phaser.Input.Pointer): void => {
      if (this.joystickPointerId !== pointer.id) return;
      this.joystickPointerId = null;
      this.joystickVector.set(0, 0);
      this.joystickBase.setVisible(false);
      this.joystickKnob.setVisible(false);
    };

    this.input.on('pointerup', releasePointer);
    this.input.on('pointerupoutside', releasePointer);
    this.input.on('gameout', () => this.resetTransientInput());
  }

  private resetTransientInput(): void {
    this.joystickPointerId = null;
    this.joystickVector.set(0, 0);
    this.joystickBase?.setVisible(false);
    this.joystickKnob?.setVisible(false);
    this.lastActionDown = false;
  }

  private getMovementInput(): Phaser.Math.Vector2 {
    const v = this.joystickVector.clone();
    if (this.cursors?.left.isDown || this.keys?.A?.isDown) v.x -= 1;
    if (this.cursors?.right.isDown || this.keys?.D?.isDown) v.x += 1;
    if (this.cursors?.up.isDown || this.keys?.W?.isDown) v.y -= 1;
    if (this.cursors?.down.isDown || this.keys?.S?.isDown) v.y += 1;
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  private updateActorVisuals(): void {
    if (this.playerShadow && this.player) {
      this.playerShadow
        .setPosition(this.player.x + 5, this.player.y + 12)
        .setVisible(this.mode === 'on-foot' && this.player.visible);
    }

    if (!this.carShadow || !this.car) return;

    const profile = getVehicleProfile(this.registry.get('currentVehicleId'));
    const speedRatio = Phaser.Math.Clamp(Math.abs(this.carSpeed) / Math.max(1, profile.maxForward), 0, 1);
    const visualAcceleration = Phaser.Math.Clamp((this.carSpeed - this.lastCarVisualSpeed) / 32, -0.035, 0.035);
    const stretch = this.appSettings.reducedMotion ? 0 : visualAcceleration;

    this.car
      .setDisplaySize(profile.width * (1 + stretch), profile.height * (1 - stretch * 0.55));

    this.carShadow
      .setPosition(this.car.x + 7, this.car.y + 9 + speedRatio * 3)
      .setSize(profile.width * (0.88 + speedRatio * 0.03), profile.height * (0.58 - speedRatio * 0.05))
      .setRotation(this.car.rotation)
      .setAlpha(0.32 - speedRatio * 0.08)
      .setVisible(true);

    this.motionFx.clear();
    if (this.mode === 'vehicle' && speedRatio > 0.58 && !this.appSettings.reducedMotion) {
      const backAngle = this.car.rotation + Math.PI;
      const back = new Phaser.Math.Vector2(Math.cos(backAngle), Math.sin(backAngle));
      const side = new Phaser.Math.Vector2(-back.y, back.x);
      const strength = Phaser.Math.Clamp((speedRatio - 0.58) / 0.42, 0, 1);
      this.motionFx.lineStyle(3, 0xeaf6fb, 0.18 + strength * 0.22);

      for (const offset of [-26, 0, 26]) {
        const startX = this.car.x + back.x * (profile.width * 0.48) + side.x * offset;
        const startY = this.car.y + back.y * (profile.width * 0.48) + side.y * offset;
        const streak = 20 + strength * 42;
        this.motionFx.lineBetween(
          startX,
          startY,
          startX + back.x * streak,
          startY + back.y * streak
        );
      }
    }

    this.drawVehicleLightsAndDamage(profile, speedRatio);
    this.maybeCreateTireMarks(profile, speedRatio);
    this.lastCarVisualSpeed = this.carSpeed;
  }

  private carLocalPoint(forwardOffset: number, sideOffset: number): Phaser.Math.Vector2 {
    const forward = new Phaser.Math.Vector2(Math.cos(this.car.rotation), Math.sin(this.car.rotation));
    const side = new Phaser.Math.Vector2(-forward.y, forward.x);
    return new Phaser.Math.Vector2(
      this.car.x + forward.x * forwardOffset + side.x * sideOffset,
      this.car.y + forward.y * forwardOffset + side.y * sideOffset
    );
  }

  private getVehicleDamageStage(condition: number): { level: number; label: string } {
    if (condition <= 0) return { level: 4, label: 'FAHRUNFÄHIG' };
    if (condition <= 25) return { level: 3, label: 'STARK BESCHÄDIGT' };
    if (condition <= 50) return { level: 2, label: 'BESCHÄDIGT' };
    if (condition <= 75) return { level: 1, label: 'KRATZER' };
    return { level: 0, label: 'INTAKT' };
  }

  private drawVehicleLightsAndDamage(
    profile: ReturnType<typeof getVehicleProfile>,
    speedRatio: number
  ): void {
    this.vehicleFx.clear();

    const rear = -profile.width * 0.43;
    const front = profile.width * 0.43;
    const sideOffset = profile.height * 0.28;
    const braking = this.mode === 'vehicle' && this.lastThrottleInput < -0.16 && this.carSpeed > 35;
    const reversing = this.mode === 'vehicle' && this.carSpeed < -8;
    const indicatorOn = Math.floor(this.time.now / 330) % 2 === 0 && Math.abs(this.lastSteerInput) > 0.38;

    if (braking) {
      this.vehicleFx.fillStyle(0xff2f2f, 0.96);
      for (const side of [-sideOffset, sideOffset]) {
        const p = this.carLocalPoint(rear, side);
        this.vehicleFx.fillCircle(p.x, p.y, 5.5);
        this.vehicleFx.fillStyle(0xff5b45, 0.16);
        this.vehicleFx.fillCircle(p.x, p.y, 11);
        this.vehicleFx.fillStyle(0xff2f2f, 0.96);
      }
    }

    if (reversing) {
      this.vehicleFx.fillStyle(0xeef8ff, 0.95);
      for (const side of [-sideOffset * 0.72, sideOffset * 0.72]) {
        const p = this.carLocalPoint(rear + 4, side);
        this.vehicleFx.fillCircle(p.x, p.y, 3.5);
      }
    }

    if (indicatorOn) {
      const blinkSide = this.lastSteerInput > 0 ? sideOffset : -sideOffset;
      this.vehicleFx.fillStyle(0xffb52f, 1);
      for (const longitudinal of [rear + 2, front - 2]) {
        const p = this.carLocalPoint(longitudinal, blinkSide);
        this.vehicleFx.fillCircle(p.x, p.y, 4.5);
      }
    }

    const condition = Phaser.Math.Clamp(Number(this.registry.get('vehicleCondition') ?? 100), 0, 100);
    const damage = this.getVehicleDamageStage(condition);
    if (damage.level >= 1) {
      const scratchA = this.carLocalPoint(profile.width * 0.10, -profile.height * 0.20);
      const scratchB = this.carLocalPoint(profile.width * 0.25, profile.height * 0.12);
      this.vehicleFx.lineStyle(2, 0x4c5960, 0.88);
      this.vehicleFx.lineBetween(scratchA.x - 7, scratchA.y - 4, scratchA.x + 8, scratchA.y + 5);
      this.vehicleFx.lineBetween(scratchB.x - 6, scratchB.y + 5, scratchB.x + 6, scratchB.y - 5);
    }

    if (damage.level >= 2) {
      const dent = this.carLocalPoint(profile.width * 0.27, 0);
      this.vehicleFx.lineStyle(3, 0x26323a, 0.9);
      this.vehicleFx.strokeCircle(dent.x, dent.y, 8);
      this.vehicleFx.lineBetween(dent.x - 10, dent.y, dent.x + 10, dent.y);
      this.vehicleFx.lineBetween(dent.x, dent.y - 8, dent.x, dent.y + 8);
    }

    if (damage.level >= 3) {
      const smokeOrigin = this.carLocalPoint(profile.width * 0.38, 0);
      const phase = this.time.now / 260;
      for (let i = 0; i < 4; i += 1) {
        const rise = (phase + i * 0.9) % 4;
        const alpha = Math.max(0.06, 0.30 - rise * 0.055);
        this.vehicleFx.fillStyle(damage.level >= 4 ? 0x30383d : 0x69747a, alpha);
        this.vehicleFx.fillCircle(
          smokeOrigin.x + Math.sin(phase + i) * 8,
          smokeOrigin.y - 6 - rise * 8,
          6 + rise * 2
        );
      }
    }

    if (damage.level >= 4) {
      const pulse = 0.45 + Math.sin(this.time.now / 160) * 0.18;
      this.vehicleFx.lineStyle(4, 0xff5348, pulse);
      this.vehicleFx.strokeCircle(this.car.x, this.car.y, Math.max(profile.width, profile.height) * 0.58);
    }

    if (this.mode !== 'vehicle' || speedRatio < 0.04) {
      this.lastThrottleInput = 0;
      this.lastSteerInput = 0;
    }
  }

  private maybeCreateTireMarks(
    profile: ReturnType<typeof getVehicleProfile>,
    speedRatio: number
  ): void {
    if (this.mode !== 'vehicle') return;
    const hardTurn = speedRatio > 0.48 && Math.abs(this.lastSteerInput) > 0.52;
    const hardBrake = this.lastThrottleInput < -0.35 && this.carSpeed > 120;
    if (!hardTurn && !hardBrake) return;
    if (this.time.now - this.lastTireMarkAt < 85) return;
    this.lastTireMarkAt = this.time.now;

    const rear = -profile.width * 0.34;
    const sideOffset = profile.height * 0.29;
    for (const side of [-sideOffset, sideOffset]) {
      const p = this.carLocalPoint(rear, side);
      const mark = this.add.rectangle(p.x, p.y, 16, 3, 0x172027, 0.25)
        .setRotation(this.car.rotation)
        .setDepth(5);
      this.tireMarks.push(mark);
    }

    while (this.tireMarks.length > 80) {
      this.tireMarks.shift()?.destroy();
    }
  }

  private updatePlayer(): void {
    const input = this.getMovementInput();
    const sprinting = Boolean(this.keys?.SHIFT?.isDown);
    const speed = sprinting ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
    this.player.setVelocity(input.x * speed, input.y * speed);
    if (input.lengthSq() > 0.04) this.player.setRotation(Math.atan2(input.y, input.x));
  }

  private updateCar(dt: number): void {
    const input = this.getMovementInput();
    const throttle = -input.y;
    const steer = input.x;
    this.lastThrottleInput = throttle;
    this.lastSteerInput = steer;
    const condition = Phaser.Math.Clamp(Number(this.registry.get('vehicleCondition') ?? 100), 0, 100);
    const conditionRatio = condition / 100;
    const conditionFactor = condition <= 0 ? 0 : Phaser.Math.Linear(0.38, 1, conditionRatio);
    const profile = getVehicleProfile(this.registry.get('currentVehicleId'));
    const maxForward = profile.maxForward * conditionFactor;
    const maxReverse = -profile.maxReverse * conditionFactor;

    if (throttle > 0.08) {
      this.carSpeed += profile.acceleration * conditionFactor * throttle * dt;
    } else if (throttle < -0.08) {
      if (this.carSpeed > 45) this.carSpeed += profile.braking * throttle * dt;
      else this.carSpeed += profile.acceleration * 0.62 * throttle * dt;
    } else {
      const resistance = profile.rollingResistance * dt;
      if (Math.abs(this.carSpeed) <= resistance) {
        this.carSpeed = 0;
      } else {
        this.carSpeed -= Math.sign(this.carSpeed) * resistance;
      }
    }

    this.carSpeed = Phaser.Math.Clamp(this.carSpeed, maxReverse, maxForward);
    const speedRatio = Phaser.Math.Clamp(Math.abs(this.carSpeed) / Math.max(1, profile.maxForward), 0, 1);
    const steeringStrength = Phaser.Math.Linear(profile.steeringLow, profile.steeringHigh, speedRatio);
    const reverseFactor = this.carSpeed < 0 ? -1 : 1;
    if (Math.abs(this.carSpeed) > 12) this.car.rotation += steer * steeringStrength * reverseFactor * dt;

    const body = this.car.body as Phaser.Physics.Arcade.Body;
    this.physics.velocityFromRotation(this.car.rotation, this.carSpeed, body.velocity);
    body.velocity.scale(0.997);
  }

  private damageVehicleFromImpact(): void {
    const now = this.time.now;
    if (now - this.lastCarImpactAt < 650) return;
    if (Math.abs(this.carSpeed) < 120) return;

    this.lastCarImpactAt = now;
    const damage = Phaser.Math.Clamp(Math.abs(this.carSpeed) * 0.018, 2, 10);
    this.applyVehicleDamage(damage, 4, 'Fahrzeug beschädigt – Werkstatt kann helfen.', -0.18);
  }

  private applyVehicleDamage(
    damage: number,
    heat: number,
    message: string,
    speedMultiplier: number
  ): void {
    const oldCondition = Phaser.Math.Clamp(Number(this.registry.get('vehicleCondition') ?? 100), 0, 100);
    const newCondition = Phaser.Math.Clamp(oldCondition - Math.max(0, damage), 0, 100);
    const before = this.getVehicleDamageStage(oldCondition);
    const after = this.getVehicleDamageStage(newCondition);

    this.registry.set('vehicleCondition', newCondition);
    this.policeSystem.addHeat(heat);
    this.registry.set(
      'toast',
      after.level > before.level
        ? message + ' · ' + after.label
        : message
    );

    this.spawnImpactBurst(after.level);
    this.carSpeed *= speedMultiplier;
  }

  private spawnImpactBurst(damageLevel: number): void {
    const front = this.carLocalPoint(
      getVehicleProfile(this.registry.get('currentVehicleId')).width * 0.44,
      0
    );
    const offsets = [
      [-12, -8], [9, -11], [14, 6], [-8, 12], [0, 0]
    ];

    offsets.forEach(([dx, dy], index) => {
      const spark = this.add.circle(
        front.x + dx,
        front.y + dy,
        3 + (index % 2),
        damageLevel >= 3 ? 0xff8d3a : 0xffd25a,
        0.92
      ).setDepth(35);

      this.tweens.add({
        targets: spark,
        x: spark.x + dx * 1.8,
        y: spark.y + dy * 1.8,
        alpha: 0,
        scale: 1.8,
        duration: 240 + index * 35,
        onComplete: () => spark.destroy()
      });
    });
  }

  private updateActionInput(): void {
    const eDown = Boolean(this.keys?.E?.isDown);
    if (eDown && !this.lastActionDown) this.performAction();
    this.lastActionDown = eDown;

    const radioDown = Boolean(this.keys?.R?.isDown);
    if (radioDown && !this.lastRadioDown) void this.cycleRadio();
    this.lastRadioDown = radioDown;
  }

  private async cycleRadio(): Promise<void> {
    await this.audioSystem.cycleRadio();
    if (this.radioLabel) this.radioLabel.setText(this.audioSystem.getChannelLabel());
    this.registry.set('toast', this.audioSystem.getChannelLabel());
  }

  private updateAudio(): void {
    const profile = getVehicleProfile(this.registry.get('currentVehicleId'));
    const speedRatio = Phaser.Math.Clamp(Math.abs(this.carSpeed) / Math.max(1, profile.maxForward), 0, 1);
    this.audioSystem.updateEngine(speedRatio, this.mode === 'vehicle');
  }

  private performAction(): void {
    const now = this.time.now;
    if (now - this.lastActionAt < 280) return;
    this.lastActionAt = now;

    if (this.mode === 'vehicle') {
      this.exitVehicle();
      return;
    }

    if (this.progressMission(true)) return;

    const activeMissionStage = this.missionSystem.getActiveStage();
    const missionNeedsVehicle = activeMissionStage?.type === 'ENTER_VEHICLE'
      || activeMissionStage?.type === 'DRIVE_TO';
    if (missionNeedsVehicle) {
      const distanceToMissionCar = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.car.x,
        this.car.y
      );
      if (distanceToMissionCar <= 110) {
        this.enterVehicle();
        return;
      }
    }

    if (!this.missionSystem.getActiveMission()) {
      const distanceToBoard = Phaser.Math.Distance.Between(this.player.x, this.player.y, 850, 1015);
      if (distanceToBoard <= 120) {
        const nextMission = this.missionSystem.getNextAvailableMission();
        if (nextMission) {
          const event = this.missionSystem.start(nextMission.id);
          if (event.type === 'mission-started') {
            if (nextMission.id === 'M10') this.policeSystem.addHeat(32, 8000);
            if (nextMission.id === 'M11') this.policeSystem.addHeat(58, 10000);
            this.registry.set('toast', 'Mission gestartet: ' + nextMission.title);
            this.refreshMissionMarkers();
            void this.saveGame();
            return;
          }
        }
      }
    }

    const collectible = this.getNearestCollectible();
    if (collectible && collectible.distance <= 95) {
      const definition = collectible.marker.definition;
      if (!this.collectedCollectibles.has(definition.id)) {
        this.collectedCollectibles.add(definition.id);
        collectible.marker.marker.setVisible(false);
        collectible.marker.label.setVisible(false);
        const credits = Number(this.registry.get('credits') ?? 500);
        const count = this.collectedCollectibles.size;
        const milestoneBonus = count % 4 === 0 ? 75 : 0;
        this.registry.set('credits', credits + definition.reward + milestoneBonus);
        this.registry.set(
          'toast',
          definition.label + ' gefunden · +' + definition.reward + ' CR' +
            (milestoneBonus > 0 ? ' · Sammlerbonus +' + milestoneBonus + ' CR' : '')
        );
        void this.saveGame();
        return;
      }
    }

    if (this.currentEvent && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.currentEvent.x, this.currentEvent.y) <= 100) {
      const credits = Number(this.registry.get('credits') ?? 500);
      this.registry.set('credits', credits + this.currentEvent.reward);
      this.registry.set('toast', this.currentEvent.label + ' erledigt: +' + this.currentEvent.reward + ' Credits');
      this.currentEvent.marker.destroy();
      this.currentEvent.text.destroy();
      this.currentEvent = null;
      void this.saveGame();
      return;
    }

    const nearestDoor = this.getNearestDoor();
    const distanceToCar = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.car.x, this.car.y);
    const missionWantsVehicle = this.missionSystem.getActiveStage()?.type === 'ENTER_VEHICLE';
    const preferCar = distanceToCar <= 110
      && (
        missionWantsVehicle
        || !nearestDoor
        || nearestDoor.distance > 105
        || distanceToCar <= nearestDoor.distance + 10
      );

    if (preferCar) {
      this.enterVehicle();
      return;
    }

    if (nearestDoor && nearestDoor.distance <= 105) {
      void this.saveGame();
      this.player.setVelocity(0, 0);
      this.scene.pause();
      this.scene.launch('InteriorScene', { placeId: nearestDoor.door.placeId, placeName: nearestDoor.door.placeName });
    }
  }

  private enterVehicle(): void {
    this.mode = 'vehicle';
    this.player.setVelocity(0, 0).setVisible(false).setActive(false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.cameras.main.startFollow(this.car, true, 0.08, 0.08);
  }

  private exitVehicle(): void {
    if (Math.abs(this.carSpeed) > 105) {
      this.registry.set('toast', 'Zum Aussteigen bitte erst langsamer werden.');
      return;
    }

    this.mode = 'on-foot';
    this.carSpeed *= 0.25;
    const safe = this.findSafeExitPosition();
    this.player.setPosition(safe.x, safe.y);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.player.setVisible(true).setActive(true).setVelocity(0, 0);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    void this.saveGame();
  }

  private findSafeExitPosition(): Phaser.Math.Vector2 {
    const offsets = [
      Math.PI / 2,
      -Math.PI / 2,
      Math.PI,
      0
    ];

    for (const offset of offsets) {
      const angle = this.car.rotation + offset;
      const candidate = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(this.car.x + Math.cos(angle) * 78, 30, WORLD_WIDTH - 30),
        Phaser.Math.Clamp(this.car.y + Math.sin(angle) * 78, 30, WORLD_HEIGHT - 30)
      );

      const blocked = this.buildingRects.some((rect) => {
        const bounds = rect.getBounds();
        return Phaser.Geom.Rectangle.Contains(
          new Phaser.Geom.Rectangle(bounds.x - 28, bounds.y - 28, bounds.width + 56, bounds.height + 56),
          candidate.x,
          candidate.y
        );
      });

      if (!blocked) return candidate;
    }

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.car.x, 30, WORLD_WIDTH - 30),
      Phaser.Math.Clamp(this.car.y + 95, 30, WORLD_HEIGHT - 30)
    );
  }

  private getNearestDoor(): { door: DoorPoint; distance: number } | null {
    let best: { door: DoorPoint; distance: number } | null = null;
    for (const door of this.doors) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y);
      if (!best || distance < best.distance) best = { door, distance };
    }
    return best;
  }

  private updateCamera(): void {
    let targetZoom = 1.05;
    if (this.mode === 'vehicle') {
      const speedRatio = Phaser.Math.Clamp(Math.abs(this.carSpeed) / 610, 0, 1);
      targetZoom = Phaser.Math.Linear(0.98, 0.72, speedRatio);
      const lookAhead = Phaser.Math.Linear(20, 170, speedRatio);
      this.cameras.main.setFollowOffset(-Math.cos(this.car.rotation) * lookAhead, -Math.sin(this.car.rotation) * lookAhead);
    } else {
      this.cameras.main.setFollowOffset(0, 0);
    }
    this.cameras.main.zoom = this.appSettings.reducedMotion
      ? targetZoom
      : Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.065);
  }

  private updateHint(): void {
    if (this.mode === 'vehicle') {
      this.hintText.setText('Fahren: Stick / WASD · Aussteigen: Aktion / E');
      this.actionLabel.setText('AUS\nSTEIGEN');
      return;
    }

    const nearestCollectible = this.getNearestCollectible();
    if (nearestCollectible && nearestCollectible.distance <= 95) {
      this.hintText.setText(nearestCollectible.marker.definition.label + ' · Aktion zum Einsammeln');
      this.actionLabel.setText('SAMMELN');
      return;
    }

    if (this.currentEvent && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.currentEvent.x, this.currentEvent.y) <= 100) {
      this.hintText.setText(this.currentEvent.label + ' · Aktion zum Helfen');
      this.actionLabel.setText('HELFEN');
      return;
    }

    const nearestDoor = this.getNearestDoor();
    const distanceToCar = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.car.x, this.car.y);
    const missionWantsVehicle = this.missionSystem.getActiveStage()?.type === 'ENTER_VEHICLE';
    const preferCar = distanceToCar <= 110
      && (
        missionWantsVehicle
        || !nearestDoor
        || nearestDoor.distance > 105
        || distanceToCar <= nearestDoor.distance + 10
      );

    if (preferCar) {
      this.hintText.setText('Fahrzeug · Aktion / E zum Einsteigen');
      this.actionLabel.setText('EIN\nSTEIGEN');
      return;
    }

    if (nearestDoor && nearestDoor.distance <= 105) {
      this.hintText.setText(nearestDoor.door.placeName + ' · Aktion zum Betreten');
      this.actionLabel.setText('REIN');
      return;
    }

    this.hintText.setText('Westend erkunden · Türen, Verkehr, Passanten und spontane Ereignisse');
    this.actionLabel.setText('AKTION');
  }

  private updateStatus(): void {
    this.statusText.setY(18 + this.hintText.height + 8);
    this.missionHudText.setY(this.statusText.y + this.statusText.height + 7);

    const credits = Math.round(Number(this.registry.get('credits') ?? 500));
    const condition = Math.round(Number(this.registry.get('vehicleCondition') ?? 100));
    const kmh = Math.round(Math.abs(this.carSpeed) * 0.22);
    const heatLevel = this.policeSystem.getLevel();
    const policeState = this.policeSystem.getState();
    const stateLabel = policeState === 'PATROL'
      ? 'RUHIG'
      : policeState === 'SEARCH'
        ? 'SUCHE'
        : policeState === 'CHASE'
          ? 'VERFOLGUNG'
          : 'KONTROLLE';
    const compactHud = this.scale.width < 700;
    const vehicleName = getVehicleProfile(this.registry.get('currentVehicleId')).name;
    const damageStage = this.getVehicleDamageStage(condition);
    const base = compactHud
      ? 'CR ' + credits + ' · ' + vehicleName + ' ' + condition + '% ' + damageStage.label + ' · A ' + heatLevel + '/5 · ' + stateLabel
      : 'CR ' + credits + ' · ' + vehicleName + ' ' + condition + '% · ' + damageStage.label + ' · AUFMERKSAMKEIT ' + heatLevel + '/5 · ' + stateLabel;
    this.statusText.setText(
      this.mode === 'vehicle'
        ? base + (compactHud ? ' · ' + kmh + ' km/h' : ' · ~' + kmh + ' km/h')
        : base + (compactHud ? '' : ' · WESTEND')
    );

    const mission = this.missionSystem.getActiveMission();
    const stage = this.missionSystem.getActiveStage();
    if (mission && stage) {
      this.missionHudText.setText(mission.id + ' ' + mission.title + ' · ' + stage.label).setVisible(true);
    } else {
      const next = this.missionSystem.getNextAvailableMission();
      this.missionHudText
        .setText(next ? 'Nächster Auftrag: ' + next.title + ' · am Auftragsboard' : 'Alle Phase-3-Missionen abgeschlossen')
        .setVisible(true);
    }
  }


  private spawnCollectibles(): void {
    this.collectibleMarkers = COLLECTIBLES.map((definition) => {
      const marker = this.add.circle(definition.x, definition.y, 17, 0x7bd3c8, 0.96)
        .setStrokeStyle(3, 0xffffff, 0.88)
        .setDepth(39);
      const label = this.add.text(definition.x, definition.y, '◆', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(40);
      return { definition, marker, label };
    });
    this.refreshCollectibles();
  }

  private refreshCollectibles(): void {
    for (const collectible of this.collectibleMarkers) {
      const visible = !this.collectedCollectibles.has(collectible.definition.id);
      collectible.marker.setVisible(visible);
      collectible.label.setVisible(visible);
    }
  }

  private getNearestCollectible(): { marker: CollectibleMarker; distance: number } | null {
    let best: { marker: CollectibleMarker; distance: number } | null = null;
    for (const marker of this.collectibleMarkers) {
      if (this.collectedCollectibles.has(marker.definition.id)) continue;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        marker.definition.x,
        marker.definition.y
      );
      if (!best || distance < best.distance) best = { marker, distance };
    }
    return best;
  }

  private createPhaseThreeMarkers(): void {
    this.missionBoard = this.add.circle(850, 1015, 28, 0x6a4b9b, 0.96)
      .setStrokeStyle(4, 0xffffff, 0.82)
      .setDepth(45);

    this.missionBoardLabel = this.add.text(850, 970, 'AUFTRÄGE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#4d3578dd',
      padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setDepth(46);

    this.refreshMissionMarkers();
  }

  private refreshMissionMarkers(): void {
    this.missionTargetMarker?.destroy();
    this.missionTargetLabel?.destroy();
    this.missionTargetMarker = undefined;
    this.missionTargetLabel = undefined;

    const mission = this.missionSystem.getActiveMission();
    const stage = this.missionSystem.getActiveStage();

    if (!mission || !stage || typeof stage.x !== 'number' || typeof stage.y !== 'number') {
      const next = this.missionSystem.getNextAvailableMission();
      if (this.missionBoard) {
        this.missionBoard.setVisible(Boolean(next) && !mission);
        this.missionBoardLabel.setVisible(Boolean(next) && !mission);
      }
      return;
    }

    this.missionBoard.setVisible(false);
    this.missionBoardLabel.setVisible(false);

    this.missionTargetMarker = this.add.circle(stage.x, stage.y, 31, 0xf3c64f, 0.32)
      .setStrokeStyle(5, 0xffe57e, 0.95)
      .setDepth(44);

    this.missionTargetLabel = this.add.text(stage.x, stage.y - 48, mission.id, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#201b10',
      backgroundColor: '#ffe57eee',
      padding: { x: 7, y: 4 }
    }).setOrigin(0.5).setDepth(45);
  }

  private progressMission(actionPressed: boolean): boolean {
    const missionBefore = this.missionSystem.getActiveMission();
    if (!missionBefore) return false;

    const actor = this.mode === 'vehicle' ? this.car : this.player;
    const result = this.missionSystem.update({
      x: actor.x,
      y: actor.y,
      mode: this.mode,
      heat: this.policeSystem.getHeat(),
      actionPressed
    });

    if (result.type === 'none') return false;

    if (result.type === 'stage-complete') {
      this.registry.set('toast', 'Zwischenziel erreicht: ' + (result.nextStage?.label ?? 'weiter'));
      this.refreshMissionMarkers();
      void this.saveGame();
      return actionPressed;
    }

    if (result.type === 'mission-complete') {
      const credits = Number(this.registry.get('credits') ?? 500);
      this.registry.set('credits', credits + result.mission.rewardCredits);
      this.reputation[result.mission.faction] = Math.max(
        -100,
        Math.min(100, this.reputation[result.mission.faction] + result.mission.rewardReputation)
      );
      const factionName = FACTIONS[result.mission.faction].shortName;
      const tier = reputationTier(this.reputation[result.mission.faction]);
      this.registry.set(
        'toast',
        result.mission.title + ' geschafft · +' + result.mission.rewardCredits +
          ' CR · ' + factionName + ': ' + tier
      );
      this.refreshMissionMarkers();
      void this.saveGame();
      return actionPressed;
    }

    return false;
  }

  private getNearestPoliceDistance(): number {
    const actor = this.mode === 'vehicle' ? this.car : this.player;
    let best = Number.POSITIVE_INFINITY;

    for (const agent of this.traffic) {
      if (!agent.police) continue;
      const distance = Phaser.Math.Distance.Between(actor.x, actor.y, agent.sprite.x, agent.sprite.y);
      if (distance < best) best = distance;
    }

    return best;
  }

  private handlePoliceControl(): void {
    const result = this.policeSystem.resolveControl();
    const credits = Math.max(0, Number(this.registry.get('credits') ?? 500));
    const fine = Math.min(credits, 30 + result.previousLevel * 20);
    this.registry.set('credits', credits - fine);
    this.carSpeed = 0;

    if (result.remainingHeat <= 0) {
      this.registry.set('toast', 'Kontrolle beendet · ' + fine + ' CR Verwarnung · Aufmerksamkeit 0');
    } else {
      this.registry.set(
        'toast',
        'Kontrolle · ' + fine + ' CR Verwarnung · Restaufmerksamkeit ' + Math.ceil(result.remainingHeat)
      );
    }

    void this.saveGame();
  }

  private updateToast(): void {
    const toast = String(this.registry.get('toast') ?? '');
    if (!toast) return;
    this.registry.set('toast', '');
    this.toastText.setText(toast).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 500, onComplete: () => this.toastText.setVisible(false) });
  }

  private spawnRandomCityEvent(): void {
    if (this.currentEvent) return;

    const events = [
      { x: 760, y: 1020, label: 'Verlorenes Paket gefunden', reward: 18 },
      { x: 2050, y: 1040, label: 'Tourist braucht eine Wegauskunft', reward: 12 },
      { x: 2630, y: 1790, label: 'Kleine Lieferpanne lösen', reward: 20 },
      { x: 760, y: 1790, label: 'Marktstand beim Tragen helfen', reward: 16 }
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    const marker = this.add.circle(event.x, event.y, 25, 0xf1c74b, 0.95).setStrokeStyle(4, 0xffffff, 0.8).setDepth(40);
    const text = this.add.text(event.x, event.y - 42, '!', { fontFamily: 'system-ui', fontSize: '25px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setDepth(41);

    this.currentEvent = { ...event, marker, text };
    this.registry.set('toast', 'In Westend ist etwas passiert – halte nach dem ! Ausschau.');

    this.time.delayedCall(26000, () => {
      if (!this.currentEvent || this.currentEvent.marker !== marker) return;
      marker.destroy();
      text.destroy();
      this.currentEvent = null;
    });
  }

  private onResumeFromInterior(): void {
    this.registry.set('vehicleCondition', Phaser.Math.Clamp(Number(this.registry.get('vehicleCondition') ?? 100), 0, 100));
    this.registry.set('ownedVehicleIds', sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds')));
    this.applyActiveVehicleProfile();
    void this.saveGame();
  }

  private applyActiveVehicleProfile(): void {
    if (!this.car) return;
    const owned = sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'));
    const requested = getVehicleProfile(this.registry.get('currentVehicleId')).id;
    const activeId = owned.includes(requested) ? requested : 'city_compact';
    const profile = getVehicleProfile(activeId);
    this.registry.set('currentVehicleId', profile.id);
    this.registry.set('ownedVehicleIds', owned);
    this.car.setTexture('vehicle-' + profile.id);
    this.car.setDisplaySize(profile.width, profile.height);
    const body = this.car.body as Phaser.Physics.Arcade.Body;
    body.setSize(profile.width * 0.82, profile.height * 0.78, true);
    this.carSpeed = Phaser.Math.Clamp(this.carSpeed, -profile.maxReverse, profile.maxForward);
  }

  private layoutHud(): void {
    if (!this.actionButton) return;
    if (this.joystickPointerId !== null) this.resetTransientInput();

    const width = Math.max(320, this.scale.width);
    const height = Math.max(240, this.scale.height);
    const actionX = width - Math.max(78, width * 0.075);
    const actionY = height - Math.max(82, height * 0.12);
    this.actionGlow.setPosition(actionX + 5, actionY + 6);
    this.actionButton.setPosition(actionX, actionY);
    this.actionLabel.setPosition(actionX, actionY);
    const radioX = width - Math.max(76, width * 0.065);
    const radioY = width < 700 ? 108 : 130;
    this.radioShadow?.setPosition(radioX + 4, radioY + 5);
    this.radioButton?.setPosition(radioX, radioY);
    this.radioLabel?.setPosition(radioX, radioY);
    this.toastText.setPosition(width / 2, Math.max(95, height * 0.13));
    if (this.minimapContainer) {
      const compactMap = width < 700;
      this.minimapContainer
        .setScale(compactMap ? 0.78 : 1)
        .setPosition(
          width - (compactMap ? 86 : 110),
          Math.max(compactMap ? 52 : 64, height * 0.09)
        );
    }

    const compact = width < 700;
    const textScale = this.appSettings.textScale;
    this.hintText
      .setFontSize(Math.round((compact ? 13 : 16) * textScale))
      .setWordWrapWidth(Math.max(180, Math.min(540, width - 36)), true);
    this.toastText
      .setFontSize(Math.round((compact ? 14 : 16) * textScale))
      .setWordWrapWidth(Math.max(180, Math.min(620, width * 0.82)), true);
    const hudWidth = Math.max(180, Math.min(620, width - 36));
    this.statusText
      .setFontSize(Math.round((compact ? 10 : 14) * textScale))
      .setFixedSize(compact ? hudWidth : 0, 0)
      .setWordWrapWidth(hudWidth, true);
    this.missionHudText
      .setFontSize(Math.round((compact ? 11 : 14) * textScale))
      .setFixedSize(compact ? hudWidth : 0, 0)
      .setWordWrapWidth(hudWidth, true);
  }

  private finiteClamp(value: number, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Phaser.Math.Clamp(value, min, max);
  }

  private async restoreGame(): Promise<void> {
    const save = await SaveSystem.load();
    if (!save || !this.scene.isActive()) return;

    const credits = Math.floor(this.finiteClamp(save.credits, 0, 999999999, 500));
    const condition = this.finiteClamp(save.vehicle.condition, 0, 100, 100);
    const carX = this.finiteClamp(save.vehicle.x, 30, WORLD_WIDTH - 30, 1600);
    const carY = this.finiteClamp(save.vehicle.y, 30, WORLD_HEIGHT - 30, 825);
    const playerX = this.finiteClamp(save.player.x, 30, WORLD_WIDTH - 30, 1420);
    const playerY = this.finiteClamp(save.player.y, 30, WORLD_HEIGHT - 30, 810);
    const rotation = Number.isFinite(save.vehicle.rotation) ? Phaser.Math.Angle.Wrap(save.vehicle.rotation) : 0;

    this.registry.set('credits', credits);
    this.registry.set('vehicleCondition', condition);
    this.registry.set('mapUnlocked', save.mapUnlocked === true);
    this.collectedCollectibles = new Set(sanitizeCollectedIds(save.collectibles));
    this.refreshCollectibles();
    this.registry.set('ownedVehicleIds', sanitizeOwnedVehicles(save.garage.ownedVehicleIds));
    this.registry.set('currentVehicleId', getVehicleProfile(save.garage.currentVehicleId).id);
    this.applyActiveVehicleProfile();
    this.reputation = sanitizeReputation(save.reputation);
    this.policeSystem.setHeat(save.heat);
    this.missionSystem.load(save.missions);
    this.refreshMissionMarkers();
    this.car.setPosition(carX, carY).setRotation(rotation);
    this.carSpeed = 0;

    if (save.mode === 'vehicle') {
      this.mode = 'vehicle';
      this.player.setPosition(carX, carY).setVelocity(0, 0).setVisible(false).setActive(false);
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
      this.cameras.main.startFollow(this.car, true, 0.08, 0.08);
    } else {
      this.mode = 'on-foot';
      let safePlayer = new Phaser.Math.Vector2(playerX, playerY);
      if (Phaser.Math.Distance.Between(playerX, playerY, carX, carY) < 58) safePlayer = this.findSafeExitPosition();
      (this.player.body as Phaser.Physics.Arcade.Body).enable = true;
      this.player.setPosition(safePlayer.x, safePlayer.y).setVelocity(0, 0).setVisible(true).setActive(true);
      this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    }

    this.registry.set('toast', 'Spielstand geladen.');
  }

  private async saveGame(): Promise<void> {
    if (!this.player || !this.car) return;

    const data: FreistadtSaveData = {
      version: 4,
      credits: Math.floor(this.finiteClamp(Number(this.registry.get('credits') ?? 500), 0, 999999999, 500)),
      mapUnlocked: this.registry.get('mapUnlocked') === true,
      mode: this.mode,
      player: {
        x: this.finiteClamp(this.player.x, 30, WORLD_WIDTH - 30, 1420),
        y: this.finiteClamp(this.player.y, 30, WORLD_HEIGHT - 30, 810)
      },
      vehicle: {
        x: this.finiteClamp(this.car.x, 30, WORLD_WIDTH - 30, 1600),
        y: this.finiteClamp(this.car.y, 30, WORLD_HEIGHT - 30, 825),
        rotation: Number.isFinite(this.car.rotation) ? Phaser.Math.Angle.Wrap(this.car.rotation) : 0,
        condition: this.finiteClamp(Number(this.registry.get('vehicleCondition') ?? 100), 0, 100, 100)
      },
      garage: {
        currentVehicleId: getVehicleProfile(this.registry.get('currentVehicleId')).id,
        ownedVehicleIds: sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'))
      },
      collectibles: sanitizeCollectedIds([...this.collectedCollectibles]),
      reputation: sanitizeReputation(this.reputation),
      heat: this.policeSystem.getHeat(),
      missions: this.missionSystem.snapshot(),
      timestamp: Date.now()
    };

    await SaveSystem.save(data);
  }

  private installDebugBridge(): void {
    if (!new URLSearchParams(window.location.search).has('test')) return;

    const scene = this;
    (window as unknown as { __FREISTADT_TEST__?: unknown }).__FREISTADT_TEST__ = {
      snapshot() {
        return {
          mode: scene.mode,
          player: { x: scene.player.x, y: scene.player.y, visible: scene.player.visible },
          car: { x: scene.car.x, y: scene.car.y, rotation: scene.car.rotation, speed: scene.carSpeed },
          credits: Number(scene.registry.get('credits') ?? 0),
          condition: Number(scene.registry.get('vehicleCondition') ?? 0),
          damageStage: scene.getVehicleDamageStage(Number(scene.registry.get('vehicleCondition') ?? 100)).label,
          tireMarkCount: scene.tireMarks.length,
          mapUnlocked: scene.registry.get('mapUnlocked') === true,
          currentVehicleId: scene.registry.get('currentVehicleId'),
          ownedVehicleIds: sanitizeOwnedVehicles(scene.registry.get('ownedVehicleIds')),
          collectibles: [...scene.collectedCollectibles],
          heat: scene.policeSystem.getHeat(),
          policeState: scene.policeSystem.getState(),
          reputation: { ...scene.reputation },
          missions: scene.missionSystem.snapshot(),
          activeMission: scene.missionSystem.getActiveMission()?.id ?? null,
          activeStage: scene.missionSystem.getActiveStage()?.label ?? null,
          activeStageType: scene.missionSystem.getActiveStage()?.type ?? null,
          trafficCount: scene.traffic.length,
          pedestrianCount: scene.pedestrians.length,
          trafficPositions: scene.traffic.map((agent) => [Math.round(agent.sprite.x), Math.round(agent.sprite.y)]),
          pedestrianPositions: scene.pedestrians.map((agent) => [Math.round(agent.sprite.x), Math.round(agent.sprite.y)]),
          hud: {
            hintX: scene.hintText.x,
            hintY: scene.hintText.y,
            hintWidth: scene.hintText.width,
            hintHeight: scene.hintText.height,
            statusX: scene.statusText.x,
            statusY: scene.statusText.y,
            statusWidth: scene.statusText.width,
            statusHeight: scene.statusText.height,
            actionX: scene.actionButton.x,
            actionY: scene.actionButton.y,
            actionRadius: scene.actionButton.radius
          }
        };
      },
      teleportPlayer(x: number, y: number) {
        scene.mode = 'on-foot';
        scene.lastActionAt = -1000;
        scene.lastActionDown = false;
        (scene.player.body as Phaser.Physics.Arcade.Body).enable = true;
        scene.player.setVisible(true).setActive(true);
        scene.player.setPosition(
          scene.finiteClamp(x, 30, WORLD_WIDTH - 30, 1420),
          scene.finiteClamp(y, 30, WORLD_HEIGHT - 30, 810)
        );
        scene.cameras.main.startFollow(scene.player, true, 0.09, 0.09);
      },
      teleportCar(x: number, y: number) {
        scene.car.setPosition(
          scene.finiteClamp(x, 30, WORLD_WIDTH - 30, 1600),
          scene.finiteClamp(y, 30, WORLD_HEIGHT - 30, 825)
        );
      },
      action() {
        scene.performAction();
      },
      setCarSpeed(speed: number) {
        scene.carSpeed = scene.finiteClamp(speed, -230, 610, 0);
      },
      setCondition(condition: number) {
        scene.registry.set('vehicleCondition', scene.finiteClamp(condition, 0, 100, 100));
      },
      setCredits(credits: number) {
        scene.registry.set('credits', Math.floor(scene.finiteClamp(credits, 0, 999999999, 500)));
      },
      setHeat(heat: number) {
        scene.policeSystem.setHeat(scene.finiteClamp(heat, 0, 100, 0));
      },
      teleportPoliceNearActor(distance = 60) {
        const actor = scene.mode === 'vehicle' ? scene.car : scene.player;
        const police = scene.traffic.find((agent) => agent.police);
        if (!police) return false;
        police.sprite.setPosition(
          scene.finiteClamp(actor.x + distance, 20, WORLD_WIDTH - 20, actor.x + 60),
          actor.y
        );
        if (police.label) police.label.setPosition(police.sprite.x, police.sprite.y);
        return true;
      },
      teleportPoliceFar() {
        const police = scene.traffic.find((agent) => agent.police);
        if (!police) return false;
        police.sprite.setPosition(80, 80);
        if (police.label) police.label.setPosition(police.sprite.x, police.sprite.y);
        return true;
      },
      teleportToMissionTarget() {
        scene.lastActionAt = -1000;
        scene.lastActionDown = false;
        const stage = scene.missionSystem.getActiveStage();
        if (!stage || typeof stage.x !== 'number' || typeof stage.y !== 'number') return false;
        if (scene.mode === 'vehicle') {
          scene.car.setPosition(stage.x, stage.y);
        } else {
          scene.player.setPosition(stage.x, stage.y);
        }
        return true;
      },
      async save() {
        await scene.saveGame();
      },
      spawnEvent() {
        scene.spawnRandomCityEvent();
      },
      fastForward(seconds: number) {
        const safeSeconds = scene.finiteClamp(seconds, 0, 1200, 0);
        const steps = Math.floor(safeSeconds * 30);
        let simulatedTime = scene.time.now;

        for (let i = 0; i < steps; i += 1) {
          simulatedTime += 1000 / 30;
          if (i > 0 && i % 210 === 0) scene.horizontalSignalGreen = !scene.horizontalSignalGreen;
          scene.updateTraffic(simulatedTime, 1 / 30);
          scene.updatePedestrians(simulatedTime, 1 / 30);
        }
      }
    };
  }

  private removeDebugBridge(): void {
    delete (window as unknown as { __FREISTADT_TEST__?: unknown }).__FREISTADT_TEST__;
  }
}

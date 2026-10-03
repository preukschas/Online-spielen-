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

const WORLD_WIDTH = 3200;
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
  sprite: Phaser.GameObjects.Rectangle;
  route: Phaser.Math.Vector2[];
  routeIndex: number;
  speed: number;
  color: number;
  label?: Phaser.GameObjects.Text;
  police?: boolean;
};

type PedestrianAgent = {
  sprite: Phaser.GameObjects.Arc;
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

  private actionButton!: Phaser.GameObjects.Arc;
  private actionLabel!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private missionHudText!: Phaser.GameObjects.Text;
  private missionBoard!: Phaser.GameObjects.Arc;
  private missionBoardLabel!: Phaser.GameObjects.Text;
  private missionTargetMarker?: Phaser.GameObjects.Arc;
  private missionTargetLabel?: Phaser.GameObjects.Text;

  private readonly missionSystem = new MissionSystem();
  private readonly policeSystem = new PoliceSystem();
  private reputation: ReputationState = createDefaultReputation();
  private appSettings: AppSettings = SettingsSystem.load();

  private doors: DoorPoint[] = [];
  private buildingRects: Phaser.GameObjects.Rectangle[] = [];
  private traffic: TrafficAgent[] = [];
  private pedestrians: PedestrianAgent[] = [];
  private currentEvent: CityEvent | null = null;

  private carSpeed = 0;
  private lastActionDown = false;
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

    this.player = this.physics.add.sprite(1420, 810, 'freistadt-player');
    this.player.setCollideWorldBounds(true).setDepth(30);

    this.car = this.physics.add.sprite(1600, 825, 'freistadt-car');
    this.car.setCollideWorldBounds(true).setDepth(28).setDrag(250, 250);
    this.setupBuildingCollisions();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,SHIFT') as Record<string, Phaser.Input.Keyboard.Key> | undefined;

    this.createHud();
    this.createPhaseThreeMarkers();
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
    this.updateCamera();
    this.updateHint();
    this.updateStatus();
    this.updateToast();
  }

  private ensureRegistryDefaults(): void {
    if (this.registry.get('credits') === undefined) this.registry.set('credits', 500);
    if (this.registry.get('vehicleCondition') === undefined) this.registry.set('vehicleCondition', 100);
    if (this.registry.get('mapUnlocked') === undefined) this.registry.set('mapUnlocked', false);
    if (this.registry.get('toast') === undefined) this.registry.set('toast', '');
  }

  private createTextures(): void {
    if (!this.textures.exists('freistadt-player')) {
      const g = this.add.graphics();
      g.fillStyle(0xf7f7f2, 1);
      g.fillCircle(17, 17, 14);
      g.lineStyle(4, 0x15222c, 1);
      g.strokeCircle(17, 17, 14);
      g.fillStyle(0x2c83b6, 1);
      g.fillTriangle(17, 3, 25, 17, 9, 17);
      g.generateTexture('freistadt-player', 34, 34);
      g.destroy();
    }

    if (!this.textures.exists('freistadt-car')) {
      const g = this.add.graphics();
      g.fillStyle(0xf0a23a, 1);
      g.fillRoundedRect(2, 3, 78, 38, 10);
      g.fillStyle(0x263b4c, 1);
      g.fillRoundedRect(25, 7, 32, 30, 7);
      g.fillStyle(0xf7f3dd, 1);
      g.fillRect(70, 8, 8, 8);
      g.fillRect(70, 28, 8, 8);
      g.generateTexture('freistadt-car', 82, 44);
      g.destroy();
    }
  }

  private buildCity(): void {
    const g = this.add.graphics();
    g.fillStyle(0x6d966b, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

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

    this.addBuilding(480, 330, 620, 360, 0xb86f56, 'Werkstatt Westend', 'workshop');
    this.addBuilding(1650, 320, 650, 350, 0x8e6f9d, 'Café Freiraum', 'cafe');
    this.addBuilding(2830, 330, 420, 320, 0x5f8ba8, 'Kiosk 24', 'kiosk');
    this.addBuilding(480, 1210, 620, 340, 0x557a91, 'Polizeistation', 'police');
    this.addBuilding(1650, 1210, 700, 350, 0x8b806d, 'Westend Bahnhof', 'station');
    this.addBuilding(2830, 1210, 430, 320, 0xb28d55, 'Eigene Garage', 'garage');

    // Südlicher Park als belebter Kontrast zu den Gebäuden.
    this.add.rectangle(1580, 1970, 980, 320, 0x4f8558, 1).setStrokeStyle(8, 0x376340).setDepth(2);
    this.add.text(1580, 1970, 'WESTEND-PARK', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#e7f3e7'
    }).setOrigin(0.5).setDepth(3);

    this.add.text(65, 715, 'WESTEND · FREISTADT', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#17212acc',
      padding: { x: 14, y: 8 }
    }).setDepth(10);
  }

  private drawCrosswalk(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xf0f0e8, 0.78);
    for (let i = -3; i <= 3; i += 1) {
      g.fillRect(x - 75 + i * 22, y - 135, 12, 270);
    }
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
    const rect = this.add.rectangle(x, y, width, height, color, 1)
      .setStrokeStyle(8, 0x26343d, 0.9)
      .setDepth(8);

    this.physics.add.existing(rect, true);

    this.add.text(x, y - height * 0.20, name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width * 0.82 }
    }).setOrigin(0.5).setDepth(9);

    const doorY = y + height / 2 + 23;
    const marker = this.add.rectangle(x, doorY, 70, 34, 0x1f7a58, 0.95)
      .setStrokeStyle(3, 0xffffff, 0.75)
      .setDepth(12);

    this.add.text(x, doorY, 'TÜR', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(13);

    this.doors.push({ x, y: doorY, placeId, placeName: name, marker });
    this.buildingRects.push(rect);
  }

  private setupBuildingCollisions(): void {
    for (const rect of this.buildingRects) {
      this.physics.add.collider(this.player, rect);
      this.physics.add.collider(this.car, rect, () => this.damageVehicleFromImpact());
    }
  }

  private createTrafficSignal(): void {
    const horizontal = this.add.circle(2292, 735, 14, 0x4caf50, 1).setDepth(20);
    const vertical = this.add.circle(2400, 735, 14, 0xe14b4b, 1).setDepth(20);

    this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        horizontal.setFillStyle(this.horizontalSignalGreen ? 0x4caf50 : 0xe14b4b, 1);
        vertical.setFillStyle(this.horizontalSignalGreen ? 0xe14b4b : 0x4caf50, 1);
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
        const sprite = this.add.rectangle(spawn.position.x, spawn.position.y, 54, 28, colors[i % colors.length], 1)
          .setStrokeStyle(2, 0x1e2a32, 0.8)
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
    const police = this.add.rectangle(policeSpawn.position.x, policeSpawn.position.y, 58, 30, 0x2d5d9a, 1)
      .setStrokeStyle(3, 0xffffff, 0.85)
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
    const oldCondition = Number(this.registry.get('vehicleCondition') ?? 100);
    const damage = Phaser.Math.Clamp(Math.abs(this.carSpeed) * 0.012, 1, 7);
    this.registry.set('vehicleCondition', Math.max(0, oldCondition - damage));
    this.policeSystem.addHeat(7);
    this.registry.set('toast', 'Zusammenstoß im Verkehr – Aufmerksamkeit steigt.');
    this.carSpeed *= 0.28;
  }

  private spawnPedestrians(): void {
    const routes: Phaser.Math.Vector2[][] = [
      [new Phaser.Math.Vector2(150, 620), new Phaser.Math.Vector2(850, 620), new Phaser.Math.Vector2(850, 1010), new Phaser.Math.Vector2(150, 1010)],
      [new Phaser.Math.Vector2(1320, 620), new Phaser.Math.Vector2(2100, 620), new Phaser.Math.Vector2(2100, 1010), new Phaser.Math.Vector2(1320, 1010)],
      [new Phaser.Math.Vector2(2550, 620), new Phaser.Math.Vector2(3080, 620), new Phaser.Math.Vector2(3080, 1010), new Phaser.Math.Vector2(2550, 1010)],
      [new Phaser.Math.Vector2(1280, 1790), new Phaser.Math.Vector2(2100, 1790), new Phaser.Math.Vector2(2100, 2110), new Phaser.Math.Vector2(1280, 2110)]
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
      const sprite = this.add.circle(spawn.position.x, spawn.position.y, 10, colors[i % colors.length], 1)
        .setStrokeStyle(2, 0x26343d, 0.8)
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
    this.actionButton = this.add.circle(1100, 600, actionRadius, 0x1f7a58, 0.90)
      .setStrokeStyle(4, 0xffffff, 0.70).setScrollFactor(0).setDepth(1000).setInteractive();
    this.actionLabel = this.add.text(1100, 600, 'AKTION', {
      fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', fontSize: '16px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.hintText = this.add.text(18, 18, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff',
      backgroundColor: '#0d1821d9', padding: { x: 12, y: 9 }
    }).setScrollFactor(0).setDepth(1000);

    this.statusText = this.add.text(18, 67, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '14px', color: '#dce8ef',
      backgroundColor: '#0d1821b8', padding: { x: 10, y: 7 }
    }).setScrollFactor(0).setDepth(1000);

    this.missionHudText = this.add.text(18, 112, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#fff4c7',
      backgroundColor: '#332a17d9', padding: { x: 10, y: 7 },
      wordWrap: { width: 520 }
    }).setScrollFactor(0).setDepth(1000);

    this.toastText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#1f7a58e8', padding: { x: 14, y: 9 }, align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1100).setVisible(false);

    this.actionButton.on('pointerdown', () => this.performAction());
  }

  private bindPointerControls(): void {
    this.input.addPointer(2);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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
    const condition = Phaser.Math.Clamp(Number(this.registry.get('vehicleCondition') ?? 100), 0, 100);
    const conditionRatio = condition / 100;
    const conditionFactor = condition <= 0 ? 0 : Phaser.Math.Linear(0.38, 1, conditionRatio);
    const maxForward = 610 * conditionFactor;
    const maxReverse = -230 * conditionFactor;

    if (throttle > 0.08) {
      this.carSpeed += 560 * conditionFactor * throttle * dt;
    } else if (throttle < -0.08) {
      if (this.carSpeed > 45) this.carSpeed += 760 * throttle * dt;
      else this.carSpeed += 350 * throttle * dt;
    } else {
      const resistance = 270 * dt;
      if (Math.abs(this.carSpeed) <= resistance) {
        this.carSpeed = 0;
      } else {
        this.carSpeed -= Math.sign(this.carSpeed) * resistance;
      }
    }

    this.carSpeed = Phaser.Math.Clamp(this.carSpeed, maxReverse, maxForward);
    const speedRatio = Phaser.Math.Clamp(Math.abs(this.carSpeed) / 610, 0, 1);
    const steeringStrength = Phaser.Math.Linear(2.65, 1.35, speedRatio);
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
    const oldCondition = Number(this.registry.get('vehicleCondition') ?? 100);
    const damage = Phaser.Math.Clamp(Math.abs(this.carSpeed) * 0.018, 2, 10);
    this.registry.set('vehicleCondition', Math.max(0, oldCondition - damage));
    this.policeSystem.addHeat(4);
    this.registry.set('toast', 'Fahrzeug beschädigt – Werkstatt kann helfen.');
    this.carSpeed *= -0.18;
  }

  private updateActionInput(): void {
    const eDown = Boolean(this.keys?.E?.isDown);
    if (eDown && !this.lastActionDown) this.performAction();
    this.lastActionDown = eDown;
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
    const base = compactHud
      ? 'CR ' + credits + ' · AUTO ' + condition + '% · A ' + heatLevel + '/5 · ' + stateLabel
      : 'CR ' + credits + ' · AUTO ' + condition + '% · AUFMERKSAMKEIT ' + heatLevel + '/5 · ' + stateLabel;
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
    void this.saveGame();
  }

  private layoutHud(): void {
    if (!this.actionButton) return;
    if (this.joystickPointerId !== null) this.resetTransientInput();

    const width = Math.max(320, this.scale.width);
    const height = Math.max(240, this.scale.height);
    const actionX = width - Math.max(78, width * 0.075);
    const actionY = height - Math.max(82, height * 0.12);
    this.actionButton.setPosition(actionX, actionY);
    this.actionLabel.setPosition(actionX, actionY);
    this.toastText.setPosition(width / 2, Math.max(95, height * 0.13));

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
      version: 3,
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
          mapUnlocked: scene.registry.get('mapUnlocked') === true,
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

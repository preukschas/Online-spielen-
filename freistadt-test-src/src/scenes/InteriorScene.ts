import Phaser from 'phaser';
import { VEHICLES, getVehicleProfile, sanitizeOwnedVehicles } from '../data/vehicles';

type InteriorData = {
  placeId?: string;
  placeName?: string;
};

export class InteriorScene extends Phaser.Scene {
  private placeId = 'generic';
  private placeName = 'Gebäude';
  private lastActionAt = -1000;
  private selectedVehicleIndex = 0;

  constructor() {
    super('InteriorScene');
  }

  create(data: InteriorData): void {
    this.placeId = data.placeId ?? 'generic';
    this.placeName = data.placeName ?? 'Gebäude';
    const currentVehicle = getVehicleProfile(this.registry.get('currentVehicleId'));
    this.selectedVehicleIndex = Math.max(0, VEHICLES.findIndex((vehicle) => vehicle.id === currentVehicle.id));

    const { width, height } = this.scale;
    const palette = this.getInteriorPalette();
    this.cameras.main.setBackgroundColor(palette.background);

    this.drawInteriorBackdrop(width, height, palette);

    this.add.text(width / 2 + 2, Math.max(54, height * 0.10) + 3, this.placeName, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(28, Math.min(50, width * 0.045)) + 'px',
      fontStyle: 'bold',
      color: '#05090c',
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.32);

    const title = this.add.text(width / 2, Math.max(54, height * 0.10), this.placeName, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(28, Math.min(50, width * 0.045)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    title.setShadow(0, 3, '#000000', 5, true, true);

    this.add.rectangle(width / 2, Math.max(110, height * 0.21), Math.min(780, width * 0.86), 72, 0x0e171d, 0.72)
      .setStrokeStyle(2, palette.accent, 0.62);

    this.add.text(width / 2, Math.max(110, height * 0.21), this.getDescription(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(16, Math.min(23, width * 0.022)) + 'px',
      color: '#d9e6ed',
      align: 'center',
      wordWrap: { width: Math.min(760, width * 0.84) }
    }).setOrigin(0.5);

    this.addInteriorAction(width, height);

    this.add.rectangle(width / 2 + 5, height - Math.max(65, height * 0.12) + 6, 236, 58, 0x05090c, 0.28);

    const exit = this.add.rectangle(width / 2, height - Math.max(65, height * 0.12), 236, 58, palette.accent, 1)
      .setStrokeStyle(3, 0xffffff, 0.68)
      .setInteractive({ useHandCursor: true });

    this.add.text(exit.x, exit.y, 'Zurück auf die Straße', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    exit.on('pointerdown', () => this.leave());
    this.input.keyboard?.once('keydown-ESC', () => this.leave());

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private addInteriorAction(width: number, height: number): void {
    const makeButton = (
      y: number,
      label: string,
      color: number,
      onClick: () => void
    ): Phaser.GameObjects.Rectangle => {
      const buttonWidth = Math.min(420, width * 0.75);
      this.add.rectangle(width / 2 + 5, y + 6, buttonWidth, 64, 0x05090c, 0.26);
      const button = this.add.rectangle(width / 2, y, buttonWidth, 64, color, 1)
        .setStrokeStyle(3, 0xffffff, 0.48)
        .setInteractive({ useHandCursor: true });
      this.add.rectangle(width / 2 - buttonWidth * 0.46, y, 7, 42, 0xf3d25e, 0.92);

      const labelText = this.add.text(button.x, button.y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);

      button.on('pointerdown', () => {
        const now = this.time.now;
        if (now - this.lastActionAt < 280) return;
        this.lastActionAt = now;
        onClick();

        if (this.placeId === 'workshop') {
          labelText.setText(this.getActionLabel());
        }
      });

      return button;
    };

    if (this.placeId === 'workshop') {
      makeButton(height * 0.48, this.getActionLabel(), 0xa55f2a, () => {
        const currentCredits = Number(this.registry.get('credits') ?? 500);
        const currentCondition = Number(this.registry.get('vehicleCondition') ?? 100);

        if (currentCondition >= 99) {
          this.registry.set('toast', 'Das Fahrzeug ist bereits in Ordnung.');
          return;
        }

        if (currentCredits < 120) {
          this.registry.set('toast', 'Nicht genug Credits für die Reparatur.');
          return;
        }

        this.registry.set('credits', currentCredits - 120);
        this.registry.set('vehicleCondition', 100);
        this.registry.set('toast', 'Fahrzeug vollständig repariert.');
      });
      return;
    }

    if (this.placeId === 'cafe') {
      makeButton(height * 0.48, 'Kaffee & Snack – 4 Credits', 0x8a5b3e, () => {
        const currentCredits = Number(this.registry.get('credits') ?? 500);
        if (currentCredits >= 4) {
          this.registry.set('credits', currentCredits - 4);
          this.registry.set('toast', 'Kurze Pause gemacht.');
        } else {
          this.registry.set('toast', 'Dafür fehlen dir Credits.');
        }
      });
      return;
    }

    if (this.placeId === 'kiosk') {
      const alreadyUnlocked = this.registry.get('mapUnlocked') === true;
      makeButton(
        height * 0.48,
        alreadyUnlocked ? 'Stadtplan bereits gekauft' : 'Stadtplan – 10 Credits',
        0x557a99,
        () => {
          if (this.registry.get('mapUnlocked') === true) {
            this.registry.set('toast', 'Den Stadtplan besitzt du bereits.');
            return;
          }

          const currentCredits = Number(this.registry.get('credits') ?? 500);
          if (currentCredits >= 10) {
            this.registry.set('credits', currentCredits - 10);
            this.registry.set('mapUnlocked', true);
            this.registry.set('toast', 'Stadtplan gekauft.');
          } else {
            this.registry.set('toast', 'Dafür fehlen dir Credits.');
          }
        }
      );
      return;
    }

    if (this.placeId === 'dealer') {
      const vehicleInfo = this.add.text(width / 2, height * 0.39, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#f6ead1',
        align: 'center',
        wordWrap: { width: Math.min(720, width * 0.84) }
      }).setOrigin(0.5);

      const previous = this.add.rectangle(width * 0.32, height * 0.50, 145, 54, 0x485865, 1)
        .setStrokeStyle(2, 0xffffff, 0.45).setInteractive({ useHandCursor: true });
      const next = this.add.rectangle(width * 0.68, height * 0.50, 145, 54, 0x485865, 1)
        .setStrokeStyle(2, 0xffffff, 0.45).setInteractive({ useHandCursor: true });
      this.add.text(previous.x, previous.y, '← Vorheriges', { fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(next.x, next.y, 'Nächstes →', { fontFamily: 'system-ui', fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);

      const action = this.add.rectangle(width / 2, height * 0.62, Math.min(420, width * 0.75), 64, 0x725ca5, 1)
        .setStrokeStyle(3, 0xffffff, 0.55).setInteractive({ useHandCursor: true });
      const actionText = this.add.text(action.x, action.y, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff', align: 'center'
      }).setOrigin(0.5);

      const refresh = (): void => {
        const profile = VEHICLES[this.selectedVehicleIndex];
        const owned = sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'));
        const current = getVehicleProfile(this.registry.get('currentVehicleId')).id;
        const speed = Math.round(profile.maxForward * 0.22);
        vehicleInfo.setText(
          profile.name + '\n~' + speed + ' km/h · Beschleunigung ' + profile.acceleration +
          ' · Lenkung ' + profile.steeringLow.toFixed(1)
        );
        actionText.setText(
          owned.includes(profile.id)
            ? current === profile.id
              ? 'Aktiv'
              : 'Als Fahrzeug wählen'
            : 'Kaufen – ' + profile.price + ' Credits'
        );
      };

      previous.on('pointerdown', () => {
        this.selectedVehicleIndex = (this.selectedVehicleIndex - 1 + VEHICLES.length) % VEHICLES.length;
        refresh();
      });
      next.on('pointerdown', () => {
        this.selectedVehicleIndex = (this.selectedVehicleIndex + 1) % VEHICLES.length;
        refresh();
      });
      action.on('pointerdown', () => {
        const now = this.time.now;
        if (now - this.lastActionAt < 280) return;
        this.lastActionAt = now;

        const profile = VEHICLES[this.selectedVehicleIndex];
        const owned = sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'));
        const currentCredits = Math.max(0, Number(this.registry.get('credits') ?? 500));

        if (!owned.includes(profile.id)) {
          if (currentCredits < profile.price) {
            this.registry.set('toast', 'Nicht genug Credits für ' + profile.name + '.');
            return;
          }
          owned.push(profile.id);
          this.registry.set('ownedVehicleIds', sanitizeOwnedVehicles(owned));
          this.registry.set('credits', currentCredits - profile.price);
          this.registry.set('currentVehicleId', profile.id);
          this.registry.set('vehicleCondition', 100);
          this.registry.set('toast', profile.name + ' gekauft und bereitgestellt.');
        } else {
          this.registry.set('currentVehicleId', profile.id);
          this.registry.set('toast', profile.name + ' ist jetzt dein aktives Fahrzeug.');
        }
        refresh();
      });

      refresh();
      return;
    }

    if (this.placeId === 'garage') {
      const owned = sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'));
      const info = this.add.text(width / 2, height * 0.39, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#d9e6ed',
        align: 'center',
        wordWrap: { width: Math.min(720, width * 0.84) }
      }).setOrigin(0.5);

      let ownedIndex = Math.max(0, owned.findIndex((id) => id === getVehicleProfile(this.registry.get('currentVehicleId')).id));
      const cycle = makeButton(height * 0.52, 'Nächstes eigenes Fahrzeug', 0x5a6f80, () => {
        const latestOwned = sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'));
        ownedIndex = (ownedIndex + 1) % latestOwned.length;
        const profile = getVehicleProfile(latestOwned[ownedIndex]);
        this.registry.set('currentVehicleId', profile.id);
        this.registry.set('toast', profile.name + ' aus der Garage gewählt.');
        updateInfo();
      });

      const updateInfo = (): void => {
        const latestOwned = sanitizeOwnedVehicles(this.registry.get('ownedVehicleIds'));
        const profile = getVehicleProfile(this.registry.get('currentVehicleId'));
        const condition = Math.round(Number(this.registry.get('vehicleCondition') ?? 100));
        info.setText('Aktiv: ' + profile.name + '\nZustand: ' + condition + '% · Eigene Fahrzeuge: ' + latestOwned.length);
      };

      cycle.setAlpha(owned.length > 1 ? 1 : 0.7);
      updateInfo();
      return;
    }

    if (this.placeId === 'supermarket') {
      makeButton(height * 0.48, 'Proviant – 12 Credits', 0x5d805e, () => {
        const currentCredits = Number(this.registry.get('credits') ?? 500);
        if (currentCredits >= 12) {
          this.registry.set('credits', currentCredits - 12);
          this.registry.set('toast', 'Proviant für die nächste Stadtrunde gekauft.');
        } else {
          this.registry.set('toast', 'Dafür fehlen dir Credits.');
        }
      });
      return;
    }

    if (this.placeId === 'harbor-cafe') {
      makeButton(height * 0.48, 'Kai-Pause – 6 Credits', 0x8c654e, () => {
        const currentCredits = Number(this.registry.get('credits') ?? 500);
        if (currentCredits >= 6) {
          this.registry.set('credits', currentCredits - 6);
          this.registry.set('toast', 'Pause am Ostkai gemacht.');
        } else {
          this.registry.set('toast', 'Dafür fehlen dir Credits.');
        }
      });
      return;
    }

    if (this.placeId === 'police') {
      this.add.text(width / 2, height * 0.48, 'Die Streife ist unterwegs. Hier beginnen später Kontroll- und Fahndungsmechaniken.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#bcd4e7',
        align: 'center',
        wordWrap: { width: Math.min(700, width * 0.8) }
      }).setOrigin(0.5);
      return;
    }

    this.add.text(width / 2, height * 0.48, 'Dieser Ort ist bereits betretbar und wird in den nächsten Ausbaustufen weiter vertieft.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#bcd4e7',
      align: 'center',
      wordWrap: { width: Math.min(700, width * 0.8) }
    }).setOrigin(0.5);
  }

  private getInteriorPalette(): { background: string; floor: number; panel: number; accent: number } {
    const palettes: Record<string, { background: string; floor: number; panel: number; accent: number }> = {
      workshop: { background: '#20262b', floor: 0x333b40, panel: 0x222b31, accent: 0xf0a04b },
      cafe: { background: '#251f28', floor: 0x3b3039, panel: 0x2b232d, accent: 0xe6b2d2 },
      kiosk: { background: '#182933', floor: 0x29424e, panel: 0x203640, accent: 0x75c7e8 },
      dealer: { background: '#211d2d', floor: 0x352d48, panel: 0x292137, accent: 0xb999f4 },
      garage: { background: '#27251f', floor: 0x3a3830, panel: 0x2d2b25, accent: 0xe0aa55 },
      supermarket: { background: '#1d2920', floor: 0x304033, panel: 0x263328, accent: 0x8fd08e },
      'metro-depot': { background: '#18282d', floor: 0x2b4248, panel: 0x20363b, accent: 0x70c4d6 },
      'harbor-cafe': { background: '#2a211d', floor: 0x43342d, panel: 0x332721, accent: 0xe2aa83 },
      police: { background: '#17232d', floor: 0x293b49, panel: 0x20313d, accent: 0x73a5d0 },
      station: { background: '#29261f', floor: 0x3d3930, panel: 0x312d26, accent: 0xd0b06b }
    };
    return palettes[this.placeId] ?? { background: '#1b2630', floor: 0x2a3944, panel: 0x22313b, accent: 0x7eb9ca };
  }

  private drawInteriorBackdrop(
    width: number,
    height: number,
    palette: { floor: number; panel: number; accent: number }
  ): void {
    this.add.rectangle(width / 2, height / 2, width, height, palette.floor, 1).setScrollFactor(0);

    const floor = this.add.graphics().setScrollFactor(0);
    floor.lineStyle(2, 0xffffff, 0.045);
    const tile = Math.max(44, Math.min(78, width * 0.07));
    for (let x = 0; x < width; x += tile) floor.lineBetween(x, height * 0.30, x, height);
    for (let y = height * 0.30; y < height; y += tile) floor.lineBetween(0, y, width, y);

    this.add.rectangle(width / 2 + 8, height * 0.18 + 8, Math.min(880, width * 0.92), Math.min(185, height * 0.24), 0x05090c, 0.24);
    this.add.rectangle(width / 2, height * 0.18, Math.min(880, width * 0.92), Math.min(185, height * 0.24), palette.panel, 0.98)
      .setStrokeStyle(3, palette.accent, 0.55);

    const stripe = this.add.graphics().setScrollFactor(0);
    stripe.fillStyle(palette.accent, 0.85);
    stripe.fillRect(width * 0.07, height * 0.315, width * 0.86, 8);

    // Seitliche Deko-Module geben jedem Innenraum mehr Tiefe.
    this.add.rectangle(width * 0.08, height * 0.56, Math.max(34, width * 0.035), height * 0.34, palette.panel, 0.92)
      .setStrokeStyle(2, palette.accent, 0.4);
    this.add.rectangle(width * 0.92, height * 0.56, Math.max(34, width * 0.035), height * 0.34, palette.panel, 0.92)
      .setStrokeStyle(2, palette.accent, 0.4);
  }

  private getActionLabel(): string {
    if (this.placeId === 'workshop') {
      const condition = Math.round(Number(this.registry.get('vehicleCondition') ?? 100));
      return condition >= 99
        ? 'Fahrzeug ist in Ordnung'
        : 'Komplettreparatur – 120 Credits (' + condition + '%)';
    }
    return 'Aktion';
  }

  private getDescription(): string {
    switch (this.placeId) {
      case 'workshop':
        return 'Werkstatt Westend – Reparaturen und später Fahrzeug-Upgrades.';
      case 'cafe':
        return 'Ein ruhiger Treffpunkt mitten im Viertel.';
      case 'kiosk':
        return 'Zeitungen, Kleinigkeiten und Informationen zur Stadt.';
      case 'garage':
        return 'Dein sicherer Ort zum Wechseln deiner eigenen Fahrzeuge.';
      case 'dealer':
        return 'Velocity Autohaus – Fahrzeuge vergleichen, kaufen und direkt auswählen.';
      case 'supermarket':
        return 'Ostkai Markt – Versorgung und kleine Einkäufe am neuen Stadtteil.';
      case 'metro-depot':
        return 'MetroExpress Depot – Logistikzentrum am Ostkai und späterer Missionsknoten.';
      case 'harbor-cafe':
        return 'Kai-Café – ruhiger Treffpunkt direkt an der Uferpromenade.';
      case 'police':
        return 'Polizeistation und Ausgangspunkt der späteren Streifenlogik.';
      case 'station':
        return 'Der Bahnhof verbindet das Viertel später mit weiteren Stadtteilen.';
      default:
        return 'Ein begehbarer Ort in GTR-Kids.';
    }
  }

  private handleResize(): void {
    this.scene.restart({ placeId: this.placeId, placeName: this.placeName });
  }

  private leave(): void {
    this.scene.stop();
    this.scene.resume('CityScene');
  }
}

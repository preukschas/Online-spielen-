import Phaser from 'phaser';

type InteriorData = {
  placeId?: string;
  placeName?: string;
};

export class InteriorScene extends Phaser.Scene {
  private placeId = 'generic';
  private placeName = 'Gebäude';
  private lastActionAt = -1000;

  constructor() {
    super('InteriorScene');
  }

  create(data: InteriorData): void {
    this.placeId = data.placeId ?? 'generic';
    this.placeName = data.placeName ?? 'Gebäude';

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1b2630');

    this.add.rectangle(width / 2, height / 2, width, height, 0x1b2630, 1).setScrollFactor(0);

    this.add.text(width / 2, Math.max(54, height * 0.10), this.placeName, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(28, Math.min(50, width * 0.045)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, Math.max(110, height * 0.21), this.getDescription(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(16, Math.min(23, width * 0.022)) + 'px',
      color: '#d9e6ed',
      align: 'center',
      wordWrap: { width: Math.min(760, width * 0.84) }
    }).setOrigin(0.5);

    this.addInteriorAction(width, height);

    const exit = this.add.rectangle(width / 2, height - Math.max(65, height * 0.12), 220, 58, 0x2d765d, 1)
      .setStrokeStyle(3, 0xffffff, 0.7)
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
      const button = this.add.rectangle(width / 2, y, Math.min(420, width * 0.75), 64, color, 1)
        .setStrokeStyle(3, 0xffffff, 0.55)
        .setInteractive({ useHandCursor: true });

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

    if (this.placeId === 'garage') {
      makeButton(height * 0.48, 'Fahrzeugzustand prüfen', 0x5a6f80, () => {
        const condition = Math.round(Number(this.registry.get('vehicleCondition') ?? 100));
        this.registry.set('toast', 'Fahrzeugzustand: ' + condition + '%');
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
        return 'Dein erster sicherer Ort für Fahrzeuge und Spielstand.';
      case 'police':
        return 'Polizeistation und Ausgangspunkt der späteren Streifenlogik.';
      case 'station':
        return 'Der Bahnhof verbindet das Viertel später mit weiteren Stadtteilen.';
      default:
        return 'Ein begehbarer Ort in FREISTADT.';
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

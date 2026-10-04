import Phaser from 'phaser';
import { SettingsSystem, type AppSettings, type PerformanceProfile } from '../systems/SettingsSystem';

export class SettingsScene extends Phaser.Scene {
  private settings!: AppSettings;
  private valueTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    this.settings = SettingsSystem.load();
    this.cameras.main.setBackgroundColor('#101820');
    this.build();
    this.scale.on('resize', this.rebuild, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.rebuild, this);
    });
  }

  private rebuild(): void {
    this.scene.restart();
  }

  private build(): void {
    const width = Math.max(320, this.scale.width);
    const height = Math.max(240, this.scale.height);
    const centerX = width / 2;

    this.add.rectangle(centerX, height / 2, width, height, 0x101820, 1);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2a35, 1);
    bg.fillRect(0, height * 0.16, width, Math.max(64, height * 0.09));
    bg.fillStyle(0x3b454d, 1);
    bg.fillRect(0, height * 0.18, width, Math.max(40, height * 0.055));
    bg.lineStyle(4, 0xf0c94e, 0.85);
    for (let x = 25; x < width; x += 90) {
      bg.lineBetween(x, height * 0.208, Math.min(width, x + 42), height * 0.208);
    }

    this.add.text(centerX + 2, Math.max(42, height * 0.09) + 3, 'EINSTELLUNGEN', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(30, Math.min(48, width * 0.05)) + 'px',
      fontStyle: 'bold',
      color: '#05090c'
    }).setOrigin(0.5).setAlpha(0.32);

    const title = this.add.text(centerX, Math.max(42, height * 0.09), 'EINSTELLUNGEN', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(30, Math.min(48, width * 0.05)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    title.setShadow(0, 3, '#000000', 5, true, true);

    this.add.rectangle(centerX, height * 0.54, Math.min(760, width * 0.90), Math.min(430, height * 0.66), 0x16242d, 0.92)
      .setStrokeStyle(3, 0x5f879a, 0.42);

    const startY = height * 0.29;
    const rowGap = Math.max(68, Math.min(92, height * 0.13));
    this.makeSettingRow(centerX, startY, 'Textgröße', () => Math.round(this.settings.textScale * 100) + ' %', () => {
      const values = [0.9, 1, 1.15, 1.3, 1.4];
      const current = values.findIndex((value) => Math.abs(value - this.settings.textScale) < 0.01);
      this.settings.textScale = values[(current + 1 + values.length) % values.length];
      this.commit();
    });

    this.makeSettingRow(centerX, startY + rowGap, 'Reduzierte Bewegung', () => this.settings.reducedMotion ? 'An' : 'Aus', () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      this.commit();
    });

    this.makeSettingRow(centerX, startY + rowGap * 2, 'Große Touch-Flächen', () => this.settings.largeTouchTargets ? 'An' : 'Aus', () => {
      this.settings.largeTouchTargets = !this.settings.largeTouchTargets;
      this.commit();
    });

    this.makeSettingRow(centerX, startY + rowGap * 3, 'Leistungsprofil', () => this.profileLabel(this.settings.performance), () => {
      const values: PerformanceProfile[] = ['high', 'balanced', 'low'];
      const current = values.indexOf(this.settings.performance);
      this.settings.performance = values[(current + 1) % values.length];
      this.commit();
    });

    this.add.rectangle(centerX + 5, height - Math.max(52, height * 0.09) + 6, Math.min(310, width * 0.72), 58, 0x05090c, 0.28);
    const back = this.add.rectangle(centerX, height - Math.max(52, height * 0.09), Math.min(310, width * 0.72), 58, 0x25805e, 1)
      .setStrokeStyle(3, 0xffffff, 0.52)
      .setInteractive({ useHandCursor: true });

    this.add.text(back.x, back.y, 'Zurück zum Menü', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    back.on('pointerdown', () => this.scene.start('MainMenuScene'));

    this.add.text(centerX, height - 18, 'Einstellungen werden sofort gespeichert.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#9fb2bc'
    }).setOrigin(0.5);
  }

  private makeSettingRow(
    x: number,
    y: number,
    label: string,
    value: () => string,
    onToggle: () => void
  ): void {
    const width = Math.min(680, this.scale.width * 0.82);
    this.add.rectangle(x + 5, y + 6, width, 58, 0x05090c, 0.25);
    const button = this.add.rectangle(x, y, width, 58, 0x22343f, 0.98)
      .setStrokeStyle(2, 0xffffff, 0.26)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(x - width * 0.47, y, 7, 38, 0xf0c94e, 0.95);

    this.add.text(x - width * 0.41, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);

    const valueText = this.add.text(x + width * 0.41, y, value(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffdf79'
    }).setOrigin(1, 0.5);

    this.valueTexts.push(valueText);

    button.on('pointerdown', () => {
      onToggle();
      valueText.setText(value());
    });
  }

  private commit(): void {
    SettingsSystem.save(this.settings);
  }

  private profileLabel(profile: PerformanceProfile): string {
    if (profile === 'high') return 'Hoch';
    if (profile === 'low') return 'Sparsam';
    return 'Ausgewogen';
  }
}

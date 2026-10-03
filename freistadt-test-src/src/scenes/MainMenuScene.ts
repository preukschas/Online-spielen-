import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  private continueButton?: Phaser.GameObjects.Rectangle;
  private continueLabel?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    if (new URLSearchParams(window.location.search).has('test')) {
      this.scene.start('CityScene');
      return;
    }

    this.cameras.main.setBackgroundColor('#111820');
    this.buildLayout();
    this.scale.on('resize', this.rebuild, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.rebuild, this);
    });
    void this.refreshContinueState();
  }

  private rebuild(): void {
    this.scene.restart();
  }

  private buildLayout(): void {
    const width = Math.max(320, this.scale.width);
    const height = Math.max(240, this.scale.height);
    const centerX = width / 2;

    this.add.rectangle(centerX, height / 2, width, height, 0x111820, 1);
    this.add.rectangle(centerX, height * 0.18, Math.min(width * 0.88, 900), Math.min(180, height * 0.24), 0x1a2b38, 1)
      .setStrokeStyle(3, 0x8fc8d8, 0.35);

    this.add.text(centerX, height * 0.12, 'FREISTADT', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(38, Math.min(68, width * 0.07)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(centerX, height * 0.205, 'Eine lebendige Stadt. Deine Wege. Friedliche Missionen.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(15, Math.min(22, width * 0.022)) + 'px',
      color: '#cce1e9',
      align: 'center',
      wordWrap: { width: Math.min(760, width * 0.8) }
    }).setOrigin(0.5);

    const buttonWidth = Math.min(420, width * 0.78);
    const buttonHeight = Math.max(54, Math.min(66, height * 0.09));
    const startY = height * 0.42;
    const gap = buttonHeight + Math.max(14, height * 0.025);

    const continueParts = this.makeButton(centerX, startY, buttonWidth, buttonHeight, 'Fortsetzen', 0x355d72, () => {
      if (this.continueButton?.alpha !== 1) return;
      this.scene.start('CityScene');
    });
    this.continueButton = continueParts.button;
    this.continueLabel = continueParts.label;
    this.continueButton.setAlpha(0.45);
    this.continueLabel.setAlpha(0.65);

    this.makeButton(centerX, startY + gap, buttonWidth, buttonHeight, 'Neues Spiel', 0x287253, () => {
      void this.startNewGame();
    });

    this.makeButton(centerX, startY + gap * 2, buttonWidth, buttonHeight, 'Einstellungen', 0x6a527e, () => {
      this.scene.start('SettingsScene');
    });

    this.makeButton(centerX, startY + gap * 3, buttonWidth, buttonHeight, 'Über FREISTADT', 0x48525b, () => {
      this.toggleInfo();
    });

    this.infoText = this.add.text(centerX, Math.min(height - 28, startY + gap * 4 + 10), '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(12, Math.min(16, width * 0.016)) + 'px',
      color: '#dce8ed',
      align: 'center',
      wordWrap: { width: Math.min(760, width * 0.84) }
    }).setOrigin(0.5, 0).setVisible(false);
  }

  private makeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void
  ): { button: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const button = this.add.rectangle(x, y, width, height, color, 0.96)
      .setStrokeStyle(3, 0xffffff, 0.45)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(18, Math.min(25, width * 0.055)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    button.on('pointerdown', onClick);
    return { button, label: text };
  }

  private async refreshContinueState(): Promise<void> {
    const save = await SaveSystem.load();
    if (!this.scene.isActive() || !this.continueButton || !this.continueLabel) return;

    const enabled = Boolean(save);
    this.continueButton.setAlpha(enabled ? 1 : 0.45);
    this.continueLabel.setAlpha(enabled ? 1 : 0.65);
    if (!enabled) this.continueLabel.setText('Fortsetzen · noch kein Spielstand');
  }

  private async startNewGame(): Promise<void> {
    await SaveSystem.clear();
    if (!this.scene.isActive()) return;
    this.scene.start('CityScene');
  }

  private toggleInfo(): void {
    if (!this.infoText) return;
    const visible = !this.infoText.visible;
    this.infoText
      .setText(
        'FREISTADT ist ein familienfreundliches Top-down-Stadtspiel mit freier Erkundung, Fahrzeugen, ' +
        'Fraktionen, friedlichen Missionen und einem Kontrollsystem ohne Kampfzwang.'
      )
      .setVisible(visible);
  }
}

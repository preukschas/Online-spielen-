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

    this.add.rectangle(centerX, height / 2, width, height, 0x101820, 1);

    // Cartoon-Stadtmotiv im Hintergrund.
    const bg = this.add.graphics();
    bg.fillStyle(0x173144, 1);
    bg.fillCircle(width * 0.08, height * 0.16, Math.max(95, width * 0.09));
    bg.fillStyle(0x193b34, 0.9);
    bg.fillCircle(width * 0.91, height * 0.16, Math.max(125, width * 0.11));
    bg.fillStyle(0x21303b, 1);
    bg.fillRect(0, height * 0.265, width, Math.max(82, height * 0.13));
    bg.fillStyle(0x39444c, 1);
    bg.fillRect(0, height * 0.285, width, Math.max(52, height * 0.08));
    bg.lineStyle(5, 0xf0d257, 0.9);
    for (let x = 22; x < width; x += 95) {
      bg.lineBetween(x, height * 0.325, Math.min(width, x + 46), height * 0.325);
    }

    // Kleine Fahrzeug-Silhouetten als CI-Motiv.
    const carY = height * 0.315;
    [
      { x: width * 0.16, color: 0xe85e53, scale: 1 },
      { x: width * 0.78, color: 0x54a8d4, scale: 0.86 },
      { x: width * 0.91, color: 0xe0b64e, scale: 0.72 }
    ].forEach((car) => {
      const w = 64 * car.scale;
      const h = 28 * car.scale;
      this.add.rectangle(car.x + 5, carY + 6, w, h, 0x081116, 0.28).setRotation(-0.05);
      this.add.rectangle(car.x, carY, w, h, car.color, 1)
        .setStrokeStyle(3, 0x17232d, 0.8)
        .setRotation(-0.05);
      this.add.rectangle(car.x + w * 0.10, carY, w * 0.32, h * 0.55, 0x8ed3ea, 0.9).setRotation(-0.05);
    });

    const logoY = height * 0.13;
    this.add.text(centerX + 3, logoY + 5, 'GTR-KIDS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(44, Math.min(78, width * 0.075)) + 'px',
      fontStyle: 'bold',
      color: '#071119',
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.45);

    const logo = this.add.text(centerX, logoY, 'GTR-KIDS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(44, Math.min(78, width * 0.075)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    logo.setShadow(0, 3, '#000000', 6, true, true);

    this.add.rectangle(centerX, height * 0.205, Math.min(720, width * 0.78), 44, 0x182731, 0.90)
      .setStrokeStyle(2, 0xf0d257, 0.65);

    this.add.text(centerX, height * 0.205, 'FAHREN · ENTDECKEN · MISSIONEN · OHNE KAMPFZWANG', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(12, Math.min(18, width * 0.018)) + 'px',
      fontStyle: 'bold',
      color: '#f4dc78',
      align: 'center',
      wordWrap: { width: Math.min(680, width * 0.72) }
    }).setOrigin(0.5);

    const panelWidth = Math.min(500, width * 0.86);
    const panelHeight = Math.min(height * 0.53, 390);
    const panelY = Math.min(height * 0.68, height - panelHeight / 2 - 16);
    this.add.rectangle(centerX + 7, panelY + 9, panelWidth, panelHeight, 0x050b0f, 0.28);
    this.add.rectangle(centerX, panelY, panelWidth, panelHeight, 0x16242d, 0.96)
      .setStrokeStyle(3, 0x6a8ea0, 0.42);

    const buttonWidth = Math.min(400, panelWidth * 0.82);
    const buttonHeight = Math.max(50, Math.min(62, height * 0.075));
    const startY = panelY - panelHeight * 0.31;
    const gap = buttonHeight + Math.max(11, height * 0.017);

    const continueParts = this.makeButton(centerX, startY, buttonWidth, buttonHeight, 'FORTSETZEN', 0x2e657f, () => {
      if (this.continueButton?.alpha !== 1) return;
      this.scene.start('CityScene');
    });
    this.continueButton = continueParts.button;
    this.continueLabel = continueParts.label;
    this.continueButton.setAlpha(0.45);
    this.continueLabel.setAlpha(0.65);

    this.makeButton(centerX, startY + gap, buttonWidth, buttonHeight, 'NEUES SPIEL', 0x25805e, () => {
      void this.startNewGame();
    });

    this.makeButton(centerX, startY + gap * 2, buttonWidth, buttonHeight, 'EINSTELLUNGEN', 0x725493, () => {
      this.scene.start('SettingsScene');
    });

    this.makeButton(centerX, startY + gap * 3, buttonWidth, buttonHeight, 'ÜBER GTR-KIDS', 0x46535d, () => {
      this.toggleInfo();
    });

    this.infoText = this.add.text(centerX, Math.min(height - 24, startY + gap * 4 - 4), '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(11, Math.min(15, width * 0.014)) + 'px',
      color: '#dce8ed',
      align: 'center',
      backgroundColor: '#0f1b22dd',
      padding: { x: 12, y: 8 },
      wordWrap: { width: Math.min(720, width * 0.82) }
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
    this.add.rectangle(x + 5, y + 6, width, height, 0x05090c, 0.30);

    const button = this.add.rectangle(x, y, width, height, color, 0.98)
      .setStrokeStyle(3, 0xffffff, 0.42)
      .setInteractive({ useHandCursor: true });

    this.add.rectangle(x - width * 0.47, y, 7, height * 0.68, 0xf0d257, 0.92);

    const text = this.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: Math.max(17, Math.min(23, width * 0.052)) + 'px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setAlpha(0.88));
    button.on('pointerout', () => button.setAlpha(1));
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
        'GTR-KIDS ist ein familienfreundliches Top-down-Stadtspiel mit freier Erkundung, Fahrzeugen, ' +
        'Fraktionen, friedlichen Missionen und einem Kontrollsystem ohne Kampfzwang.'
      )
      .setVisible(visible);
  }
}

import Phaser from 'phaser';
import './style.css';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CityScene } from './scenes/CityScene';
import { InteriorScene } from './scenes/InteriorScene';
import { SettingsScene } from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#111820',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  input: {
    activePointers: 3
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MainMenuScene, CityScene, InteriorScene, SettingsScene]
};

new Phaser.Game(config);

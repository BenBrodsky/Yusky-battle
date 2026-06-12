import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { BootScene           } from './scenes/BootScene.js';
import { TitleScene          } from './scenes/TitleScene.js';
import { CharacterSelectScene} from './scenes/CharacterSelectScene.js';
import { GameScene           } from './scenes/GameScene.js';
import { HUDScene            } from './scenes/HUDScene.js';

const config = {
  type: Phaser.AUTO,
  width:  GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111111',
  scene: [
    BootScene,
    TitleScene,
    CharacterSelectScene,
    GameScene,
    HUDScene,
  ],
  scale: {
    mode:            Phaser.Scale.FIT,
    autoCenter:      Phaser.Scale.CENTER_BOTH,
    width:           GAME_WIDTH,
    height:          GAME_HEIGHT,
  },
  input: {
    gamepad: true,
  },
  render: {
    pixelArt:           false,
    antialias:          true,
    roundPixels:        false,
    premultipliedAlpha: false,  // PNGs use straight alpha; prevents white-box fringing
  },
  audio: {
    disableWebAudio: false,
  },
};

new Phaser.Game(config);

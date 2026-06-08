import Phaser from 'phaser';

// BootScene generates all placeholder textures programmatically.
// When real sprites are ready, swap in sprite sheet keys here.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this._makeRect('soccer_ball', 20, 20, 0xffffff);
    this._makeRect('tennis_ball', 16, 16, 0xddff00);
    this._makeRect('chocolate',  26, 16, 0x6b3a2a);
    this._makeRect('tvset',      30, 24, 0x334466);
    this._makeRect('chicken',    26, 26, 0xf4a460);
    this._makeRect('family_card',20, 28, 0xffd700);
    this.scene.start('Title');
  }

  _makeRect(key, w, h, color) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}

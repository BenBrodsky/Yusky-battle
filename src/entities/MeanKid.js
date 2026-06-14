import { Enemy } from './Enemy.js';

export class MeanKid extends Enemy {
  constructor(scene, worldX, groundY) {
    super(scene, worldX, groundY, {
      color:          0xcc2222,
      width:          40,
      height:         66,
      hp:             100,
      damage:         18,
      speed:          115,
      detectionRange: 340,
      attackRange:    72,
    });
    this.facing = 'left'; // start facing player
  }
}

// Boss: BullyKing — bigger, more HP, harder hits
export class BullyKing extends Enemy {
  constructor(scene, worldX, groundY) {
    super(scene, worldX, groundY, {
      color:          0x991111,
      width:          66,
      height:         100,
      hp:             300,
      damage:         22,
      speed:          80,
      detectionRange: 500,
      attackRange:    100,
    });
    this.facing  = 'left';
    this.isBoss  = true;
    this.phase   = 1;

    // Crown decoration
    this.crown = scene.add.triangle(
      worldX, groundY, 0, 0, 33, -20, 66, 0, 0xffcc00
    );
    this.crown.setDepth(groundY + 5);
  }

  update(dt, gameScene) {
    super.update(dt, gameScene);

    // Phase 2: speed boost below half HP
    if (this.hp < this.maxHP / 2 && this.phase === 1) {
      this.phase       = 2;
      this.config.speed = 140;
      this.config.damage = 28;
      this.sprite.setFillStyle(0xff3333);
    }

    this.crown.x = this.worldX - 33;
    this.crown.y = this.groundY - this.jumpZ - this.config.height - 2;
    this.crown.setDepth(this.groundY + 5);
  }

  _die() {
    this.crown.destroy();
    super._die();
    this.scene.events.emit('bossDefeated');
  }
}

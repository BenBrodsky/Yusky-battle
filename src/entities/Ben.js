import { Character } from './Character.js';

// Ben — boxer tank. Jab-jab-haymaker combo. Toss enemies as a finisher.
export class Ben extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);
    this.throwCooldown = 0;
  }

  _createSprites() {
    super._createSprites();

    // Boxing gloves (two orange rectangles on the hands)
    this.gloveL = this.scene.add.rectangle(0, 0, 16, 16, 0xff6600);
    this.gloveR = this.scene.add.rectangle(0, 0, 16, 16, 0xff6600);
  }

  update(dt, input, gameScene) {
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    super.update(dt, input, gameScene);
  }

  // Override attack: check for grab/throw vs normal boxing
  onAttack(gameScene) {
    if (!gameScene) return;

    const closeEnemy = this._findCloseEnemy(gameScene.enemies, 55);

    if (closeEnemy && this.throwCooldown <= 0 && this.comboStep === 0) {
      // Grab and toss on the 3rd-hit reset
      this._doThrow(closeEnemy, gameScene);
    }
    // Normal hit registered by getAttackHitbox() in GameScene
  }

  _doThrow(enemy, gameScene) {
    this.throwCooldown = 1.2;
    const dir          = this.facing === 'right' ? 1 : -1;
    enemy.takeDamage(40, dir * 2.5);
    enemy.isFlying     = true;
    enemy.flyVelX      = dir * 450;
    enemy.flyVelZ      = 480;
    enemy.state        = 'fly';
    // Text popup
    this._popup('TOSS!', 0xff8800);
  }

  getAttackDamage() {
    // Jab → Jab → Haymaker cycle
    const dmgs = [12, 14, 38];
    return dmgs[this.comboStep] ?? 14;
  }

  _popup(text, color) {
    const hex  = '#' + color.toString(16).padStart(6, '0');
    const txt  = this.scene.add.text(this.worldX, this.groundY - this.config.height - 30, text, {
      fontSize: '20px', fill: hex, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1000);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  _syncSprites() {
    super._syncSprites();
    const dir  = this.facing === 'right' ? 1 : -1;
    const sy   = this.groundY - this.jumpZ;
    const gOffX = dir * (this.config.width * 0.5 + 4);
    const gOffY = -this.config.height * 0.3;

    this.gloveL.x = this.worldX + gOffX;
    this.gloveL.y = sy + gOffY - 4;
    this.gloveR.x = this.worldX + gOffX;
    this.gloveR.y = sy + gOffY + 4;
    [this.gloveL, this.gloveR].forEach(g => g.setDepth(this.groundY + 3));

    // Punch forward when attacking
    if (this.state === 'attack') {
      const punchOff = dir * Math.max(0, Math.sin(this.stateTimer * 20) * 12);
      this.gloveR.x  = this.worldX + gOffX + punchOff;
    }
  }

  _findCloseEnemy(enemies, range) {
    for (const e of enemies) {
      if (!e.active || e.state === 'dead') continue;
      const dx = Math.abs(e.worldX - this.worldX);
      const dy = Math.abs(e.groundY - this.groundY) * 0.5;
      if (Math.sqrt(dx * dx + dy * dy) < range) return e;
    }
    return null;
  }

  destroy() {
    super.destroy();
    this.gloveL.destroy();
    this.gloveR.destroy();
  }
}

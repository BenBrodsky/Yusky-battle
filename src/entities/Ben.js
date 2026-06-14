import { Character } from './Character.js';
import { FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

const WALK_FRAME_MS   = 63;
const BASE_SPRITE_H   = 160;
const DEPTH_SCALE_MIN = 0.6;
const DEPTH_SCALE_MAX = 1.3;

const N_WALK = 8;

const WALK_SPRITE_KEYS = [
  'ben_walk_r1', 'ben_walk_r2', 'ben_walk_r3', 'ben_walk_r4',
  'ben_walk_r5', 'ben_walk_r6', 'ben_walk_r7', 'ben_walk_r8',
  'ben_idle_r',  'ben_jump_r',
  'ben_walk_l1', 'ben_walk_l2', 'ben_walk_l3', 'ben_walk_l4',
  'ben_walk_l5', 'ben_walk_l6', 'ben_walk_l7', 'ben_walk_l8',
  'ben_idle_l',  'ben_jump_l',
];
const FRAMES_PER_DIR = 10; // 8 walk + idle + jump
const IDLE_FRAME     = 8;
const JUMP_FRAME     = 9;
const WALK_SEQUENCE  = [0, 1, 2, 3, 4, 5, 6, 7];

// Ben — boxer tank. Jab-jab-haymaker combo. Toss enemies as a finisher.
export class Ben extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);
    this.throwCooldown = 0;
    this._initWalkSprite();
  }

  _initWalkSprite() {
    this._hasSprites = WALK_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (!this._hasSprites) return;

    this.walkFrames = WALK_SPRITE_KEYS.map(key =>
      this.scene.add.image(this.worldX, this.groundY, key)
        .setOrigin(0.5, 1)
        .setVisible(false)
    );
    this._activeFrameIdx = -1;
  }

  _createSprites() {
    super._createSprites();
    this.gloveL = this.scene.add.rectangle(0, 0, 16, 16, 0xff6600);
    this.gloveR = this.scene.add.rectangle(0, 0, 16, 16, 0xff6600);
  }

  update(dt, input, gameScene) {
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    super.update(dt, input, gameScene);
  }

  onAttack(gameScene) {
    if (!gameScene) return;
    const closeEnemy = this._findCloseEnemy(gameScene.enemies, 55);
    if (closeEnemy && this.throwCooldown <= 0 && this.comboStep === 0) {
      this._doThrow(closeEnemy, gameScene);
    }
  }

  _doThrow(enemy, gameScene) {
    this.throwCooldown = 1.2;
    const dir          = this.facing === 'right' ? 1 : -1;
    enemy.takeDamage(40, dir * 2.5);
    enemy.isFlying     = true;
    enemy.flyVelX      = dir * 450;
    enemy.flyVelZ      = 480;
    enemy.state        = 'fly';
    this._popup('TOSS!', 0xff8800);
  }

  getAttackDamage() {
    const dmgs = [12, 14, 38];
    return dmgs[this.comboStep] ?? 14;
  }

  _syncSprites() {
    super._syncSprites();

    const dir = this.facing === 'right' ? 1 : -1;
    const sy  = this.groundY - this.jumpZ;

    if (this._hasSprites) {
      this.sprite.setVisible(false);
      this.eyeL.setVisible(false);
      this.eyeR.setVisible(false);

      const depthT     = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
      const depthScale = DEPTH_SCALE_MIN + depthT * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN);
      const baseScale  = BASE_SPRITE_H / this.walkFrames[0].height;
      const sx         = baseScale * depthScale;
      const alpha      = this.sprite.alpha;

      const frameNum = !this.isGrounded()
        ? JUMP_FRAME
        : (this.state === 'walk')
          ? WALK_SEQUENCE[Math.floor(Date.now() / WALK_FRAME_MS) % WALK_SEQUENCE.length]
          : IDLE_FRAME;
      const dirOff   = this.facing === 'right' ? 0 : FRAMES_PER_DIR;
      const frameIdx = dirOff + frameNum;

      if (frameIdx !== this._activeFrameIdx) {
        if (this._activeFrameIdx >= 0) this.walkFrames[this._activeFrameIdx].setVisible(false);
        this._activeFrameIdx = frameIdx;
      }
      this.walkFrames[frameIdx].setVisible(true).setPosition(this.worldX, sy)
        .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);

      // Gloves hidden when sprite active
      this.gloveL.setVisible(false);
      this.gloveR.setVisible(false);
    } else {
      // Placeholder gloves
      const gOffX = dir * (this.config.width * 0.5 + 4);
      const gOffY = -this.config.height * 0.3;
      this.gloveL.x = this.worldX + gOffX;
      this.gloveL.y = sy + gOffY - 4;
      this.gloveR.x = this.worldX + gOffX;
      this.gloveR.y = sy + gOffY + 4;
      [this.gloveL, this.gloveR].forEach(g => g.setDepth(this.groundY + 3).setVisible(true));
      if (this.state === 'attack') {
        const punchOff = dir * Math.max(0, Math.sin(this.stateTimer * 20) * 12);
        this.gloveR.x  = this.worldX + gOffX + punchOff;
      }
    }
  }

  _setVisible(v) {
    super._setVisible(v);
    if (this.walkFrames) {
      this.walkFrames.forEach((f, i) => f.setVisible(v && i === this._activeFrameIdx));
    }
    this.gloveL?.setVisible(v && !this._hasSprites);
    this.gloveR?.setVisible(v && !this._hasSprites);
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites) {
      this.walkFrames.forEach(f => f.setTint(color));
      this.scene.time.delayedCall(200, () => {
        if (this.active) this.walkFrames.forEach(f => f.clearTint());
      });
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

  _popup(text, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.scene.add.text(this.worldX, this.groundY - this.config.height - 30, text, {
      fontSize: '20px', fill: hex, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1000);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  destroy() {
    super.destroy();
    this.gloveL.destroy();
    this.gloveR.destroy();
    this.walkFrames?.forEach(f => f.destroy());
  }
}

import { Character } from './Character.js';
import { FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

const WALK_FRAME_MS   = 63;
const BASE_SPRITE_H   = 208; // ~30% bigger than Miles (160)
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
const JUMP_SCALE     = 0.72; // tucked jump pose renders smaller than standing height
const DOWN_SCALE     = 1.0;  // knocked-down pose scale
const DOWN_KEYS      = { right: 'ben_down_r', left: 'ben_down_l' };
const WALK_SEQUENCE  = [0, 1, 2, 3, 4, 5, 6, 7];

// Two alternating punches: lead jab and rear cross. 3 frames each, per direction.
const ATTACK_DURATION = 0.32; // matches Character._handleAttack
const N_PUNCH         = 3;
const PUNCH_KEYS = {
  jab: {
    right: ['ben_jab_r1', 'ben_jab_r2', 'ben_jab_r3'],
    left:  ['ben_jab_l1', 'ben_jab_l2', 'ben_jab_l3'],
  },
  cross: {
    right: ['ben_cross_r1', 'ben_cross_r2', 'ben_cross_r3'],
    left:  ['ben_cross_l1', 'ben_cross_l2', 'ben_cross_l3'],
  },
};
const ATTACK_SPRITE_KEYS = [
  ...PUNCH_KEYS.jab.right, ...PUNCH_KEYS.jab.left,
  ...PUNCH_KEYS.cross.right, ...PUNCH_KEYS.cross.left,
];

// Ben — boxer tank. Jab-jab-haymaker combo. Toss enemies as a finisher.
export class Ben extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);
    this.throwCooldown = 0;
    this.punchType     = 'cross'; // flips to 'jab' on the first swing
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

    this._hasAttackSprites = ATTACK_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (this._hasAttackSprites) {
      this.attackFrames = {};
      ATTACK_SPRITE_KEYS.forEach(key => {
        this.attackFrames[key] = this.scene.add.image(this.worldX, this.groundY, key)
          .setOrigin(0.5, 1)
          .setVisible(false);
      });
      this._activeAttackKey = null;
    }

    this._hasDownSprite = this.scene.textures.exists(DOWN_KEYS.right) &&
                          this.scene.textures.exists(DOWN_KEYS.left);
    if (this._hasDownSprite) {
      this.downFrames = {
        right: this.scene.add.image(this.worldX, this.groundY, DOWN_KEYS.right).setOrigin(0.5, 1).setVisible(false),
        left:  this.scene.add.image(this.worldX, this.groundY, DOWN_KEYS.left ).setOrigin(0.5, 1).setVisible(false),
      };
    }
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
    // Alternate hands each swing: jab ↔ cross
    this.punchType = this.punchType === 'jab' ? 'cross' : 'jab';

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

  // Only land the hit while the fist is actually extended (the strike frame),
  // not on the windup — keeps Ben honest about his close range.
  getAttackHitbox() {
    if (this.state !== 'attack' || this.hitThisSwing) return null;
    const progress = 1 - this.stateTimer / ATTACK_DURATION;
    if (progress < 0.28 || progress > 0.72) return null;
    const dir   = this.facing === 'right' ? 1 : -1;
    const reach = 68; // boxer's reach — must get in close
    return {
      x:          this.worldX + dir * (this.config.width * 0.5 + reach / 2),
      y:          this.groundY - this.config.height * 0.5,
      w:          reach,
      h:          this.config.height * 0.65,
      knockbackX: dir,
    };
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

      // Gloves hidden when real sprites are active
      this.gloveL.setVisible(false);
      this.gloveR.setVisible(false);

      // ── Knocked down: show the down pose while KO'd (stars handled by base) ──
      if (this.isKO && this._hasDownSprite) {
        if (this._activeFrameIdx >= 0)  { this.walkFrames[this._activeFrameIdx].setVisible(false); this._activeFrameIdx = -1; }
        if (this._activeAttackKey)      { this.attackFrames[this._activeAttackKey].setVisible(false); this._activeAttackKey = null; }
        const down  = this.downFrames[this.facing];
        const other = this.downFrames[this.facing === 'right' ? 'left' : 'right'];
        other.setVisible(false);
        down.setVisible(true).setPosition(this.worldX, this.groundY)
          .setDepth(this.groundY).setScale(sx * DOWN_SCALE, sx * DOWN_SCALE).setAlpha(alpha);
        return;
      } else if (this._hasDownSprite) {
        this.downFrames.right.setVisible(false);
        this.downFrames.left.setVisible(false);
      }

      // ── Attack: alternating jab / cross punch frames ──────────────────
      if (this.state === 'attack' && this._hasAttackSprites) {
        if (this._activeFrameIdx >= 0) { this.walkFrames[this._activeFrameIdx].setVisible(false); this._activeFrameIdx = -1; }

        const progress  = Math.max(0, Math.min(0.999, 1 - this.stateTimer / ATTACK_DURATION));
        const frameNum  = Math.floor(progress * N_PUNCH);
        const key       = PUNCH_KEYS[this.punchType][this.facing][frameNum];

        if (key !== this._activeAttackKey) {
          if (this._activeAttackKey) this.attackFrames[this._activeAttackKey].setVisible(false);
          this._activeAttackKey = key;
        }
        this.attackFrames[key].setVisible(true).setPosition(this.worldX, sy)
          .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
        return;
      } else if (this._activeAttackKey) {
        this.attackFrames[this._activeAttackKey].setVisible(false);
        this._activeAttackKey = null;
      }

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
      // Tucked jump pose renders smaller so it matches his standing scale
      const fsx = (frameNum === JUMP_FRAME) ? sx * JUMP_SCALE : sx;
      this.walkFrames[frameIdx].setVisible(true).setPosition(this.worldX, sy)
        .setDepth(this.groundY).setScale(fsx, fsx).setAlpha(alpha);
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
    if (this.attackFrames) {
      Object.entries(this.attackFrames).forEach(([key, f]) => f.setVisible(v && key === this._activeAttackKey));
    }
    if (this.downFrames) {
      this.downFrames.right.setVisible(v && this.isKO && this.facing === 'right');
      this.downFrames.left.setVisible(v && this.isKO && this.facing === 'left');
    }
    this.gloveL?.setVisible(v && !this._hasSprites);
    this.gloveR?.setVisible(v && !this._hasSprites);
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites) {
      const all = [...this.walkFrames, ...Object.values(this.attackFrames || {}), ...Object.values(this.downFrames || {})];
      all.forEach(f => f.setTint(color));
      this.scene.time.delayedCall(200, () => {
        if (this.active) all.forEach(f => f.clearTint());
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
    if (this.attackFrames) Object.values(this.attackFrames).forEach(f => f.destroy());
    if (this.downFrames) Object.values(this.downFrames).forEach(f => f.destroy());
  }
}

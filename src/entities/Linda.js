import { Character } from './Character.js';
import { Projectile } from './Projectile.js';
import { MELEE_RANGE, FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

const WALK_FRAME_MS   = 120;
const BASE_SPRITE_H   = 152; // slightly smaller than Ben (208), slightly bigger than Miles (144)
const DEPTH_SCALE_MIN = 0.6;
const DEPTH_SCALE_MAX = 1.3;
const ATTACK_DURATION = 0.40; // slightly longer than base to cover swing arc
const N_SWING_FRAMES  = 6;

const WALK_SPRITE_KEYS = [
  'linda_walk_r1', 'linda_walk_r2', 'linda_walk_r3',
  'linda_walk_r4', 'linda_walk_r5', 'linda_walk_r6',
  'linda_idle_r',  'linda_jump_r',
  'linda_walk_l1', 'linda_walk_l2', 'linda_walk_l3',
  'linda_walk_l4', 'linda_walk_l5', 'linda_walk_l6',
  'linda_idle_l',  'linda_jump_l',
];
const FRAMES_PER_DIR = 8;
const IDLE_FRAME     = 6;
const JUMP_FRAME     = 7;
const WALK_SEQUENCE  = [0, 1, 2, 3, 4, 5];

const SWING_SPRITE_KEYS = [
  'linda_swing_r1', 'linda_swing_r2', 'linda_swing_r3',
  'linda_swing_r4', 'linda_swing_r5', 'linda_swing_r6',
  'linda_swing_l1', 'linda_swing_l2', 'linda_swing_l3',
  'linda_swing_l4', 'linda_swing_l5', 'linda_swing_l6',
];

// Linda — tennis racket close combat, lob shot ranged.
export class Linda extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);
    this.ballActive = false;
    this._initWalkSprite();
  }

  _initWalkSprite() {
    this._hasSprites = WALK_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (!this._hasSprites) return;

    this.walkFrames = WALK_SPRITE_KEYS.map(key =>
      this.scene.add.image(this.worldX, this.groundY, key)
        .setOrigin(0.5, 1).setVisible(false)
    );
    this.walkSprite      = this.walkFrames[0];
    this._activeFrameIdx = -1;

    this._hasSwingSprites = SWING_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (this._hasSwingSprites) {
      this.swingFrames = SWING_SPRITE_KEYS.map(key =>
        this.scene.add.image(this.worldX, this.groundY, key)
          .setOrigin(0.5, 1).setVisible(false)
      );
      this._activeSwingIdx = -1;
    }

    this._hasDownSprite = this.scene.textures.exists('linda_down_r') &&
                          this.scene.textures.exists('linda_down_l');
    if (this._hasDownSprite) {
      this.downFrames = {
        right: this.scene.add.image(this.worldX, this.groundY, 'linda_down_r').setOrigin(0.5, 1).setVisible(false),
        left:  this.scene.add.image(this.worldX, this.groundY, 'linda_down_l').setOrigin(0.5, 1).setVisible(false),
      };
    }
  }

  // ── Attack overrides ──────────────────────────────────────────────

  onAttack(gameScene) {
    // Override attack duration to match swing animation
    this.stateTimer = ATTACK_DURATION;
    if (!gameScene) return;
    const nearEnemy = this._findNearestEnemy(gameScene.enemies);
    const dist      = nearEnemy ? this._dist(nearEnemy) : Infinity;

    if (dist > MELEE_RANGE && !this.ballActive) {
      const dir = this.facing === 'right' ? 1 : -1;
      const ball = new Projectile(
        this.scene, this.worldX + dir * 30, this.groundY,
        'tennis_ball', dir, this.config.rangedDmg, 'tennis', this
      );
      gameScene.projectiles.push(ball);
      this.ballActive = true;
      ball.onReturn = () => { this.ballActive = false; };
    }
  }

  getAttackDamage() {
    return [16, 18, 24][this.comboStep] ?? 16;
  }

  // ── Sprites ───────────────────────────────────────────────────────

  _syncSprites() {
    super._syncSprites();
    if (!this._hasSprites) return;

    const sy = this.groundY - this.jumpZ;

    this.sprite.setVisible(false);
    this.eyeL.setVisible(false);
    this.eyeR.setVisible(false);

    const depthT     = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
    const depthScale = DEPTH_SCALE_MIN + depthT * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN);
    const baseScale  = BASE_SPRITE_H / this.walkFrames[0].height;
    const sx         = baseScale * depthScale;
    const alpha      = this.sprite.alpha;

    // KO — show down pose
    if (this.isKO && this._hasDownSprite) {
      this._hideWalkFrame();
      this._hideSwingFrame();
      const down  = this.downFrames[this.facing];
      const other = this.downFrames[this.facing === 'right' ? 'left' : 'right'];
      other.setVisible(false);
      down.setVisible(true).setPosition(this.worldX, this.groundY)
        .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
      return;
    } else if (this._hasDownSprite) {
      this.downFrames.right.setVisible(false);
      this.downFrames.left.setVisible(false);
    }

    // Attack — show swing animation
    if (this.state === 'attack' && this._hasSwingSprites) {
      this._hideWalkFrame();
      const progress  = Math.max(0, Math.min(0.999, 1 - this.stateTimer / ATTACK_DURATION));
      const frameNum  = Math.floor(progress * N_SWING_FRAMES);
      const dirOff    = this.facing === 'right' ? 0 : N_SWING_FRAMES;
      const swingIdx  = dirOff + frameNum;
      if (swingIdx !== this._activeSwingIdx) {
        this._hideSwingFrame();
        this._activeSwingIdx = swingIdx;
      }
      this.swingFrames[swingIdx].setVisible(true).setPosition(this.worldX, sy)
        .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
      return;
    } else {
      this._hideSwingFrame();
    }

    // Walk / idle / jump
    const frameNum = !this.isGrounded()
      ? JUMP_FRAME
      : (this.state === 'walk')
        ? WALK_SEQUENCE[Math.floor(Date.now() / WALK_FRAME_MS) % WALK_SEQUENCE.length]
        : IDLE_FRAME;
    const dirOff   = this.facing === 'right' ? 0 : FRAMES_PER_DIR;
    const frameIdx = dirOff + frameNum;

    if (frameIdx !== this._activeFrameIdx) {
      this._hideWalkFrame();
      this._activeFrameIdx = frameIdx;
    }
    this.walkFrames[frameIdx].setVisible(true).setPosition(this.worldX, sy)
      .setDepth(this.groundY).setScale(sx, sx).setAlpha(alpha);
  }

  _hideWalkFrame() {
    if (this._activeFrameIdx >= 0) {
      this.walkFrames[this._activeFrameIdx].setVisible(false);
      this._activeFrameIdx = -1;
    }
  }

  _hideSwingFrame() {
    if (this._activeSwingIdx >= 0) {
      this.swingFrames?.[this._activeSwingIdx].setVisible(false);
      this._activeSwingIdx = -1;
    }
  }

  _setVisible(v) {
    super._setVisible(v);
    if (this.walkFrames) {
      this.walkFrames.forEach((f, i) => f.setVisible(v && i === this._activeFrameIdx));
    }
    if (this.swingFrames) {
      this.swingFrames.forEach((f, i) => f.setVisible(v && i === this._activeSwingIdx));
    }
    if (this.downFrames) {
      this.downFrames.right.setVisible(v && this.isKO && this.facing === 'right');
      this.downFrames.left.setVisible(v && this.isKO && this.facing === 'left');
    }
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites) {
      const all = [
        ...(this.walkFrames  || []),
        ...(this.swingFrames || []),
        ...Object.values(this.downFrames || {}),
      ];
      all.forEach(f => f.setTint(color));
      this.scene.time.delayedCall(200, () => {
        if (this.active) all.forEach(f => f.clearTint());
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  _findNearestEnemy(enemies) {
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (!e.active || e.state === 'dead') continue;
      const d = this._dist(e);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  _dist(e) {
    const dx = e.worldX - this.worldX;
    const dy = (e.groundY - this.groundY) * 0.5;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy() {
    super.destroy();
    this.walkFrames?.forEach(f => f.destroy());
    this.swingFrames?.forEach(f => f.destroy());
    if (this.downFrames) Object.values(this.downFrames).forEach(f => f.destroy());
  }
}

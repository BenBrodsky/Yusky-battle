import { Character } from './Character.js';
import { Projectile } from './Projectile.js';
import { MELEE_RANGE, FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

const WALK_FRAME_MS    = 130;
const BASE_SPRITE_H    = 144; // display height at mid-floor (scales with depth)
const DEPTH_SCALE_MIN  = 0.6; // scale at FLOOR_TOP (far away)
const DEPTH_SCALE_MAX  = 1.3; // scale at FLOOR_BOTTOM (close up)
// 6-frame walk cycle per direction, plus idle (legs together) and jump
const WALK_SPRITE_KEYS = [
  'miles_walk_r1', 'miles_walk_r2', 'miles_walk_r3', 'miles_walk_r4',
  'miles_walk_r5', 'miles_walk_r6', 'miles_idle_r',  'miles_jump_r',
  'miles_walk_l1', 'miles_walk_l2', 'miles_walk_l3', 'miles_walk_l4',
  'miles_walk_l5', 'miles_walk_l6', 'miles_idle_l',  'miles_jump_l',
];
const FRAMES_PER_DIR = 8;
const IDLE_FRAME     = 6;
const JUMP_FRAME     = 7;
// Classic 4-beat walk: stride-A, feet pass, stride-B, feet pass.
// Frames 3 (near-duplicate of 4) and 6 (knee-up fist pump) are skipped —
// they broke the gait rhythm.
const WALK_SEQUENCE  = [0, 1, 3, 4];

// Miles — punch/kick close combat, soccer ball boomerang, nuclear super mode.
export class Miles extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);

    this.ballActive  = false;
    this.nuclear     = 0;   // 0–1 charge
    this.superActive = false;
    this.superTimer  = 0;

    // Walk sprite — overlays the placeholder rectangle when textures are loaded
    this._initWalkSprite();
  }

  _initWalkSprite() {
    this._hasSprites = WALK_SPRITE_KEYS.every(k => this.scene.textures.exists(k));
    if (!this._hasSprites) return;

    // One image per frame — toggle visibility instead of swapping textures (avoids white flash)
    this.walkFrames = WALK_SPRITE_KEYS.map(key =>
      this.scene.add.image(this.worldX, this.groundY, key)
        .setOrigin(0.5, 1)
        .setVisible(false)
    );
    this.walkSprite = this.walkFrames[0]; // alias used by _setVisible / _flashTint
    this._activeFrameIdx = -1;

    this._hasDownSprite = this.scene.textures.exists('miles_down_r') &&
                          this.scene.textures.exists('miles_down_l');
    if (this._hasDownSprite) {
      this.downFrames = {
        right: this.scene.add.image(this.worldX, this.groundY, 'miles_down_r').setOrigin(0.5, 1).setVisible(false),
        left:  this.scene.add.image(this.worldX, this.groundY, 'miles_down_l').setOrigin(0.5, 1).setVisible(false),
      };
    }
  }

  // ── Attack / combat ───────────────────────────────────────────────

  onAttack(gameScene) {
    if (!gameScene) return;
    const nearEnemy = this._findNearestEnemy(gameScene.enemies);
    const dist      = nearEnemy ? this._dist(nearEnemy) : Infinity;

    if (dist > MELEE_RANGE && !this.ballActive) {
      const dir  = this.facing === 'right' ? 1 : -1;
      const dmg  = this.superActive ? this.config.ballDmg * this.config.superMult : this.config.ballDmg;
      const ball = new Projectile(
        this.scene, this.worldX + dir * 30, this.groundY,
        'soccer_ball', dir, dmg, 'soccer', this
      );
      gameScene.projectiles.push(ball);
      this.ballActive = true;
      ball.onReturn = () => { this.ballActive = false; };
    }
  }

  getAttackDamage() {
    const base = [14, 16, 20][this.comboStep] ?? 14;
    return this.superActive ? base * this.config.superMult : base;
  }

  hitConfirm() {
    super.hitConfirm();
    if (!this.superActive) {
      this.nuclear = Math.min(1, this.nuclear + this.config.superFill);
      if (this.nuclear >= 1) this._activateSuper();
    }
  }

  _activateSuper() {
    if (this.superActive) return;
    this.superActive = true;
    this.superTimer  = 8.0;
    this.nuclear     = 1;
    this._flashTint(0x00ff44, 0.4);
    this._popup('NUCLEAR!!!', 0x00ff44);
  }

  // ── Update ────────────────────────────────────────────────────────

  update(dt, input, gameScene) {
    if (this.superActive) {
      this.superTimer -= dt;
      if (this.superTimer <= 0) {
        this.superActive = false;
        this.nuclear     = 0;
      }
    }
    super.update(dt, input, gameScene);
  }

  // ── Sprites ───────────────────────────────────────────────────────

  _syncSprites() {
    super._syncSprites();

    // Super glow on placeholder sprite (also mirrors to walkSprite via alpha below)
    if (this.superActive) {
      const glow = 0.7 + Math.sin(Date.now() / 120) * 0.3;
      this.sprite.setAlpha(glow);
    }

    if (!this._hasSprites) return;

    const sy = this.groundY - this.jumpZ;

    // Hide placeholder rectangle and eyes; walkSprite takes over visually
    this.sprite.setVisible(false);
    this.eyeL.setVisible(false);
    this.eyeR.setVisible(false);

    // Depth scale: larger near bottom of screen (closer), smaller near top (farther)
    const depthT     = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
    const depthScale = DEPTH_SCALE_MIN + depthT * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN);
    // Note: deliberately NOT inheriting this.sprite's scale — the placeholder
    // attack pulse (grow/shrink) looks wrong on real sprite art
    const baseScale  = BASE_SPRITE_H / this.walkFrames[0].height;
    const sx         = baseScale * depthScale;
    const sy2        = baseScale * depthScale;
    const alpha      = this.sprite.alpha;

    // ── Knocked down: show the down pose while KO'd (stars from base) ──
    if (this.isKO && this._hasDownSprite) {
      if (this._activeFrameIdx >= 0) { this.walkFrames[this._activeFrameIdx].setVisible(false); this._activeFrameIdx = -1; }
      const down  = this.downFrames[this.facing];
      const other = this.downFrames[this.facing === 'right' ? 'left' : 'right'];
      other.setVisible(false);
      down.setVisible(true).setPosition(this.worldX, this.groundY)
        .setDepth(this.groundY).setScale(sx, sy2).setAlpha(alpha);
      return;
    } else if (this._hasDownSprite) {
      this.downFrames.right.setVisible(false);
      this.downFrames.left.setVisible(false);
    }

    // Airborne shows the jump tuck; 4-beat cycle while walking; idle otherwise
    const frameNum = !this.isGrounded()
      ? JUMP_FRAME
      : (this.state === 'walk')
        ? WALK_SEQUENCE[Math.floor(Date.now() / WALK_FRAME_MS) % WALK_SEQUENCE.length]
        : IDLE_FRAME;
    const dirOff   = this.facing === 'right' ? 0 : FRAMES_PER_DIR;
    const frameIdx = dirOff + frameNum;

    // Show only the active frame; hide the rest (no texture swap = no white flash)
    if (frameIdx !== this._activeFrameIdx) {
      if (this._activeFrameIdx >= 0) this.walkFrames[this._activeFrameIdx].setVisible(false);
      this._activeFrameIdx = frameIdx;
    }
    const frame = this.walkFrames[frameIdx];
    frame.setVisible(true).setPosition(this.worldX, sy).setDepth(this.groundY)
      .setScale(sx, sy2).setAlpha(alpha);
  }

  _setVisible(v) {
    super._setVisible(v);
    if (this.walkFrames) {
      // Only show the active frame; hide all others
      this.walkFrames.forEach((f, i) => f.setVisible(v && i === this._activeFrameIdx));
    }
    if (this.downFrames) {
      this.downFrames.right.setVisible(v && this.isKO && this.facing === 'right');
      this.downFrames.left.setVisible(v && this.isKO && this.facing === 'left');
    }
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites && this.walkFrames) {
      const all = [...this.walkFrames, ...Object.values(this.downFrames || {})];
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

  _popup(text, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.scene.add.text(
      this.worldX, this.groundY - this.config.height - 30, text,
      { fontSize: '18px', fill: hex, stroke: '#000', strokeThickness: 4 }
    ).setOrigin(0.5).setDepth(1000);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 900,
      onComplete: () => txt.destroy(),
    });
  }

  destroy() {
    super.destroy();
    this.walkFrames?.forEach(f => f.destroy());
    if (this.downFrames) Object.values(this.downFrames).forEach(f => f.destroy());
  }
}

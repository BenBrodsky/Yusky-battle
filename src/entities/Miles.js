import { Character } from './Character.js';
import { Projectile } from './Projectile.js';
import { MELEE_RANGE, FLOOR_TOP, FLOOR_BOTTOM } from '../config/constants.js';

const WALK_FRAME_MS    = 160;
const BASE_SPRITE_H    = 160; // display height at mid-floor (scales with depth)
const DEPTH_SCALE_MIN  = 0.6; // scale at FLOOR_TOP (far away)
const DEPTH_SCALE_MAX  = 1.3; // scale at FLOOR_BOTTOM (close up)
const WALK_SPRITE_KEYS = [
  'miles_walk_r1', 'miles_walk_r2', 'miles_walk_r3',
  'miles_walk_l1', 'miles_walk_l2', 'miles_walk_l3',
];
// Pendulum pattern: 1→2→3→2→1→... maps to indices 0,1,2,1,0,1,...
const WALK_SEQUENCE = [0, 1, 2, 1];

// Miles — punch/kick close combat, soccer ball boomerang, nuclear super mode.
export class Miles extends Character {
  constructor(scene, worldX, groundY, config, playerIndex) {
    super(scene, worldX, groundY, config, playerIndex);

    this.ballActive  = false;
    this.nuclear     = 0;   // 0–1 charge
    this.superActive = false;
    this.superTimer  = 0;

    // Nuclear meter bar (shown above head)
    this.nuclearBg  = this.scene.add.rectangle(0, 0, config.width, 5, 0x004400);
    this.nuclearBar = this.scene.add.rectangle(0, 0, 0, 5, 0x00ff44);

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

    // Nuclear bar
    const sy = this.groundY - this.jumpZ;
    const bx = this.worldX;
    const by = sy - this.config.height - 22;
    this.nuclearBg.x  = bx;
    this.nuclearBg.y  = by;
    this.nuclearBar.width = this.config.width * this.nuclear;
    this.nuclearBar.x = bx - (this.config.width - this.config.width * this.nuclear) / 2;
    this.nuclearBar.y = by;
    this.nuclearBg.setDepth(this.groundY + 2);
    this.nuclearBar.setDepth(this.groundY + 2);

    // Super glow on placeholder sprite (also mirrors to walkSprite via alpha below)
    if (this.superActive) {
      const glow = 0.7 + Math.sin(Date.now() / 120) * 0.3;
      this.sprite.setAlpha(glow);
    }

    if (!this._hasSprites) return;

    // Hide placeholder rectangle and eyes; walkSprite takes over visually
    this.sprite.setVisible(false);
    this.eyeL.setVisible(false);
    this.eyeR.setVisible(false);

    // Depth scale: larger near bottom of screen (closer), smaller near top (farther)
    const depthT     = Math.max(0, Math.min(1, (this.groundY - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP)));
    const depthScale = DEPTH_SCALE_MIN + depthT * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN);
    const baseScale  = BASE_SPRITE_H / this.walkFrames[0].height;
    const sx         = baseScale * depthScale * this.sprite.scaleX;
    const sy2        = baseScale * depthScale * this.sprite.scaleY;
    const alpha      = this.sprite.alpha;

    // Pendulum walk: 1→2→3→2→1→... idle holds legs-together frame (index 2)
    const frameNum = (this.state === 'walk')
      ? WALK_SEQUENCE[Math.floor(Date.now() / WALK_FRAME_MS) % WALK_SEQUENCE.length]
      : 2;
    const dirOff   = this.facing === 'right' ? 0 : 3; // r: 0-2, l: 3-5
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
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites && this.walkFrames) {
      this.walkFrames.forEach(f => f.setTint(color));
      this.scene.time.delayedCall(200, () => {
        if (this.active) this.walkFrames.forEach(f => f.clearTint());
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
    this.nuclearBg.destroy();
    this.nuclearBar.destroy();
    this.walkFrames?.forEach(f => f.destroy());
  }
}

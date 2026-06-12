import { Character } from './Character.js';
import { Projectile } from './Projectile.js';
import { MELEE_RANGE } from '../config/constants.js';

const WALK_FRAME_MS  = 160; // ms per walk animation frame
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

    this.walkSprite = this.scene.add.image(this.worldX, this.groundY, 'miles_walk_r1')
      .setOrigin(0.5, 1);

    // Scale so the sprite height matches the character config height
    const scale = this.config.height / this.walkSprite.height;
    this.walkSprite.setScale(scale);
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

    // Position — bottom-anchored at feet
    this.walkSprite.x = this.worldX;
    this.walkSprite.y = sy;
    this.walkSprite.setDepth(this.groundY);

    // Mirror alpha (KO blink + invuln flicker + super glow all live on this.sprite.alpha)
    this.walkSprite.setAlpha(this.sprite.alpha);

    // Mirror attack-pulse scale on top of the base fit-to-height scale
    const baseScale = this.config.height / this.walkSprite.height;
    this.walkSprite.setScale(baseScale * this.sprite.scaleX, baseScale * this.sprite.scaleY);

    // Pendulum walk: 1→2→3→2→1→... idle holds frame 1
    const seqIdx = (this.state === 'walk')
      ? Math.floor(Date.now() / WALK_FRAME_MS) % WALK_SEQUENCE.length
      : 0;
    const frameNum = WALK_SEQUENCE[seqIdx] + 1;
    const dir = this.facing === 'right' ? 'r' : 'l';
    const key = `miles_walk_${dir}${frameNum}`;
    if (this.walkSprite.texture.key !== key) this.walkSprite.setTexture(key);
  }

  _setVisible(v) {
    super._setVisible(v);
    this.walkSprite?.setVisible(v);
  }

  _flashTint(color, duration) {
    super._flashTint(color, duration);
    if (this._hasSprites && this.walkSprite) {
      this.walkSprite.setTint(color);
      this.scene.time.delayedCall(200, () => {
        if (this.active && this.walkSprite?.active) this.walkSprite.clearTint();
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
    this.walkSprite?.destroy();
  }
}

import { GAME_WIDTH } from '../config/constants.js';

// Range constants (in world pixels)
const TENNIS_RANGE = Math.round(GAME_WIDTH * (2 / 3)); // ~853px — long lob
const SOCCER_RANGE = Math.round(GAME_WIDTH * (1 / 3)); // ~427px — hard low drive

export class Projectile {
  constructor(scene, worldX, groundY, textureKey, dir, damage, kind, owner) {
    this.scene     = scene;
    this.worldX    = worldX;
    this.groundY   = groundY;
    this.dir       = dir;
    this.damage    = damage;
    this.kind      = kind;   // 'tennis' | 'soccer'
    this.owner     = owner;
    this.active    = true;
    this.returning = false;
    this.onReturn  = null;

    this.launchX  = worldX;
    this.maxRange = kind === 'tennis' ? TENNIS_RANGE : SOCCER_RANGE;

    const speed  = kind === 'soccer' ? 540 : 460;
    this.velX    = dir * speed;
    this.hitEnemies = new Set();

    const hasTexture = textureKey && scene.textures.exists(textureKey);
    if (hasTexture) {
      this.sprite = scene.add.image(worldX, groundY, textureKey)
        .setDisplaySize(kind === 'soccer' ? 30 : 18, kind === 'soccer' ? 30 : 18);
    } else {
      this.sprite = scene.add.circle(
        worldX, groundY,
        kind === 'soccer' ? 10 : 8,
        kind === 'soccer' ? 0xffffff : 0xddff00
      );
    }
    this.sprite.setDepth(groundY + 5);

    const shadowW = kind === 'soccer' ? 28 : 18;
    this.shadow = scene.add.ellipse(worldX, groundY + 2, shadowW, shadowW * 0.35, 0x000000, 0.28);
    this.shadow.setDepth(groundY - 1);
  }

  update(dt, _gameScene) {
    if (!this.active) return;

    if (this.returning) {
      const dx    = this.owner.worldX - this.worldX;
      this.velX   = Math.sign(dx) * 520;
      this.worldX += this.velX * dt;
      if (Math.abs(dx) < 30) { this._return(); return; }
    } else {
      this.worldX += this.velX * dt;

      // Turn around once max range is reached
      const traveled = Math.abs(this.worldX - this.launchX);
      if (traveled >= this.maxRange) {
        this.returning = true;
        this.velX      = -this.velX;
      }
    }

    this._syncSprite();
  }

  overlaps(entity) {
    if (!this.active) return false;
    const dx = Math.abs(this.worldX - entity.worldX);
    const dy = Math.abs(this.groundY - entity.groundY) * 0.5;
    return Math.sqrt(dx * dx + dy * dy) < 40;
  }

  onHitEnemy(enemy) {
    if (this.hitEnemies.has(enemy)) return;
    this.hitEnemies.add(enemy);
    // Tennis ball bounces back on first hit; soccer ball punches through
    if (this.kind === 'tennis' && !this.returning) {
      this.returning = true;
      this.velX      = -this.velX * 0.75;
    }
  }

  _return() {
    this.active = false;
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.onReturn) this.onReturn();
  }

  _syncSprite() {
    this.sprite.x = this.worldX;
    this.sprite.y = this.groundY;
    this.sprite.setDepth(this.groundY + 5);
    this.shadow.x = this.worldX;
    this.shadow.y = this.groundY + 4;

    if (this.kind === 'soccer') {
      this.sprite.rotation += 0.12 * Math.sign(this.velX);
    }
  }
}

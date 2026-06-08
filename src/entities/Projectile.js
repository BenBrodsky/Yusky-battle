import { GAME_WIDTH } from '../config/constants.js';

// A tennis ball or soccer ball that travels, hits enemies, then returns.
export class Projectile {
  constructor(scene, worldX, groundY, textureKey, dir, damage, kind, owner) {
    this.scene    = scene;
    this.worldX   = worldX;
    this.groundY  = groundY;
    this.dir      = dir;   // 1 = right, -1 = left
    this.damage   = damage;
    this.kind     = kind;  // 'tennis' | 'soccer'
    this.owner    = owner;
    this.active   = true;
    this.returning = false;
    this.onReturn  = null; // callback when picked up by owner

    const speed   = kind === 'soccer' ? 520 : 480;
    this.velX     = dir * speed;
    this.lifetime = 3.5; // max seconds before auto-return
    this.hitEnemies = new Set(); // prevent double-hitting

    this.sprite = scene.add.circle(worldX, groundY, kind === 'soccer' ? 10 : 8,
      kind === 'soccer' ? 0xffffff : 0xddff00
    );
    this.sprite.setDepth(groundY + 5);

    // Shadow
    this.shadow = scene.add.ellipse(worldX, groundY + 2, 20, 8, 0x000000, 0.25);
    this.shadow.setDepth(groundY - 1);
  }

  update(dt, gameScene) {
    if (!this.active) return;

    this.lifetime -= dt;

    if (this.returning) {
      // Home toward owner
      const dx = this.owner.worldX - this.worldX;
      const speed = 500;
      this.velX = Math.sign(dx) * speed;
      this.worldX += this.velX * dt;

      const ownerDist = Math.abs(this.worldX - this.owner.worldX);
      if (ownerDist < 30) {
        this._return();
        return;
      }
    } else {
      this.worldX += this.velX * dt;

      // Bounce off right edge of camera view
      const camRight = gameScene.cameras.main.scrollX + GAME_WIDTH;
      if (this.worldX > camRight - 20 || this.lifetime < 1.5) {
        this.returning = true;
        this.velX = -this.velX;
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
    // Soccer ball keeps going after hitting; tennis ball starts returning
    if (this.kind === 'tennis' && !this.returning) {
      this.returning = true;
      this.velX = -this.velX * 0.7;
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

    // Spin soccer ball
    if (this.kind === 'soccer') {
      this.sprite.rotation += 0.1 * Math.sign(this.velX);
    }
  }
}

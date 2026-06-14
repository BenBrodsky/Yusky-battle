import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FLOOR_TOP, FLOOR_BOTTOM, CHAR_CONFIGS } from '../config/constants.js';
import { LEVEL_1 } from '../config/levels.js';
import { InputManager } from '../input/InputManager.js';
import { Ben   } from '../entities/Ben.js';
import { Linda } from '../entities/Linda.js';
import { Miles } from '../entities/Miles.js';
import { Ocean } from '../entities/Ocean.js';
import { MeanKid, BullyKing } from '../entities/MeanKid.js';

const CHAR_CLASS = { ben: Ben, linda: Linda, miles: Miles, ocean: Ocean };

// Axis-aligned bounding-box overlap check
function boxOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) < (a.h + b.h) / 2
  );
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  preload() {
    const key = LEVEL_1.bgImage;
    if (key) this.load.image(key, `${key}.png`);
    this.load.audio('level1-music', 'level1-music.mp3');
    this.load.audio('boss-music',   'boss-music.mp3');
    // Miles 6-frame walk cycle + idle, per direction
    for (let i = 1; i <= 6; i++) {
      this.load.image(`miles_walk_r${i}`, `miles/miles-walk-r${i}.png`);
      this.load.image(`miles_walk_l${i}`, `miles/miles-walk-l${i}.png`);
    }
    this.load.image('miles_idle_r', 'miles/miles-idle-r.png');
    this.load.image('miles_idle_l', 'miles/miles-idle-l.png');
    this.load.image('miles_jump_r', 'miles/miles-jump-r.png');
    this.load.image('miles_jump_l', 'miles/miles-jump-l.png');
    this.load.image('miles_down_r', 'miles/miles-down-r.png');
    this.load.image('miles_down_l', 'miles/miles-down-l.png');
    this.load.image('soccer_ball',  'miles/soccer-ball.png');
    // Ben 8-frame walk cycle + idle + jump, per direction
    for (let i = 1; i <= 8; i++) {
      this.load.image(`ben_walk_r${i}`, `ben/ben-walk-r${i}.png`);
      this.load.image(`ben_walk_l${i}`, `ben/ben-walk-l${i}.png`);
    }
    this.load.image('ben_idle_r', 'ben/ben-idle-r.png');
    this.load.image('ben_idle_l', 'ben/ben-idle-l.png');
    this.load.image('ben_jump_r', 'ben/ben-jump-r.png');
    this.load.image('ben_jump_l', 'ben/ben-jump-l.png');
    this.load.image('ben_down_r', 'ben/ben-down-r.png');
    this.load.image('ben_down_l', 'ben/ben-down-l.png');
    // Ben punches: 3-frame jab + 3-frame cross, per direction
    for (let i = 1; i <= 3; i++) {
      this.load.image(`ben_jab_r${i}`,   `ben/ben-jab-r${i}.png`);
      this.load.image(`ben_jab_l${i}`,   `ben/ben-jab-l${i}.png`);
      this.load.image(`ben_cross_r${i}`, `ben/ben-cross-r${i}.png`);
      this.load.image(`ben_cross_l${i}`, `ben/ben-cross-l${i}.png`);
    }
    // Ocean 6-frame walk cycle + idle + jump, per direction
    for (let i = 1; i <= 6; i++) {
      this.load.image(`ocean_walk_r${i}`, `ocean/ocean-walk-r${i}.png`);
      this.load.image(`ocean_walk_l${i}`, `ocean/ocean-walk-l${i}.png`);
    }
    this.load.image('ocean_idle_r', 'ocean/ocean-idle-r.png');
    this.load.image('ocean_idle_l', 'ocean/ocean-idle-l.png');
    this.load.image('ocean_jump_r', 'ocean/ocean-jump-r.png');
    this.load.image('ocean_jump_l', 'ocean/ocean-jump-l.png');
    this.load.image('ocean_sleep',  'ocean/ocean-sleep.png');
    this.load.image('ocean_down_r', 'ocean/ocean-down-r.png');
    this.load.image('ocean_down_l', 'ocean/ocean-down-l.png');
    for (let i = 1; i <= 6; i++) {
      this.load.image(`ocean_attack_r${i}`, `ocean/ocean-attack-r${i}.png`);
      this.load.image(`ocean_attack_l${i}`, `ocean/ocean-attack-l${i}.png`);
    }
  }

  init(data) {
    this.playerConfigs  = data.playerConfigs || [];
    this.currentLevel   = LEVEL_1;
    this.familyCards    = 0;
    this.bossEnemy      = null;
    this.levelMusic     = null;
    this.bossMusic      = null;
  }

  create() {
    const levelData   = this.currentLevel;
    const worldWidth  = levelData.worldWidth;

    this.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);

    // ---- Background ----
    this._buildBackground(levelData, worldWidth);

    // ---- Players ----
    this.players    = [];
    this.koRespawnTimers = [];

    this.playerConfigs.forEach((cfg, i) => {
      const Cls    = CHAR_CLASS[cfg.characterKey];
      const config = CHAR_CONFIGS[cfg.characterKey];
      const spawnX = 120 + i * 70;
      const spawnY = FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * 0.6;
      const player = new Cls(this, spawnX, spawnY, config, i);
      this.players.push(player);
      this.koRespawnTimers.push(0);
    });

    // ---- Input ----
    this.inputManager = new InputManager(this, this.playerConfigs);

    // ---- Enemies / Projectiles / Pickups ----
    this.enemies     = [];
    this.projectiles = [];
    this.pickups     = [];

    // Spawn data cursor
    this.spawnEntries    = [...levelData.entries];
    this.nextEntryIdx    = 0;
    this.gateX           = Infinity; // camera won't pass this
    this.activeGateEntry = null;

    // ---- Listen for events ----
    this.events.on('enemyDefeated',   this._onEnemyDefeated,   this);
    this.events.on('playerKO',        this._onPlayerKO,        this);
    this.events.on('playerDespawned', this._onPlayerDespawned, this);
    this.events.on('bossDefeated',    this._onBossDefeated,    this);

    // ---- Launch HUD overlay ----
    if (!this.scene.isActive('HUD')) this.scene.launch('HUD');

    // ---- Music ----
    this.levelMusic = this.sound.add('level1-music', { loop: true, volume: 0.75 });
    this.levelMusic.play();
  }

  // ── Build level background ──────────────────────────────────────────

  _buildBackground(levelData, worldWidth) {
    const key = levelData.bgImage;

    if (key && this.textures.exists(key)) {
      // Display once across the full world width — no tiling
      this.add.image(worldWidth / 2, GAME_HEIGHT / 2, key)
        .setDisplaySize(worldWidth, GAME_HEIGHT)
        .setDepth(-10);
    } else {
      // Fallback: programmatic gradient + ground
      const { bgColor, groundColor } = levelData;
      const sky = this.add.graphics();
      sky.fillGradientStyle(bgColor, bgColor, 0x4488cc, 0x4488cc, 1);
      sky.fillRect(0, 0, worldWidth, FLOOR_TOP);
      sky.setDepth(-10);

      const gnd = this.add.graphics();
      gnd.fillStyle(groundColor, 1);
      gnd.fillRect(0, FLOOR_TOP, worldWidth, GAME_HEIGHT - FLOOR_TOP);
      gnd.setDepth(-9);

      const deco = this.add.graphics();
      deco.fillStyle(0x335577, 0.5);
      for (let x = 0; x < worldWidth; x += 200) {
        const h = Phaser.Math.Between(60, 140);
        deco.fillRect(x + 20, FLOOR_TOP - h, 60, h);
        deco.fillRect(x + 120, FLOOR_TOP - h * 0.7, 40, h * 0.7);
      }
      deco.setDepth(-7);
    }

    // Subtle depth-lane lines
    const lines = this.add.graphics();
    lines.lineStyle(1, 0x000000, 0.07);
    for (let y = FLOOR_TOP; y <= FLOOR_BOTTOM; y += 30) {
      lines.lineBetween(0, y, worldWidth, y);
    }
    lines.setDepth(-8);
  }

  // ── Main update ────────────────────────────────────────────────────

  update(time, delta) {
    const dt = delta / 1000;

    this.inputManager.update();

    // Trigger spawns based on camera position
    this._checkSpawns();

    // Update players
    this.players.forEach((player, i) => {
      if (!player || !player.active) return;
      const input = this.playerConfigs[i]?.isCPU
        ? this._cpuInput(player)
        : this.inputManager.getInput(i);
      player.update(dt, input, this);
    });

    // Update enemies
    this.enemies.forEach(e => e.update(dt, this));

    // Update projectiles
    this.projectiles.forEach(p => p.update(dt, this));

    // Collisions
    this._checkHits();
    this._checkPickups();
    this._checkHugs();

    // Camera
    this._updateCamera();

    // Clean up inactive objects
    this._cleanup();
  }

  // ── Spawning ────────────────────────────────────────────────────────

  _checkSpawns() {
    const camRight = this.cameras.main.scrollX + GAME_WIDTH;

    while (this.nextEntryIdx < this.spawnEntries.length) {
      const entry = this.spawnEntries[this.nextEntryIdx];
      if (camRight < entry.triggerX) break;

      if (entry.type === 'gate') {
        this.gateX           = entry.gateX;
        this.activeGateEntry = entry;
        entry.enemies.forEach(e => this._spawnEnemy(e));
      } else if (entry.type === 'pickup') {
        this._spawnPickup(entry);
      }
      this.nextEntryIdx++;
    }
  }

  _spawnEnemy(def) {
    let enemy;
    if (def.kind === 'bullykng') {
      enemy = new BullyKing(this, def.x, def.y);
      this.bossEnemy = enemy;
      this._startBossMusic();
    } else {
      enemy = new MeanKid(this, def.x, def.y);
    }
    this.enemies.push(enemy);
  }

  _startBossMusic() {
    if (this.levelMusic?.isPlaying) {
      this.tweens.add({
        targets: this.levelMusic, volume: 0, duration: 2500,
        onComplete: () => this.levelMusic?.stop(),
      });
    }
    if (this.cache.audio.exists('boss-music')) {
      this.bossMusic = this.sound.add('boss-music', { loop: true, volume: 0 });
      this.bossMusic.play();
      this.tweens.add({ targets: this.bossMusic, volume: 0.75, duration: 2500 });
    }
  }

  _spawnPickup(def) {
    const sprite = this.add.image(def.x, def.y, def.kind);
    sprite.setDepth(def.y + 3);
    sprite.kind  = def.kind;

    // Gentle bob tween
    this.tweens.add({
      targets: sprite, y: def.y - 8, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.pickups.push(sprite);
  }

  // ── Collision ──────────────────────────────────────────────────────

  _checkHits() {
    // Player attacks → enemies
    this.players.forEach(player => {
      if (!player?.active || player.isKO) return;
      const hitbox = player.getAttackHitbox();
      if (!hitbox) return;

      this.enemies.forEach(enemy => {
        if (!enemy.active || enemy.state === 'dead' || enemy.hitThisAttack) return;
        if (boxOverlap(hitbox, enemy.getHurtbox())) {
          const dmg = player.getAttackDamage();
          enemy.takeDamage(dmg, hitbox.knockbackX ?? 0);
          player.hitConfirm();
        }
      });
    });

    // Projectiles → enemies (a soccer ball at rest is harmless)
    this.projectiles.forEach(proj => {
      if (!proj.active || proj.loose) return;
      this.enemies.forEach(enemy => {
        if (!enemy.active || enemy.state === 'dead') return;
        if (proj.overlaps(enemy) && !proj.hitEnemies.has(enemy)) {
          enemy.takeDamage(proj.damage, Math.sign(proj.velX));
          proj.onHitEnemy(enemy);
        }
      });
    });

    // Enemy attacks → players
    this.enemies.forEach(enemy => {
      const hitbox = enemy.getAttackHitbox();
      if (!hitbox || enemy.hitThisAttack) return;

      this.players.forEach(player => {
        if (!player?.active || player.isKO || player.invulnTimer > 0) return;
        if (boxOverlap(hitbox, player.getHurtbox())) {
          player.takeDamage(enemy.damage, hitbox.knockbackX ?? 0);
          enemy.hitThisAttack = true;
        }
      });
    });
  }

  _checkPickups() {
    this.pickups.forEach((pickup, idx) => {
      if (!pickup.active) return;

      this.players.forEach(player => {
        if (!player?.active || player.isKO) return;

        const dx = Math.abs(player.worldX - pickup.x);
        const dy = Math.abs(player.groundY - pickup.y);
        if (dx > 45 || dy > 45) return;

        this._applyPickup(player, pickup.kind);
        pickup.destroy();
        pickup.active = false;
        this.pickups[idx] = null;
      });
    });
    this.pickups = this.pickups.filter(p => p !== null);
  }

  _applyPickup(player, kind) {
    switch (kind) {
      case 'chocolate':
        if (player.config.key === 'ocean') {
          player.energy = Math.min(player.config.maxEnergy, player.energy + 50);
          player.heal(15);
        } else {
          player.heal(20);
        }
        break;
      case 'chicken':
        player.heal(40);
        break;
      case 'tvset':
        if (player.config.key === 'miles') player.heal(35);
        else player.heal(18);
        break;
      case 'family_card':
        this.familyCards = Math.min(9, this.familyCards + 1);
        this._showCardPopup();
        break;
    }
  }

  _showCardPopup() {
    const W   = GAME_WIDTH;
    const txt = this.add.text(W / 2, FLOOR_TOP - 40, `Family Card! (${this.familyCards})`, {
      fontSize: '22px', fill: '#ffd700', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500);
    this.tweens.add({
      targets: txt, y: txt.y - 50, alpha: 0, duration: 1200,
      onComplete: () => txt.destroy(),
    });
  }

  _checkHugs() {
    this.players.forEach((player, i) => {
      if (!player?.active || player.isKO) return;
      const input = this.inputManager.getInput(i);
      if (!input.hugJust) return;

      this.players.forEach((other, j) => {
        if (i === j || !other?.active || other.isKO) return;
        const dx = Math.abs(player.worldX - other.worldX);
        const dy = Math.abs(player.groundY - other.groundY) * 0.5;
        if (Math.sqrt(dx * dx + dy * dy) > 80) return;

        // Both characters hug — heal if applicable
        if (player.config.key === 'ben' || player.config.key === 'linda') {
          player.receiveHug();
        } else {
          player.heal(10);
        }
        if (other.config.key === 'ben' || other.config.key === 'linda') {
          other.receiveHug();
        } else {
          other.heal(10);
        }

        // Heart particle burst
        this._heartBurst((player.worldX + other.worldX) / 2, player.groundY - 40);
      });
    });
  }

  _heartBurst(x, y) {
    for (let i = 0; i < 6; i++) {
      const heart = this.add.text(x, y, '♥', {
        fontSize: '22px', fill: '#ff44aa',
      }).setOrigin(0.5).setDepth(900);
      const angle = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      this.tweens.add({
        targets: heart,
        x: x + Math.cos(angle) * 50,
        y: y + Math.sin(angle) * 50,
        alpha: 0,
        duration: 700,
        onComplete: () => heart.destroy(),
      });
    }
  }

  // ── Camera ─────────────────────────────────────────────────────────

  _updateCamera() {
    const active = this.players.filter(p => p?.active && !p.isKO);
    if (active.length === 0) return;

    const maxX = Math.max(...active.map(p => p.worldX));
    const minX = Math.min(...active.map(p => p.worldX));
    const avgX = (maxX + minX) / 2;

    let targetScroll = avgX - GAME_WIDTH / 2;

    // Gate lock: don't advance if enemies are alive in current gate
    const enemiesAlive = this.enemies.some(e => e.active && e.state !== 'dead');
    if (enemiesAlive && this.gateX < Infinity) {
      targetScroll = Math.min(targetScroll, this.gateX - GAME_WIDTH * 0.75);
    }

    // Never scroll backward
    targetScroll = Math.max(targetScroll, this.cameras.main.scrollX - 2);
    targetScroll = Phaser.Math.Clamp(targetScroll, 0, this.currentLevel.worldWidth - GAME_WIDTH);

    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX, targetScroll, 0.07
    );
  }

  // ── CPU basic AI ───────────────────────────────────────────────────

  _cpuInput(player) {
    const nearEnemy = this._nearestActiveEnemy(player);
    const input     = {
      left: false, right: false, up: false, down: false,
      jump: false, attack: false, hug: false, start: false,
      jumpJust: false, attackJust: false, hugJust: false, startJust: false,
    };
    if (!nearEnemy) return input;

    const dx  = nearEnemy.worldX - player.worldX;
    const dy  = nearEnemy.groundY - player.groundY;
    const dist = Math.abs(dx);

    if (dist > 80)  { input.right = dx > 0; input.left = dx < 0; }
    if (Math.abs(dy) > 30) { input.down = dy > 0; input.up = dy < 0; }
    if (dist < 100 && Math.random() < 0.04) input.attackJust = true;

    return input;
  }

  _nearestActiveEnemy(player) {
    let best = null, bestDist = Infinity;
    for (const e of this.enemies) {
      if (!e.active || e.state === 'dead') continue;
      const d = Math.hypot(e.worldX - player.worldX, e.groundY - player.groundY);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  // ── Events ─────────────────────────────────────────────────────────

  _onEnemyDefeated(enemy) {
    const alive = this.enemies.filter(e => e.active && e.state !== 'dead');
    if (alive.length === 0) {
      // All enemies cleared — open the gate
      this.gateX = Infinity;
      this._showMessage('CLEARED!', 0x44ff44, 1200);
    }
  }

  _onPlayerKO(playerIndex) {
    // Game over is now deferred to _onPlayerDespawned (fires only when lives run out)
  }

  _onPlayerDespawned(playerIndex) {
    const anyLeft = this.players.some(p => p?.active);
    if (!anyLeft) {
      this.time.delayedCall(1500, () => this._gameOver());
    }
  }

  _onBossDefeated() {
    if (this.bossMusic?.isPlaying) {
      this.tweens.add({ targets: this.bossMusic, volume: 0, duration: 1500, onComplete: () => this.bossMusic?.stop() });
    }
    this._showMessage('STAGE CLEAR!', 0xffdd00, 2000);
    this.time.delayedCall(3000, () => this._stageComplete());
  }

  _gameOver() {
    this.levelMusic?.stop();
    this.bossMusic?.stop();
    this.scene.stop('HUD');
    this.scene.start('Title');
  }

  _stageComplete() {
    this.levelMusic?.stop();
    this.bossMusic?.stop();
    this.scene.stop('HUD');
    this.scene.start('Title');
  }

  _showMessage(text, color, duration = 1500) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, text, {
      fontSize: '52px', fontStyle: 'bold',
      fill: hex, stroke: '#000000', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.tweens.add({
      targets: msg, alpha: 0, delay: duration - 400, duration: 400,
      onComplete: () => msg.destroy(),
    });
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  _cleanup() {
    this.enemies     = this.enemies.filter(e => e.active);
    this.projectiles = this.projectiles.filter(p => p.active);
  }
}

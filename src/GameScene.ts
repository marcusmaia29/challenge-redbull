import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Constantes de balanceamento. Ajuste estes valores para calibrar a partida.
// ---------------------------------------------------------------------------

const MATCH_DURATION_SECONDS = 60;

const PLAYER_SPEED = 620;
const PLAYER_BOTTOM_OFFSET = 90; // distancia do jogador ate a base da tela
const POINTER_DEAD_ZONE = 12; // evita tremer quando o toque esta sobre o jogador

const CAN_SPAWN_INTERVAL = 550; // ms entre latas
const CAN_MIN_FALL_SPEED = 280;
const CAN_MAX_FALL_SPEED = 430;

const BOMB_SPAWN_INTERVAL = 2400; // ms entre bombas (bem menos frequentes)
const BOMB_MIN_FALL_SPEED = 320;
const BOMB_MAX_FALL_SPEED = 470;
const BOMB_PENALTY = 5;

const STREAK_FOR_POWERUP = 10;
const POWERUP_DURATION = 5000; // ms
const POWERUP_MULTIPLIER = 2;

const SPAWN_MARGIN = 60; // impede spawn colado nas bordas

// Tamanhos dos placeholders. Ao trocar por PNG, viram apenas referencia.
const PLAYER_WIDTH = 120;
const PLAYER_HEIGHT = 90;
const CAN_WIDTH = 46;
const CAN_HEIGHT = 78;
const BOMB_RADIUS = 28;

/**
 * Sabores disponiveis. Cada item gera uma textura placeholder `can-<id>`.
 * Quando os PNGs definitivos chegarem, carregue-os no preload() usando
 * exatamente essas mesmas chaves e apague createPlaceholderTextures():
 * o resto da logica continua funcionando sem alteracao.
 */
const CAN_TYPES = [
  { id: 'original', label: 'Original', color: 0x1c3f94 },
  { id: 'sugarfree', label: 'Sugar Free', color: 0xa8b0bd },
  { id: 'watermelon', label: 'Watermelon', color: 0xe0245e },
  { id: 'tropical', label: 'Tropical', color: 0xf2b705 },
];

/**
 * Cena principal: o jogador coleta latas e desvia de bombas durante 60s.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cans!: Phaser.Physics.Arcade.Group;
  private bombs!: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private powerUpText!: Phaser.GameObjects.Text;

  private score = 0;
  private streak = 0;
  private cansByType: Record<string, number> = {};
  private timeLeft = MATCH_DURATION_SECONDS;
  private powerUpActive = false;
  private matchOver = false;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    // Sem assets externos ainda. Os sprites definitivos (touro, latas, bomba,
    // background) serao carregados aqui.
  }

  create(): void {
    // O Phaser reaproveita a instancia da Scene entre partidas, entao todo
    // estado precisa ser reiniciado aqui, e nao na declaracao dos campos.
    this.score = 0;
    this.streak = 0;
    this.timeLeft = MATCH_DURATION_SECONDS;
    this.powerUpActive = false;
    this.matchOver = false;
    this.cansByType = {};
    CAN_TYPES.forEach((type) => {
      this.cansByType[type.id] = 0;
    });

    this.createPlaceholderTextures();
    this.createPlayer();
    this.createHud();

    this.cans = this.physics.add.group();
    this.bombs = this.physics.add.group();

    this.physics.add.overlap(this.player, this.cans, (_player, can) => {
      this.collectCan(can as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(this.player, this.bombs, (_player, bomb) => {
      this.hitBomb(bomb as Phaser.Physics.Arcade.Sprite);
    });

    this.cursors = this.input.keyboard?.createCursorKeys();

    this.time.addEvent({
      delay: CAN_SPAWN_INTERVAL,
      loop: true,
      callback: this.spawnCan,
      callbackScope: this,
    });

    this.time.addEvent({
      delay: BOMB_SPAWN_INTERVAL,
      loop: true,
      callback: this.spawnBomb,
      callbackScope: this,
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickClock,
      callbackScope: this,
    });

    this.refreshHud();
  }

  update(): void {
    if (this.matchOver) {
      return;
    }

    this.updatePlayerMovement();
    this.removeOffscreen(this.cans);
    this.removeOffscreen(this.bombs);
  }

  // --- setup -----------------------------------------------------------------

  /**
   * Gera as texturas provisorias em runtime. Para usar PNGs, basta carregar
   * arquivos com as mesmas chaves no preload() e remover este metodo.
   */
  private createPlaceholderTextures(): void {
    this.makeRectTexture('player', PLAYER_WIDTH, PLAYER_HEIGHT, 0xf5f5f5);
    this.makeRectTexture('player-power', PLAYER_WIDTH, PLAYER_HEIGHT, 0x35d07f);
    this.makeCircleTexture('bomb', BOMB_RADIUS, 0x11151c);

    CAN_TYPES.forEach((type) => {
      this.makeRectTexture(`can-${type.id}`, CAN_WIDTH, CAN_HEIGHT, type.color);
    });
  }

  private makeRectTexture(key: string, width: number, height: number, color: number): void {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(4, 0xffffff, 0.85);
    graphics.strokeRect(2, 2, width - 4, height - 4);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  private makeCircleTexture(key: string, radius: number, color: number): void {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.lineStyle(4, 0xff4b4b, 1);
    graphics.strokeCircle(radius, radius, radius - 2);
    graphics.generateTexture(key, radius * 2, radius * 2);
    graphics.destroy();
  }

  private createPlayer(): void {
    const { width, height } = this.scale;

    // Linha de chao apenas como referencia visual do cenario.
    this.add.rectangle(width / 2, height - 24, width, 6, 0x333a45);

    this.player = this.physics.add.sprite(width / 2, height - PLAYER_BOTTOM_OFFSET, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setImmovable(true);
  }

  private createHud(): void {
    const style = { fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff' };

    this.scoreText = this.add.text(24, 20, '', style);
    this.streakText = this.add.text(24, 60, '', { ...style, fontSize: '24px', color: '#b9c2cf' });
    this.timeText = this.add.text(this.scale.width - 24, 20, '', style).setOrigin(1, 0);

    this.powerUpText = this.add
      .text(this.scale.width / 2, 30, 'x2', { ...style, fontSize: '44px', color: '#35d07f' })
      .setOrigin(0.5, 0)
      .setVisible(false);
  }

  // --- loop da partida -------------------------------------------------------

  private updatePlayerMovement(): void {
    let velocity = 0;

    if (this.cursors?.left.isDown) {
      velocity = -PLAYER_SPEED;
    } else if (this.cursors?.right.isDown) {
      velocity = PLAYER_SPEED;
    } else {
      // Toque/clique: anda na direcao do ponteiro enquanto estiver pressionado.
      const pointer = this.input.activePointer;
      if (pointer.isDown) {
        const distance = pointer.worldX - this.player.x;
        if (Math.abs(distance) > POINTER_DEAD_ZONE) {
          velocity = distance < 0 ? -PLAYER_SPEED : PLAYER_SPEED;
        }
      }
    }

    this.player.setVelocityX(velocity);
  }

  private spawnCan(): void {
    if (this.matchOver) {
      return;
    }

    const type = Phaser.Utils.Array.GetRandom(CAN_TYPES);
    const x = Phaser.Math.Between(SPAWN_MARGIN, this.scale.width - SPAWN_MARGIN);

    const can = this.cans.create(x, -CAN_HEIGHT, `can-${type.id}`) as Phaser.Physics.Arcade.Sprite;
    can.setData('type', type.id);
    can.setVelocityY(Phaser.Math.Between(CAN_MIN_FALL_SPEED, CAN_MAX_FALL_SPEED));
  }

  private spawnBomb(): void {
    if (this.matchOver) {
      return;
    }

    const x = Phaser.Math.Between(SPAWN_MARGIN, this.scale.width - SPAWN_MARGIN);

    const bomb = this.bombs.create(x, -BOMB_RADIUS * 2, 'bomb') as Phaser.Physics.Arcade.Sprite;
    bomb.setVelocityY(Phaser.Math.Between(BOMB_MIN_FALL_SPEED, BOMB_MAX_FALL_SPEED));
  }

  private collectCan(can: Phaser.Physics.Arcade.Sprite): void {
    if (this.matchOver) {
      return;
    }

    const type = can.getData('type') as string;
    can.destroy();

    // O contador do sabor conta latas fisicas: sempre +1, independente do x2.
    this.cansByType[type] += 1;
    this.score += this.powerUpActive ? POWERUP_MULTIPLIER : 1;
    this.streak += 1;

    if (!this.powerUpActive && this.streak >= STREAK_FOR_POWERUP) {
      this.activatePowerUp();
    }

    this.refreshHud();
  }

  private hitBomb(bomb: Phaser.Physics.Arcade.Sprite): void {
    if (this.matchOver) {
      return;
    }

    bomb.destroy();

    this.score = Math.max(0, this.score - BOMB_PENALTY);
    this.streak = 0;
    this.cameras.main.flash(180, 255, 70, 70);

    this.refreshHud();
  }

  private activatePowerUp(): void {
    this.powerUpActive = true;
    this.streak = 0; // obriga a construir uma nova sequencia
    this.player.setTexture('player-power');
    this.powerUpText.setVisible(true);

    this.time.delayedCall(POWERUP_DURATION, this.deactivatePowerUp, undefined, this);
  }

  private deactivatePowerUp(): void {
    this.powerUpActive = false;
    this.player.setTexture('player');
    this.powerUpText.setVisible(false);
  }

  private removeOffscreen(group: Phaser.Physics.Arcade.Group): void {
    const limit = this.scale.height + 100;

    // Copia a lista porque destroy() altera o array de filhos do grupo.
    [...group.getChildren()].forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > limit) {
        sprite.destroy();
      }
    });
  }

  private tickClock(): void {
    this.timeLeft -= 1;
    this.refreshHud();

    if (this.timeLeft <= 0) {
      this.endMatch();
    }
  }

  private refreshHud(): void {
    this.scoreText.setText(`Pontos: ${this.score}`);
    this.streakText.setText(`Sequencia: ${this.streak}/${STREAK_FOR_POWERUP}`);
    this.timeText.setText(`Tempo: ${Math.max(0, this.timeLeft)}`);
  }

  private endMatch(): void {
    if (this.matchOver) {
      return;
    }

    this.matchOver = true;
    this.time.removeAllEvents(); // para spawns, relogio e timer do power-up
    this.physics.pause();

    this.scene.start('EndScene', {
      score: this.score,
      cansByType: this.cansByType,
    });
  }
}

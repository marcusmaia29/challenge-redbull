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

// Altura das latas em tela. A largura acompanha a proporcao de cada PNG.
const CAN_HEIGHT = 120;

// Placeholder ainda sem arte definitiva.
const BOMB_RADIUS = 28;

// --- Touro -----------------------------------------------------------------
// Os 4 frames vivem em public/assets/player/bull_idle_<i>.png, recortados da
// folha original (celula de 543x724). Todos compartilham a mesma linha de chao,
// entao o "sobe e desce" acontece so na parte de cima do desenho.
const BULL_FRAME_COUNT = 4;
const BULL_SCALE = 0.4;
const BULL_TILT_ANGLE = 5; // graus de inclinacao ao andar

// Hitbox em pixels da TEXTURA (antes da escala). O desenho ocupa a faixa
// x 35..532 / y 204..486 da celula; a caixa abaixo cobre o tronco e ignora
// cauda, ponta dos chifres e cascos. Ajuste aqui se a coleta parecer injusta.
const BULL_BODY_WIDTH = 360;
const BULL_BODY_HEIGHT = 220;
const BULL_BODY_OFFSET_X = 100;
const BULL_BODY_OFFSET_Y = 240;

/**
 * Sabores disponiveis. Cada `id` corresponde a public/assets/cans/<id>.png
 * e vira a chave de textura `can-<id>` e a chave do contador por sabor.
 * Para incluir um novo sabor, basta adicionar o PNG e uma linha aqui.
 */
const CAN_TYPES = [
  { id: 'original', label: 'Original' },
  { id: 'zero', label: 'Zero' },
  { id: 'sugarfree', label: 'Sugarfree' },
  { id: 'tropical', label: 'Tropical' },
  { id: 'amora', label: 'Amora' },
  { id: 'ice', label: 'Ice' },
  { id: 'maca', label: 'Maçã' },
  { id: 'nectarina', label: 'Nectarina' },
  { id: 'pomelo', label: 'Pomelo' },
  { id: 'pessego', label: 'Pêssego' },
];

/**
 * Cena principal: o jogador coleta latas e desvia de bombas durante 60s.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cans!: Phaser.Physics.Arcade.Group;
  private bombs!: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private powerUpPulse?: Phaser.Tweens.Tween;

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
    // Caminho relativo (sem barra inicial) para funcionar tambem se o jogo
    // for publicado em uma subpasta.
    this.load.image('cenario', 'assets/cenario_chalenge_redbull.png');

    CAN_TYPES.forEach((type) => {
      this.load.image(`can-${type.id}`, `assets/cans/${type.id}.png`);
    });

    // Frames do touro, um arquivo por quadro.
    for (let i = 0; i < BULL_FRAME_COUNT; i++) {
      this.load.image(`bull-idle-${i}`, `assets/player/bull_idle_${i}.png`);
    }

    // A bomba ainda usa placeholder gerado em runtime.
  }

  create(): void {
    // O Phaser reaproveita a instancia da Scene entre partidas, entao todo
    // estado precisa ser reiniciado aqui, e nao na declaracao dos campos.
    this.score = 0;
    this.streak = 0;
    this.timeLeft = MATCH_DURATION_SECONDS;
    this.powerUpActive = false;
    this.powerUpPulse = undefined;
    this.matchOver = false;
    this.cansByType = {};
    CAN_TYPES.forEach((type) => {
      this.cansByType[type.id] = 0;
    });

    this.createPlaceholderTextures();
    this.createBackground();
    this.createPlayerAnimations();
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
   * Placeholder da bomba, ainda sem arte definitiva. Ao receber o sprite,
   * carregue-o no preload() com a chave 'bomb' e remova este metodo.
   */
  private createPlaceholderTextures(): void {
    this.makeCircleTexture('bomb', BOMB_RADIUS, 0x11151c);
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

  /**
   * Cenario oficial cobrindo a tela inteira. O PNG e 3:2 e o jogo e 4:3, entao
   * escalamos pelo maior fator e centralizamos: sobra um corte nas laterais em
   * vez de deformar a arte.
   */
  private createBackground(): void {
    const { width, height } = this.scale;

    const background = this.add.image(width / 2, height / 2, 'cenario');
    const scale = Math.max(width / background.width, height / background.height);
    background.setScale(scale);
    background.setDepth(-10);
  }

  /**
   * Animacoes do jogador. As animacoes ficam no gerenciador global do Phaser,
   * por isso o guarda contra recriacao a cada nova partida.
   *
   * Quando chegar a public/assets/player/bull_fly_<i>.png, carregue os frames
   * no preload() e registre aqui uma segunda animacao 'bull-fly' no mesmo
   * formato — depois basta troca-la em activatePowerUp/deactivatePowerUp.
   */
  private createPlayerAnimations(): void {
    if (this.anims.exists('bull-idle')) {
      return;
    }

    this.anims.create({
      key: 'bull-idle',
      frames: Array.from({ length: BULL_FRAME_COUNT }, (_, i) => ({ key: `bull-idle-${i}` })),
      frameRate: 5,
      repeat: -1,
    });
  }

  private createPlayer(): void {
    const { width, height } = this.scale;

    this.player = this.physics.add.sprite(width / 2, height - PLAYER_BOTTOM_OFFSET, 'bull-idle-0');
    this.player.setScale(BULL_SCALE);
    this.player.setCollideWorldBounds(true);
    this.player.setImmovable(true);

    // Hitbox justa: so o tronco, sem cauda nem pontas.
    this.player.body?.setSize(BULL_BODY_WIDTH, BULL_BODY_HEIGHT);
    this.player.body?.setOffset(BULL_BODY_OFFSET_X, BULL_BODY_OFFSET_Y);

    this.player.play('bull-idle');
  }

  private createHud(): void {
    // O contorno escuro mantem o HUD legivel sobre o ceu claro do cenario.
    const style = {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#0a1730',
      strokeThickness: 6,
    };

    this.scoreText = this.add.text(24, 20, '', style);
    this.streakText = this.add.text(24, 60, '', { ...style, fontSize: '24px', color: '#e8edf5' });
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

    // O desenho original olha para a direita: so espelhamos ao ir para a
    // esquerda. A inclinacao minima da a sensacao de investida.
    if (velocity < 0) {
      this.player.setFlipX(true);
      this.player.setAngle(-BULL_TILT_ANGLE);
    } else if (velocity > 0) {
      this.player.setFlipX(false);
      this.player.setAngle(BULL_TILT_ANGLE);
    } else {
      this.player.setAngle(0);
    }
  }

  private spawnCan(): void {
    if (this.matchOver) {
      return;
    }

    const type = Phaser.Utils.Array.GetRandom(CAN_TYPES);
    const x = Phaser.Math.Between(SPAWN_MARGIN, this.scale.width - SPAWN_MARGIN);

    const can = this.cans.create(x, -CAN_HEIGHT, `can-${type.id}`) as Phaser.Physics.Arcade.Sprite;
    can.setData('type', type.id);

    // Normaliza a altura mantendo a proporcao do PNG e ajusta o corpo fisico
    // para acompanhar o tamanho exibido.
    const scale = CAN_HEIGHT / can.height;
    can.setScale(scale);
    can.body?.setSize(can.width, can.height);

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

    const points = this.powerUpActive ? POWERUP_MULTIPLIER : 1;

    // O contador do sabor conta latas fisicas: sempre +1, independente do x2.
    this.cansByType[type] += 1;
    this.score += points;
    this.streak += 1;

    this.showFloatingText(`+${points}`, '#ffd166');

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

    this.showBombFeedback();
    this.refreshHud();
  }

  /**
   * Texto curto que sobe e some perto do touro. Usado no +1/+2 da coleta e na
   * penalidade da bomba.
   */
  private showFloatingText(message: string, color: string): void {
    const label = this.add
      .text(this.player.x, this.player.y - 60, message, {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color,
        stroke: '#0a1730',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.tweens.add({
      targets: label,
      y: label.y - 45,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Tranco curto na camera, texto da penalidade e piscada vermelha no touro. */
  private showBombFeedback(): void {
    this.cameras.main.shake(150, 0.006);
    this.showFloatingText(`-${BOMB_PENALTY}`, '#ff6b6b');

    // setTintFill (e nao setTint): o touro e vermelho puro e o tint comum,
    // por ser multiplicativo, quase nao aparece nele.
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(220, () => this.refreshPlayerTint());
  }

  /** Cor do touro conforme o estado atual: dourado no x2, natural fora dele. */
  private refreshPlayerTint(): void {
    if (this.powerUpActive) {
      this.player.setTintFill(0xffc21e);
    } else {
      this.player.clearTint();
    }
  }

  private activatePowerUp(): void {
    this.powerUpActive = true;
    this.streak = 0; // obriga a construir uma nova sequencia
    this.powerUpText.setVisible(true);
    this.refreshPlayerTint();

    // Pulsacao discreta enquanto o x2 durar. Quando existir 'bull-fly',
    // troque a animacao aqui: this.player.play('bull-fly').
    this.powerUpPulse = this.tweens.add({
      targets: this.player,
      scaleX: BULL_SCALE * 1.12,
      scaleY: BULL_SCALE * 1.12,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(POWERUP_DURATION, this.deactivatePowerUp, undefined, this);
  }

  private deactivatePowerUp(): void {
    this.powerUpActive = false;
    this.powerUpText.setVisible(false);
    this.refreshPlayerTint();

    // Volta ao tamanho normal (e, futuramente, a animacao 'bull-idle').
    this.powerUpPulse?.remove();
    this.powerUpPulse = undefined;
    this.player.setScale(BULL_SCALE);
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

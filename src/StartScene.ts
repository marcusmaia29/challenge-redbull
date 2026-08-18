import * as Phaser from 'phaser';

const COLORS = {
  navy: 0x061d49,
  blue: 0x0b3b83,
  red: 0xdb0a40,
  yellow: 0xffc400,
  white: 0xffffff,
  paleBlue: 0x9ad9ff,
  electricBlue: 0x0878d1,
};

const PLAYER_NAME_STORAGE_KEY = 'redbull-can-challenge-player-name-v1';
const MAX_PLAYER_NAME_LENGTH = 16;
const START_BULL_FRAME_COUNT = 4;

/** Tela inicial e tutorial do jogo. */
export class StartScene extends Phaser.Scene {
  private tutorial?: Phaser.GameObjects.Container;
  private startBull?: Phaser.GameObjects.Sprite;
  private playerName = '';
  private nameHint?: Phaser.GameObjects.Text;
  private nameField?: Phaser.GameObjects.Rectangle;
  private nameInput?: HTMLInputElement;
  private resizeNameInputHandler?: () => void;
  private nameFocused = false;
  private isStarting = false;

  constructor() {
    super('StartScene');
  }

  preload(): void {
    // Reaproveita o mesmo cenário da GameScene.
    this.load.image('start-cenario', 'assets/cenario_chalenge_redbull.png');
    this.load.image('tutorial-can', 'assets/cans/original.png');
    this.load.image('tutorial-bomb', 'assets/bomb.png');
    for (let index = 0; index < START_BULL_FRAME_COUNT; index += 1) {
      this.load.image(`start-bull-${index}`, `assets/player/bull_idle_${index}.png`);
    }
  }

  create(): void {
    const { width, height } = this.scale;

    this.destroyNameInput();
    this.tutorial = undefined;
    this.playerName = this.readSavedPlayerName();
    this.nameFocused = false;
    this.isStarting = false;
    this.input.enabled = true;
    this.cameras.main.resetFX();

    this.createBackground();
    this.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        COLORS.navy,
        0.68,
      )
      .setDepth(-5);

    this.add
      .rectangle(width / 2, 9, width, 7, COLORS.yellow, 1)
      .setDepth(8);
    this.add
      .rectangle(width / 2, height - 9, width, 7, COLORS.red, 1)
      .setDepth(8);

    this.add
      .text(width / 2, 29, 'RED BULL  •  CAN CHALLENGE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffc400',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(8);

    this.add.circle(118, 132, 76, COLORS.yellow, 0.13).setDepth(-3);
    this.add.circle(width - 112, 585, 105, COLORS.red, 0.12).setDepth(-3);
    this.add
      .rectangle(width / 2 + 8, 354, 740, 586, 0x000000, 0.28)
      .setDepth(-2);
    this.add
      .rectangle(width / 2, 346, 740, 586, COLORS.navy, 0.58)
      .setStrokeStyle(3, COLORS.paleBlue, 0.18)
      .setDepth(-2);

    this.add
      .rectangle(width / 2, 55, 740, 7, COLORS.red, 1)
      .setDepth(-1);
    this.add
      .rectangle(width / 2, 61, 740, 4, COLORS.yellow, 1)
      .setDepth(-1);

    this.createEnergyEffects();
    this.createStartBullAnimation();
    this.createBullPreview();

    this.add
      .text(width / 2, 125, 'RED BULL', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '74px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#061d49',
        strokeThickness: 12,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 202, 'CAN CHALLENGE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '39px',
        fontStyle: 'bold',
        color: '#ffc400',
        stroke: '#061d49',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 258, 'PEGUE • DESVIE • PONTUE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#ffc400',
        stroke: '#061d49',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.createNameField();

    this.createButton(width / 2, 490, 330, 76, 'JOGAR', COLORS.red, () => {
      this.startGame();
    });

    this.createButton(width / 2, 585, 280, 58, 'COMO JOGAR', COLORS.blue, () => {
      this.showTutorial();
    });

    this.add
      .text(width / 2, height - 46, 'TOQUE E ARRASTE PARA MOVER O TOURO', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#e9f2ff',
        stroke: '#061d49',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyNameInput();
    });
  }

  private createEnergyEffects(): void {
    const { width } = this.scale;
    const glow = this.add
      .circle(width / 2, 300, 235, COLORS.electricBlue, 0.1)
      .setDepth(-1)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: glow,
      scale: 1.14,
      alpha: 0.035,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    for (let index = 0; index < 6; index += 1) {
      const slash = this.add
        .rectangle(
          -80 + index * 220,
          125 + index * 95,
          250,
          7,
          index % 2 ? COLORS.red : COLORS.yellow,
          0.08,
        )
        .setAngle(-16)
        .setDepth(-1)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: slash,
        x: slash.x + 90,
        duration: 1800 + index * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private createStartBullAnimation(): void {
    if (this.anims.exists('start-bull-run')) {
      return;
    }

    this.anims.create({
      key: 'start-bull-run',
      frames: Array.from({ length: START_BULL_FRAME_COUNT }, (_, index) => ({
        key: `start-bull-${index}`,
      })),
      frameRate: 10,
      repeat: -1,
    });
  }

  private createBullPreview(): void {
    const { height } = this.scale;

    this.startBull = this.add
      .sprite(112, height - 76, 'start-bull-0')
      .setScale(0.27)
      .setDepth(4)
      .play('start-bull-run');

    // Na espera, os mesmos quadros rodam devagar e o balanço dá vida à tela.
    this.startBull.anims.timeScale = 0.48;
    this.tweens.add({
      targets: this.startBull,
      y: this.startBull.y - 7,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private createNameField(): void {
    const { width } = this.scale;

    this.add
      .text(width / 2, 316, 'QUAL É O SEU NOME?', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffc400',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.add.rectangle(width / 2 + 5, 372, 390, 66, 0x000000, 0.32);
    this.nameField = this.add
      .rectangle(width / 2, 366, 390, 66, COLORS.navy, 0.94)
      .setStrokeStyle(3, COLORS.paleBlue, 0.72);

    this.add.rectangle(
      width / 2 - 174,
      366,
      7,
      46,
      COLORS.yellow,
      1,
    );

    this.nameHint = this.add
      .text(width / 2, 421, 'SEU NOME APARECERÁ NO RANKING', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#9ad9ff',
      })
      .setOrigin(0.5);

    this.createNameInput();
    this.refreshNameField();
  }

  private createNameInput(): void {
    const input = document.createElement('input');

    input.type = 'text';
    input.maxLength = MAX_PLAYER_NAME_LENGTH;
    input.value = this.playerName;
    input.placeholder = 'TOQUE E DIGITE';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.inputMode = 'text';
    input.enterKeyHint = 'done';
    input.setAttribute('aria-label', 'Seu nome');

    Object.assign(input.style, {
      position: 'fixed',
      zIndex: '1000',
      boxSizing: 'border-box',
      margin: '0',
      padding: '0 28px',
      border: '0',
      borderRadius: '0',
      outline: 'none',
      background: 'transparent',
      color: '#ffffff',
      caretColor: '#ffc400',
      fontFamily: 'Arial, sans-serif',
      fontWeight: '900',
      textAlign: 'center',
      textTransform: 'uppercase',
      transformOrigin: 'center center',
      WebkitAppearance: 'none',
      WebkitTapHighlightColor: 'transparent',
    });

    input.addEventListener('focus', () => {
      this.nameFocused = true;
      this.refreshNameField();
    });

    input.addEventListener('blur', () => {
      this.nameFocused = false;
      this.refreshNameField();
    });

    input.addEventListener('input', () => {
      const sanitizedName = this.sanitizePlayerName(input.value).slice(
        0,
        MAX_PLAYER_NAME_LENGTH,
      );

      if (input.value !== sanitizedName) {
        input.value = sanitizedName;
      }

      this.playerName = sanitizedName;
      this.refreshNameField();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      input.blur();
      this.startGame();
    });

    document.body.appendChild(input);
    this.nameInput = input;

    this.resizeNameInputHandler = () => {
      this.positionNameInput();
    };

    window.addEventListener('resize', this.resizeNameInputHandler);
    window.visualViewport?.addEventListener(
      'resize',
      this.resizeNameInputHandler,
    );
    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.resizeNameInputHandler,
    );

    this.positionNameInput();
  }

  private positionNameInput(): void {
    if (!this.nameInput) {
      return;
    }

    const canvasBounds = this.game.canvas.getBoundingClientRect();
    const scaleX = canvasBounds.width / this.scale.width;
    const scaleY = canvasBounds.height / this.scale.height;
    const fieldWidth = 390;
    const fieldHeight = 66;
    const fieldCenterX = this.scale.width / 2;
    const fieldCenterY = 366;

    this.nameInput.style.left =
      `${canvasBounds.left + (fieldCenterX - fieldWidth / 2) * scaleX}px`;
    this.nameInput.style.top =
      `${canvasBounds.top + (fieldCenterY - fieldHeight / 2) * scaleY}px`;
    this.nameInput.style.width = `${fieldWidth * scaleX}px`;
    this.nameInput.style.height = `${fieldHeight * scaleY}px`;
    this.nameInput.style.fontSize = `${Math.max(16, 25 * scaleY)}px`;
    this.nameInput.style.lineHeight = `${fieldHeight * scaleY}px`;
  }

  private setNameInputVisible(visible: boolean): void {
    if (!this.nameInput) {
      return;
    }

    this.nameInput.style.display = visible ? 'block' : 'none';

    if (visible) {
      this.positionNameInput();
    } else {
      this.nameInput.blur();
    }
  }

  private destroyNameInput(): void {
    if (this.resizeNameInputHandler) {
      window.removeEventListener('resize', this.resizeNameInputHandler);
      window.visualViewport?.removeEventListener(
        'resize',
        this.resizeNameInputHandler,
      );
      this.scale.off(
        Phaser.Scale.Events.RESIZE,
        this.resizeNameInputHandler,
      );
    }

    this.nameInput?.remove();
    this.nameInput = undefined;
    this.resizeNameInputHandler = undefined;
  }

  private refreshNameField(): void {
    this.nameField?.setStrokeStyle(
      this.nameFocused ? 4 : 3,
      this.nameFocused ? COLORS.yellow : COLORS.paleBlue,
      this.nameFocused ? 1 : 0.65,
    );

    if (this.nameInput && this.nameInput.value !== this.playerName) {
      this.nameInput.value = this.playerName;
    }
  }

  private startGame(): void {
    if (this.isStarting) {
      return;
    }

    const name = this.sanitizePlayerName(this.playerName).trim();

    if (!name) {
      this.nameFocused = true;
      this.setNameInputVisible(true);
      this.nameInput?.focus({ preventScroll: true });
      this.nameHint?.setText('DIGITE SEU NOME PARA COMEÇAR').setColor('#ffc400');
      this.nameField?.setStrokeStyle(4, COLORS.yellow, 1);
      this.tweens.add({
        targets: this.nameField,
        x: '+=8',
        duration: 45,
        yoyo: true,
        repeat: 3,
      });
      return;
    }

    this.playerName = name;
    this.registry.set('playerName', name);

    try {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    } catch {
      // O jogo continua funcionando se o navegador bloquear o localStorage.
    }

    this.playBullTransition();
  }

  private playBullTransition(): void {
    const { width, height } = this.scale;
    this.isStarting = true;
    this.nameFocused = false;
    this.input.enabled = false;
    this.setNameInputVisible(false);

    // Uma segunda cópia, já nítida, cobre suavemente a interface. Como usa o
    // mesmo asset da GameScene, a troca final parece uma continuação da corrida.
    const transitionBackground = this.add
      .image(width / 2, height / 2, 'start-cenario')
      .setDepth(180)
      .setAlpha(0);
    transitionBackground.setScale(
      Math.max(width / transitionBackground.width, height / transitionBackground.height),
    );

    const transitionShade = this.add
      .rectangle(width / 2, height / 2, width, height, COLORS.navy, 0)
      .setDepth(181);

    const speedLines: Phaser.GameObjects.Rectangle[] = [];
    for (let index = 0; index < 8; index += 1) {
      const line = this.add
        .rectangle(
          -180 - index * 85,
          520 + (index % 4) * 36,
          185,
          6,
          index % 3 === 0 ? COLORS.yellow : COLORS.paleBlue,
          0.7,
        )
        .setDepth(195)
        .setAngle(-7);
      speedLines.push(line);
    }

    const bull = this.startBull ?? this.add.sprite(112, height - 76, 'start-bull-0');
    this.tweens.killTweensOf(bull);
    bull
      .setDepth(200)
      .setAlpha(1)
      .play('start-bull-run');
    bull.anims.timeScale = 1;

    const callout = this.add
      .text(width / 2, 112, 'PREPARE-SE!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#031b44',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(210)
      .setScale(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: transitionBackground,
      alpha: 1,
      duration: 420,
      ease: 'Sine.Out',
    });

    this.tweens.add({
      targets: transitionShade,
      alpha: { from: 0, to: 0.12 },
      duration: 420,
    });

    this.tweens.add({
      targets: callout,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.Out',
    });

    this.tweens.add({
      targets: speedLines,
      x: `+=${width + 650}`,
      duration: 1250,
      ease: 'Quad.InOut',
    });

    this.tweens.add({
      targets: bull,
      x: width / 2,
      y: height - 90,
      scale: 0.4,
      duration: 1500,
      ease: 'Cubic.Out',
      onStart: () => {
        this.time.delayedCall(1080, () => {
          this.cameras.main.shake(130, 0.007);
        });
      },
      onComplete: () => {
        bull.stop();
        bull.setTexture('start-bull-0');
        this.cameras.main.flash(120, 255, 255, 255, false);
        this.time.delayedCall(150, () => {
          this.scene.start('GameScene');
        });
      },
    });
  }

  private readSavedPlayerName(): string {
    try {
      return this.sanitizePlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY));
    } catch {
      return '';
    }
  }

  private sanitizePlayerName(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/[^A-Za-zÀ-ÿ0-9 .'-]/g, '')
      .replace(/\s+/g, ' ')
      .trimStart()
      .slice(0, MAX_PLAYER_NAME_LENGTH);
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    const background = this.add.image(width / 2, height / 2, 'start-cenario');
    const scale = Math.max(width / background.width, height / background.height);

    background.setScale(scale).setDepth(-10).setTint(0xd6deea);

    // Phaser 3.60+ possui blur nativo. Em versões anteriores, o optional
    // chaining evita erro e o overlay escuro mantém a leitura da tela.
    const blurTarget = background as Phaser.GameObjects.Image & {
      preFX?: { addBlur: (...args: number[]) => unknown };
    };
    blurTarget.preFX?.addBlur(1, 4, 4, 0.5, 0xffffff, 4);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const shadow = this.createBeveledGraphics(
      width,
      height,
      0x000000,
      0.34,
    ).setPosition(6, 8);

    const body = this.createBeveledGraphics(
      width,
      height,
      color,
      1,
      COLORS.white,
      3,
      0.94,
    );

    const accent = this.add.rectangle(
      -width / 2 + 31,
      0,
      7,
      height - 20,
      COLORS.yellow,
      1,
    );

    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: height >= 70 ? '30px' : '23px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const hitArea = this.add
      .zone(0, 0, width, height)
      .setInteractive({ useHandCursor: true });

    const button = this.add.container(x, y, [
      shadow,
      body,
      accent,
      text,
      hitArea,
    ]);

    hitArea.on('pointerover', () => button.setScale(1.035));
    hitArea.on('pointerout', () => button.setScale(1));
    hitArea.on('pointerdown', () => button.setScale(0.97));
    hitArea.on('pointerup', () => {
      button.setScale(1);
      onClick();
    });

    return button;
  }

  private createBeveledGraphics(
    width: number,
    height: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor?: number,
    strokeWidth = 0,
    strokeAlpha = 1,
  ): Phaser.GameObjects.Graphics {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const bevel = Math.min(22, halfHeight);
    const points = [
      -halfWidth + bevel,
      -halfHeight,
      halfWidth - bevel,
      -halfHeight,
      halfWidth,
      0,
      halfWidth - bevel,
      halfHeight,
      -halfWidth + bevel,
      halfHeight,
      -halfWidth,
      0,
    ];
    const graphics = this.add.graphics();

    graphics.fillStyle(fillColor, fillAlpha);
    if (strokeColor !== undefined && strokeWidth > 0) {
      graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    }

    graphics.beginPath();
    graphics.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 2) {
      graphics.lineTo(points[index], points[index + 1]);
    }
    graphics.closePath();
    graphics.fillPath();

    if (strokeColor !== undefined && strokeWidth > 0) {
      graphics.strokePath();
    }

    return graphics;
  }

  private showTutorial(): void {
    if (this.tutorial?.active) {
      this.tutorial.setVisible(true);
      this.setNameInputVisible(false);
      return;
    }

    const { width, height } = this.scale;
    const centerX = width / 2;
    const leftCardX = centerX - 180;
    const rightCardX = centerX + 180;

    this.setNameInputVisible(false);

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x020b1d, 0.86)
      .setOrigin(0)
      .setInteractive();

    const panelShadow = this.add.rectangle(
      centerX + 10,
      height / 2 + 12,
      840,
      580,
      0x000000,
      0.4,
    );
    // Layout v4: hierarquia curta e sem caixas competindo com o conteúdo.
    const panel = this.add
      .rectangle(centerX, height / 2, 840, 580, COLORS.navy, 0.98)
      .setStrokeStyle(2, COLORS.paleBlue, 0.24);

    const redBar = this.add.rectangle(centerX, 98, 840, 8, COLORS.red, 1);
    const yellowBar = this.add.rectangle(centerX, 105, 840, 5, COLORS.yellow, 1);

    const title = this.add
      .text(centerX, 142, 'COMO JOGAR', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const titleRule = this.add.rectangle(centerX, 178, 72, 3, COLORS.yellow, 1);

    const goalTitle = this.add
      .text(centerX, 211, 'MARQUE O MÁXIMO DE PONTOS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const goalSubtitle = this.add
      .text(centerX, 240, 'VOCÊ TEM 40 SEGUNDOS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffc400',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    // Caixas dos dois objetivos: fortes, alinhadas e sem poluir a tela.
    const collectBoxShadow = this.add.rectangle(
      leftCardX + 6,
      371,
      340,
      168,
      0x000000,
      0.3,
    );
    const avoidBoxShadow = this.add.rectangle(
      rightCardX + 6,
      371,
      340,
      168,
      0x000000,
      0.3,
    );

    const collectBox = this.add
      .rectangle(leftCardX, 365, 340, 168, COLORS.blue, 0.88)
      .setStrokeStyle(2, COLORS.paleBlue, 0.58);
    const avoidBox = this.add
      .rectangle(rightCardX, 365, 340, 168, COLORS.blue, 0.88)
      .setStrokeStyle(2, COLORS.paleBlue, 0.58);

    const collectBoxAccent = this.add.rectangle(
      leftCardX - 164,
      365,
      6,
      142,
      COLORS.yellow,
      1,
    );
    const avoidBoxAccent = this.add.rectangle(
      rightCardX - 164,
      365,
      6,
      142,
      COLORS.red,
      1,
    );

    const canIcon = this.add.image(leftCardX - 98, 365, 'tutorial-can');
    canIcon.setScale(
      Math.min(80 / canIcon.width, 108 / canIcon.height),
    );
    const canLabel = this.add
      .text(leftCardX + 50, 350, 'COLETE LATINHAS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    const canHelp = this.add
      .text(leftCardX + 50, 389, '+1 PONTO', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffc400',
        align: 'center',
      })
      .setOrigin(0.5);

    const bombIcon = this.add.image(rightCardX - 98, 365, 'tutorial-bomb');
    bombIcon.setScale(
      Math.min(104 / bombIcon.width, 116 / bombIcon.height),
    );
    const bombLabel = this.add
      .text(rightCardX + 50, 350, 'DESVIE DAS BOMBAS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    const bombHelp = this.add
      .text(rightCardX + 50, 389, '−5 PONTOS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ff6b88',
        align: 'center',
      })
      .setOrigin(0.5);

    const touchLine = this.add.rectangle(
      centerX,
      493,
      210,
      2,
      COLORS.paleBlue,
      0.42,
    );
    const touchPoint = this.add
      .circle(centerX - 84, 493, 9, COLORS.yellow, 1)
      .setStrokeStyle(2, COLORS.white, 0.9);
    const hint = this.add
      .text(centerX, 528, 'TOQUE E ARRASTE PARA MOVER', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#9ad9ff',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: touchPoint,
      x: centerX + 84,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const closeButton = this.createButton(
      centerX,
      622,
      290,
      66,
      'ENTENDI!',
      COLORS.red,
      () => {
        this.tutorial?.setVisible(false);
        this.setNameInputVisible(true);
      },
    );

    this.tutorial = this.add.container(0, 0, [
      overlay,
      panelShadow,
      panel,
      redBar,
      yellowBar,
      title,
      titleRule,
      goalTitle,
      goalSubtitle,
      collectBoxShadow,
      avoidBoxShadow,
      collectBox,
      avoidBox,
      collectBoxAccent,
      avoidBoxAccent,
      canIcon,
      canLabel,
      canHelp,
      bombIcon,
      bombLabel,
      bombHelp,
      touchLine,
      touchPoint,
      hint,
      closeButton,
    ]);
    this.tutorial.setDepth(100);
  }
}
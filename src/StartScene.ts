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
  private nameText?: Phaser.GameObjects.Text;
  private nameHint?: Phaser.GameObjects.Text;
  private nameField?: Phaser.GameObjects.Rectangle;
  private nameFocused = false;
  private isStarting = false;
  private keyboardHandler?: (event: KeyboardEvent) => void;

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

    // A Scene é reaproveitada após "Jogar novamente", mas seus objetos são
    // destruídos no shutdown. Limpar a referência garante que o modal seja
    // reconstruído e volte a responder ao clique.
    this.tutorial = undefined;
    this.playerName = this.readSavedPlayerName();
    this.nameFocused = false;
    this.isStarting = false;
    this.input.enabled = true;
    this.cameras.main.resetFX();

    this.createBackground();
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.navy, 0.42).setDepth(-5);

    // Moldura e detalhes dão acabamento sem depender de novos assets.
    this.add.rectangle(width / 2, 18, width, 10, COLORS.yellow, 0.95).setDepth(-3);
    this.add.rectangle(width / 2, height - 18, width, 10, COLORS.red, 0.95).setDepth(-3);
    this.add.circle(118, 132, 76, COLORS.yellow, 0.16).setDepth(-3);
    this.add.circle(width - 112, 585, 105, COLORS.red, 0.14).setDepth(-3);
    this.add
      .rectangle(width / 2, 350, 720, 575, COLORS.navy, 0.38)
      .setStrokeStyle(2, COLORS.white, 0.18)
      .setDepth(-2);

    this.createEnergyEffects();
    this.createStartBullAnimation();
    this.createBullPreview();

    this.add
      .text(width / 2, 125, 'RED BULL', {
        fontFamily: 'Arial Black, Arial, sans-serif',
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
        fontFamily: 'Arial Black, Arial, sans-serif',
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
      .text(width / 2, height - 46, 'USE  ←  →  PARA MOVER O TOURO', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#e9f2ff',
        stroke: '#061d49',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.bindNameKeyboard();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) {
        this.input.keyboard?.off('keydown', this.keyboardHandler);
      }
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
        .rectangle(-80 + index * 220, 125 + index * 95, 250, 7, index % 2 ? COLORS.red : COLORS.yellow, 0.08)
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
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#9ad9ff',
      })
      .setOrigin(0.5);

    this.add.rectangle(width / 2 + 5, 372, 390, 66, 0x000000, 0.32);
    this.nameField = this.add
      .rectangle(width / 2, 366, 390, 66, COLORS.navy, 0.94)
      .setStrokeStyle(3, COLORS.paleBlue, 0.65)
      .setInteractive({ useHandCursor: true });

    this.nameText = this.add
      .text(width / 2, 366, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.nameHint = this.add
      .text(width / 2, 421, 'SEU NOME APARECERÁ NO RANKING', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#9ad9ff',
      })
      .setOrigin(0.5);

    this.nameField.on('pointerup', () => {
      // Ao voltar do ranking, o primeiro clique seleciona o nome antigo na
      // prática: limpa o campo para a pessoa digitar outro sem usar Backspace.
      if (!this.nameFocused && this.playerName) {
        this.playerName = '';
      }
      this.nameFocused = true;
      this.refreshNameField();
    });

    this.refreshNameField();
  }

  private bindNameKeyboard(): void {
    if (!this.input.keyboard) {
      return;
    }

    this.keyboardHandler = (event: KeyboardEvent) => {
      if (!this.nameFocused) {
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        this.playerName = this.playerName.slice(0, -1);
      } else if (event.key === 'Enter') {
        this.startGame();
        return;
      } else if (event.key.length === 1 && this.playerName.length < MAX_PLAYER_NAME_LENGTH) {
        const candidate = this.sanitizePlayerName(this.playerName + event.key);
        this.playerName = candidate.slice(0, MAX_PLAYER_NAME_LENGTH);
      } else {
        return;
      }

      this.refreshNameField();
    };

    this.input.keyboard.on('keydown', this.keyboardHandler);
  }

  private refreshNameField(): void {
    const placeholder = this.nameFocused ? '|' : 'CLIQUE E DIGITE';
    this.nameText?.setText(this.playerName || placeholder);
    this.nameText?.setColor(this.playerName ? '#ffffff' : '#9ad9ff');
    this.nameField?.setStrokeStyle(
      this.nameFocused ? 4 : 3,
      this.nameFocused ? COLORS.yellow : COLORS.paleBlue,
      this.nameFocused ? 1 : 0.65,
    );
  }

  private startGame(): void {
    if (this.isStarting) {
      return;
    }

    const name = this.sanitizePlayerName(this.playerName);

    if (!name) {
      this.nameFocused = true;
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
        .rectangle(-180 - index * 85, 520 + (index % 4) * 36, 185, 6, index % 3 === 0 ? COLORS.yellow : COLORS.paleBlue, 0.7)
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
        fontFamily: 'Arial Black, Impact, Arial, sans-serif',
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
    const shadow = this.add.rectangle(5, 7, width, height, 0x000000, 0.3).setOrigin(0.5);
    const body = this.add
      .rectangle(0, 0, width, height, color, 1)
      .setOrigin(0.5)
      .setStrokeStyle(4, COLORS.white, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: height >= 80 ? '34px' : '25px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const button = this.add.container(x, y, [shadow, body, text]);
    body.on('pointerover', () => button.setScale(1.04));
    body.on('pointerout', () => button.setScale(1));
    body.on('pointerdown', () => button.setScale(0.98));
    body.on('pointerup', () => {
      button.setScale(1.04);
      onClick();
    });

    return button;
  }

  private showTutorial(): void {
    if (this.tutorial?.active) {
      this.tutorial.setVisible(true);
      return;
    }

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(0, 0, width, height, 0x020b1d, 0.78).setOrigin(0).setInteractive();

    const panelShadow = this.add.rectangle(width / 2 + 10, height / 2 + 12, 820, 560, 0x000000, 0.35);
    const panel = this.add
      .rectangle(width / 2, height / 2, 820, 560, 0xf8faff, 1)
      .setStrokeStyle(7, COLORS.yellow, 1);

    const header = this.add.rectangle(width / 2, 139, 820, 70, COLORS.blue, 1);

    const title = this.add
      .text(width / 2, 139, 'COMO JOGAR', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const timerBadge = this.add.circle(250, 232, 36, COLORS.red).setStrokeStyle(4, COLORS.white, 1);
    const timerText = this.add
      .text(250, 232, '40s', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const goal = this.add
      .text(310, 232, 'PEGUE O MÁXIMO DE LATINHAS\nANTES QUE O TEMPO ACABE!', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#061d49',
        align: 'left',
        lineSpacing: 5,
      })
      .setOrigin(0, 0.5);

    // Dois cards com o mesmo tamanho mantêm ícones e textos alinhados.
    const collectCard = this.add
      .rectangle(335, 395, 330, 190, 0xeaf1ff, 1)
      .setStrokeStyle(3, COLORS.blue, 0.28);
    const avoidCard = this.add
      .rectangle(689, 395, 330, 190, 0xffedf1, 1)
      .setStrokeStyle(3, COLORS.red, 0.28);

    const canIcon = this.add.image(250, 395, 'tutorial-can');
    canIcon.setScale(Math.min(88 / canIcon.width, 116 / canIcon.height));
    const canLabel = this.add
      .text(320, 367, 'COLETE', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '27px',
        color: '#0b3b83',
      })
      .setOrigin(0, 0.5);
    const canHelp = this.add
      .text(325, 412, 'Cada latinha\nvale 1 ponto', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#42516a',
        lineSpacing: 4,
      })
      .setOrigin(0, 0.5);

    const bombGlow = this.add.circle(620, 391, 66, COLORS.red, 0.14);
    const bombIcon = this.add.image(620, 391, 'tutorial-bomb');
    bombIcon.setScale(Math.min(112 / bombIcon.width, 126 / bombIcon.height));
    const bombLabel = this.add
      .text(690, 367, 'DESVIE', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '27px',
        color: '#db0a40',
      })
      .setOrigin(0, 0.5);
    const bombHelp = this.add
      .text(690, 420, 'Não deixe a bomba\nencostar no touro\n(-5 pontos)', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#42516a',
        lineSpacing: 4,
      })
      .setOrigin(0, 0.5);

    const keyLeft = this.add.rectangle(320, 525, 52, 42, COLORS.navy, 1).setStrokeStyle(2, COLORS.yellow);
    const keyRight = this.add.rectangle(384, 525, 52, 42, COLORS.navy, 1).setStrokeStyle(2, COLORS.yellow);
    const arrowLeft = this.add
      .text(320, 525, '←', { fontFamily: 'Arial Black', fontSize: '29px', color: '#ffffff' })
      .setOrigin(0.5);
    const arrowRight = this.add
      .text(384, 525, '→', { fontFamily: 'Arial Black', fontSize: '29px', color: '#ffffff' })
      .setOrigin(0.5);
    const hint = this.add
      .text(420, 525, 'USE AS SETAS PARA MOVER O TOURO', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#061d49',
      })
      .setOrigin(0, 0.5);

    const closeButton = this.createButton(width / 2, 608, 280, 66, 'ENTENDI!', COLORS.red, () => {
      this.tutorial?.setVisible(false);
    });

    this.tutorial = this.add.container(0, 0, [
      overlay,
      panelShadow,
      panel,
      header,
      title,
      timerBadge,
      timerText,
      goal,
      collectCard,
      avoidCard,
      canIcon,
      canLabel,
      canHelp,
      bombGlow,
      bombIcon,
      bombLabel,
      bombHelp,
      keyLeft,
      keyRight,
      arrowLeft,
      arrowRight,
      hint,
      closeButton,
    ]);
    this.tutorial.setDepth(100);
  }
}
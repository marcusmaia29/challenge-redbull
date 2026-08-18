import * as Phaser from 'phaser';

const COLORS = {
  navy: 0x061d49,
  blue: 0x0b3b83,
  red: 0xdb0a40,
  yellow: 0xffc400,
  white: 0xffffff,
};

/** Tela inicial e tutorial do jogo. */
export class StartScene extends Phaser.Scene {
  private tutorial?: Phaser.GameObjects.Container;

  constructor() {
    super('StartScene');
  }

  preload(): void {
    // Reaproveita o mesmo cenário da GameScene.
    this.load.image('start-cenario', 'assets/cenario_chalenge_redbull.png');
    this.load.image('tutorial-can', 'assets/cans/original.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // A Scene é reaproveitada após "Jogar novamente", mas seus objetos são
    // destruídos no shutdown. Limpar a referência garante que o modal seja
    // reconstruído e volte a responder ao clique.
    this.tutorial = undefined;

    this.createBackground();
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.navy, 0.42).setDepth(-5);

    // Moldura e detalhes dão acabamento sem depender de novos assets.
    this.add.rectangle(width / 2, 18, width, 10, COLORS.yellow, 0.95).setDepth(-3);
    this.add.rectangle(width / 2, height - 18, width, 10, COLORS.red, 0.95).setDepth(-3);
    this.add.circle(118, 132, 76, COLORS.yellow, 0.16).setDepth(-3);
    this.add.circle(width - 112, 585, 105, COLORS.red, 0.14).setDepth(-3);
    this.add
      .rectangle(width / 2, 350, 620, 540, COLORS.navy, 0.34)
      .setStrokeStyle(2, COLORS.white, 0.18)
      .setDepth(-2);

    this.add
      .text(width / 2, 160, 'RED BULL', {
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
      .text(width / 2, 240, 'CAN CHALLENGE', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '39px',
        fontStyle: 'bold',
        color: '#ffc400',
        stroke: '#061d49',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 300, 'PEGUE • DESVIE • PONTUE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#ffc400',
        stroke: '#061d49',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.createButton(width / 2, 430, 330, 82, 'JOGAR', COLORS.red, () => {
      this.scene.start('GameScene');
    });

    this.createButton(width / 2, 542, 280, 62, 'COMO JOGAR', COLORS.blue, () => {
      this.showTutorial();
    });

    this.add
      .text(width / 2, height - 48, 'USE  ←  →  PARA MOVER O TOURO', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#e9f2ff',
        stroke: '#061d49',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

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
      .text(250, 232, '60s', {
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

    // Bomba vetorial temporária; pode ser substituída por PNG sem alterar o layout.
    const bombGlow = this.add.circle(620, 391, 59, COLORS.red, 0.14);
    const bombIcon = this.add.circle(620, 397, 43, 0x171b25).setStrokeStyle(5, COLORS.red);
    const bombCap = this.add.rectangle(635, 352, 29, 17, 0x353b49, 1).setAngle(-18);
    const fuse = this.add.line(660, 330, -17, 15, 17, -15, COLORS.yellow, 1).setLineWidth(6, 6);
    const spark = this.add.circle(678, 313, 7, COLORS.red, 1);
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
      bombCap,
      fuse,
      spark,
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
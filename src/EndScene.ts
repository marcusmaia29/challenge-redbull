import Phaser from 'phaser';

const COLORS = {
  navy: 0x031b44,
  blue: 0x0b3b83,
  electricBlue: 0x0878d1,
  red: 0xdb0a40,
  yellow: 0xffc400,
  silver: 0xd6e0ec,
  bronze: 0xb96835,
  white: 0xffffff,
  paleBlue: 0x9ad9ff,
};

const RANKING_STORAGE_KEY = 'redbull-can-challenge-ranking-v1';
const MAX_STORED_SCORES = 10_000;
const DISPLAY_ROW_COUNT = 5;

const RANKING_LAYOUT = {
  centerX: 512,
  rowWidth: 680,
  rowHeight: 54,
  positionX: -285,
  playerX: -222,
  scoreX: 285,
};

interface EndSceneData {
  score?: number;
  cansByType?: Record<string, number>;
}

interface RankingEntry {
  id: string;
  name: string;
  score: number;
  playedAt: number;
}

export class EndScene extends Phaser.Scene {
  private score = 0;
  private totalCans = 0;
  private currentEntryId = '';
  private playerName = 'JOGADOR';
  private ranking: RankingEntry[] = [];
  private currentPosition = 1;

  private resultView!: Phaser.GameObjects.Container;
  private rankingView!: Phaser.GameObjects.Container;
  private resultScoreText!: Phaser.GameObjects.Text;
  private resultRankGroup!: Phaser.GameObjects.Container;
  private resultButton!: Phaser.GameObjects.Container;
  private rankingRows: Phaser.GameObjects.Container[] = [];

  private isTransitioning = false;

  constructor() {
    super('EndScene');
  }

  init(data: EndSceneData = {}): void {
    this.score = this.toNonNegativeInteger(data.score);

    this.totalCans = Object.values(data.cansByType ?? {}).reduce(
      (total, amount) => {
        return total + this.toNonNegativeInteger(amount);
      },
      0,
    );
  }

  preload(): void {
    this.load.image(
      'end-cenario',
      'assets/cenario_chalenge_redbull.png',
    );

    this.load.image(
      'end-can-original',
      'assets/cans/original.png',
    );

    this.load.image(
      'end-can-tropical',
      'assets/cans/tropical.png',
    );
  }

  create(): void {
    const { width, height } = this.scale;

    this.rankingRows = [];
    this.isTransitioning = false;
    this.playerName = this.sanitizePlayerName(
      this.registry.get('playerName'),
    );

    this.recordCurrentScore();
    this.createBackground();
    this.createEnergyEffects();

    this.add
      .rectangle(
        width / 2,
        9,
        width,
        7,
        COLORS.yellow,
        1,
      )
      .setDepth(20);

    this.add
      .rectangle(
        width / 2,
        height - 9,
        width,
        7,
        COLORS.red,
        1,
      )
      .setDepth(20);

    this.add
      .text(
        width / 2,
        29,
        'RED BULL  •  CHALLENGE',
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffc400',
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(20);

    this.resultView = this.createResultView();
    this.rankingView = this.createRankingView();

    this.rankingView
      .setX(width)
      .setAlpha(0)
      .setVisible(false);

    this.animateResultEntrance();
    this.cameras.main.fadeIn(250, 3, 27, 68);
  }

  private createBackground(): void {
    const { width, height } = this.scale;

    const background = this.add.image(
      width / 2,
      height / 2,
      'end-cenario',
    );

    const backgroundScale = Math.max(
      width / background.width,
      height / background.height,
    );

    background
      .setScale(backgroundScale)
      .setDepth(-10)
      .setTint(0x7898bc);

    this.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        COLORS.navy,
        0.79,
      )
      .setDepth(-7);

    const leftWedge = this.add
      .polygon(
        75,
        height / 2,
        [
          -180,
          -470,
          210,
          -470,
          70,
          470,
          -320,
          470,
        ],
        COLORS.blue,
        0.34,
      )
      .setDepth(-6);

    const rightWedge = this.add
      .polygon(
        width - 45,
        height / 2,
        [
          -100,
          -470,
          260,
          -470,
          410,
          470,
          50,
          470,
        ],
        COLORS.red,
        0.2,
      )
      .setDepth(-6);

    leftWedge.setAngle(-2);
    rightWedge.setAngle(2);
  }

  private createEnergyEffects(): void {
    const { width, height } = this.scale;

    const glow = this.add
      .circle(
        width / 2,
        325,
        245,
        COLORS.electricBlue,
        0.1,
      )
      .setDepth(-4)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: glow,
      scale: 1.16,
      alpha: 0.035,
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    for (let index = 0; index < 8; index += 1) {
      const color =
        index % 3 === 0
          ? COLORS.yellow
          : index % 2 === 0
            ? COLORS.red
            : COLORS.paleBlue;

      const slash = this.add
        .rectangle(
          -110 + index * 170,
          130 + index * 83,
          300,
          index % 3 === 0 ? 7 : 11,
          color,
          0.09,
        )
        .setAngle(-16)
        .setDepth(-3)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: slash,
        x: slash.x + 150,
        duration: 1900 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    this.add
      .circle(
        18,
        height - 55,
        105,
        COLORS.yellow,
        0.08,
      )
      .setDepth(-4);

    this.add
      .circle(
        width - 20,
        105,
        135,
        COLORS.red,
        0.09,
      )
      .setDepth(-4);
  }

  private createResultView(): Phaser.GameObjects.Container {
    const { width } = this.scale;
    const view = this.add.container(0, 0);

    for (let angle = 0; angle < 360; angle += 24) {
      const ray = this.add
        .rectangle(
          width / 2,
          315,
          angle % 48 === 0 ? 430 : 350,
          angle % 48 === 0 ? 6 : 3,
          COLORS.yellow,
          0.08,
        )
        .setAngle(angle)
        .setBlendMode(Phaser.BlendModes.ADD);

      view.add(ray);
    }

    const outerGlow = this.add
      .circle(
        width / 2,
        315,
        172,
        COLORS.electricBlue,
        0.15,
      )
      .setStrokeStyle(
        3,
        COLORS.paleBlue,
        0.18,
      )
      .setBlendMode(Phaser.BlendModes.ADD);

    const innerGlow = this.add
      .circle(
        width / 2,
        315,
        132,
        COLORS.blue,
        0.72,
      )
      .setStrokeStyle(
        5,
        COLORS.yellow,
        0.86,
      );

    view.add([
      outerGlow,
      innerGlow,
    ]);

    this.tweens.add({
      targets: outerGlow,
      scale: 1.1,
      alpha: 0.06,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.createBurstParticles(
      view,
      width / 2,
      330,
    );

    this.createDecorativeCan(
      view,
      -80,
      145,
      355,
      'end-can-original',
      -14,
      280,
      150,
    );

    this.createDecorativeCan(
      view,
      width + 80,
      width - 145,
      360,
      'end-can-tropical',
      14,
      265,
      240,
    );

    const title = this.add
      .text(
        width / 2,
        88,
        'TEMPO ESGOTADO',
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: '43px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#031b44',
          strokeThickness: 10,
        },
      )
      .setOrigin(0.5);

    const kicker = this.add
      .text(
        width / 2,
        139,
        'SUA ENERGIA VIROU',
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffc400',
          letterSpacing: 4,
        },
      )
      .setOrigin(0.5);

    view.add([
      title,
      kicker,
    ]);

    this.resultScoreText = this.add
      .text(
        width / 2,
        297,
        '0',
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: '130px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#031b44',
          strokeThickness: 12,
        },
      )
      .setOrigin(0.5);

    const pointsLabel = this.add
      .text(
        width / 2,
        390,
        'PONTOS',
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffc400',
          letterSpacing: 5,
        },
      )
      .setOrigin(0.5);

    view.add([
      this.resultScoreText,
      pointsLabel,
    ]);

    const resultRankVisuals = this.getRankVisuals(
      this.currentPosition,
      true,
    );

    const rankLabel =
      `${this.formatPosition(this.currentPosition)} LUGAR NO RANKING`;

    const rankFontSize =
      this.currentPosition >= 100
        ? 26
        : this.currentPosition >= 10
          ? 28
          : 30;

    const rankShadow = this.createBeveledGraphics(
      560,
      76,
      0x000000,
      0.35,
    ).setPosition(6, 8);

    const rankBanner = this.createBeveledGraphics(
      560,
      76,
      resultRankVisuals.background,
      1,
      resultRankVisuals.stroke,
      4,
    );

    const rankAccent = this.add.rectangle(
      -247,
      0,
      8,
      54,
      resultRankVisuals.accent,
      1,
    );

    const rankText = this.add
      .text(
        0,
        0,
        rankLabel,
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: `${rankFontSize}px`,
          fontStyle: 'bold',
          color: resultRankVisuals.text,
          stroke: resultRankVisuals.textStroke,
          strokeThickness: 3,
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.fitTextToWidth(
      rankText,
      470,
    );

    this.resultRankGroup = this.add.container(
      width / 2,
      480,
      [
        rankShadow,
        rankBanner,
        rankAccent,
        rankText,
      ],
    );

    view.add(this.resultRankGroup);

    if (this.currentPosition <= 3) {
      const prizeMessage =
        this.currentPosition === 1 &&
        this.ranking.length > 1
          ? 'NOVO RECORDE  •  PRÊMIO ESPECIAL'
          : 'TOP 3  •  PRÊMIO ESPECIAL';

      const prizeLabel = this.add
        .text(
          width / 2,
          421,
          prizeMessage,
          {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: resultRankVisuals.label,
            stroke: '#031b44',
            strokeThickness: 5,
          },
        )
        .setOrigin(0.5);

      view.add(prizeLabel);
    }

    const canSummaryLabel =
      this.totalCans === 1
        ? `${this.totalCans} LATINHA COLETADA`
        : `${this.totalCans} LATINHAS COLETADAS`;

    const canSummary = this.add
      .text(
        width / 2,
        548,
        canSummaryLabel,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#dcecff',
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5);

    view.add(canSummary);

    this.resultButton = this.createButton(
      width / 2,
      630,
      360,
      70,
      'VER RANKING',
      COLORS.red,
      () => {
        this.showRanking();
      },
    );

    const hint = this.add
      .text(
        width / 2,
        687,
        'TOQUE PARA DESCOBRIR QUEM LIDERA',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#9ad9ff',
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5);

    view.add([
      this.resultButton,
      hint,
    ]);

    return view;
  }

  private createRankingView(): Phaser.GameObjects.Container {
    const { width } = this.scale;
    const view = this.add.container(0, 0);

    const title = this.add
      .text(
        width / 2,
        83,
        'RANKING GERAL',
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: '41px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#031b44',
          strokeThickness: 9,
        },
      )
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        width / 2,
        128,
        'TOP 3 COM PRÊMIOS ESPECIAIS',
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#ffc400',
          letterSpacing: 3,
        },
      )
      .setOrigin(0.5);

    view.add([
      title,
      subtitle,
    ]);

    const panelShadow = this.add.rectangle(
      width / 2 + 10,
      391,
      770,
      472,
      0x000000,
      0.28,
    );

    const panel = this.add
      .rectangle(
        width / 2,
        382,
        770,
        472,
        COLORS.navy,
        0.91,
      )
      .setStrokeStyle(
        3,
        COLORS.paleBlue,
        0.2,
      );

    const redSlash = this.add.rectangle(
      width / 2,
      151,
      770,
      8,
      COLORS.red,
      1,
    );

    const yellowSlash = this.add.rectangle(
      width / 2,
      158,
      770,
      5,
      COLORS.yellow,
      1,
    );

    view.add([
      panelShadow,
      panel,
      redSlash,
      yellowSlash,
    ]);

    const positionColumnX =
      RANKING_LAYOUT.centerX + RANKING_LAYOUT.positionX;
    const playerColumnX =
      RANKING_LAYOUT.centerX + RANKING_LAYOUT.playerX;
    const scoreColumnX =
      RANKING_LAYOUT.centerX + RANKING_LAYOUT.scoreX;

    const positionHeader = this.add
      .text(
        positionColumnX,
        186,
        'POS.',
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#9ad9ff',
        },
      )
      .setOrigin(0.5);

    const playerHeader = this.add
      .text(
        playerColumnX,
        186,
        'JOGADOR',
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#9ad9ff',
          letterSpacing: 2,
        },
      )
      .setOrigin(0, 0.5);

    const scoreHeader = this.add
      .text(
        scoreColumnX,
        186,
        'PONTOS',
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#9ad9ff',
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5);

    view.add([
      positionHeader,
      playerHeader,
      scoreHeader,
    ]);

    this.getDisplayedRows().forEach(
      (entry, rowIndex) => {
        const rowY = 231 + rowIndex * 67;

        const row = this.createRankingRow(
          entry,
          rowY,
        );

        this.rankingRows.push(row);
        view.add(row);
      },
    );

    const currentPositionLabel = this.formatPosition(
      this.currentPosition,
    );

    const currentScoreLabel = this.score.toLocaleString(
      'pt-BR',
    );

    const currentSummaryLabel =
      `SUA POSIÇÃO: ${currentPositionLabel}   •   ` +
      `${currentScoreLabel} PONTOS`;

    const currentSummary = this.add
      .text(
        width / 2,
        581,
        currentSummaryLabel,
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffc400',
        },
      )
      .setOrigin(0.5);

    view.add([
      currentSummary,
    ]);


    const replayButton = this.createButton(
      360,
      686,
      330,
      64,
      'JOGAR DE NOVO',
      COLORS.red,
      () => {
        this.scene.start('GameScene');
      },
    );

    const homeButton = this.createButton(
      694,
      686,
      270,
      64,
      'INÍCIO',
      COLORS.blue,
      () => {
        this.scene.start('StartScene');
      },
    );

    view.add([
      replayButton,
      homeButton,
    ]);

    return view;
  }

  private createRankingRow(
    entry: RankingEntry | null,
    y: number,
  ): Phaser.GameObjects.Container {
    const row = this.add
      .container(RANKING_LAYOUT.centerX, y)
      .setAlpha(0);

    if (entry === null) {
      const dots = this.add
        .text(
          0,
          0,
          '•   •   •',
          {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '20px',
            color: '#9ad9ff',
          },
        )
        .setOrigin(0.5);

      row.add(dots);

      return row;
    }

    const position =
      this.ranking.findIndex(
        (rankedEntry) => rankedEntry.id === entry.id,
      ) + 1;

    const isCurrent =
      entry.id === this.currentEntryId;

    const rankVisuals = this.getRankVisuals(
      position,
      isCurrent,
    );

    const shadow = this.createRankingArrowGraphics(
      RANKING_LAYOUT.rowWidth,
      RANKING_LAYOUT.rowHeight,
      0x000000,
      0.22,
    ).setPosition(4, 4);

    const background = this.createRankingArrowGraphics(
      RANKING_LAYOUT.rowWidth,
      RANKING_LAYOUT.rowHeight,
      rankVisuals.background,
      1,
      rankVisuals.stroke,
      isCurrent ? 3 : 1,
      isCurrent ? 1 : 0.16,
    );

    const accent = this.add.rectangle(
      -331,
      0,
      8,
      44,
      rankVisuals.accent,
      1,
    );

    const badge = this.add
      .circle(
        RANKING_LAYOUT.positionX,
        0,
        22,
        rankVisuals.badge,
        1,
      )
      .setStrokeStyle(
        2,
        COLORS.paleBlue,
        0.5,
      );

    const positionText = this.add
      .text(
        RANKING_LAYOUT.positionX,
        0,
        this.formatPosition(position),
        {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: position >= 100 ? '12px' : '16px',
          fontStyle: 'bold',
          color: rankVisuals.badgeText,
        },
      )
      .setOrigin(0.5, 0.5);

    const playerText = this.add
      .text(
        RANKING_LAYOUT.playerX,
        0,
        entry.name,
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: '19px',
          fontStyle: 'bold',
          color: rankVisuals.text,
          letterSpacing: 1,
        },
      )
      .setOrigin(0, 0.5);

    this.fitTextToWidth(playerText, 255);

    const scoreText = this.add
      .text(
        RANKING_LAYOUT.scoreX,
        0,
        entry.score.toLocaleString('pt-BR'),
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: rankVisuals.text,
        },
      )
      .setOrigin(0.5, 0.5);

    row.add([
      shadow,
      background,
      accent,
      badge,
      positionText,
      playerText,
      scoreText,
    ]);

    return row;
  }

  private createDecorativeCan(
    parent: Phaser.GameObjects.Container,
    startX: number,
    targetX: number,
    y: number,
    texture: string,
    angle: number,
    targetHeight: number,
    delay: number,
  ): void {
    const can = this.add
      .image(
        startX,
        y,
        texture,
      )
      .setAngle(angle)
      .setAlpha(0);

    can.setScale(
      targetHeight / can.height,
    );

    parent.add(can);

    this.tweens.add({
      targets: can,
      x: targetX,
      alpha: 0.97,
      duration: 680,
      delay,
      ease: 'Back.Out',

      onComplete: () => {
        this.tweens.add({
          targets: can,
          y: y - 16,
          angle:
            angle +
            (angle < 0 ? -4 : 4),
          duration: 1250,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      },
    });
  }

  private createBurstParticles(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): void {
    const palette = [
      COLORS.yellow,
      COLORS.red,
      COLORS.white,
      COLORS.paleBlue,
    ];

    for (let index = 0; index < 26; index += 1) {
      const angle = Phaser.Math.FloatBetween(
        0,
        Math.PI * 2,
      );

      const distance = Phaser.Math.Between(
        180,
        390,
      );

      const particle = this.add
        .rectangle(
          x,
          y,
          Phaser.Math.Between(5, 11),
          Phaser.Math.Between(12, 25),
          palette[index % palette.length],
          0.9,
        )
        .setAngle(
          Phaser.Math.Between(-90, 90),
        );

      parent.add(particle);

      this.tweens.add({
        targets: particle,
        x:
          x +
          Math.cos(angle) * distance,
        y:
          y +
          Math.sin(angle) *
            distance *
            0.7,
        angle:
          particle.angle +
          Phaser.Math.Between(100, 360),
        alpha: 0,
        duration:
          Phaser.Math.Between(850, 1450),
        delay:
          Phaser.Math.Between(180, 500),
        ease: 'Cubic.Out',

        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  private animateResultEntrance(): void {
    this.resultView.setAlpha(0);

    this.resultScoreText
      .setAlpha(0)
      .setScale(0.55);

    this.resultRankGroup
      .setAlpha(0)
      .setScale(0.62);

    this.resultButton
      .setAlpha(0)
      .setY(654);

    this.tweens.add({
      targets: this.resultView,
      alpha: 1,
      duration: 280,
      ease: 'Quad.Out',
    });

    this.tweens.add({
      targets: this.resultScoreText,
      alpha: 1,
      scale: 1,
      duration: 620,
      delay: 170,
      ease: 'Back.Out',
    });

    this.tweens.addCounter({
      from: 0,
      to: this.score,
      duration: 1050,
      delay: 260,
      ease: 'Cubic.Out',

      onUpdate: (tween) => {
        const animatedScore = Math.round(
          tween.getValue() ?? 0,
        );

        this.resultScoreText.setText(
          animatedScore.toLocaleString('pt-BR'),
        );
      },
    });

    this.tweens.add({
      targets: this.resultRankGroup,
      alpha: 1,
      scale: 1,
      duration: 520,
      delay: 920,
      ease: 'Back.Out',
    });

    this.tweens.add({
      targets: this.resultButton,
      alpha: 1,
      y: 630,
      duration: 430,
      delay: 1120,
      ease: 'Back.Out',
    });
  }

  private showRanking(): void {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;

    this.rankingRows.forEach((row) => {
      row
        .setX(574)
        .setAlpha(0);
    });

    this.rankingView
      .setVisible(true)
      .setX(this.scale.width * 0.72)
      .setAlpha(0);

    this.playTransitionSweep('forward');
    this.cameras.main.shake(110, 0.0025);

    this.tweens.add({
      targets: this.resultView,
      x: -180,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.In',
    });

    this.tweens.add({
      targets: this.rankingView,
      x: 0,
      alpha: 1,
      duration: 540,
      delay: 120,
      ease: 'Expo.Out',
    });

    this.time.delayedCall(
      350,
      () => {
        this.animateRankingRows();
      },
    );

    this.time.delayedCall(
      970,
      () => {
        this.resultView.setVisible(false);
        this.isTransitioning = false;
      },
    );
  }

  private showResult(): void {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;

    this.resultView
      .setVisible(true)
      .setX(-220)
      .setAlpha(0);

    this.playTransitionSweep('backward');

    this.tweens.add({
      targets: this.rankingView,
      x: this.scale.width * 0.72,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.In',
    });

    this.tweens.add({
      targets: this.resultView,
      x: 0,
      alpha: 1,
      duration: 500,
      delay: 100,
      ease: 'Expo.Out',

      onComplete: () => {
        this.rankingView.setVisible(false);
        this.isTransitioning = false;
      },
    });
  }

  private animateRankingRows(): void {
    this.rankingRows.forEach(
      (row, index) => {
        this.tweens.add({
          targets: row,
          x: 512,
          alpha: 1,
          duration: 360,
          delay: index * 70,
          ease: 'Back.Out',
        });
      },
    );
  }

  private playTransitionSweep(
    direction: 'forward' | 'backward',
  ): void {
    const { width, height } = this.scale;

    const startX =
      direction === 'forward'
        ? -360
        : width + 360;

    const endX =
      direction === 'forward'
        ? width + 360
        : -360;

    const yellowSweep = this.add
      .rectangle(
        startX,
        height / 2,
        300,
        height * 1.7,
        COLORS.yellow,
        0.92,
      )
      .setAngle(-13)
      .setDepth(100)
      .setBlendMode(Phaser.BlendModes.ADD);

    const redStartX =
      startX -
      (direction === 'forward'
        ? 120
        : -120);

    const redSweep = this.add
      .rectangle(
        redStartX,
        height / 2,
        80,
        height * 1.7,
        COLORS.red,
        0.96,
      )
      .setAngle(-13)
      .setDepth(101);

    this.tweens.add({
      targets: yellowSweep,
      x: endX,
      duration: 500,
      ease: 'Cubic.InOut',

      onComplete: () => {
        yellowSweep.destroy();
      },
    });

    this.tweens.add({
      targets: redSweep,
      x: endX,
      duration: 560,
      delay: 40,
      ease: 'Cubic.InOut',

      onComplete: () => {
        redSweep.destroy();
      },
    });
  }

  private getRankVisuals(
    position: number,
    isCurrent: boolean,
  ): {
    background: number;
    stroke: number;
    accent: number;
    badge: number;
    badgeText: string;
    text: string;
    textStroke: string;
    label: string;
  } {
    const accent =
      position === 1
        ? COLORS.yellow
        : position === 2
          ? COLORS.silver
          : position === 3
            ? COLORS.bronze
            : COLORS.paleBlue;

    const label =
      position === 1
        ? '#ffc400'
        : position === 2
          ? '#d6e0ec'
          : position === 3
            ? '#b96835'
            : '#9ad9ff';

    return {
      background:
        isCurrent
          ? COLORS.red
          : COLORS.blue,

      stroke:
        isCurrent
          ? COLORS.yellow
          : COLORS.paleBlue,

      accent,

      badge: COLORS.navy,
      badgeText: '#ffffff',
      text: '#ffffff',

      textStroke:
        isCurrent
          ? '#7f0626'
          : '#031b44',

      label,
    };
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
    fontSize = 22,
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
      .text(
        0,
        0,
        label,
        {
          fontFamily: 'Arial Black, Impact, Arial, sans-serif',
          fontSize: `${fontSize}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5);

    const hitArea = this.add
      .zone(
        0,
        0,
        width,
        height,
      )
      .setInteractive({
        useHandCursor: true,
      });

    const button = this.add.container(
      x,
      y,
      [
        shadow,
        body,
        accent,
        text,
        hitArea,
      ],
    );

    hitArea.on(
      'pointerover',
      () => {
        button.setScale(1.035);
      },
    );

    hitArea.on(
      'pointerout',
      () => {
        button.setScale(1);
      },
    );

    hitArea.on(
      'pointerdown',
      () => {
        button.setScale(0.97);
      },
    );

    hitArea.on(
      'pointerup',
      () => {
        button.setScale(1);
        onClick();
      },
    );

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

    graphics.fillStyle(
      fillColor,
      fillAlpha,
    );

    if (
      strokeColor !== undefined &&
      strokeWidth > 0
    ) {
      graphics.lineStyle(
        strokeWidth,
        strokeColor,
        strokeAlpha,
      );
    }

    graphics.beginPath();

    graphics.moveTo(
      points[0],
      points[1],
    );

    for (
      let index = 2;
      index < points.length;
      index += 2
    ) {
      graphics.lineTo(
        points[index],
        points[index + 1],
      );
    }

    graphics.closePath();
    graphics.fillPath();

    if (
      strokeColor !== undefined &&
      strokeWidth > 0
    ) {
      graphics.strokePath();
    }

    return graphics;
  }

  private createRankingArrowGraphics(
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
    const arrowTip = 28;

    const points = [
      -halfWidth,
      -halfHeight,

      halfWidth - arrowTip,
      -halfHeight,

      halfWidth,
      0,

      halfWidth - arrowTip,
      halfHeight,

      -halfWidth,
      halfHeight,
    ];

    const graphics = this.add.graphics();

    graphics.fillStyle(
      fillColor,
      fillAlpha,
    );

    if (
      strokeColor !== undefined &&
      strokeWidth > 0
    ) {
      graphics.lineStyle(
        strokeWidth,
        strokeColor,
        strokeAlpha,
      );
    }

    graphics.beginPath();
    graphics.moveTo(
      points[0],
      points[1],
    );

    for (
      let index = 2;
      index < points.length;
      index += 2
    ) {
      graphics.lineTo(
        points[index],
        points[index + 1],
      );
    }

    graphics.closePath();
    graphics.fillPath();

    if (
      strokeColor !== undefined &&
      strokeWidth > 0
    ) {
      graphics.strokePath();
    }

    return graphics;
  }

  private fitTextToWidth(
    text: Phaser.GameObjects.Text,
    maximumWidth: number,
  ): void {
    if (text.width <= maximumWidth) {
      return;
    }

    const scale = maximumWidth / text.width;

    text.setScale(scale);
  }

  private recordCurrentScore(): void {
    const entry: RankingEntry = {
      id:
        `${Date.now().toString(36)}-` +
        Math.random()
          .toString(36)
          .slice(2, 10),

      name: this.playerName,
      score: this.score,
      playedAt: Date.now(),
    };

    this.currentEntryId = entry.id;

    this.ranking = [
      ...this.readRanking(),
      entry,
    ].sort(
      (first, second) => {
        return (
          second.score -
            first.score ||
          first.playedAt -
            second.playedAt
        );
      },
    );

    this.currentPosition =
      this.ranking.findIndex(
        (rankedEntry) => {
          return rankedEntry.id === entry.id;
        },
      ) + 1;

    try {
      const storedRanking = this.ranking.slice(
        0,
        MAX_STORED_SCORES,
      );

      window.localStorage.setItem(
        RANKING_STORAGE_KEY,
        JSON.stringify(storedRanking),
      );
    } catch {
      // O jogo continua funcionando se o navegador bloquear o localStorage.
    }
  }

  private readRanking(): RankingEntry[] {
    try {
      const rawRanking =
        window.localStorage.getItem(
          RANKING_STORAGE_KEY,
        );

      if (!rawRanking) {
        return [];
      }

      const parsedRanking: unknown =
        JSON.parse(rawRanking);

      if (!Array.isArray(parsedRanking)) {
        return [];
      }

      return parsedRanking
        .filter(
          (
            entry,
          ): entry is RankingEntry => {
            if (
              typeof entry !== 'object' ||
              entry === null
            ) {
              return false;
            }

            const candidate =
              entry as Partial<RankingEntry>;

            return (
              typeof candidate.id === 'string' &&
              (candidate.name === undefined ||
                typeof candidate.name === 'string') &&
              typeof candidate.score === 'number' &&
              Number.isFinite(candidate.score) &&
              typeof candidate.playedAt === 'number' &&
              Number.isFinite(candidate.playedAt)
            );
          },
        )
        .map((entry) => {
          return {
            id: entry.id,

            // Mantém compatibilidade com partidas salvas antes dos nomes.
            name: this.sanitizePlayerName(entry.name),

            score:
              this.toNonNegativeInteger(
                entry.score,
              ),

            playedAt: entry.playedAt,
          };
        })
        .slice(
          0,
          MAX_STORED_SCORES,
        );
    } catch {
      return [];
    }
  }

  private getDisplayedRows(): Array<
    RankingEntry | null
  > {
    const currentIndex =
      this.ranking.findIndex(
        (entry) => {
          return entry.id === this.currentEntryId;
        },
      );

    if (currentIndex < DISPLAY_ROW_COUNT) {
      return this.ranking.slice(
        0,
        DISPLAY_ROW_COUNT,
      );
    }

    return [
      ...this.ranking.slice(0, 3),
      null,
      this.ranking[currentIndex],
    ];
  }

  private formatPosition(
    position: number,
  ): string {
    return `${position}º`;
  }

  private sanitizePlayerName(value: unknown): string {
    if (typeof value !== 'string') {
      return 'JOGADOR';
    }

    const sanitized = value
      .replace(/[^A-Za-zÀ-ÿ0-9 .'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16);

    return sanitized || 'JOGADOR';
  }

  private toNonNegativeInteger(
    value: unknown,
  ): number {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor(value),
    );
  }
}
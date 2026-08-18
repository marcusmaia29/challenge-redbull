import Phaser from 'phaser';

/**
 * Tela inicial do jogo.
 * Por enquanto exibe apenas um titulo e um atalho provisorio para a GameScene.
 */
export class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  preload(): void {
    // Assets da tela inicial serao carregados aqui (public/assets).
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'Start Screen', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Navegacao provisoria: clique/toque para seguir o fluxo.
    const startButton = this.add
      .text(width / 2, height / 2 + 60, 'Jogar', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
        padding: { x: 32, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerup', () => {
      this.scene.start('GameScene');
    });
  }
}

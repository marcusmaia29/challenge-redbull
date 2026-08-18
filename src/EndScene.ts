import Phaser from 'phaser';

/**
 * Tela exibida ao final de uma rodada.
 * Por enquanto exibe apenas um titulo e um atalho provisorio de volta para a StartScene.
 */
export class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  preload(): void {
    // Assets da tela final serao carregados aqui (public/assets).
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'End Screen', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Navegacao provisoria: reinicia o fluxo a partir da tela inicial.
    const restartButton = this.add
      .text(width / 2, height / 2 + 60, 'Jogar novamente', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
        padding: { x: 32, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restartButton.on('pointerup', () => {
      this.scene.start('StartScene');
    });
  }
}

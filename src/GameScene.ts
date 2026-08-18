import Phaser from 'phaser';

/**
 * Cena principal, onde a mecanica do jogo sera implementada.
 * Por enquanto exibe apenas um titulo e um atalho provisorio para a EndScene.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload(): void {
    // Assets do jogo serao carregados aqui (public/assets).
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'Game Screen', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Navegacao provisoria: clique/toque para seguir o fluxo.
    const endButton = this.add
      .text(width / 2, height / 2 + 60, 'Finalizar', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#1a1a1a',
        backgroundColor: '#ffffff',
        padding: { x: 32, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    endButton.on('pointerup', () => {
      this.scene.start('EndScene');
    });
  }

  update(): void {
    // Loop do jogo. Ainda sem logica.
  }
}

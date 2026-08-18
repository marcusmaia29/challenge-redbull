import Phaser from 'phaser';
import { StartScene } from './StartScene';
import { GameScene } from './GameScene';
import { EndScene } from './EndScene';

// Resolucao base do jogo (4:3, proporcao de iPad em modo paisagem).
// O Scale Manager cuida de ajustar essa resolucao a tela real do dispositivo.
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    // Mouse e toque habilitados; o teclado nao e obrigatorio para jogar.
    activePointers: 2,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  // Ordem de registro define a ordem conceitual do fluxo.
  // A primeira Scene da lista e iniciada automaticamente.
  scene: [StartScene, GameScene, EndScene],
};

new Phaser.Game(config);

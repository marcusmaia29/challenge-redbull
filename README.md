# Challenge Red Bull

Jogo 2D simples, interativo e de curta duracao, pensado para ativacoes presenciais
da marca em iPad (feiras de carreira, volta as aulas, feiras do livro, festivais).

Roda apenas localmente no navegador: sem backend, sem banco de dados e sem deploy.

## Tecnologias

- [TypeScript](https://www.typescriptlang.org/)
- [Phaser 3](https://phaser.io/)
- [Vite](https://vite.dev/)
- npm

## Pre-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior (inclui o npm)

## Instalacao

```bash
git clone https://github.com/marcusmaia29/challenge-redbull.git
cd challenge-redbull
npm install
```

## Como rodar localmente

```bash
npm run dev
```

Abra a URL exibida no terminal (normalmente <http://localhost:5173>).

Outros comandos:

```bash
npm run build     # checagem de tipos (tsc) + build de producao em dist/
npm run preview   # serve localmente o build gerado
```

## Estrutura

```text
src/main.ts        Configuracao e inicializacao do Phaser.
src/StartScene.ts  Tela inicial do jogo.
src/GameScene.ts   Cena principal onde ficara a logica do jogo.
src/EndScene.ts    Tela apresentada ao final de uma rodada.
public/assets/     Imagens, sprites, audio e demais recursos do jogo.
```

## Fluxo das telas

Cada tela e uma `Scene` do Phaser. A navegacao usa apenas `this.scene.start()`,
sem nenhuma camada extra de gerenciamento de estado.

```text
StartScene → GameScene → EndScene → StartScene
```

Os botoes atuais sao provisorios e existem apenas para validar esse fluxo.
Eles respondem a clique e toque, entao o jogo ja pode ser testado no iPad.

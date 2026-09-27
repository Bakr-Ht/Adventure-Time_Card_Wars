import '@fontsource/luckiest-guy';
import '@fontsource/grandstander/500.css';
import '@fontsource/grandstander/700.css';
import './styles.css';
import Phaser from 'phaser';
import { AudioManager } from './audio/AudioManager';
import { validateAllCards, validateDeck } from './game/cards/validate';
import { DECKS } from './game/data/decks';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { DeckSelectScene } from './scenes/DeckSelectScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { ResultScene } from './scenes/ResultScene';
import { flags } from './settings';
import { applyBodySettings } from './ui/menus/SettingsModal';
import { devicePixelRatio } from './ui/viewport';

async function loadFonts(): Promise<void> {
  // Phaser renders text to canvas, so the web fonts must be ready first.
  await Promise.allSettled([
    document.fonts.load('32px "Luckiest Guy"'),
    document.fonts.load('500 16px "Grandstander"'),
    document.fonts.load('700 16px "Grandstander"'),
  ]);
}

function canvasSize(): { width: number; height: number } {
  const dpr = devicePixelRatio();
  return { width: Math.round(window.innerWidth * dpr), height: Math.round(window.innerHeight * dpr) };
}

async function start(): Promise<void> {
  if (import.meta.env.DEV) {
    const problems = [...validateAllCards(), ...Object.values(DECKS).flatMap(validateDeck)];
    if (problems.length) console.warn('Card data problems:', problems);
  }
  applyBodySettings();
  await loadFonts();

  const { width, height } = canvasSize();
  const game = new Phaser.Game({
    type: flags.canvasRenderer ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#D9A866',
    width,
    height,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / devicePixelRatio() },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { keyboard: true, gamepad: false },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, MainMenuScene, DeckSelectScene, BattleScene, ResultScene, HowToPlayScene],
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const size = canvasSize();
      game.scale.setZoom(1 / devicePixelRatio());
      game.scale.resize(size.width, size.height);
    }, 100);
  });

  const unlock = () => AudioManager.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  (window as unknown as { __game?: Phaser.Game }).__game = game;
}

void start();

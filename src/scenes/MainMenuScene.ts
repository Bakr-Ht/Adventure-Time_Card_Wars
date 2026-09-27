import { UI_KEYS } from '../assets/manifest';
import { AudioManager } from '../audio/AudioManager';
import { settings } from '../settings';
import { h, mount } from '../ui/menus/dom';
import { openSettings } from '../ui/menus/SettingsModal';
import { BaseScene } from './BaseScene';

/** Title screen: animated Land of Ooo backdrop behind accessible DOM buttons. */
export class MainMenuScene extends BaseScene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const bg = this.add.image(0, 0, UI_KEYS.menuBg);
    const fit = () => {
      bg.setPosition(this.vp.width / 2, this.vp.height / 2);
      bg.setScale(Math.max(this.vp.width / bg.width, this.vp.height / bg.height));
    };
    // The DOM menu reflows by itself; the canvas only needs its backdrop refitted.
    this.setupViewport(fit);
    fit();
    const { width, height } = this.vp;

    // A few card backs drifting like leaves — the one ambient motion on this screen.
    if (!settings.get().reducedMotion) {
      for (let i = 0; i < 5; i++) {
        const card = this.add.image(width * (0.08 + i * 0.21), height + 120, UI_KEYS.cardBack).setScale(0.28).setAngle(-20 + i * 9).setAlpha(0.9);
        this.tweens.add({
          targets: card,
          y: -140,
          angle: card.angle + 140,
          duration: 14000 + i * 2300,
          delay: i * 2600,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    }

    const go = (fn: () => void) => () => {
      AudioManager.unlock();
      AudioManager.play('uiClick');
      fn();
    };
    const play = h('button', { class: 'btn', type: 'button', 'data-testid': 'menu-play', onclick: go(() => this.scene.start('DeckSelect', { mode: 'play' })) }, 'Play');
    const screen = h(
      'main',
      { class: 'screen', 'aria-labelledby': 'game-title' },
      h(
        'h1',
        { class: 'title-lockup', id: 'game-title' },
        h('span', { class: 'title-lockup__small' }, 'Card Wars:'),
        h('span', { class: 'title-lockup__big' }, 'Land of Ooo'),
      ),
      h(
        'nav',
        { class: 'menu-stack', 'aria-label': 'Main menu' },
        play,
        h('button', { class: 'btn btn--sky', type: 'button', 'data-testid': 'menu-decks', onclick: go(() => this.scene.start('DeckSelect', { mode: 'browse' })) }, 'Decks'),
        h('button', { class: 'btn btn--mint', type: 'button', 'data-testid': 'menu-howto', onclick: go(() => this.scene.start('HowToPlay')) }, 'How to play'),
        h('button', { class: 'btn btn--paper', type: 'button', 'data-testid': 'menu-settings', onclick: go(() => openSettings()) }, 'Settings'),
      ),
      h('p', { class: 'fan-note' }, 'A fan-made tribute to Adventure Time’s Card Wars. Not affiliated with or endorsed by Cartoon Network. All artwork is original.'),
    );
    this.trackDom(mount(screen));
    play.focus();
  }
}

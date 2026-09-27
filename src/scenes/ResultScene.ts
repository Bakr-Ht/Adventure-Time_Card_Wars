import { UI_KEYS } from '../assets/manifest';
import { getHero } from '../game/data/cards';
import type { DeckId } from '../game/data/decks';
import { settings } from '../settings';
import { h, mount } from '../ui/menus/dom';
import { COLORS } from '../ui/theme';
import { BaseScene } from './BaseScene';

export interface ResultData {
  won: boolean;
  playerDeck: DeckId;
  heroId: string;
  enemyHeroId: string;
  hp: number;
  stats: { turns: number; damageDealt: number; creaturesDefeated: number };
}

export class ResultScene extends BaseScene {
  private result!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    this.setupViewport();
    const { width, height } = this.vp;
    const r = this.result;
    const bg = this.add.image(width / 2, height / 2, UI_KEYS.menuBg);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    if (!r.won) bg.setTint(0x9aa6c8);

    const portrait = this.add.image(width / 2, height * 0.2, getHero(r.won ? r.heroId : r.enemyHeroId).portrait).setDisplaySize(170, 170);
    if (!settings.get().reducedMotion) {
      portrait.setScale(0.1);
      this.tweens.add({ targets: portrait, scale: 170 / portrait.width, duration: 500, ease: 'Back.Out' });
      if (r.won) {
        const confetti = this.add.particles(width / 2, -20, UI_KEYS.star, {
          x: { min: -width / 2, max: width / 2 },
          speedY: { min: 120, max: 260 },
          speedX: { min: -40, max: 40 },
          rotate: { min: 0, max: 360 },
          scale: { min: 0.5, max: 1.1 },
          tint: [COLORS.lemon, COLORS.bubblegum, COLORS.mint, COLORS.sky],
          lifespan: 5000,
          frequency: 70,
        });
        this.time.delayedCall(3500, () => confetti.stop());
      }
    }

    const me = getHero(r.heroId).name.split(' ')[0];
    const them = getHero(r.enemyHeroId).name.split(' ')[0];
    const rematch = h('button', { class: 'btn btn--mint', type: 'button', 'data-testid': 'rematch', onclick: () => this.scene.start('Battle', { playerDeck: r.playerDeck }) }, 'Rematch');
    const screen = h('main', { class: 'screen', style: 'justify-content:flex-end;padding-bottom:6vh', 'aria-labelledby': 'result-title' },
      h('h1', { class: 'result-banner', id: 'result-title', 'data-outcome': r.won ? 'victory' : 'defeat', 'data-testid': 'result-title' }, r.won ? 'Victory!' : 'Defeat'),
      h('p', { class: 'result-sub' }, r.won ? `${me} wins the Card War with ${r.hp} HP to spare.` : `${them} takes this round. Shuffle up and try again.`),
      h('div', { class: 'result-stats panel' },
        h('span', {}, h('b', {}, String(r.stats.turns)), 'turns played'),
        h('span', {}, h('b', {}, String(r.stats.damageDealt)), 'damage to hero'),
        h('span', {}, h('b', {}, String(r.stats.creaturesDefeated)), 'creatures defeated'),
      ),
      h('div', { class: 'screen-footer' },
        rematch,
        h('button', { class: 'btn btn--sky', type: 'button', onclick: () => this.scene.start('DeckSelect', { mode: 'play' }) }, 'Change hero'),
        h('button', { class: 'btn btn--paper', type: 'button', 'data-testid': 'to-title', onclick: () => this.scene.start('MainMenu') }, 'Title screen'),
      ),
    );
    this.trackDom(mount(screen));
    rematch.focus();
  }
}

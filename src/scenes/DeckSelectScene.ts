import { assetUrl, UI_KEYS } from '../assets/manifest';
import { AudioManager } from '../audio/AudioManager';
import type { CardDef, Faction } from '../game/cards/types';
import { FACTION_NAMES } from '../game/cards/types';
import { getCard, getHero } from '../game/data/cards';
import { DECKS, type DeckId } from '../game/data/decks';
import { h, mount } from '../ui/menus/dom';
import { FACTION_COLORS, hex } from '../ui/theme';
import { BaseScene } from './BaseScene';

const glyphUrl = (f: Faction) => assetUrl(`ui/glyph-${f.toLowerCase().replace('_', '-')}.svg`);

/** Glyph + name so factions never rely on colour. `count` reads as "3× Blue Plains". */
function factionChip(f: Faction, count?: number): HTMLElement {
  return h('span', { class: 'faction-chip', style: `background:${hex(FACTION_COLORS[f])}33` }, h('img', { src: glyphUrl(f), alt: '' }), `${count ? `${count}× ` : ''}${FACTION_NAMES[f]}`);
}

function deckCounts(id: DeckId): Record<string, number> {
  const counts: Record<string, number> = { CREATURE: 0, BUILDING: 0, SPELL: 0 };
  for (const [cardId, n] of Object.entries(DECKS[id].cards)) counts[getCard(cardId).type] += n;
  return counts;
}

function miniCard(def: CardDef, copies: number): HTMLElement {
  if (def.type !== 'CREATURE' && def.type !== 'BUILDING' && def.type !== 'SPELL') return h('div');
  const stats = def.type === 'CREATURE'
    ? h('span', {}, h('span', { class: 'pill' }, `ATK ${def.attack}`), ' ', h('span', { class: 'pill' }, `DEF ${def.defense}`))
    : h('span', { class: 'pill' }, def.type === 'SPELL' ? 'Spell' : 'Building');
  return h(
    'article',
    { class: 'mini-card', style: `--faction:${hex(FACTION_COLORS[def.faction])}` },
    h('span', { class: 'copies', 'aria-label': `${copies} copies` }, `×${copies}`),
    h('img', { src: assetUrl(`cards/${def.id}.svg`), alt: '' }),
    h('h3', {}, def.name),
    h('div', { class: 'rules' }, def.description),
    h('div', { class: 'meta' }, h('span', { class: 'pill' }, `Cost ${def.cost}`), stats),
    h('div', { class: 'meta' }, factionChip(def.faction), h('span', {}, def.landRequirement > 0 ? `Needs ${def.landRequirement}` : 'Any lane')),
  );
}

/** Deck choice before a match (mode "play") or a card browser (mode "browse"). */
export class DeckSelectScene extends BaseScene {
  private mode: 'play' | 'browse' = 'play';

  constructor() {
    super('DeckSelect');
  }

  init(data: { mode?: 'play' | 'browse' }): void {
    this.mode = data.mode ?? 'play';
  }

  create(): void {
    this.setupViewport();
    const { width, height } = this.vp;
    const bg = this.add.tileSprite(0, 0, width, height, UI_KEYS.table).setOrigin(0).setTileScale(0.6);
    bg.setAlpha(1);
    this.trackDom(mount(this.mode === 'play' ? this.playScreen() : this.browseScreen('finn')));
  }

  private back(): HTMLElement {
    return h('button', { class: 'btn btn--paper', type: 'button', 'data-testid': 'back', onclick: () => this.scene.start('MainMenu') }, 'Back');
  }

  private playScreen(): HTMLElement {
    let chosen: DeckId = 'finn';
    const cards: HTMLElement[] = [];
    const start = (id: DeckId) => {
      AudioManager.play('cardPlay');
      this.scene.start('Battle', { playerDeck: id });
    };
    const select = (id: DeckId) => {
      chosen = id;
      cards.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.deck === id)));
    };
    for (const id of ['finn', 'jake'] as DeckId[]) {
      const deck = DECKS[id];
      const hero = getHero(deck.heroId);
      const counts = deckCounts(id);
      const factions = new Map<Faction, number>();
      for (const l of deck.landscapes) {
        const f = getCard(l).faction;
        factions.set(f, (factions.get(f) ?? 0) + 1);
      }
      const card = h(
        'section',
        { class: 'deck-card panel', 'data-deck': id, 'aria-pressed': String(id === chosen), 'aria-labelledby': `deck-${id}` },
        h('img', { class: 'deck-card__portrait', src: assetUrl(`heroes/${id}.svg`), alt: `${hero.name} portrait` }),
        h('div', { class: 'deck-card__head' },
          h('h2', { class: 'deck-card__name', id: `deck-${id}` }, hero.name),
          h('div', {}, ...[...factions].map(([f, n]) => factionChip(f, n))),
        ),
        h('div', { class: 'deck-card__body' },
          h('p', {}, h('strong', {}, deck.name), ` — ${hero.playstyle}`),
          h('p', {}, deck.summary),
          h('p', {}, h('strong', {}, `${hero.ability.name}: `), hero.ability.text, ` Costs ${hero.ability.cost} action, recharges in ${hero.ability.cooldown} turns.`),
          h('div', { class: 'deck-stats' }, h('span', {}, `${counts.CREATURE} creatures`), h('span', {}, `${counts.BUILDING} buildings`), h('span', {}, `${counts.SPELL} spells`), h('span', {}, `${hero.maxHp} HP`)),
        ),
        h('div', { class: 'deck-card__action' },
          h('button', { class: `btn ${id === 'finn' ? 'btn--sky' : ''}`, type: 'button', 'data-testid': `pick-${id}`, onclick: () => start(id) }, `Play as ${hero.name.split(' ')[0]}`),
        ),
      );
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        select(id);
      });
      cards.push(card);
    }
    return h('main', { class: 'screen', 'aria-labelledby': 'deck-title' },
      h('h1', { class: 'screen-title', id: 'deck-title' }, 'Choose your hero'),
      h('div', { class: 'deck-row' }, ...cards),
      h('div', { class: 'screen-footer' }, this.back()),
    );
  }

  private browseScreen(active: DeckId): HTMLElement {
    const grid = h('div', { class: 'card-grid', role: 'list' });
    const tabs = (['finn', 'jake'] as DeckId[]).map((id) =>
      h('button', { class: 'btn btn--small', type: 'button', role: 'tab', 'aria-selected': String(id === active), onclick: () => render(id) }, DECKS[id].name),
    );
    const render = (id: DeckId) => {
      tabs.forEach((t, i) => t.setAttribute('aria-selected', String(['finn', 'jake'][i] === id)));
      grid.replaceChildren(...Object.entries(DECKS[id].cards).map(([cardId, n]) => miniCard(getCard(cardId), n)));
    };
    render(active);
    return h('main', { class: 'screen', 'aria-labelledby': 'browse-title' },
      h('h1', { class: 'screen-title', id: 'browse-title' }, 'Decks'),
      h('div', { class: 'tabs', role: 'tablist' }, ...tabs),
      grid,
      h('div', { class: 'screen-footer' }, this.back(), h('button', { class: 'btn', type: 'button', onclick: () => this.scene.start('DeckSelect', { mode: 'play' }) }, 'Play')),
    );
  }
}

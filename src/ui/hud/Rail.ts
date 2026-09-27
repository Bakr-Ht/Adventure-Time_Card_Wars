import type { LogTone } from '../../game/events/types';
import { h } from '../menus/dom';
import { TONE_COLORS } from '../theme';
import type { LayoutMode } from './battleLayout';

export interface RailHandlers {
  onFight(): void;
  onDraw(): void;
  onHero(): void;
  onMenu(): void;
}

export interface RailState {
  myTurn: boolean;
  title: string;
  subtitle: string;
  ap: number;
  maxAp: number;
  busy: boolean;
  draw: { ok: boolean; reason: string };
  hero: { name: string; cost: number; ok: boolean; reason: string };
  deck: number;
  discard: number;
}

/**
 * Turn controls live in real DOM buttons so they get native focus, keyboard
 * activation and screen-reader labels. Positioned over the canvas rail area.
 */
export class Rail {
  readonly el: HTMLElement;
  private turn: HTMLElement;
  private apPips: HTMLElement;
  private apLabel: HTMLElement;
  private fight: HTMLButtonElement;
  private fightHint: HTMLElement;
  private draw: HTMLButtonElement;
  private hero: HTMLButtonElement;
  private logEl: HTMLElement;
  private menu: HTMLButtonElement;

  constructor(handlers: RailHandlers) {
    this.turn = h('div', { class: 'rail__turn', role: 'status', 'aria-live': 'polite' });
    this.apLabel = h('span', {}, 'Actions');
    this.apPips = h('span', { style: 'display:flex;gap:6px', 'aria-hidden': 'true' });
    const ap = h('div', { class: 'rail__ap', 'aria-label': 'Action points' }, this.apLabel, this.apPips);
    this.fightHint = h('small', {}, 'Ready creatures attack');
    this.fight = h(
      'button',
      { class: 'btn btn--fight', type: 'button', 'data-testid': 'fight', title: 'Your ready creatures attack down their lanes, then the turn passes (F)', onclick: () => handlers.onFight() },
      h('span', { class: 'btn__stack' }, 'FIGHT!', this.fightHint),
    );
    this.draw = h('button', { class: 'btn btn--sky btn--small', type: 'button', 'data-testid': 'draw', onclick: () => handlers.onDraw() }, 'Draw');
    this.hero = h('button', { class: 'btn btn--pink btn--small', type: 'button', 'data-testid': 'hero-ability', onclick: () => handlers.onHero() }, 'Hero');
    this.logEl = h('div', { class: 'rail__log', 'aria-label': 'Battle log', tabindex: 0 });
    this.menu = h('button', { class: 'btn btn--paper btn--small', type: 'button', 'data-testid': 'menu', onclick: () => handlers.onMenu(), title: 'Settings and quit (Esc when nothing is selected)' }, 'Menu');
    this.el = h('aside', { class: 'rail', 'aria-label': 'Turn controls' });
    this.el.append(ap);
  }

  place(css: { left: number; top: number; width: number; height: number }, mode: LayoutMode, scale: number): void {
    Object.assign(this.el.style, { left: `${css.left}px`, top: `${css.top}px`, width: `${css.width}px`, height: `${css.height}px` });
    this.el.style.setProperty('--rail-scale', String(Math.max(0.6, Math.min(1.4, scale))));
    this.el.classList.toggle('rail--strip', mode === 'tall');
    this.el.classList.toggle('rail--compact', mode === 'compact');
    const ap = this.apPips.parentElement!;
    const row = h('div', { class: 'rail__row' }, this.draw, this.hero);
    this.el.replaceChildren();
    if (mode === 'tall') {
      this.el.append(
        h('div', { class: 'rail__col' }, this.turn, h('div', { class: 'rail__row' }, ap, this.menu)),
        h('div', { class: 'rail__col' }, this.fight),
        h('div', { class: 'rail__col' }, this.draw, this.hero),
        this.logEl,
      );
    } else if (mode === 'compact') {
      row.append(this.menu);
      this.el.append(h('div', { class: 'rail__row' }, this.turn, ap), this.fight, row);
    } else {
      this.el.append(this.turn, ap, this.fight, row, this.logEl, h('div', { class: 'rail__row' }, this.menu));
    }
  }

  update(s: RailState): void {
    this.turn.dataset.side = s.myTurn ? 'mine' : 'enemy';
    this.turn.replaceChildren(document.createTextNode(s.title), h('small', {}, s.subtitle));
    this.apLabel.textContent = `Actions ${s.ap}/${s.maxAp}`;
    this.apPips.replaceChildren(...Array.from({ length: s.maxAp }, (_, i) => h('span', { class: 'ap-pip', 'data-spent': String(i >= s.ap) })));

    const canAct = s.myTurn && !s.busy;
    this.fight.disabled = !canAct;
    this.fightHint.textContent = s.myTurn ? 'Ready creatures attack' : 'Opponent is playing';

    this.draw.disabled = !canAct || !s.draw.ok;
    this.draw.replaceChildren(document.createTextNode('Draw card'), h('small', { style: 'display:block;font-size:.62em;font-family:var(--font-body)' }, s.draw.ok ? `1 action, ${s.deck} left` : s.draw.reason));
    this.draw.title = s.draw.ok ? 'Spend 1 action to draw a card (D)' : s.draw.reason;

    this.hero.disabled = !canAct || !s.hero.ok;
    this.hero.replaceChildren(document.createTextNode(s.hero.name), h('small', { style: 'display:block;font-size:.62em;font-family:var(--font-body)' }, s.hero.ok ? `${s.hero.cost} action` : s.hero.reason));
    this.hero.title = s.hero.ok ? `Use ${s.hero.name} (H)` : s.hero.reason;
  }

  log(text: string, tone: LogTone): void {
    const p = h('p', { 'data-tone': tone, style: `color:${TONE_COLORS[tone]}` }, text);
    this.logEl.append(p);
    while (this.logEl.children.length > 80) this.logEl.firstElementChild?.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  focusFight(): void {
    this.fight.focus();
  }

  destroy(): void {
    this.el.remove();
  }
}

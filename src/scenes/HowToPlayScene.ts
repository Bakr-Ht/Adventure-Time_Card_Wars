import Phaser from 'phaser';
import { glyphKey, UI_KEYS } from '../assets/manifest';
import { AudioManager } from '../audio/AudioManager';
import { BoardCreatureView } from '../ui/cards/BoardCards';
import { CardFace } from '../ui/cards/CardFace';
import { displayLabel } from '../ui/cards/text';
import { h, mount } from '../ui/menus/dom';
import { COLORS } from '../ui/theme';
import { settings } from '../settings';
import { BaseScene } from './BaseScene';

interface Step {
  title: string;
  body: string;
  /** Something the player does in the demo to finish the step. */
  task: string;
  demo: (stage: DemoStage) => void;
}

/**
 * A small sandbox drawn inside the tutorial's demo box. Each step builds a
 * tiny animated example with real card views, plus one thing to click.
 */
class DemoStage {
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  constructor(
    readonly scene: Phaser.Scene,
    readonly rect: { x: number; y: number; w: number; h: number },
    readonly done: () => void,
  ) {}

  get cx(): number {
    return this.rect.x + this.rect.w / 2;
  }

  get cy(): number {
    return this.rect.y + this.rect.h / 2;
  }

  add<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.objects.push(obj);
    return obj;
  }

  loop(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
    if (settings.get().reducedMotion) return;
    this.scene.tweens.add({ repeat: -1, yoyo: true, ease: 'Sine.InOut', ...config });
  }

  clickable(obj: Phaser.GameObjects.Container, fn: () => void): void {
    obj.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      AudioManager.play('uiClick');
      fn();
    });
  }

  label(x: number, y: number, text: string, size = 22, color: number = COLORS.paper): Phaser.GameObjects.Text {
    return this.add(displayLabel(this.scene, x, y, text, size, color, 5));
  }

  clear(): void {
    for (const o of this.objects) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.objects.length = 0;
  }
}

function landscapeTile(stage: DemoStage, x: number, y: number, id: string, w = 170, h = 110): Phaser.GameObjects.Image {
  const img = stage.add(stage.scene.add.image(x, y, `land:${id}`).setDisplaySize(w, h));
  const g = stage.add(stage.scene.add.graphics());
  g.lineStyle(4, COLORS.ink).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
  return img;
}

const STEPS: Step[] = [
  {
    title: 'Landscapes',
    body: 'Each side has four landscapes in a row, and each one is a lane. Creatures must stand on a landscape of their own faction, while Rainbow cards fit anywhere. Faction shapes (grass tuft, corn cob, swamp drop, heart) tell them apart without relying on colour.',
    task: 'Click the Useless Swamp lane.',
    demo: (s) => {
      const ids = ['blue-plains', 'blue-plains', 'useless-swamp', 'blue-plains'];
      ids.forEach((id, i) => {
        const x = s.rect.x + s.rect.w * (0.14 + i * 0.24);
        const img = landscapeTile(s, x, s.cy - 10, id, s.rect.w * 0.22, 130);
        s.add(s.scene.add.image(x, s.cy + 80, glyphKey(id === 'useless-swamp' ? 'USELESS_SWAMP' : 'BLUE_PLAINS')).setDisplaySize(36, 36));
        img.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          if (id === 'useless-swamp') s.done();
          else s.label(x, s.cy - 10, 'Blue Plains', 20, COLORS.lemon);
        });
      });
    },
  },
  {
    title: 'Cards',
    body: 'The number in the yellow gem is the card’s cost in actions. Little faction icons under the art show how many matching landscapes you need. Creatures have ATK (burst) and DEF (shield). Damage sticks around until healed.',
    task: 'Click the card to flip through its parts.',
    demo: (s) => {
      const card = s.add(new CardFace(s.scene, 'heroic-paladin', s.cx - 140, s.cy).setScale(0.95));
      const parts = ['Cost: 2 actions', 'Needs 2 Blue Plains', 'ATK 5: damage it deals', 'DEF 9: damage it can take'];
      let i = 0;
      const text = s.label(s.cx + 170, s.cy, 'Click the card!', 26, COLORS.lemon);
      s.clickable(card, () => {
        text.setText(parts[i % parts.length]);
        i += 1;
        if (i >= parts.length) s.done();
      });
    },
  },
  {
    title: 'Action Points',
    body: 'You get 2 actions every turn (1 on the very first turn of the game). Playing a card costs its cost. Spending 1 action draws a card. Unused actions do not carry over.',
    task: 'Spend both actions.',
    demo: (s) => {
      let ap = 2;
      const pips: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 2; i++) {
        const pip = s.add(s.scene.add.circle(s.cx - 40 + i * 80, s.cy - 30, 30, COLORS.lemon).setStrokeStyle(5, COLORS.ink));
        pips.push(pip);
        pip.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          if (pip.fillColor !== COLORS.lemon) return;
          AudioManager.play('cardPlay');
          pip.setFillStyle(0xd8c7a6);
          ap -= 1;
          count.setText(`${ap} action${ap === 1 ? '' : 's'} left`);
          if (ap === 0) s.done();
        });
      }
      const count = s.label(s.cx, s.cy + 50, '2 actions left', 28, COLORS.paper);
    },
  },
  {
    title: 'Playing creatures',
    body: 'Select a creature in your hand, then choose a glowing lane. A creature that just arrived is drowsy (Zzz) and fights from your next turn, unless it is Hasty.',
    task: 'Click the card, then click the glowing lane.',
    demo: (s) => {
      const lane = landscapeTile(s, s.cx + 150, s.cy, 'blue-plains', 230, 190);
      const card = s.add(new CardFace(s.scene, 'cool-dog', s.cx - 170, s.cy).setScale(0.8));
      let selected = false;
      const glow = s.add(s.scene.add.graphics());
      s.clickable(card, () => {
        selected = true;
        card.setHighlight('selected');
        glow.clear().lineStyle(8, COLORS.mint).strokeRoundedRect(s.cx + 35, s.cy - 95, 230, 190, 14);
      });
      lane.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (!selected) return;
        glow.clear();
        s.scene.tweens.add({
          targets: card,
          x: s.cx + 150,
          scale: 0.1,
          alpha: 0,
          duration: 250,
          onComplete: () => {
            const view = s.add(new BoardCreatureView(s.scene, 'demo', 'cool-dog', s.cx + 150, s.cy).setScale(0.85));
            view.applyDisplay({ attack: 2, health: 7, baseAttack: 2, baseDefense: 7, damaged: false, flooped: false, frozen: false, drowsy: true, hasFloop: false, floopAvailable: false });
            s.done();
          },
        });
      });
    },
  },
  {
    title: 'Buildings',
    body: 'Buildings sit beside the creature slot in a lane and stay there. Most boost the creature in their lane; some have their own FLOOP. Playing a new building in the same lane replaces the old one.',
    task: 'Click the Sword Rack to power up the creature.',
    demo: (s) => {
      const view = s.add(new BoardCreatureView(s.scene, 'demo', 'plains-pup', s.cx - 80, s.cy).setScale(0.9));
      view.applyDisplay({ attack: 2, health: 3, baseAttack: 2, baseDefense: 3, damaged: false, flooped: false, frozen: false, drowsy: false, hasFloop: false, floopAvailable: false });
      const card = s.add(new CardFace(s.scene, 'sword-rack', s.cx + 170, s.cy).setScale(0.7));
      s.clickable(card, () => {
        s.scene.tweens.add({ targets: card, x: s.cx + 40, y: s.cy + 40, scale: 0.35, duration: 250 });
        view.applyDisplay({ attack: 4, health: 3, baseAttack: 2, baseDefense: 3, damaged: false, flooped: false, frozen: false, drowsy: false, hasFloop: false, floopAvailable: false });
        s.label(s.cx - 80, s.cy - 110, '+2 ATK', 30, COLORS.lemon);
        s.done();
      });
    },
  },
  {
    title: 'Spells',
    body: 'Spells happen once and go to the discard pile. Some need a target: pick the card, then click the glowing enemy. Untargeted spells are cast by clicking the card a second time.',
    task: 'Cast Hero Strike on the Corn Ronin.',
    demo: (s) => {
      const foe = s.add(new BoardCreatureView(s.scene, 'demo', 'corn-ronin', s.cx + 140, s.cy).setScale(0.9));
      foe.applyDisplay({ attack: 3, health: 4, baseAttack: 3, baseDefense: 4, damaged: false, flooped: false, frozen: false, drowsy: false, hasFloop: false, floopAvailable: false });
      const card = s.add(new CardFace(s.scene, 'hero-strike', s.cx - 170, s.cy).setScale(0.8));
      let armed = false;
      s.clickable(card, () => {
        armed = true;
        card.setHighlight('selected');
        foe.setHighlight('target');
      });
      s.clickable(foe, () => {
        if (!armed) return;
        AudioManager.play('spell');
        card.destroy();
        s.label(s.cx + 140, s.cy - 40, '-4', 40, COLORS.tomato);
        s.scene.tweens.add({ targets: foe, alpha: 0, scale: 0.3, angle: 30, duration: 400 });
        s.done();
      });
    },
  },
  {
    title: 'FLOOP',
    body: 'Some creatures and buildings have a FLOOP ability. FLOOPing turns the card sideways and uses its power. A FLOOPed creature skips this turn’s fight, and it straightens up at the start of your next turn.',
    task: 'Press the FLOOP pill.',
    demo: (s) => {
      const view = s.add(new BoardCreatureView(s.scene, 'demo', 'sharpshooter-squire', s.cx, s.cy).setScale(1));
      view.applyDisplay({ attack: 2, health: 5, baseAttack: 2, baseDefense: 5, damaged: false, flooped: false, frozen: false, drowsy: false, hasFloop: true, floopAvailable: true });
      if (view.pill) {
        s.clickable(view.pill, () => {
          AudioManager.play('floop');
          view.pill?.setAvailable(false);
          s.scene.tweens.add({ targets: view, angle: 90, duration: 320, ease: 'Back.Out' });
          s.label(s.cx, s.cy - 110, 'FLOOP!', 40, COLORS.lemon);
          s.done();
        });
        s.loop({ targets: view.pill, scale: 1.15, duration: 500 });
      }
    },
  },
  {
    title: 'Attacking',
    body: 'Press FIGHT! to end your turn. Each ready creature attacks straight down its lane: it damages the creature across from it, or hits the enemy hero if that lane is empty. Damage only flows from attacker to defender.',
    task: 'Press FIGHT!',
    demo: (s) => {
      const mine = s.add(new BoardCreatureView(s.scene, 'demo', 'cool-dog', s.cx - 90, s.cy + 50).setScale(0.7));
      mine.applyDisplay({ attack: 3, health: 7, baseAttack: 2, baseDefense: 7, damaged: false, flooped: false, frozen: false, drowsy: false, hasFloop: false, floopAvailable: false });
      mine.setHighlight('ready');
      const hero = s.add(s.scene.add.image(s.cx - 90, s.rect.y + 50, 'hero:jake').setDisplaySize(80, 80));
      const btn = s.add(s.scene.add.container(s.cx + 170, s.cy));
      const g = s.scene.add.graphics().fillStyle(COLORS.ink).fillRoundedRect(-80 + 5, -34 + 6, 160, 68, 16).fillStyle(COLORS.tomato).fillRoundedRect(-80, -34, 160, 68, 16).lineStyle(4, COLORS.ink).strokeRoundedRect(-80, -34, 160, 68, 16);
      btn.add([g, displayLabel(s.scene, 0, 3, 'FIGHT!', 34, COLORS.paper, 6)]).setSize(160, 68);
      s.clickable(btn, () => {
        AudioManager.play('attack');
        s.scene.tweens.add({
          targets: mine,
          y: s.rect.y + 90,
          duration: 200,
          yoyo: true,
          onYoyo: () => {
            AudioManager.play('damage');
            s.label(hero.x + 60, hero.y, '-3', 36, COLORS.tomato);
          },
        });
        s.done();
      });
    },
  },
  {
    title: 'Winning',
    body: 'Both heroes start at 25 HP. Bring the enemy hero to 0 to win. If your deck runs out, each missed draw deals 2 fatigue damage to you, so keep the pressure on.',
    task: 'Click the enemy hero to land the final blow.',
    demo: (s) => {
      const hero = s.add(s.scene.add.image(s.cx, s.cy - 10, 'hero:jake').setDisplaySize(150, 150));
      const hp = s.label(s.cx, s.cy + 90, '1 / 25 HP', 28, COLORS.paper);
      hero.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        AudioManager.play('victory');
        hp.setText('0 / 25 HP');
        hero.setTint(0x9aa6c8);
        const burst = s.add(s.scene.add.particles(s.cx, s.cy, UI_KEYS.star, { speed: { min: 80, max: 240 }, lifespan: 700, scale: { start: 1, end: 0 }, emitting: false }));
        burst.explode(24);
        s.label(s.cx, s.cy - 110, 'Victory!', 44, COLORS.lemon);
        s.done();
      });
    },
  },
];

/** Interactive tutorial: DOM text and navigation around a live Phaser demo box. */
export class HowToPlayScene extends BaseScene {
  private index = 0;
  private stage: DemoStage | null = null;
  private completed = new Set<number>();

  constructor() {
    super('HowToPlay');
  }

  init(): void {
    this.index = 0;
    this.completed = new Set();
    this.stage = null;
  }

  create(): void {
    this.setupViewport(() => this.renderStep());
    const { width, height } = this.vp;
    this.add.tileSprite(0, 0, width, height, UI_KEYS.table).setOrigin(0).setTileScale(0.6);

    const stepsList = h('ol', { class: 'tutorial__steps', 'aria-label': 'Tutorial steps' });
    const title = h('h2', { id: 'tut-title' });
    const body = h('p');
    const task = h('p', { class: 'tutorial__try', role: 'status', 'aria-live': 'polite' });
    const demo = h('div', { class: 'tutorial__demo', 'aria-hidden': 'true' });
    const prev = h('button', { class: 'btn btn--paper', type: 'button', onclick: () => this.go(this.index - 1) }, 'Back');
    const next = h('button', { class: 'btn btn--mint', type: 'button', 'data-testid': 'tut-next', onclick: () => this.go(this.index + 1) }, 'Next');
    const screen = h('main', { class: 'screen screen--passthrough', 'aria-labelledby': 'howto-title' },
      h('h1', { class: 'screen-title', id: 'howto-title' }, 'How to play'),
      h('div', { class: 'tutorial' },
        h('nav', { class: 'panel tutorial__nav-panel' }, stepsList),
        h('section', { class: 'tutorial__stage', 'aria-labelledby': 'tut-title' },
          h('div', { class: 'panel tutorial__text' }, title, body),
          demo,
          task,
          h('div', { class: 'tutorial__nav' }, prev, next),
        ),
      ),
      h('div', { class: 'screen-footer' },
        h('button', { class: 'btn btn--paper', type: 'button', 'data-testid': 'back', onclick: () => this.scene.start('MainMenu') }, 'Title screen'),
        h('button', { class: 'btn', type: 'button', onclick: () => this.scene.start('DeckSelect', { mode: 'play' }) }, 'Play a match'),
      ),
    );
    this.trackDom(mount(screen));
    this.ui = { stepsList, title, body, task, demo, prev, next };
    this.renderStep();
  }

  private ui!: {
    stepsList: HTMLElement;
    title: HTMLElement;
    body: HTMLElement;
    task: HTMLElement;
    demo: HTMLElement;
    prev: HTMLButtonElement;
    next: HTMLButtonElement;
  };

  private go(i: number): void {
    if (i < 0) return;
    if (i >= STEPS.length) {
      this.scene.start('DeckSelect', { mode: 'play' });
      return;
    }
    this.index = i;
    this.renderStep();
  }

  /** Maps the DOM demo box onto the canvas so the Phaser demo sits exactly inside it. */
  private demoRect(): { x: number; y: number; w: number; h: number } {
    const box = this.ui.demo.getBoundingClientRect();
    const cam = this.cameras.main;
    const dpr = this.scale.width / window.innerWidth;
    const toWorld = (px: number, py: number) => ({ x: (px * dpr) / cam.zoom + cam.worldView.x, y: (py * dpr) / cam.zoom + cam.worldView.y });
    const a = toWorld(box.left, box.top);
    const b = toWorld(box.right, box.bottom);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  }

  private renderStep(): void {
    if (!this.ui) return;
    const step = STEPS[this.index];
    const { ui } = this;
    ui.stepsList.replaceChildren(
      ...STEPS.map((s, i) =>
        h('li', {}, h('button', {
          type: 'button',
          'aria-current': i === this.index ? 'step' : undefined,
          'data-done': String(this.completed.has(i)),
          onclick: () => this.go(i),
        }, `${i + 1}. ${s.title}`)),
      ),
    );
    ui.title.textContent = step.title;
    ui.body.textContent = step.body;
    ui.task.textContent = `Try it: ${step.task}`;
    ui.task.dataset.done = String(this.completed.has(this.index));
    ui.prev.disabled = this.index === 0;
    ui.next.textContent = this.index === STEPS.length - 1 ? 'Play a match' : 'Next';

    this.stage?.clear();
    // Wait a frame so the DOM layout (and the demo box position) is final.
    requestAnimationFrame(() => {
      if (!this.sys.isActive()) return;
      const rect = this.demoRect();
      const stage = new DemoStage(this, rect, () => {
        this.completed.add(this.index);
        ui.task.textContent = this.index === STEPS.length - 1 ? 'That’s the whole game. Ready for a real match?' : 'Nice work! That’s the idea. Press Next when you’re ready.';
        ui.task.dataset.done = 'true';
        const li = ui.stepsList.children[this.index]?.querySelector('button');
        li?.setAttribute('data-done', 'true');
      });
      const bg = stage.add(this.add.graphics());
      bg.fillStyle(0x7a5a9e).fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 12);
      this.stage = stage;
      step.demo(stage);
    });
  }
}

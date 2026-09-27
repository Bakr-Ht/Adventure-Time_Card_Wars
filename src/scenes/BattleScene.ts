import Phaser from 'phaser';
import { chooseAction } from '../game/ai/AIController';
import { fightStatus } from '../game/combat/combat';
import { getHero } from '../game/data/cards';
import type { DeckId } from '../game/data/decks';
import type { GameEvent } from '../game/events/types';
import type { Action } from '../game/rules/actions';
import { applyAction } from '../game/rules/engine';
import { canDrawCard, canUseHero } from '../game/rules/legality';
import { ACTION_POINTS_PER_TURN } from '../game/rules/turn';
import { randomSeed } from '../game/core/rng';
import { createGame } from '../game/state/create';
import { findBuilding, findCreature, heroShortName } from '../game/state/queries';
import { opponentOf, type GameState, type PlayerId } from '../game/state/types';
import { flags, settings } from '../settings';
import { Fx } from '../ui/components/Fx';
import { displayLabel } from '../ui/cards/text';
import { Animator } from '../ui/hud/Animator';
import { computeBattleLayout, type BattleLayout, type Point } from '../ui/hud/battleLayout';
import { BoardView } from '../ui/hud/BoardView';
import { HandView } from '../ui/hud/HandView';
import { describeHeroCooldown, HeroView, PileView } from '../ui/hud/HeroView';
import { Interaction } from '../ui/hud/Interaction';
import { Preview } from '../ui/hud/Preview';
import { Rail } from '../ui/hud/Rail';
import { KeyboardFocus } from '../ui/hud/KeyboardFocus';
import { mount, toast } from '../ui/menus/dom';
import { openSettings } from '../ui/menus/SettingsModal';
import { COLORS } from '../ui/theme';
import { BaseScene } from './BaseScene';
import { installTestHooks } from '../debug/testHooks';
import { DebugPanel } from '../debug/DebugPanel';

export interface BattleData {
  playerDeck: DeckId;
  seed?: number;
}

const AI_DELAY = { relaxed: 1100, normal: 650, fast: 250 } as const;

export class BattleScene extends BaseScene {
  state!: GameState;
  readonly human: PlayerId = 'P1';
  readonly ai: PlayerId = 'P2';
  private data0!: BattleData;
  private busy = false;
  /** Whose turn the animations are currently showing (can lag the engine state). */
  private displayTurn: PlayerId = 'P1';
  private aiActionsThisTurn = 0;
  private layout!: BattleLayout;
  private fx!: Fx;
  board!: BoardView;
  hand!: HandView;
  private heroes!: Record<PlayerId, HeroView>;
  private piles!: { deck: PileView; enemyHand: PileView; enemyDeck: PileView };
  private rail!: Rail;
  private animator!: Animator;
  interaction!: Interaction;
  private preview!: Preview;
  private focus!: KeyboardFocus;
  private hintText: Phaser.GameObjects.Container | null = null;
  private debugPanel: DebugPanel | null = null;
  private resizePending = false;
  private stats = { turns: 0, damageDealt: 0, creaturesDefeated: 0 };

  constructor() {
    super('Battle');
  }

  init(data: BattleData): void {
    this.data0 = { playerDeck: data.playerDeck ?? 'finn', seed: data.seed };
    this.busy = false;
    this.aiActionsThisTurn = 0;
    this.stats = { turns: 0, damageDealt: 0, creaturesDefeated: 0 };
  }

  create(): void {
    this.setupViewport(() => this.requestRebuild());
    this.fx = new Fx(this);
    const seed = this.data0.seed ?? flags.seed ?? randomSeed();
    const aiDeck: DeckId = this.data0.playerDeck === 'finn' ? 'jake' : 'finn';
    const created = createGame({ seed, p1Deck: this.data0.playerDeck, p2Deck: aiDeck, p1IsAI: false, p2IsAI: true });
    this.state = created.state;
    this.rail = new Rail({
      onFight: () => this.fight(),
      onDraw: () => this.dispatch({ type: 'DRAW_CARD', player: this.human }),
      onHero: () => this.interaction.useHero(),
      onMenu: () => this.openMenu(),
    });
    this.trackDom(mount(this.rail.el));
    this.buildViews(false);
    this.hand.sync([], false);

    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button === 2) this.interaction.cancel();
      else if (over.length === 0) this.interaction.cancel();
    });
    this.focus = new KeyboardFocus(this);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));

    this.debugPanel = flags.debug ? new DebugPanel(this) : null;
    if (flags.test || flags.debug) installTestHooks(this);
    this.events.once('shutdown', () => {
      this.debugPanel?.destroy();
      this.input.keyboard?.removeAllListeners();
    });

    void this.runEvents(created.events).then(() => this.afterAction());
  }

  // ---------- View construction ----------

  private buildViews(fromState: boolean): void {
    this.layout = computeBattleLayout(this.vp.width, this.vp.height);
    const L = this.layout;
    const state = this.state;
    const enemy = opponentOf(this.human);

    this.board = new BoardView(this, L, this.human, state, {
      onLaneClick: (side, lane) => this.interaction.clickLane(side, lane),
      onCreatureClick: (uid) => this.onPieceClick(uid),
      onFloopClick: (uid) => this.interaction.clickFloop(uid),
      onHover: (uid, anchor) => this.onPieceHover(uid, anchor),
    });

    const enemyBar = this.add.graphics().setDepth(1);
    enemyBar.fillStyle(COLORS.ink, 0.9).fillRoundedRect(L.enemyBar.x + 4, L.enemyBar.y + 5, L.enemyBar.w, L.enemyBar.h, 18);
    enemyBar.fillStyle(0x7a5a9e).fillRoundedRect(L.enemyBar.x, L.enemyBar.y, L.enemyBar.w, L.enemyBar.h, 18);
    enemyBar.lineStyle(4, COLORS.ink).strokeRoundedRect(L.enemyBar.x, L.enemyBar.y, L.enemyBar.w, L.enemyBar.h, 18);

    this.heroes = {
      [this.human]: new HeroView(this, L.playerHero, L.playerHeroRadius, state.players[this.human], false).setDepth(20),
      [enemy]: new HeroView(this, L.enemyHero, L.enemyHeroRadius, state.players[enemy], true).setDepth(20),
    } as Record<PlayerId, HeroView>;

    this.piles = {
      deck: new PileView(this, L.deckPile, 0.32, 'Your deck').setDepth(15),
      enemyHand: new PileView(this, L.enemyHandAnchor, 0.22, 'Hand', undefined, true).setDepth(15),
      enemyDeck: new PileView(this, { x: L.enemyBar.x + L.enemyBar.w - 40, y: L.enemyHandAnchor.y }, 0.22, 'Deck', undefined, true).setDepth(15),
    };
    this.enemyAbilityText = displayLabel(this, L.enemyHero.x + L.enemyHeroRadius + 210, L.enemyHero.y + 4, '', 17, COLORS.paper, 4).setOrigin(0, 0.5).setDepth(20);

    this.hand = new HandView(this, L.hand, L.handScale, {
      onCardClick: (uid) => this.interaction.clickHand(uid),
      onCardHover: () => undefined,
    });

    this.rail.place(this.toCss(L.rail), L.mode, this.vp.cssScale);

    this.animator = new Animator({
      scene: this, fx: this.fx, layout: L, board: this.board, hand: this.hand, heroes: this.heroes, rail: this.rail, viewer: this.human,
      onTurnStart: (player) => {
        this.displayTurn = player;
        this.updateRail();
      },
    });
    const pending = this.interaction?.pending ?? null;
    this.interaction = new Interaction({
      getState: () => this.state,
      canInteract: () => !this.busy && this.state.phase === 'MAIN' && this.state.activePlayer === this.human,
      viewer: this.human,
      board: this.board,
      hand: this.hand,
      dispatch: (a) => this.dispatch(a),
      onChange: () => this.refresh(),
    });
    this.interaction.pending = pending;
    this.preview = new Preview(this, L);

    if (fromState) {
      this.hand.sync(state.players[this.human].hand, false);
      this.refresh();
    }
  }

  private enemyAbilityText!: Phaser.GameObjects.Text;

  private requestRebuild(): void {
    if (this.busy) {
      this.resizePending = true;
      return;
    }
    this.rebuild();
  }

  private rebuild(): void {
    this.resizePending = false;
    this.preview?.hide();
    this.board.destroy();
    this.hand.destroy();
    for (const obj of [...this.children.list]) obj.destroy();
    this.hintText = null;
    this.buildViews(true);
    this.focus?.reset();
  }

  // ---------- Game flow ----------

  private async runEvents(events: GameEvent[]): Promise<void> {
    this.busy = true;
    // Only the controls update now; the board catches up after the animations
    // so views are never synced to a state the player has not seen yet.
    this.board.clearLaneHighlights();
    this.hand.setHighlights(new Map());
    this.updateHint();
    this.updateRail();
    for (const e of events) {
      if (e.type === 'HERO_DAMAGE' && e.player !== this.human) this.stats.damageDealt += e.amount;
      if (e.type === 'CREATURE_DESTROYED' && e.player !== this.human) this.stats.creaturesDefeated += 1;
      if (e.type === 'TURN_START' && e.player === this.human) this.stats.turns += 1;
    }
    await this.animator.play(events, this.state);
    this.busy = false;
    this.displayTurn = this.state.activePlayer;
    if (this.resizePending) this.rebuild();
    this.hand.sync(this.state.players[this.human].hand, true, this.layout.deckPile);
    this.refresh();
  }

  dispatch(action: Action): void {
    if (this.busy) return;
    const result = applyAction(this.state, action);
    if (!result.ok) {
      toast(result.reason, 'error');
      return;
    }
    this.interaction.pending = null;
    this.preview.hide();
    this.displayTurn = this.state.activePlayer;
    this.state = result.state;
    if (action.player === this.ai && action.type !== 'END_TURN') this.aiActionsThisTurn += 1;
    if (action.type === 'END_TURN') this.aiActionsThisTurn = 0;
    void this.runEvents(result.events).then(() => this.afterAction());
  }

  private afterAction(): void {
    this.debugPanel?.render();
    if (this.state.phase === 'GAME_OVER') {
      this.time.delayedCall(this.fx.ms(900), () => {
        this.scene.start('Result', {
          won: this.state.winner === this.human,
          playerDeck: this.data0.playerDeck,
          heroId: this.state.players[this.human].heroId,
          enemyHeroId: this.state.players[this.ai].heroId,
          hp: this.state.players[this.human].hp,
          stats: this.stats,
        });
      });
      return;
    }
    if (this.state.activePlayer === this.ai) this.scheduleAi();
  }

  private scheduleAi(): void {
    const delay = AI_DELAY[settings.get().aiSpeed] / flags.speed;
    this.time.delayedCall(delay, () => this.aiStep());
  }

  /** One AI decision. Public so the debug panel can force it. */
  aiStep(player: PlayerId = this.ai): void {
    if (this.busy || this.state.phase === 'GAME_OVER' || this.state.activePlayer !== player) return;
    const choice = chooseAction(this.state, player, player === this.ai ? this.aiActionsThisTurn : 0);
    this.debugPanel?.showAiChoice(choice);
    this.dispatch(choice.action);
  }

  fight(): void {
    if (this.busy || this.state.activePlayer !== this.human) return;
    this.interaction.cancel();
    this.dispatch({ type: 'END_TURN', player: this.human });
  }

  /** Debug/test only: edit state directly, then re-render. */
  debugMutate(fn: (s: GameState) => void): void {
    if (this.busy) return;
    const next = structuredClone(this.state);
    fn(next);
    this.state = next;
    this.hand.sync(next.players[this.human].hand, true, this.layout.deckPile);
    this.refresh();
    this.debugPanel?.render();
  }

  restart(): void {
    this.scene.restart({ playerDeck: this.data0.playerDeck });
  }

  private openMenu(): void {
    this.interaction.cancel();
    openSettings([
      { label: 'Restart match', onClick: () => this.restart() },
      { label: 'Quit to title', onClick: () => this.scene.start('MainMenu') },
    ]);
  }

  // ---------- Presentation ----------

  refresh(): void {
    const state = this.state;
    const me = state.players[this.human];
    const foe = state.players[this.ai];
    this.board.sync(state, this.human, true);
    this.interaction.paint();
    this.heroes[this.human].setHp(me.hp);
    this.heroes[this.ai].setHp(foe.hp);
    this.piles.deck.setCount(me.deck.length);
    this.piles.enemyHand.setCount(foe.hand.length);
    this.piles.enemyDeck.setCount(foe.deck.length);
    this.enemyAbilityText.setText(describeHeroCooldown(foe));

    this.updateRail();
    this.updateHint();
    this.focus?.refresh();
  }

  private updateRail(): void {
    const state = this.state;
    const me = state.players[this.human];
    const turnOwner = this.busy ? this.displayTurn : state.activePlayer;
    const myTurn = turnOwner === this.human && state.phase === 'MAIN';
    const hero = getHero(me.heroId);
    const heroCheck = canUseHero(state, this.human);
    const drawCheck = canDrawCard(state, this.human);
    const readyCount = me.lanes.filter((l) => fightStatus(state, this.human, l.index).ready).length;
    const over = state.phase === 'GAME_OVER';
    this.rail.update({
      myTurn: myTurn || (over && state.winner === this.human),
      title: over ? (state.winner === this.human ? 'You win!' : 'You lose') : myTurn ? 'Your turn' : `${heroShortName(state, this.ai)}'s turn`,
      subtitle: over ? 'Game over' : myTurn ? (this.busy ? 'Resolving…' : `${readyCount} creature${readyCount === 1 ? '' : 's'} ready to fight`) : this.busy ? 'Playing…' : 'Thinking…',
      ap: me.ap,
      maxAp: Math.max(ACTION_POINTS_PER_TURN, me.ap),
      busy: this.busy,
      // While animating the buttons are disabled anyway; keep their normal labels instead of a stale reason.
      draw: drawCheck.ok || this.busy ? { ok: true, reason: '' } : { ok: false, reason: drawCheck.reason },
      hero: { name: hero.ability.name, cost: hero.ability.cost, ok: heroCheck.ok || this.busy, reason: heroCheck.ok || this.busy ? '' : heroCheck.reason },
      deck: me.deck.length,
      discard: me.discard.length,
    });
  }

  private updateHint(): void {
    const text = this.interaction.hint();
    this.hintText?.destroy();
    this.hintText = null;
    if (!text) return;
    const L = this.layout;
    const label = displayLabel(this, 0, 2, text, 22, COLORS.ink);
    const w = label.width + 36;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ink).fillRoundedRect(-w / 2 + 4, -20 + 5, w, 40, 14);
    bg.fillStyle(COLORS.lemon).fillRoundedRect(-w / 2, -20, w, 40, 14);
    bg.lineStyle(4, COLORS.ink).strokeRoundedRect(-w / 2, -20, w, 40, 14);
    this.hintText = this.add.container(L.board.x + L.board.w / 2, L.board.y + L.board.h / 2, [bg, label]).setDepth(960);
  }

  private onPieceClick(uid: string): void {
    if (this.interaction.clickTarget(uid)) return;
    const creature = findCreature(this.state, uid);
    const building = creature ? null : findBuilding(this.state, uid);
    const defId = creature?.creature.defId ?? building?.building.defId;
    if (!defId) return;
    const view = this.board.creatures.get(uid) ?? this.board.buildings.get(uid);
    if (view) this.preview.show(defId, { x: view.x, y: view.y }, this.statusOf(uid));
  }

  private onPieceHover(uid: string | null, anchor: Point | null): void {
    if (!uid || !anchor || this.busy) {
      this.preview.hide();
      return;
    }
    const defId = findCreature(this.state, uid)?.creature.defId ?? findBuilding(this.state, uid)?.building.defId;
    if (defId) this.preview.show(defId, anchor, this.statusOf(uid));
  }

  statusOf(uid: string): string | null {
    const loc = findCreature(this.state, uid);
    if (!loc) return null;
    const status = fightStatus(this.state, loc.player.id, loc.lane.index);
    const whose = loc.player.id === this.human ? '' : 'Enemy: ';
    return status.ready ? `${whose}Ready to fight` : `${whose}${status.reason}`;
  }

  private onKey(e: KeyboardEvent): void {
    const active = document.activeElement;
    const inDom = active && active !== document.body && active.tagName !== 'CANVAS';
    if (e.key === 'Escape') {
      if (this.interaction.pending) this.interaction.cancel();
      else if (!document.querySelector('.modal-backdrop')) this.openMenu();
      return;
    }
    if (inDom || document.querySelector('.modal-backdrop')) return;
    const key = e.key.toLowerCase();
    if (key === 'f') this.fight();
    else if (key === 'd') this.dispatch({ type: 'DRAW_CARD', player: this.human });
    else if (key === 'h') this.interaction.useHero();
    else this.focus.handleKey(e);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get battleLayout(): BattleLayout {
    return this.layout;
  }
}

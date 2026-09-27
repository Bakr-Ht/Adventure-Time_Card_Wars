import { AudioManager } from '../../audio/AudioManager';
import { getCreature, getHero, getPlayable } from '../../game/data/cards';
import type { TargetRule } from '../../game/cards/types';
import type { Action } from '../../game/rules/actions';
import {
  canFloop,
  canPlayCard,
  canUseHero,
  floopAbilityOf,
  validLanes,
  validTargets,
} from '../../game/rules/legality';
import { creatureStats } from '../../game/rules/stats';
import { cardName, findCreature } from '../../game/state/queries';
import { opponentOf, type GameState, type PlayerId } from '../../game/state/types';
import type { CardHighlight } from '../cards/CardFace';
import { toast } from '../menus/dom';
import type { BoardView, Side } from './BoardView';
import type { HandView } from './HandView';

export type Pending =
  | { kind: 'play'; cardUid: string; mode: 'lane'; lanes: number[] }
  | { kind: 'play'; cardUid: string; mode: 'target'; targets: string[]; rule: TargetRule }
  | { kind: 'play'; cardUid: string; mode: 'confirm' }
  | { kind: 'floop'; sourceUid: string; targets: string[]; rule: TargetRule }
  | { kind: 'hero'; targets: string[]; rule: TargetRule };

export interface InteractionDeps {
  getState(): GameState;
  canInteract(): boolean;
  viewer: PlayerId;
  board: BoardView;
  hand: HandView;
  dispatch(action: Action): void;
  onChange(): void;
}

const TARGET_WORDS: Record<TargetRule, string> = {
  NONE: '',
  FRIENDLY_CREATURE: 'one of your creatures',
  ENEMY_CREATURE: 'an enemy creature',
  ANY_CREATURE: 'a creature',
  ENEMY_BUILDING: 'an enemy building',
};

/** Selection state machine for the human player. Every refusal explains itself. */
export class Interaction {
  pending: Pending | null = null;

  constructor(private d: InteractionDeps) {}

  private refuse(reason: string): void {
    AudioManager.play('invalid');
    toast(reason, 'error');
  }

  private guard(): boolean {
    if (this.d.canInteract()) return true;
    const s = this.d.getState();
    this.refuse(s.phase === 'GAME_OVER' ? 'The game is over' : s.activePlayer !== this.d.viewer ? 'Wait for your turn' : 'Hold on — resolving…');
    return false;
  }

  cancel(): void {
    if (!this.pending) return;
    this.pending = null;
    this.d.onChange();
  }

  clickHand(uid: string): void {
    if (!this.guard()) return;
    const state = this.d.getState();
    const me = this.d.viewer;
    if (this.pending?.kind === 'play' && this.pending.cardUid === uid) {
      if (this.pending.mode === 'confirm') this.d.dispatch({ type: 'PLAY_CARD', player: me, cardUid: uid });
      this.pending = null;
      this.d.onChange();
      return;
    }
    const check = canPlayCard(state, me, uid);
    if (!check.ok) {
      this.refuse(check.reason);
      return;
    }
    AudioManager.play('uiClick');
    const card = state.players[me].hand.find((c) => c.uid === uid)!;
    const def = getPlayable(card.defId);
    if (def.type === 'SPELL') {
      this.pending = def.target === 'NONE'
        ? { kind: 'play', cardUid: uid, mode: 'confirm' }
        : { kind: 'play', cardUid: uid, mode: 'target', targets: validTargets(state, me, def.target, def.effects), rule: def.target };
    } else {
      this.pending = { kind: 'play', cardUid: uid, mode: 'lane', lanes: validLanes(state, me, def.id) };
    }
    this.d.onChange();
  }

  clickLane(side: Side, lane: number): void {
    const p = this.pending;
    if (!p) return;
    if (!this.guard()) return;
    const state = this.d.getState();
    const me = this.d.viewer;
    if (p.kind === 'play' && p.mode === 'lane') {
      if (side === 'top') return this.refuse('Choose one of your own lanes');
      if (!p.lanes.includes(lane)) return this.refuse('Wrong Landscape');
      this.pending = null;
      this.d.dispatch({ type: 'PLAY_CARD', player: me, cardUid: p.cardUid, lane });
      return;
    }
    if (p.kind === 'play' && p.mode === 'confirm') {
      this.pending = null;
      this.d.dispatch({ type: 'PLAY_CARD', player: me, cardUid: p.cardUid });
      return;
    }
    // Clicking a lane while targeting picks whatever sits in it.
    const owner = side === 'bottom' ? me : opponentOf(me);
    const laneState = state.players[owner].lanes[lane];
    const uid = p.rule === 'ENEMY_BUILDING' ? laneState.building?.uid : laneState.creature?.uid;
    if (uid) this.clickTarget(uid);
    else this.refuse(`Choose ${TARGET_WORDS[p.rule]}`);
  }

  /** Board piece clicked. Returns false when the click was not consumed (caller may inspect). */
  clickTarget(uid: string): boolean {
    const p = this.pending;
    if (!p || (p.kind === 'play' && p.mode !== 'target')) return false;
    if (!this.guard()) return true;
    if (!p.targets.includes(uid)) {
      this.refuse('Invalid target');
      return true;
    }
    const me = this.d.viewer;
    this.pending = null;
    if (p.kind === 'play') this.d.dispatch({ type: 'PLAY_CARD', player: me, cardUid: p.cardUid, targetUid: uid });
    else if (p.kind === 'floop') this.d.dispatch({ type: 'FLOOP', player: me, sourceUid: p.sourceUid, targetUid: uid });
    else this.d.dispatch({ type: 'HERO_ABILITY', player: me, targetUid: uid });
    return true;
  }

  clickFloop(uid: string): void {
    if (this.pending?.kind === 'floop' && this.pending.sourceUid === uid) return this.cancel();
    if (this.clickTarget(uid)) return;
    if (!this.guard()) return;
    const state = this.d.getState();
    const me = this.d.viewer;
    const check = canFloop(state, me, uid);
    if (!check.ok) return this.refuse(check.reason);
    const ability = floopAbilityOf(state, uid)!;
    if (ability.target === 'NONE') {
      this.pending = null;
      this.d.dispatch({ type: 'FLOOP', player: me, sourceUid: uid });
      return;
    }
    AudioManager.play('uiClick');
    this.pending = { kind: 'floop', sourceUid: uid, targets: validTargets(state, me, ability.target, ability.effects), rule: ability.target };
    this.d.onChange();
  }

  useHero(): void {
    if (this.pending?.kind === 'hero') return this.cancel();
    if (!this.guard()) return;
    const state = this.d.getState();
    const me = this.d.viewer;
    const check = canUseHero(state, me);
    if (!check.ok) return this.refuse(check.reason);
    const ability = getHero(state.players[me].heroId).ability;
    if (ability.target === 'NONE') {
      this.d.dispatch({ type: 'HERO_ABILITY', player: me });
      return;
    }
    this.pending = { kind: 'hero', targets: validTargets(state, me, ability.target, ability.effects), rule: ability.target };
    this.d.onChange();
  }

  /** Enter/confirm for the current selection (casts untargeted spells). */
  confirm(): void {
    const p = this.pending;
    if (p?.kind === 'play' && p.mode === 'confirm') this.clickHand(p.cardUid);
  }

  hint(): string | null {
    const p = this.pending;
    if (!p) return null;
    const state = this.d.getState();
    if (p.kind === 'play') {
      const card = state.players[this.d.viewer].hand.find((c) => c.uid === p.cardUid);
      const name = card ? cardName(card.defId) : 'this card';
      if (p.mode === 'lane') return `Choose a glowing lane for ${name}`;
      if (p.mode === 'confirm') return `Click ${name} again (or press Enter) to cast it`;
      return `Choose ${TARGET_WORDS[p.rule]} for ${name}`;
    }
    if (p.kind === 'floop') {
      const loc = findCreature(state, p.sourceUid);
      return `Choose ${TARGET_WORDS[p.rule]} for ${loc ? cardName(loc.creature.defId) : 'the FLOOP'}`;
    }
    return `Choose ${TARGET_WORDS[p.rule]} for ${getHero(state.players[this.d.viewer].heroId).ability.name}`;
  }

  /** Recomputes every visual affordance from the current state + selection. */
  paint(): void {
    const { board, hand, viewer } = this.d;
    const state = this.d.getState();
    const myTurn = this.d.canInteract();
    board.clearLaneHighlights();
    board.clearTargetHighlights();

    const modes = new Map<string, CardHighlight>();
    for (const card of state.players[viewer].hand) {
      modes.set(card.uid, myTurn && canPlayCard(state, viewer, card.uid).ok ? 'playable' : 'unplayable');
    }
    hand.setSelected(this.pending?.kind === 'play' ? this.pending.cardUid : null);
    hand.setHighlights(modes);

    const p = this.pending;
    if (p?.kind === 'play' && p.mode === 'lane') board.highlightLanes('bottom', p.lanes, 'mint');
    if (p && 'targets' in p) {
      const friendly = p.rule === 'FRIENDLY_CREATURE';
      board.setTargetHighlights(p.targets, friendly ? 'friendly-target' : 'target');
      if (p.kind === 'floop') board.setTargetHighlights([p.sourceUid], 'selected');
    }
    if (!p && myTurn) {
      // Enemy creatures that will hit your hero next turn get a red warning ring.
      const foe = state.players[opponentOf(viewer)];
      const danger = foe.lanes
        .filter((l) => l.creature
          && getCreature(l.creature.defId).attackRestriction === 'NONE'
          && !state.players[viewer].lanes[l.index].creature
          && creatureStats(foe, l).attack > 0)
        .map((l) => l.creature!.uid);
      board.setTargetHighlights(danger, 'danger');
    }
  }
}

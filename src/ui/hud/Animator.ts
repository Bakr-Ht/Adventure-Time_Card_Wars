import Phaser from 'phaser';
import { UI_KEYS } from '../../assets/manifest';
import { AudioManager } from '../../audio/AudioManager';
import { getHero } from '../../game/data/cards';
import type { GameEvent } from '../../game/events/types';
import { heroShortName } from '../../game/state/queries';
import { opponentOf, type GameState, type PlayerId } from '../../game/state/types';
import { CardFace } from '../cards/CardFace';
import type { Fx } from '../components/Fx';
import { announce } from '../menus/dom';
import { COLORS } from '../theme';
import type { BattleLayout, Point } from './battleLayout';
import type { BoardView } from './BoardView';
import type { HandView } from './HandView';
import type { HeroView } from './HeroView';
import type { Rail } from './Rail';

export interface AnimatorDeps {
  scene: Phaser.Scene;
  fx: Fx;
  layout: BattleLayout;
  board: BoardView;
  hand: HandView;
  heroes: Record<PlayerId, HeroView>;
  rail: Rail;
  viewer: PlayerId;
  /** Lets the HUD follow the turn being animated rather than the final state. */
  onTurnStart?: (player: PlayerId) => void;
}

/**
 * Turns the engine's event list into sequential animations. Views are only
 * approximately updated here; the scene re-syncs from state afterwards, so an
 * animation can never leave the UI out of step with the rules.
 */
export class Animator {
  constructor(private d: AnimatorDeps) {}

  async play(events: GameEvent[], state: GameState): Promise<void> {
    for (const e of events) {
      try {
        await this.one(e, state);
      } catch (err) {
        // A missing view must never stall the game; the final sync repairs the board.
        console.warn('Animation skipped', e.type, err);
      }
    }
  }

  private creaturePos(uid: string): Point | null {
    const v = this.d.board.creatures.get(uid);
    return v ? { x: v.x, y: v.y } : null;
  }

  private heroPos(player: PlayerId): Point {
    return this.d.heroes[player].center;
  }

  /** Shows the AI's card big in the middle so the player can read what happened. */
  private async showcase(defId: string, from: Point): Promise<CardFace> {
    const { scene, fx, layout } = this.d;
    const face = new CardFace(scene, defId, from.x, from.y).setScale(0.3).setDepth(800);
    const center = { x: layout.board.x + layout.board.w / 2, y: layout.board.y + layout.board.h / 2 };
    await fx.tween({ targets: face, x: center.x, y: center.y, scale: 0.95, duration: 300, ease: 'Back.Out' });
    await fx.wait(this.d.fx.reduced ? 500 : 650);
    return face;
  }

  private async flyToSlot(face: CardFace, to: Point): Promise<void> {
    await this.d.fx.tween({ targets: face, x: to.x, y: to.y, scale: 0.55 * this.d.layout.boardScale, angle: 0, alpha: 0.2, duration: 240, ease: 'Quad.In' });
    face.destroy();
  }

  private async cardFromHand(player: PlayerId, uid: string, defId: string): Promise<CardFace> {
    if (player === this.d.viewer) {
      const face = this.d.hand.take(uid);
      if (face) {
        face.setDepth(800).setHighlight('none');
        return face;
      }
    }
    return this.showcase(defId, this.d.layout.enemyHandAnchor);
  }

  private async one(e: GameEvent, state: GameState): Promise<void> {
    const { scene, fx, board, hand, heroes, rail, viewer, layout } = this.d;
    switch (e.type) {
      case 'LOG':
        rail.log(e.text, e.tone);
        announce(e.text);
        return;
      case 'TURN_START': {
        this.d.onTurnStart?.(e.player);
        AudioManager.play('turnStart');
        const mine = e.player === viewer;
        await fx.banner(mine ? 'Your turn!' : `${heroShortName(state, e.player)}'s turn`, mine ? COLORS.mint : COLORS.tomato, layout.width, layout.board.y + layout.board.h / 2);
        return;
      }
      case 'DRAW': {
        AudioManager.play('cardDraw');
        if (e.player === viewer && !e.burned) {
          hand.sync([...hand.uids.map((u) => ({ uid: u, defId: hand.cards.get(u)!.def.id })), e.card], true, layout.deckPile);
          await fx.wait(140);
        } else {
          const from = e.player === viewer ? layout.deckPile : layout.enemyHandAnchor;
          const back = scene.add.image(from.x, from.y, UI_KEYS.cardBack).setDisplaySize(60, 84).setDepth(700);
          const to = e.burned ? { x: from.x, y: from.y - 60 } : e.player === viewer ? { x: layout.hand.x + layout.hand.w / 2, y: layout.hand.y + 80 } : { x: layout.enemyHandAnchor.x, y: layout.enemyHandAnchor.y };
          await fx.tween({ targets: back, x: to.x, y: to.y, alpha: e.burned ? 0 : 0.2, duration: 200 });
          back.destroy();
        }
        return;
      }
      case 'FATIGUE':
        fx.floatText(this.heroPos(e.player), 'Empty deck!', COLORS.lemon, 26);
        return;
      case 'PLAY_CREATURE':
      case 'PLAY_BUILDING': {
        AudioManager.play('cardPlay');
        const face = await this.cardFromHand(e.player, e.card.uid, e.card.defId);
        const slot = board.slot(e.player, e.lane);
        const isCreature = e.type === 'PLAY_CREATURE';
        const to = isCreature ? slot.creature : slot.building;
        if (e.replaced) {
          if (isCreature) board.removeCreature(e.replaced.uid);
          else board.removeBuilding(e.replaced.uid);
          fx.burst(to, UI_KEYS.puff, 6);
        }
        await this.flyToSlot(face, to);
        const view = isCreature ? board.addCreature(e.card.uid, e.card.defId, to) : board.addBuilding(e.card.uid, e.card.defId, to);
        const s = isCreature ? layout.boardScale : layout.buildingScale;
        view.setScale(s * 0.4);
        fx.burst(to, UI_KEYS.puff, 8);
        await fx.tween({ targets: view, scale: s, duration: 280, ease: 'Back.Out' });
        return;
      }
      case 'SUMMON': {
        const to = board.slot(e.player, e.lane).creature;
        const view = board.addCreature(e.card.uid, e.card.defId, to).setScale(0.1);
        fx.burst(to, UI_KEYS.star, 8);
        await fx.tween({ targets: view, scale: layout.boardScale, duration: 260, ease: 'Back.Out' });
        return;
      }
      case 'CAST_SPELL': {
        AudioManager.play('spell');
        const face = await this.cardFromHand(e.player, e.card.uid, e.card.defId);
        const center = { x: layout.board.x + layout.board.w / 2, y: layout.board.y + layout.board.h / 2 };
        await fx.tween({ targets: face, x: center.x, y: center.y, scale: 0.95, angle: 0, duration: 220, ease: 'Quad.Out' });
        const target = e.targetUid ? this.creaturePos(e.targetUid) ?? this.buildingPos(e.targetUid) : null;
        if (target) {
          await fx.tween({ targets: face, x: target.x, y: target.y, scale: 0.3, alpha: 0, duration: 260, ease: 'Quad.In' });
          fx.burst(target, UI_KEYS.spark, 12, COLORS.lemon);
        } else {
          fx.burst(center, UI_KEYS.spark, 16, COLORS.lemon);
          await fx.tween({ targets: face, scale: 1.2, alpha: 0, duration: 260 });
        }
        face.destroy();
        return;
      }
      case 'FLOOP': {
        AudioManager.play('floop');
        const view = e.source === 'CREATURE' ? board.creatures.get(e.uid) : board.buildings.get(e.uid);
        if (!view) return;
        fx.floatText({ x: view.x, y: view.y - 40 }, 'FLOOP!', COLORS.lemon, 34);
        fx.burst({ x: view.x, y: view.y }, UI_KEYS.star, 10);
        const bottom = e.player === viewer;
        if (e.source === 'CREATURE') await fx.tween({ targets: view, angle: bottom ? 90 : -90, duration: 320, ease: 'Back.Out' });
        else await fx.tween({ targets: view, angle: 12, duration: 120, yoyo: true });
        return;
      }
      case 'HERO_ABILITY': {
        AudioManager.play('spell');
        const hero = heroes[e.player];
        fx.floatText({ x: hero.x, y: hero.y - 70 }, getHero(e.heroId).ability.name, COLORS.bubblegum, 26);
        await fx.tween({ targets: hero, scale: 1.18, duration: 140, yoyo: true, ease: 'Quad.Out' });
        return;
      }
      case 'FIGHT_PHASE':
        await fx.banner('FIGHT!', COLORS.tomato, layout.width, layout.board.y + layout.board.h / 2);
        return;
      case 'ATTACK': {
        AudioManager.play('attack');
        const view = board.creatures.get(e.uid);
        if (!view) return;
        const target = e.targetUid ? this.creaturePos(e.targetUid) : this.heroPos(opponentOf(e.player));
        if (!target) return;
        const home = { x: view.x, y: view.y };
        view.setDepth(50);
        board.highlightLanes(e.player === viewer ? 'top' : 'bottom', [e.lane], 'tomato');
        await fx.tween({ targets: view, x: home.x + (target.x - home.x) * 0.55, y: home.y + (target.y - home.y) * 0.55, duration: 170, ease: 'Quad.In' });
        AudioManager.play('hit');
        fx.burst(target, UI_KEYS.star, 6);
        await fx.tween({ targets: view, x: home.x, y: home.y, duration: 200, ease: 'Quad.Out' });
        board.clearLaneHighlights();
        view.setDepth(0);
        return;
      }
      case 'CREATURE_DAMAGE': {
        const view = board.creatures.get(e.uid);
        if (!view) return;
        view.setHealth(view.health - e.amount);
        fx.floatText({ x: view.x, y: view.y - 20 }, `-${e.amount}`, COLORS.tomato);
        await fx.shake(view, 7);
        return;
      }
      case 'HERO_DAMAGE': {
        AudioManager.play('damage');
        const hero = heroes[e.player];
        hero.setHp(e.hp);
        hero.flash(COLORS.tomato);
        fx.floatText({ x: hero.x, y: hero.y - 30 }, `-${e.amount}`, COLORS.tomato, 40);
        fx.cameraShake(0.004 + Math.min(0.01, e.amount * 0.0015));
        await fx.shake(hero, 9);
        return;
      }
      case 'CREATURE_HEAL': {
        const view = board.creatures.get(e.uid);
        if (!view) return;
        view.setHealth(view.health + e.amount, true);
        fx.floatText({ x: view.x, y: view.y - 20 }, `+${e.amount}`, COLORS.mint);
        fx.burst({ x: view.x, y: view.y }, UI_KEYS.spark, 6, COLORS.mint);
        await fx.wait(220);
        return;
      }
      case 'HERO_HEAL': {
        const hero = heroes[e.player];
        hero.setHp(e.hp);
        fx.floatText({ x: hero.x, y: hero.y - 30 }, `+${e.amount}`, COLORS.mint, 36);
        await fx.wait(260);
        return;
      }
      case 'BUFF': {
        const view = board.creatures.get(e.uid);
        if (!view) return;
        const parts = [e.atk ? `${e.atk > 0 ? '+' : ''}${e.atk} ATK` : '', e.def ? `${e.def > 0 ? '+' : ''}${e.def} DEF` : ''].filter(Boolean).join(' ');
        fx.floatText({ x: view.x, y: view.y - 50 }, parts, e.atk < 0 || e.def < 0 ? COLORS.tomato : COLORS.lemon, 26);
        await fx.tween({ targets: view.badges.atk, scale: 1.4, duration: 120, yoyo: true });
        return;
      }
      case 'FREEZE': {
        const view = board.creatures.get(e.uid);
        if (!view) return;
        fx.floatText({ x: view.x, y: view.y - 40 }, 'Frozen!', COLORS.frost, 28);
        fx.burst({ x: view.x, y: view.y }, UI_KEYS.spark, 10, COLORS.frost);
        await fx.wait(250);
        return;
      }
      case 'MOVE': {
        const view = board.creatures.get(e.uid);
        if (!view) return;
        const to = board.slot(e.player, e.to).creature;
        await fx.tween({ targets: view, x: to.x, y: to.y, duration: 320, ease: 'Back.InOut' });
        return;
      }
      case 'CREATURE_DESTROYED': {
        AudioManager.play('destroy');
        const view = board.creatures.get(e.card.uid);
        if (!view) return;
        board.creatures.delete(e.card.uid);
        fx.burst({ x: view.x, y: view.y }, UI_KEYS.star, 14);
        await fx.tween({ targets: view, angle: view.angle + 25, scale: 0.2, alpha: 0, y: view.y + 20, duration: 360, ease: 'Back.In' });
        view.destroy();
        return;
      }
      case 'BUILDING_DESTROYED': {
        AudioManager.play('destroy');
        const view = board.buildings.get(e.card.uid);
        if (!view) return;
        board.buildings.delete(e.card.uid);
        fx.burst({ x: view.x, y: view.y }, UI_KEYS.puff, 10);
        await fx.tween({ targets: view, scaleY: 0.1, alpha: 0, y: view.y + 30, duration: 320 });
        view.destroy();
        return;
      }
      case 'GAME_OVER':
        AudioManager.play(e.winner === viewer ? 'victory' : 'defeat');
        await fx.wait(500);
        return;
      case 'AP':
      case 'TURN_END':
        return;
    }
  }

  private buildingPos(uid: string): Point | null {
    const v = this.d.board.buildings.get(uid);
    return v ? { x: v.x, y: v.y } : null;
  }
}

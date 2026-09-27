import Phaser from 'phaser';
import { glyphKey, UI_KEYS } from '../../assets/manifest';
import { fightStatus } from '../../game/combat/combat';
import { getCreature, getLandscape } from '../../game/data/cards';
import { canFloop } from '../../game/rules/legality';
import { creatureStats } from '../../game/rules/stats';
import { opponentOf, type GameState, type PlayerId } from '../../game/state/types';
import { BoardCreatureView, BuildingView, BUILDING_H, BUILDING_W, CREATURE_H, CREATURE_W, type SlotHighlight } from '../cards/BoardCards';
import { bodyLabel } from '../cards/text';
import { COLORS } from '../theme';
import { settings } from '../../settings';
import type { BattleLayout, LaneSide, Point, Rect } from './battleLayout';

export type Side = 'top' | 'bottom';

export interface BoardHandlers {
  onLaneClick(side: Side, lane: number): void;
  onCreatureClick(uid: string): void;
  onFloopClick(uid: string): void;
  onHover(uid: string | null, anchor: Point | null): void;
}

function dashedRoundRect(g: Phaser.GameObjects.Graphics, r: Rect, dash = 10): void {
  const segs: [number, number, number, number][] = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [x1, y1, x2, y2] of segs) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.floor(len / dash);
    for (let i = 0; i < n; i += 2) {
      const a = i / n;
      const b = Math.min(1, (i + 1) / n);
      g.lineBetween(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    }
  }
}

export class BoardView {
  readonly creatures = new Map<string, BoardCreatureView>();
  readonly buildings = new Map<string, BuildingView>();
  private laneOverlays: Record<Side, Phaser.GameObjects.Graphics[]> = { top: [], bottom: [] };
  private root: Phaser.GameObjects.Container;
  private pieces: Phaser.GameObjects.Container;

  constructor(
    private scene: Phaser.Scene,
    private layout: BattleLayout,
    private bottom: PlayerId,
    state: GameState,
    private handlers: BoardHandlers,
  ) {
    this.root = scene.add.container(0, 0).setDepth(0);
    this.pieces = scene.add.container(0, 0).setDepth(10);
    this.drawTable(state);
  }

  private sideOf(player: PlayerId): Side {
    return player === this.bottom ? 'bottom' : 'top';
  }

  slot(player: PlayerId, lane: number): LaneSide {
    const l = this.layout.lanes[lane];
    return this.sideOf(player) === 'bottom' ? l.player : l.enemy;
  }

  private drawTable(state: GameState): void {
    const { scene, layout } = this;
    const table = scene.add.tileSprite(0, 0, layout.width, layout.height, UI_KEYS.table).setOrigin(0).setTileScale(0.6);
    this.root.add(table);

    for (const player of [this.bottom, opponentOf(this.bottom)]) {
      const side = this.sideOf(player);
      state.players[player].lanes.forEach((lane, i) => {
        const s = this.slot(player, i);
        const r = s.rect;
        const land = getLandscape(lane.landscapeId);
        const shadow = scene.add.graphics().fillStyle(COLORS.ink, 0.9).fillRoundedRect(r.x + 4, r.y + 5, r.w, r.h, 16);
        const img = scene.add.image(r.x + r.w / 2, r.y + r.h / 2, land.art);
        const cover = Math.max(r.w / img.width, r.h / img.height);
        img.setScale(cover);
        const maskShape = scene.make.graphics({}, false).fillStyle(0xffffff).fillRoundedRect(r.x, r.y, r.w, r.h, 16);
        img.setMask(maskShape.createGeometryMask());
        const border = scene.add.graphics().lineStyle(4, COLORS.ink).strokeRoundedRect(r.x, r.y, r.w, r.h, 16);

        const sc = layout.boardScale;
        const slots = scene.add.graphics().lineStyle(3, COLORS.white, 0.85);
        dashedRoundRect(slots, { x: s.creature.x - (CREATURE_W * sc) / 2, y: s.creature.y - (CREATURE_H * sc) / 2, w: CREATURE_W * sc, h: CREATURE_H * sc });
        const bs = layout.buildingScale;
        dashedRoundRect(slots, { x: s.building.x - (BUILDING_W * bs) / 2, y: s.building.y - (BUILDING_H * bs) / 2, w: BUILDING_W * bs, h: BUILDING_H * bs }, 8);
        const watermark = scene.add.image(s.creature.x, s.creature.y, glyphKey(land.faction)).setDisplaySize(44 * sc, 44 * sc).setAlpha(0.55);

        // Landscape name tag: text plus glyph so it never depends on colour.
        const tagY = side === 'top' ? r.y + 16 : r.y + r.h - 16;
        const label = bodyLabel(scene, 0, 0, land.name, 13, undefined, COLORS.ink);
        const tagW = label.width + 34;
        const tag = scene.add.container(r.x + 10 + tagW / 2, tagY);
        const tagBg = scene.add.graphics().fillStyle(COLORS.paper).fillRoundedRect(-tagW / 2, -12, tagW, 24, 10).lineStyle(2.5, COLORS.ink).strokeRoundedRect(-tagW / 2, -12, tagW, 24, 10);
        const tagGlyph = scene.add.image(-tagW / 2 + 13, 0, glyphKey(land.faction)).setDisplaySize(17, 17);
        label.setPosition(9, 1);
        tag.add([tagBg, tagGlyph, label]);

        const overlay = scene.add.graphics();
        this.laneOverlays[side][i] = overlay;

        const zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive({ useHandCursor: false });
        zone.on('pointerup', () => this.handlers.onLaneClick(side, i));
        this.root.add([shadow, img, border, slots, watermark, tag, overlay, zone]);
      });
    }
  }

  /** Paints lane halves: green for legal drops, red for danger/targets. */
  highlightLanes(side: Side, lanes: number[], color: 'mint' | 'tomato' | 'lemon'): void {
    lanes.forEach((i) => {
      const g = this.laneOverlays[side][i];
      const s = side === 'bottom' ? this.layout.lanes[i].player : this.layout.lanes[i].enemy;
      const r = s.rect;
      g.clear();
      g.fillStyle(COLORS[color], 0.28).fillRoundedRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 13);
      g.lineStyle(10, COLORS[color], 1).strokeRoundedRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, 13);
      g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20, 10);
      if (color === 'mint') {
        // A chunky plus marks exactly where the card will land.
        const c = s.creature;
        g.fillStyle(COLORS.ink).fillRoundedRect(c.x - 9 + 3, c.y - 30 + 4, 18, 60, 6).fillRoundedRect(c.x - 30 + 3, c.y - 9 + 4, 60, 18, 6);
        g.fillStyle(COLORS.paper).fillRoundedRect(c.x - 9, c.y - 30, 18, 60, 6).fillRoundedRect(c.x - 30, c.y - 9, 60, 18, 6);
      }
      g.setAlpha(1);
      if (!settings.get().reducedMotion) {
        this.scene.tweens.add({ targets: g, alpha: 0.6, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });
  }

  clearLaneHighlights(): void {
    for (const side of ['top', 'bottom'] as const) {
      for (const g of this.laneOverlays[side]) {
        if (!g) continue;
        this.scene.tweens.killTweensOf(g);
        g.clear().setAlpha(1);
      }
    }
  }

  /** Brings every creature/building view in line with `state`. Returns views created this call. */
  sync(state: GameState, viewer: PlayerId, animate: boolean): void {
    const sc = this.layout.boardScale;
    const seenC = new Set<string>();
    const seenB = new Set<string>();
    for (const player of Object.values(state.players)) {
      for (const lane of player.lanes) {
        const s = this.slot(player.id, lane.index);
        if (lane.creature) {
          const c = lane.creature;
          seenC.add(c.uid);
          let view = this.creatures.get(c.uid);
          if (!view) view = this.addCreature(c.uid, c.defId, s.creature);
          const def = getCreature(c.defId);
          const stats = creatureStats(player, lane);
          const mine = player.id === viewer && state.activePlayer === viewer;
          view.applyDisplay({
            attack: stats.attack,
            health: stats.health,
            baseAttack: def.attack,
            baseDefense: def.defense,
            damaged: c.damage > 0,
            flooped: c.flooped,
            frozen: c.frozen,
            drowsy: c.drowsy && !def.keywords.includes('HASTY'),
            hasFloop: Boolean(def.floop),
            floopAvailable: mine && canFloop(state, viewer, c.uid).ok,
          });
          const ready = mine && fightStatus(state, player.id, lane.index).ready;
          view.setHighlight(ready ? 'ready' : 'none');
          const targetAngle = c.flooped ? (this.sideOf(player.id) === 'bottom' ? 90 : -90) : 0;
          if (view.x !== s.creature.x || view.y !== s.creature.y || view.angle !== targetAngle) {
            if (animate) {
              this.scene.tweens.add({ targets: view, x: s.creature.x, y: s.creature.y, angle: targetAngle, duration: 260, ease: 'Back.Out' });
            } else view.setPosition(s.creature.x, s.creature.y).setAngle(targetAngle);
          }
          view.setScale(sc);
        }
        if (lane.building) {
          const b = lane.building;
          seenB.add(b.uid);
          let view = this.buildings.get(b.uid);
          if (!view) view = this.addBuilding(b.uid, b.defId, s.building);
          view.setFlooped(b.flooped, player.id === viewer && state.activePlayer === viewer && canFloop(state, viewer, b.uid).ok);
          view.setPosition(s.building.x, s.building.y).setScale(this.layout.buildingScale);
        }
      }
    }
    for (const [uid, view] of this.creatures) if (!seenC.has(uid)) this.removeCreature(uid, view);
    for (const [uid, view] of this.buildings) if (!seenB.has(uid)) this.removeBuilding(uid, view);
  }

  addCreature(uid: string, defId: string, at: Point): BoardCreatureView {
    const view = new BoardCreatureView(this.scene, uid, defId, at.x, at.y).setScale(this.layout.boardScale);
    this.wire(view, uid);
    this.pieces.add(view);
    this.creatures.set(uid, view);
    return view;
  }

  addBuilding(uid: string, defId: string, at: Point): BuildingView {
    const view = new BuildingView(this.scene, uid, defId, at.x, at.y).setScale(this.layout.buildingScale);
    this.wire(view, uid);
    this.pieces.add(view);
    this.buildings.set(uid, view);
    return view;
  }

  private wire(view: BoardCreatureView | BuildingView, uid: string): void {
    view.setInteractive({ useHandCursor: true });
    view.on('pointerup', (p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      if (p.button === 0) this.handlers.onCreatureClick(uid);
    });
    view.on('pointerover', () => this.handlers.onHover(uid, { x: view.x, y: view.y }));
    view.on('pointerout', () => this.handlers.onHover(null, null));
    if (view.pill) {
      view.pill.setInteractive({ useHandCursor: true });
      view.pill.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.handlers.onFloopClick(uid);
      });
    }
  }

  removeCreature(uid: string, view = this.creatures.get(uid)): void {
    this.creatures.delete(uid);
    view?.destroy();
  }

  removeBuilding(uid: string, view = this.buildings.get(uid)): void {
    this.buildings.delete(uid);
    view?.destroy();
  }

  setTargetHighlights(uids: string[], mode: SlotHighlight): void {
    for (const uid of uids) {
      this.creatures.get(uid)?.setHighlight(mode);
      this.buildings.get(uid)?.setHighlight(mode);
    }
  }

  clearTargetHighlights(): void {
    for (const b of this.buildings.values()) b.setHighlight('none');
  }

  destroy(): void {
    this.root.destroy();
    this.pieces.destroy();
    this.creatures.clear();
    this.buildings.clear();
  }
}

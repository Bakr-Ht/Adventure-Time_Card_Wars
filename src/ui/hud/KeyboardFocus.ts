import Phaser from 'phaser';
import type { BattleScene } from '../../scenes/BattleScene';
import { COLORS } from '../theme';
import type { Rect } from './battleLayout';

interface FocusItem {
  id: string;
  bounds(): Rect;
  activate(): void;
}

/**
 * Keyboard access to canvas objects. Arrow keys move a visible focus ring
 * through whatever is actionable right now; Enter/Space activates it.
 * DOM buttons (FIGHT, Draw, Hero, Menu) use normal Tab focus.
 */
export class KeyboardFocus {
  private index = -1;
  private ring: Phaser.GameObjects.Graphics;
  private items: FocusItem[] = [];

  constructor(private scene: BattleScene) {
    this.ring = scene.add.graphics().setDepth(990);
  }

  private collect(): FocusItem[] {
    const s = this.scene;
    const pending = s.interaction.pending;
    const fromView = (obj: Phaser.GameObjects.Container): Rect => {
      const b = obj.getBounds();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    if (pending?.kind === 'play' && pending.mode === 'lane') {
      return pending.lanes.map((i) => ({
        id: `lane-${i}`,
        bounds: () => s.battleLayout.lanes[i].player.rect,
        activate: () => s.interaction.clickLane('bottom', i),
      }));
    }
    if (pending && 'targets' in pending) {
      return pending.targets.flatMap((uid) => {
        const view = s.board.creatures.get(uid) ?? s.board.buildings.get(uid);
        return view ? [{ id: uid, bounds: () => fromView(view), activate: () => s.interaction.clickTarget(uid) }] : [];
      });
    }
    const items: FocusItem[] = s.hand.uids.flatMap((uid) => {
      const face = s.hand.cards.get(uid);
      return face ? [{ id: uid, bounds: () => fromView(face), activate: () => s.interaction.clickHand(uid) }] : [];
    });
    for (const view of [...s.board.creatures.values(), ...s.board.buildings.values()]) {
      if (!view.pill) continue;
      const owner = s.state.players[s.human].lanes.some((l) => l.creature?.uid === view.uid || l.building?.uid === view.uid);
      if (owner) items.push({ id: `floop-${view.uid}`, bounds: () => fromView(view), activate: () => s.interaction.clickFloop(view.uid) });
    }
    return items;
  }

  handleKey(e: KeyboardEvent): void {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (forward || back) {
      e.preventDefault();
      this.items = this.collect();
      if (this.items.length === 0) return;
      this.index = this.index < 0 ? 0 : (this.index + (forward ? 1 : -1) + this.items.length) % this.items.length;
      this.draw();
      return;
    }
    if (/^[1-8]$/.test(e.key)) {
      const uid = this.scene.hand.uids[Number(e.key) - 1];
      if (uid) this.scene.interaction.clickHand(uid);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const item = this.items[this.index];
      if (item) {
        const id = item.id;
        item.activate();
        this.items = this.collect();
        this.index = Math.max(0, this.items.findIndex((i) => i.id === id));
        this.draw();
      } else {
        this.scene.interaction.confirm();
      }
    }
  }

  refresh(): void {
    if (this.index < 0) return;
    this.items = this.collect();
    if (this.index >= this.items.length) this.index = this.items.length - 1;
    this.draw();
  }

  reset(): void {
    this.index = -1;
    this.ring.destroy();
    this.ring = this.scene.add.graphics().setDepth(990);
  }

  private draw(): void {
    this.ring.clear();
    const item = this.items[this.index];
    if (!item) return;
    const r = item.bounds();
    this.ring.lineStyle(5, COLORS.grape).strokeRoundedRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 16);
    this.ring.lineStyle(2, COLORS.paper).strokeRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 13);
  }
}

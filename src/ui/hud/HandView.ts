import Phaser from 'phaser';
import type { CardRef } from '../../game/state/types';
import { CardFace, CARD_H, CARD_W, type CardHighlight } from '../cards/CardFace';
import type { Point, Rect } from './battleLayout';

export interface HandHandlers {
  onCardClick(uid: string): void;
  onCardHover(uid: string | null): void;
}

interface Slot {
  x: number;
  y: number;
  angle: number;
}

/** The human player's hand: a gentle fan that lifts cards on hover and selection. */
export class HandView {
  readonly cards = new Map<string, CardFace>();
  private order: string[] = [];
  private hovered: string | null = null;
  private selected: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    private rect: Rect,
    private scale: number,
    private handlers: HandHandlers,
  ) {}

  private slots(n: number): Slot[] {
    const w = CARD_W * this.scale;
    const spacing = n <= 1 ? 0 : Math.min(w + 12, (this.rect.w - w - 20) / (n - 1));
    const cx = this.rect.x + this.rect.w / 2;
    const baseY = this.rect.y + this.rect.h - 28 - (CARD_H * this.scale) / 2;
    return Array.from({ length: n }, (_, i) => {
      const t = i - (n - 1) / 2;
      return { x: cx + t * spacing, y: baseY + Math.abs(t) * 3, angle: t * 2.2 };
    });
  }

  /** Aligns the hand with `cards`, creating any missing faces at `spawnFrom`. */
  sync(cards: CardRef[], animate: boolean, spawnFrom?: Point): void {
    const keep = new Set(cards.map((c) => c.uid));
    for (const [uid, face] of this.cards) {
      if (!keep.has(uid)) {
        face.destroy();
        this.cards.delete(uid);
      }
    }
    for (const c of cards) if (!this.cards.has(c.uid)) this.add(c, spawnFrom);
    this.order = cards.map((c) => c.uid);
    this.arrange(animate);
  }

  add(card: CardRef, from?: Point): CardFace {
    const face = new CardFace(this.scene, card.defId, from?.x ?? this.rect.x + this.rect.w / 2, from?.y ?? this.rect.y + this.rect.h);
    face.setScale(this.scale).setDepth(100);
    face.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    face.on('pointerover', () => {
      this.hovered = card.uid;
      this.arrange(true);
      this.handlers.onCardHover(card.uid);
    });
    face.on('pointerout', () => {
      if (this.hovered === card.uid) this.hovered = null;
      this.arrange(true);
      this.handlers.onCardHover(null);
    });
    face.on('pointerup', (p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      if (p.button === 0) this.handlers.onCardClick(card.uid);
    });
    this.cards.set(card.uid, face);
    return face;
  }

  /** Detaches a card face (e.g. to animate it onto the board). The caller owns it afterwards. */
  take(uid: string): CardFace | null {
    const face = this.cards.get(uid);
    if (!face) return null;
    this.cards.delete(uid);
    this.order = this.order.filter((u) => u !== uid);
    face.removeAllListeners();
    face.disableInteractive();
    if (this.hovered === uid) this.hovered = null;
    this.arrange(true);
    return face;
  }

  setSelected(uid: string | null): void {
    this.selected = uid;
    this.arrange(true);
  }

  setHighlights(modes: Map<string, CardHighlight>): void {
    for (const [uid, face] of this.cards) face.setHighlight(uid === this.selected ? 'selected' : (modes.get(uid) ?? 'none'));
  }

  arrange(animate: boolean): void {
    const slots = this.slots(this.order.length);
    this.order.forEach((uid, i) => {
      const face = this.cards.get(uid);
      if (!face) return;
      const lifted = uid === this.hovered || uid === this.selected;
      const s = slots[i];
      const target = {
        x: s.x,
        y: lifted ? s.y - CARD_H * this.scale * 0.32 : s.y,
        angle: lifted ? 0 : s.angle,
        scale: lifted ? this.scale * 1.14 : this.scale,
      };
      face.setDepth(lifted ? 200 : 100 + i);
      this.scene.tweens.killTweensOf(face);
      if (animate) this.scene.tweens.add({ targets: face, ...target, duration: 160, ease: 'Quad.Out' });
      else face.setPosition(target.x, target.y).setAngle(target.angle).setScale(target.scale);
    });
  }

  positionOf(uid: string): Point | null {
    const face = this.cards.get(uid);
    return face ? { x: face.x, y: face.y } : null;
  }

  get uids(): string[] {
    return [...this.order];
  }

  destroy(): void {
    for (const face of this.cards.values()) face.destroy();
    this.cards.clear();
    this.order = [];
  }
}

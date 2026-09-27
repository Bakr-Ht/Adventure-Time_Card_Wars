import Phaser from 'phaser';
import { CardFace, CARD_H, CARD_W } from '../cards/CardFace';
import { bodyLabel } from '../cards/text';
import { COLORS } from '../theme';
import type { BattleLayout, Point } from './battleLayout';

/** Large readable copy of a board card, shown on hover, keyboard focus or click. */
export class Preview {
  private container: Phaser.GameObjects.Container | null = null;

  constructor(private scene: Phaser.Scene, private layout: BattleLayout) {}

  show(defId: string, anchor: Point, status: string | null): void {
    this.hide();
    const scale = Math.min(1, (this.layout.height * 0.52) / CARD_H);
    const w = CARD_W * scale;
    const board = this.layout.board;
    const rightRoom = board.x + board.w - anchor.x;
    const x = rightRoom > w + 120 ? anchor.x + 90 + w / 2 : anchor.x - 90 - w / 2;
    const y = Phaser.Math.Clamp(anchor.y, board.y + (CARD_H * scale) / 2, board.y + board.h - (CARD_H * scale) / 2);
    const face = new CardFace(this.scene, defId, 0, 0).setScale(scale);
    const parts: Phaser.GameObjects.GameObject[] = [face];
    if (status) {
      const text = bodyLabel(this.scene, 0, (CARD_H * scale) / 2 + 24, status, 15, w + 40);
      const bg = this.scene.add.graphics();
      const bw = text.width + 24;
      const bh = text.height + 12;
      bg.fillStyle(COLORS.paper).fillRoundedRect(-bw / 2, text.y - bh / 2, bw, bh, 10);
      bg.lineStyle(3, COLORS.ink).strokeRoundedRect(-bw / 2, text.y - bh / 2, bw, bh, 10);
      parts.push(bg, text);
    }
    this.container = this.scene.add.container(Phaser.Math.Clamp(x, w / 2 + 8, this.layout.width - w / 2 - 8), y, parts).setDepth(980);
  }

  hide(): void {
    this.container?.destroy();
    this.container = null;
  }
}

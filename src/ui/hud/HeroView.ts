import Phaser from 'phaser';
import { UI_KEYS } from '../../assets/manifest';
import { getHero } from '../../game/data/cards';
import type { PlayerState } from '../../game/state/types';
import { bodyLabel, displayLabel } from '../cards/text';
import { COLORS } from '../theme';
import type { Point } from './battleLayout';

/** Portrait + HP pill. The HP number is shown in text so it never relies on bar colour. */
export class HeroView extends Phaser.GameObjects.Container {
  private hpText: Phaser.GameObjects.Text;
  private hpBar: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image;
  private shownHp: number;
  private maxHp: number;
  private readonly barW: number;
  private readonly barY: number;
  private readonly barX: number;

  constructor(scene: Phaser.Scene, at: Point, radius: number, player: PlayerState, compact: boolean) {
    super(scene, at.x, at.y);
    const hero = getHero(player.heroId);
    this.shownHp = player.hp;
    this.maxHp = player.maxHp;
    const ring = scene.add.graphics();
    ring.fillStyle(COLORS.ink).fillCircle(4, 5, radius + 4);
    this.portrait = scene.add.image(0, 0, hero.portrait).setDisplaySize(radius * 2 + 6, radius * 2 + 6);

    this.barW = compact ? 150 : 124;
    this.barX = compact ? radius + 34 : -this.barW / 2 + 12;
    this.barY = compact ? 4 : radius + 16;
    this.hpBar = scene.add.graphics();
    this.hpText = displayLabel(scene, this.barX + this.barW / 2, this.barY + 1, '', 19, COLORS.paper, 4);
    const heart = scene.add.graphics();
    const hx = this.barX - 12;
    const hy = this.barY;
    heart.fillStyle(COLORS.tomato).lineStyle(3, COLORS.ink);
    heart.fillCircle(hx - 5, hy - 4, 7).fillCircle(hx + 5, hy - 4, 7);
    heart.fillTriangle(hx - 12, hy - 1, hx + 12, hy - 1, hx, hy + 13);
    heart.strokeCircle(hx - 5, hy - 4, 7).strokeCircle(hx + 5, hy - 4, 7);

    const name = compact
      ? displayLabel(scene, radius + 18, -radius * 0.62, hero.name, 22, COLORS.paper, 5).setOrigin(0, 0.5)
      : displayLabel(scene, 0, -radius - 16, hero.name.split(' ')[0], 22, COLORS.paper, 5);
    this.add([ring, this.portrait, this.hpBar, heart, this.hpText, name]);
    this.drawHp(player.hp);
    scene.add.existing(this);
  }

  private drawHp(hp: number): void {
    const g = this.hpBar;
    const { barX: x, barY: y, barW: w } = this;
    const ratio = Phaser.Math.Clamp(hp / this.maxHp, 0, 1);
    g.clear();
    g.fillStyle(COLORS.ink).fillRoundedRect(x + 3, y - 11, w, 26, 12);
    g.fillStyle(COLORS.paper).fillRoundedRect(x, y - 14, w, 26, 12);
    if (ratio > 0) {
      g.fillStyle(ratio > 0.5 ? COLORS.mint : ratio > 0.25 ? COLORS.lemon : COLORS.tomato);
      g.fillRoundedRect(x + 3, y - 11, Math.max(20, (w - 6) * ratio), 20, 9);
    }
    g.lineStyle(3, COLORS.ink).strokeRoundedRect(x, y - 14, w, 26, 12);
    this.hpText.setText(`${Math.max(0, hp)} / ${this.maxHp}`);
  }

  setHp(hp: number): void {
    if (hp === this.shownHp) return;
    const from = this.shownHp;
    this.shownHp = hp;
    const counter = { v: from };
    this.scene.tweens.add({
      targets: counter,
      v: hp,
      duration: 300,
      onUpdate: () => this.drawHp(Math.round(counter.v)),
      onComplete: () => this.drawHp(hp),
    });
  }

  get hp(): number {
    return this.shownHp;
  }

  get center(): Point {
    return { x: this.x, y: this.y };
  }

  flash(color: number): void {
    this.portrait.setTint(color);
    this.scene.time.delayedCall(160, () => this.portrait.clearTint());
  }
}

/** Card-back stack showing a count. Used for decks and the AI's hand. */
export class PileView extends Phaser.GameObjects.Container {
  private countText: Phaser.GameObjects.Text;
  private sub: Phaser.GameObjects.Text | null;

  constructor(scene: Phaser.Scene, at: Point, scale: number, label: string, subLabel?: string, captionLeft = false) {
    super(scene, at.x, at.y);
    const backs: Phaser.GameObjects.Image[] = [];
    for (let i = 2; i >= 0; i--) {
      backs.push(scene.add.image(i * 3, -i * 3, UI_KEYS.cardBack).setDisplaySize(200 * scale, 280 * scale));
    }
    this.countText = displayLabel(scene, 0, 0, '0', 30 * Math.max(0.7, scale * 2.2), COLORS.lemon, 6);
    const caption = captionLeft
      ? bodyLabel(scene, -100 * scale - 10, 0, label, 14, undefined, COLORS.paper).setOrigin(1, 0.5)
      : bodyLabel(scene, 0, 140 * scale + 14, label, 13, undefined, COLORS.ink);
    this.sub = subLabel ? bodyLabel(scene, 0, 140 * scale + 32, subLabel, 12, undefined, COLORS.ink) : null;
    this.add([...backs, this.countText, caption, ...(this.sub ? [this.sub] : [])]);
    scene.add.existing(this);
  }

  setCount(n: number, sub?: string): void {
    this.countText.setText(String(n));
    if (sub !== undefined && this.sub) this.sub.setText(sub);
  }
}

export function describeHeroCooldown(player: PlayerState): string {
  const hero = getHero(player.heroId);
  return player.heroCooldown > 0 ? `${hero.ability.name}: ${player.heroCooldown} turn${player.heroCooldown > 1 ? 's' : ''}` : `${hero.ability.name}: ready`;
}

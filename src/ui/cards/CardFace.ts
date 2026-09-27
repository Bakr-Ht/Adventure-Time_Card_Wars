import Phaser from 'phaser';
import { glyphKey } from '../../assets/manifest';
import type { CardDef, PlayableDef } from '../../game/cards/types';
import { getCard } from '../../game/data/cards';
import { COLORS, FACTION_COLORS, RARITY_PIPS, SHADOW } from '../theme';
import { bodyLabel, displayLabel, fitText } from './text';

export const CARD_W = 200;
export const CARD_H = 280;

export type CardHighlight = 'none' | 'playable' | 'unplayable' | 'selected' | 'target';

const TYPE_LABEL: Record<string, string> = { CREATURE: 'Creature', BUILDING: 'Building', SPELL: 'Spell' };

/** Draws a sword or shield badge with a number. Shape differs so stats never rely on colour alone. */
export function statBadge(
  scene: Phaser.Scene,
  kind: 'atk' | 'def',
  x: number,
  y: number,
  value: number,
  r = 22,
): { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text } {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink).lineStyle(4, COLORS.ink);
  if (kind === 'atk') {
    // Burst for attack.
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 16; i++) {
      const rr = i % 2 === 0 ? r * 1.1 : r * 0.82;
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
    }
    g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 3, p.y + 3)), true);
    g.fillStyle(COLORS.tomato).fillPoints(pts, true).strokePoints(pts, true);
  } else {
    // Shield for defense.
    const shield = (dx: number, dy: number) => {
      const p = new Phaser.Curves.Path(-r + dx, -r * 0.85 + dy);
      p.lineTo(r + dx, -r * 0.85 + dy);
      p.lineTo(r + dx, r * 0.1 + dy);
      p.quadraticBezierTo(dx, r * 1.15 + dy, -r + dx, r * 0.1 + dy);
      p.closePath();
      return p.getPoints(12);
    };
    g.fillPoints(shield(3, 3), true);
    g.fillStyle(COLORS.sky).fillPoints(shield(0, 0), true).strokePoints(shield(0, 0), true);
  }
  const text = displayLabel(scene, 0, kind === 'def' ? -1 : 1, String(value), r * 1.05, COLORS.paper, 5);
  const container = scene.add.container(x, y, [g, text]);
  return { container, text };
}

/**
 * The full-size card face used in the hand and for inspect previews.
 * Built from primitives so any faction/rarity combination renders consistently.
 */
export class CardFace extends Phaser.GameObjects.Container {
  readonly def: CardDef;
  private outline: Phaser.GameObjects.Graphics;
  private dim: Phaser.GameObjects.Graphics;
  private highlight: CardHighlight = 'none';

  constructor(scene: Phaser.Scene, defId: string, x = 0, y = 0) {
    super(scene, x, y);
    this.def = getCard(defId);
    const def = this.def as PlayableDef;
    const faction = FACTION_COLORS[def.faction];
    const L = -CARD_W / 2;
    const T = -CARD_H / 2;

    this.outline = scene.add.graphics();
    const frame = scene.add.graphics();
    frame.fillStyle(COLORS.ink, SHADOW.alpha).fillRoundedRect(L + SHADOW.x, T + SHADOW.y, CARD_W, CARD_H, 18);
    frame.fillStyle(faction).fillRoundedRect(L, T, CARD_W, CARD_H, 18);
    // A lighter inner band gives the "printed card" depth without gradients.
    frame.fillStyle(COLORS.white, 0.22).fillRoundedRect(L + 8, T + 8, CARD_W - 16, CARD_H - 16, 12);
    frame.lineStyle(5, COLORS.ink).strokeRoundedRect(L, T, CARD_W, CARD_H, 18);

    // Name banner.
    frame.fillStyle(COLORS.paper).fillRoundedRect(L + 30, T + 10, CARD_W - 40, 32, 9);
    frame.lineStyle(3, COLORS.ink).strokeRoundedRect(L + 30, T + 10, CARD_W - 40, 32, 9);
    const name = displayLabel(scene, 16, T + 28, def.name, 19);
    fitText(name, CARD_W - 64);

    // Art window.
    const art = scene.add.image(0, T + 104, def.art).setDisplaySize(176, 124);
    frame.lineStyle(4, COLORS.ink).strokeRoundedRect(-88, T + 42, 176, 124, 6);

    // Cost gem (top-left).
    frame.fillStyle(COLORS.ink).fillCircle(L + 22 + 3, T + 22 + 3, 22);
    frame.fillStyle(COLORS.lemon).fillCircle(L + 22, T + 22, 22).lineStyle(4, COLORS.ink).strokeCircle(L + 22, T + 22, 22);
    const cost = displayLabel(scene, L + 22, T + 24, String(def.cost), 28, COLORS.ink);

    // Faction glyph medallion (shape identifies faction; colour is secondary).
    frame.fillStyle(COLORS.paper).fillCircle(72, T + 62, 17).lineStyle(3, COLORS.ink).strokeCircle(72, T + 62, 17);
    const glyph = scene.add.image(72, T + 62, glyphKey(def.faction)).setDisplaySize(26, 26);

    // Type line with landscape requirement and rarity pips.
    const typeText = bodyLabel(scene, L + 12, T + 180, TYPE_LABEL[def.type] ?? def.type, 14, undefined, COLORS.ink).setOrigin(0, 0.5);
    const reqIcons: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < def.landRequirement; i++) {
      reqIcons.push(scene.add.image(L + 20 + typeText.width + i * 16, T + 180, glyphKey(def.faction)).setDisplaySize(15, 15));
    }
    const pips = RARITY_PIPS[def.rarity];
    for (let i = 0; i < pips; i++) {
      const px = -L - 16 - i * 13;
      frame.fillStyle(def.rarity === 'LEGENDARY' ? COLORS.bubblegum : COLORS.paper);
      frame.fillPoints([
        new Phaser.Math.Vector2(px, T + 173),
        new Phaser.Math.Vector2(px + 5, T + 180),
        new Phaser.Math.Vector2(px, T + 187),
        new Phaser.Math.Vector2(px - 5, T + 180),
      ], true);
      frame.lineStyle(2, COLORS.ink).strokePoints([
        new Phaser.Math.Vector2(px, T + 173),
        new Phaser.Math.Vector2(px + 5, T + 180),
        new Phaser.Math.Vector2(px, T + 187),
        new Phaser.Math.Vector2(px - 5, T + 180),
      ], true);
    }

    // Rules text box.
    const isCreature = def.type === 'CREATURE';
    const boxH = isCreature ? 70 : 80;
    frame.fillStyle(COLORS.paper).fillRoundedRect(-90, T + 192, 180, boxH, 8);
    frame.lineStyle(3, COLORS.ink).strokeRoundedRect(-90, T + 192, 180, boxH, 8);
    const rules = bodyLabel(scene, 0, T + 192 + boxH / 2 - (isCreature ? 4 : 0), def.description, 14, 166);
    fitText(rules, 170, boxH - 8 - (isCreature ? 8 : 0), 10);

    const parts: Phaser.GameObjects.GameObject[] = [this.outline, frame, art, name, cost, glyph, typeText, ...reqIcons, rules];
    if (def.type === 'CREATURE') {
      parts.push(statBadge(scene, 'atk', L + 20, -T - 14, def.attack).container);
      parts.push(statBadge(scene, 'def', -L - 20, -T - 14, def.defense).container);
    }
    this.dim = scene.add.graphics();
    this.dim.fillStyle(COLORS.ink, 0.45).fillRoundedRect(L, T, CARD_W, CARD_H, 18).setVisible(false);
    parts.push(this.dim);
    this.add(parts);
    this.setSize(CARD_W, CARD_H);
    scene.add.existing(this);
  }

  setHighlight(mode: CardHighlight): this {
    if (mode === this.highlight) return this;
    this.highlight = mode;
    const g = this.outline;
    g.clear();
    this.dim.setVisible(mode === 'unplayable');
    const color = mode === 'playable' ? COLORS.mint : mode === 'selected' ? COLORS.lemon : mode === 'target' ? COLORS.tomato : null;
    if (color !== null) {
      g.fillStyle(color).fillRoundedRect(-CARD_W / 2 - 9, -CARD_H / 2 - 9, CARD_W + 18, CARD_H + 18, 24);
      g.lineStyle(3, COLORS.ink).strokeRoundedRect(-CARD_W / 2 - 9, -CARD_H / 2 - 9, CARD_W + 18, CARD_H + 18, 24);
    }
    return this;
  }
}

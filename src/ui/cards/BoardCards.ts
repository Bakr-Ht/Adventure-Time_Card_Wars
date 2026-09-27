import Phaser from 'phaser';
import { glyphKey } from '../../assets/manifest';
import { getBuilding, getCreature } from '../../game/data/cards';
import { COLORS, FACTION_COLORS, SHADOW } from '../theme';
import { statBadge } from './CardFace';
import { bodyLabel, displayLabel, fitText } from './text';

export const CREATURE_W = 150;
export const CREATURE_H = 180;
export const BUILDING_W = 104;
export const BUILDING_H = 112;

export type SlotHighlight = 'none' | 'ready' | 'selected' | 'target' | 'friendly-target' | 'danger';

const HIGHLIGHT_COLORS: Record<Exclude<SlotHighlight, 'none'>, number> = {
  ready: COLORS.mint,
  selected: COLORS.lemon,
  target: COLORS.tomato,
  'friendly-target': COLORS.mint,
  danger: COLORS.tomato,
};

export interface CreatureDisplay {
  attack: number;
  health: number;
  baseAttack: number;
  baseDefense: number;
  damaged: boolean;
  flooped: boolean;
  frozen: boolean;
  drowsy: boolean;
  hasFloop: boolean;
  floopAvailable: boolean;
}

/** A small FLOOP pill that sits on a card. Clickable separately from the card body. */
export class FloopPill extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  readonly pillWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w = 78) {
    super(scene, x, y);
    this.pillWidth = w;
    this.bg = scene.add.graphics();
    this.label = displayLabel(scene, 0, 1, 'FLOOP', 16, COLORS.ink);
    this.add([this.bg, this.label]);
    this.setSize(w, 28);
    this.setAvailable(false);
    scene.add.existing(this);
  }

  setAvailable(on: boolean): void {
    const w = this.pillWidth;
    this.bg.clear();
    this.bg.fillStyle(COLORS.ink).fillRoundedRect(-w / 2 + 2, -12, w, 28, 12);
    this.bg.fillStyle(on ? COLORS.lemon : 0xd8cdb8).fillRoundedRect(-w / 2, -14, w, 28, 12);
    this.bg.lineStyle(3, COLORS.ink).strokeRoundedRect(-w / 2, -14, w, 28, 12);
    this.label.setAlpha(on ? 1 : 0.55);
  }
}

function frame(scene: Phaser.Scene, w: number, h: number, color: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, SHADOW.alpha).fillRoundedRect(-w / 2 + 4, -h / 2 + 5, w, h, 14);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.lineStyle(4, COLORS.ink).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  return g;
}

/** A creature standing in a lane. Shows live ATK/health and its status. */
export class BoardCreatureView extends Phaser.GameObjects.Container {
  readonly uid: string;
  readonly defId: string;
  readonly pill: FloopPill | null;
  private glow: Phaser.GameObjects.Graphics;
  private frost: Phaser.GameObjects.Graphics;
  private atkBadge: { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text };
  private hpBadge: { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text };
  private zzz: Phaser.GameObjects.Text;
  private shownHealth = 0;

  constructor(scene: Phaser.Scene, uid: string, defId: string, x: number, y: number) {
    super(scene, x, y);
    this.uid = uid;
    this.defId = defId;
    const def = getCreature(defId);
    const W = CREATURE_W;
    const H = CREATURE_H;
    this.glow = scene.add.graphics();
    const body = frame(scene, W, H, FACTION_COLORS[def.faction]);
    const art = scene.add.image(0, -H / 2 + 56, def.art).setDisplaySize(W - 14, 100);
    body.lineStyle(3, COLORS.ink).strokeRoundedRect(-W / 2 + 7, -H / 2 + 6, W - 14, 100, 6);
    body.fillStyle(COLORS.paper).fillRoundedRect(-W / 2 + 6, -H / 2 + 110, W - 12, 26, 7);
    body.lineStyle(3, COLORS.ink).strokeRoundedRect(-W / 2 + 6, -H / 2 + 110, W - 12, 26, 7);
    const name = displayLabel(scene, 0, -H / 2 + 124, def.name, 16);
    fitText(name, W - 22);
    const glyph = scene.add.image(W / 2 - 18, -H / 2 + 20, glyphKey(def.faction)).setDisplaySize(22, 22);
    this.frost = scene.add.graphics();
    this.frost.fillStyle(COLORS.frost, 0.55).fillRoundedRect(-W / 2, -H / 2, W, H, 14).setVisible(false);
    this.atkBadge = statBadge(scene, 'atk', -W / 2 + 18, H / 2 - 16, def.attack, 20);
    this.hpBadge = statBadge(scene, 'def', W / 2 - 18, H / 2 - 16, def.defense, 20);
    this.zzz = displayLabel(scene, -W / 2 + 24, -H / 2 + 22, 'Zzz', 18, COLORS.paper, 4).setVisible(false);
    this.pill = def.floop ? new FloopPill(scene, 0, H / 2 - 16, 70) : null;
    const parts: Phaser.GameObjects.GameObject[] = [this.glow, body, art, name, glyph, this.frost, this.atkBadge.container, this.hpBadge.container, this.zzz];
    if (this.pill) parts.push(this.pill);
    this.add(parts);
    this.setSize(W, H);
    scene.add.existing(this);
  }

  applyDisplay(d: CreatureDisplay): void {
    this.atkBadge.text.setText(String(d.attack));
    this.atkBadge.text.setColor(d.attack > d.baseAttack ? '#B9FFCF' : d.attack < d.baseAttack ? '#FFD3D5' : '#FFFBF0');
    this.setHealth(d.health, d.damaged);
    this.frost.setVisible(d.frozen);
    this.zzz.setVisible(d.drowsy && !d.flooped);
    this.pill?.setAvailable(d.floopAvailable);
  }

  setHealth(health: number, damaged = true): void {
    this.shownHealth = health;
    this.hpBadge.text.setText(String(Math.max(0, health)));
    this.hpBadge.text.setColor(damaged ? '#FFD3D5' : '#FFFBF0');
  }

  get health(): number {
    return this.shownHealth;
  }

  get badges(): { atk: Phaser.GameObjects.Container; hp: Phaser.GameObjects.Container } {
    return { atk: this.atkBadge.container, hp: this.hpBadge.container };
  }

  setHighlight(mode: SlotHighlight): void {
    const g = this.glow;
    g.clear();
    if (mode === 'none') return;
    const pad = mode === 'ready' ? 6 : 10;
    g.fillStyle(HIGHLIGHT_COLORS[mode], mode === 'ready' ? 0.9 : 1);
    g.fillRoundedRect(-CREATURE_W / 2 - pad, -CREATURE_H / 2 - pad, CREATURE_W + pad * 2, CREATURE_H + pad * 2, 18);
    g.lineStyle(3, COLORS.ink).strokeRoundedRect(-CREATURE_W / 2 - pad, -CREATURE_H / 2 - pad, CREATURE_W + pad * 2, CREATURE_H + pad * 2, 18);
  }
}

/** A building tile next to a lane's creature slot. */
export class BuildingView extends Phaser.GameObjects.Container {
  readonly uid: string;
  readonly defId: string;
  readonly pill: FloopPill | null;
  private glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, uid: string, defId: string, x: number, y: number) {
    super(scene, x, y);
    this.uid = uid;
    this.defId = defId;
    const def = getBuilding(defId);
    const W = BUILDING_W;
    const H = BUILDING_H;
    this.glow = scene.add.graphics();
    const body = frame(scene, W, H, FACTION_COLORS[def.faction]);
    const art = scene.add.image(0, -H / 2 + 36, def.art).setDisplaySize(W - 12, 62);
    body.lineStyle(3, COLORS.ink).strokeRoundedRect(-W / 2 + 6, -H / 2 + 5, W - 12, 62, 5);
    const name = bodyLabel(scene, 0, -H / 2 + 80, def.name, 12, W - 10);
    fitText(name, W - 10, 26, 9);
    this.pill = def.floop ? new FloopPill(scene, 0, H / 2 - 4, 66) : null;
    const parts: Phaser.GameObjects.GameObject[] = [this.glow, body, art, name];
    if (this.pill) parts.push(this.pill);
    this.add(parts);
    this.setSize(W, H);
    scene.add.existing(this);
  }

  setFlooped(on: boolean, floopAvailable: boolean): void {
    this.pill?.setAvailable(floopAvailable);
    this.setAlpha(on ? 0.75 : 1);
  }

  setHighlight(mode: SlotHighlight): void {
    const g = this.glow;
    g.clear();
    if (mode === 'none') return;
    g.fillStyle(HIGHLIGHT_COLORS[mode]).fillRoundedRect(-BUILDING_W / 2 - 8, -BUILDING_H / 2 - 8, BUILDING_W + 16, BUILDING_H + 16, 16);
    g.lineStyle(3, COLORS.ink).strokeRoundedRect(-BUILDING_W / 2 - 8, -BUILDING_H / 2 - 8, BUILDING_W + 16, BUILDING_H + 16, 16);
  }
}

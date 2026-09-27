import { LANE_COUNT } from '../../game/state/types';
import { BUILDING_H, BUILDING_W, CREATURE_H, CREATURE_W } from '../cards/BoardCards';
import { CARD_H } from '../cards/CardFace';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LaneSide {
  rect: Rect;
  creature: Point;
  building: Point;
}

export type LayoutMode = 'wide' | 'compact' | 'tall';

export interface BattleLayout {
  mode: LayoutMode;
  width: number;
  height: number;
  enemyBar: Rect;
  board: Rect;
  lanes: { enemy: LaneSide; player: LaneSide }[];
  hand: Rect;
  playerHero: Point;
  enemyHero: Point;
  playerHeroRadius: number;
  enemyHeroRadius: number;
  deckPile: Point;
  enemyHandAnchor: Point;
  rail: Rect;
  handScale: number;
  boardScale: number;
  buildingScale: number;
}

const PAD = 14;
const GAP = 8;

export function computeBattleLayout(width: number, height: number): BattleLayout {
  const aspect = width / height;
  const mode: LayoutMode = aspect >= 1.45 ? 'wide' : aspect >= 1.1 ? 'compact' : 'tall';
  const railW = mode === 'wide' ? 300 : 0;
  const mainW = width - railW;
  const handH = mode === 'tall' ? 290 : 262;
  const stripH = mode === 'tall' ? 150 : 0;

  const enemyBar = { x: PAD, y: 8, w: mainW - PAD * 2, h: 88 };
  const boardTop = enemyBar.y + enemyBar.h + 6;
  const boardBottom = height - handH - stripH - 6;
  const board = { x: PAD, y: boardTop, w: mainW - PAD * 2, h: boardBottom - boardTop };

  const laneW = (board.w - GAP * (LANE_COUNT - 1)) / LANE_COUNT;
  const halfH = (board.h - GAP) / 2;
  const stacked = laneW < 270;
  const boardScale = stacked
    ? Math.min(1, (laneW - 12) / (CREATURE_W + 10), (halfH - 10) / (CREATURE_H + BUILDING_H * 0.62))
    : Math.min(1, (laneW - 20) / (CREATURE_W + BUILDING_W + 16), (halfH - 12) / (CREATURE_H + 8));

  const lanes = Array.from({ length: LANE_COUNT }, (_, i) => {
    const x = board.x + i * (laneW + GAP);
    const enemyRect = { x, y: board.y, w: laneW, h: halfH };
    const playerRect = { x, y: board.y + halfH + GAP, w: laneW, h: halfH };
    const side = (rect: Rect, isEnemy: boolean): LaneSide => {
      if (stacked) {
        // Narrow lanes: creature near the centre line, building tucked into the outer corner
        // opposite the landscape name tag.
        const cy = isEnemy ? rect.y + rect.h - (CREATURE_H / 2 + 10) * boardScale : rect.y + (CREATURE_H / 2 + 10) * boardScale;
        const bScale = boardScale * 0.8;
        const bx = rect.x + rect.w - 8 - (BUILDING_W / 2) * bScale;
        const by = isEnemy ? rect.y + 8 + (BUILDING_H / 2) * bScale + 30 : rect.y + rect.h - 8 - (BUILDING_H / 2) * bScale - 30;
        return { rect, creature: { x: rect.x + rect.w / 2, y: cy }, building: { x: bx, y: by } };
      }
      const cx = rect.x + 12 + (CREATURE_W / 2) * boardScale + (rect.w - (CREATURE_W + BUILDING_W + 16) * boardScale - 24) * 0.35;
      const bx = rect.x + rect.w - 10 - (BUILDING_W / 2) * boardScale;
      const by = isEnemy ? rect.y + 12 + (BUILDING_H / 2) * boardScale : rect.y + rect.h - 12 - (BUILDING_H / 2) * boardScale;
      return { rect, creature: { x: cx, y: rect.y + rect.h / 2 }, building: { x: bx, y: by } };
    };
    return { enemy: side(enemyRect, true), player: side(playerRect, false) };
  });

  const handTop = height - handH;
  const heroZoneW = mode === 'tall' ? 150 : 180;
  const playerHeroRadius = mode === 'tall' ? 52 : 58;
  const playerHero = { x: PAD + heroZoneW / 2, y: handTop + handH / 2 - 16 };
  const railRect: Rect =
    mode === 'wide'
      ? { x: mainW, y: 0, w: railW, h: height }
      : mode === 'compact'
        ? { x: width - 300, y: handTop, w: 300, h: handH }
        : { x: 0, y: height - handH - stripH, w: width, h: stripH };
  const handRight = mode === 'compact' ? railRect.x - 110 : mainW - 110;
  const hand = { x: PAD + heroZoneW, y: handTop, w: handRight - (PAD + heroZoneW), h: handH };
  const deckPile = { x: handRight + 55, y: handTop + handH / 2 };

  return {
    mode,
    width,
    height,
    enemyBar,
    board,
    lanes,
    hand,
    playerHero,
    enemyHero: { x: enemyBar.x + 46, y: enemyBar.y + enemyBar.h / 2 },
    playerHeroRadius,
    enemyHeroRadius: 38,
    deckPile,
    enemyHandAnchor: { x: enemyBar.x + enemyBar.w - 150, y: enemyBar.y + enemyBar.h / 2 + 2 },
    rail: railRect,
    handScale: Math.min(0.86, (handH - 36) / CARD_H),
    boardScale,
    buildingScale: stacked ? boardScale * 0.8 : boardScale,
  };
}

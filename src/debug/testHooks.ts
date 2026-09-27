import type Phaser from 'phaser';
import type { Action } from '../game/rules/actions';
import type { GameState } from '../game/state/types';
import type { BattleScene } from '../scenes/BattleScene';
import { devicePixelRatio } from '../ui/viewport';

export interface CardWarsTestApi {
  state(): GameState;
  busy(): boolean;
  /** CSS-pixel centre of a battle object, so tests can click the real canvas. */
  point(kind: 'hand' | 'creature' | 'building' | 'floop' | 'lane-bottom' | 'lane-top', id: string): { x: number; y: number } | null;
  dispatch(action: Action): void;
  mutate(fn: (s: GameState) => void): void;
}

declare global {
  interface Window {
    __cardwars?: CardWarsTestApi;
  }
}

/** Exposed only with ?test=true or ?debug=true. Never part of the normal UI. */
export function installTestHooks(scene: BattleScene): void {
  const toCss = (x: number, y: number) => {
    const cam = scene.cameras.main;
    const dpr = devicePixelRatio();
    return { x: ((x - cam.worldView.x) * cam.zoom) / dpr, y: ((y - cam.worldView.y) * cam.zoom) / dpr };
  };
  const worldOf = (obj: Phaser.GameObjects.Container) => {
    const m = obj.getWorldTransformMatrix();
    return toCss(m.tx, m.ty);
  };
  window.__cardwars = {
    state: () => structuredClone(scene.state),
    busy: () => scene.isBusy || scene.tweens.getTweens().some((t) => t.isPlaying() && t.duration > 0 && !t.loop),
    point: (kind, id) => {
      switch (kind) {
        case 'hand': {
          const face = scene.hand.cards.get(id);
          return face ? worldOf(face) : null;
        }
        case 'creature': {
          const v = scene.board.creatures.get(id);
          return v ? worldOf(v) : null;
        }
        case 'building': {
          const v = scene.board.buildings.get(id);
          return v ? worldOf(v) : null;
        }
        case 'floop': {
          const v = scene.board.creatures.get(id) ?? scene.board.buildings.get(id);
          return v?.pill ? worldOf(v.pill) : null;
        }
        case 'lane-bottom':
        case 'lane-top': {
          const lane = scene.battleLayout.lanes[Number(id)];
          if (!lane) return null;
          const r = kind === 'lane-bottom' ? lane.player.rect : lane.enemy.rect;
          // Aim at the landscape itself, away from the creature slot.
          return toCss(r.x + r.w * 0.5, kind === 'lane-bottom' ? r.y + r.h - 18 : r.y + 18);
        }
      }
    },
    dispatch: (action) => scene.dispatch(action),
    mutate: (fn) => scene.debugMutate(fn),
  };
}

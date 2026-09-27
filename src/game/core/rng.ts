import type { GameState } from '../state/types';

/** mulberry32 step: returns [value in 0..1, next cursor]. Pure and deterministic. */
export function mulberry32(cursor: number): [number, number] {
  const next = (cursor + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Draws a random number from the game's own RNG and advances it. */
export function roll(state: GameState): number {
  const [value, next] = mulberry32(state.rng);
  state.rng = next;
  return value;
}

export function shuffleInPlace<T>(state: GameState, items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(roll(state) * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

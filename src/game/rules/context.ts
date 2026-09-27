import type { GameEvent, LogTone } from '../events/types';
import type { GameState } from '../state/types';

export const LOG_LIMIT = 120;

/** Mutable working context for a single state transition. */
export interface Ctx {
  state: GameState;
  events: GameEvent[];
}

export function emit(ctx: Ctx, event: GameEvent): void {
  ctx.events.push(event);
}

export function log(ctx: Ctx, text: string, tone: LogTone = 'neutral'): void {
  ctx.state.log.push(text);
  if (ctx.state.log.length > LOG_LIMIT) ctx.state.log.splice(0, ctx.state.log.length - LOG_LIMIT);
  ctx.events.push({ type: 'LOG', text, tone });
}

export function isOver(ctx: Ctx): boolean {
  return ctx.state.phase === 'GAME_OVER';
}

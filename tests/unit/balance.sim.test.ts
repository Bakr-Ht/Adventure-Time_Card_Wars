import { it } from 'vitest';

declare const process: { env: Record<string, string | undefined>; stderr: { write(text: string): void } };
import { playFullTurn } from '../../src/game/ai/AIController';
import { createGame } from '../../src/game/state/create';

/** Opt-in balance report (`npm run sim`): AI vs AI across many seeds, seats swapped. */
it.skipIf(!process.env.SIM)('balance simulation', () => {
  const games = Number(process.env.SIM_GAMES ?? 80);
  const wins: Record<string, number> = {};
  const lengths: number[] = [];
  let firstWins = 0;
  for (let seed = 100; seed < 100 + games; seed++) {
    const swap = seed % 2 === 0;
    let { state } = createGame({ seed, p1Deck: swap ? 'jake' : 'finn', p2Deck: swap ? 'finn' : 'jake', p1IsAI: true });
    while (state.phase !== 'GAME_OVER') state = playFullTurn(state, state.activePlayer);
    const deck = state.players[state.winner!].deckId;
    wins[deck] = (wins[deck] ?? 0) + 1;
    lengths.push(state.turn);
    if (state.winner === state.firstPlayer) firstWins++;
  }
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  process.stderr.write(
    `\nBalance over ${games} games: ${JSON.stringify(wins)}; first player won ${firstWins}; ` +
      `turns avg ${avg.toFixed(1)} (min ${Math.min(...lengths)}, max ${Math.max(...lengths)})\n`,
  );
}, 120_000);

import type { ScoredAction } from '../game/ai/AIController';
import { allCards } from '../game/data/cards';
import type { GameState } from '../game/state/types';
import type { BattleScene } from '../scenes/BattleScene';
import { h, mount } from '../ui/menus/dom';

function describe(state: GameState): string {
  const lines: string[] = [];
  lines.push(`seed ${state.seed}  rng ${state.rng}  turn ${state.turn}  phase ${state.phase}`);
  lines.push(`active ${state.activePlayer}  first ${state.firstPlayer}  winner ${state.winner ?? '-'}`);
  for (const p of Object.values(state.players)) {
    lines.push(`\n[${p.id}] ${p.heroId}${p.isAI ? ' (AI)' : ''}  HP ${p.hp}/${p.maxHp}  AP ${p.ap}  hero cd ${p.heroCooldown}`);
    lines.push(`  deck ${p.deck.length}  discard ${p.discard.length}  hand: ${p.hand.map((c) => `${c.defId}#${c.uid}`).join(', ')}`);
    for (const lane of p.lanes) {
      const c = lane.creature;
      const b = lane.building;
      const flags = c ? [c.flooped && 'flooped', c.drowsy && 'drowsy', c.frozen && 'frozen'].filter(Boolean).join(',') : '';
      lines.push(`  lane ${lane.index} (${lane.landscapeId}): ${c ? `${c.defId}#${c.uid} dmg${c.damage} ${flags}` : '—'}${b ? ` | ${b.defId}#${b.uid}` : ''}`);
    }
  }
  return lines.join('\n');
}

/** Development panel shown with ?debug=true. Mutates state through the scene's debug hook only. */
export class DebugPanel {
  private el: HTMLElement;
  private pre: HTMLPreElement;
  private ai: HTMLPreElement;
  private dispose: () => void;

  constructor(private scene: BattleScene) {
    const select = h('select', { 'aria-label': 'Card to add' }, ...allCards()
      .filter((c) => c.type === 'CREATURE' || c.type === 'BUILDING' || c.type === 'SPELL')
      .map((c) => h('option', { value: c.id }, `${c.name} (${c.id})`)));
    const btn = (label: string, fn: () => void) => h('button', { type: 'button', onclick: fn }, label);
    this.pre = h('pre');
    this.ai = h('pre');
    this.el = h(
      'div',
      { class: 'debug-panel', 'data-testid': 'debug-panel' },
      h('h3', {}, 'Debug'),
      h('div', {}, select, btn('Add to hand', () => scene.debugMutate((s) => s.players[scene.human].hand.push({ uid: `dbg${s.nextUid++}`, defId: select.value })))),
      h('div', {},
        btn('Restore HP', () => scene.debugMutate((s) => { s.players.P1.hp = s.players.P1.maxHp; s.players.P2.hp = s.players.P2.maxHp; })),
        btn('Enemy HP 1', () => scene.debugMutate((s) => { s.players[scene.ai].hp = 1; })),
        btn('My HP 1', () => scene.debugMutate((s) => { s.players[scene.human].hp = 1; })),
        btn('+2 AP', () => scene.debugMutate((s) => { s.players[s.activePlayer].ap += 2; })),
      ),
      h('div', {},
        btn('Skip turn', () => scene.dispatch({ type: 'END_TURN', player: scene.state.activePlayer })),
        btn('Force AI action', () => scene.aiStep(scene.state.activePlayer)),
        btn('Reset battle', () => scene.restart()),
      ),
      h('h3', {}, 'State (card ids #uid, lane ids 0-3)'),
      this.pre,
      h('h3', {}, 'Last AI decision'),
      this.ai,
    );
    this.dispose = mount(this.el);
    this.render();
  }

  render(): void {
    this.pre.textContent = describe(this.scene.state);
  }

  showAiChoice(choice: ScoredAction): void {
    const b = choice.breakdown;
    this.ai.textContent = `${JSON.stringify(choice.action)}\nscore ${choice.score.toFixed(1)}\n` +
      Object.entries(b).map(([k, v]) => `  ${k}: ${v.toFixed(1)}`).join('\n');
  }

  destroy(): void {
    this.dispose();
  }
}

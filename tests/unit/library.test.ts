import { describe, expect, it } from 'vitest';
import { filterGames, load, pickNext, sampleShelf, sanitizeGame, sanitizeShelf, save, type Game } from '../../src/library/store';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('library store', () => {
  it('seeds a sample shelf on first visit and round-trips through storage', () => {
    const s = memory();
    const first = load(s);
    expect(first.length).toBeGreaterThan(5);
    expect(first.find((g) => g.playUrl)?.title).toBe('Card Wars: Land of Ooo');
    save(first, s);
    expect(load(s)).toEqual(first);
  });

  it('falls back to the sample shelf when storage holds garbage', () => {
    expect(load({ getItem: () => '{not json' }).length).toBeGreaterThan(0);
  });

  it('sanitizes untrusted imports', () => {
    const g = sanitizeGame({
      title: '  Tunic  ',
      status: 'hacked',
      rating: 99,
      hours: -4,
      year: 'soon',
      shell: 'red; background:url(x)',
      playUrl: 'javascript:alert(1)',
      id: '<img>',
    })!;
    expect(g.title).toBe('Tunic');
    expect(g.status).toBe('backlog');
    expect(g.rating).toBe(5);
    expect(g.hours).toBeNull();
    expect(g.year).toBeNull();
    expect(g.shell).toMatch(/^#[0-9a-f]{6}$/);
    expect(g.playUrl).toBeUndefined();
    expect(g.id).toMatch(/^[a-z0-9]+$/);
    expect(sanitizeGame({ title: '   ' })).toBeNull();
  });

  it('accepts both a bare array and an export envelope, and de-duplicates ids', () => {
    const a = { id: 'abcd1234', title: 'A' };
    expect(sanitizeShelf([a, a]).map((g) => g.id)).toHaveLength(2);
    expect(new Set(sanitizeShelf([a, a]).map((g) => g.id)).size).toBe(2);
    expect(sanitizeShelf({ version: 1, games: [a] })).toHaveLength(1);
    expect(sanitizeShelf('nope')).toEqual([]);
  });

  it('filters by text, status and genre, and sorts', () => {
    const shelf = sampleShelf();
    const cards = filterGames(shelf, { text: '', status: 'all', genre: 'Card battler', sort: 'title' });
    expect(cards.every((g) => g.genre === 'Card battler')).toBe(true);
    expect(cards.map((g) => g.title)).toEqual([...cards.map((g) => g.title)].sort((a, b) => a.localeCompare(b)));
    expect(filterGames(shelf, { text: 'cherry', status: 'all', genre: 'all', sort: 'recent' }).map((g) => g.title)).toEqual(['Hollow Knight']);
    expect(filterGames(shelf, { text: '', status: 'wishlist', genre: 'all', sort: 'recent' }).every((g) => g.status === 'wishlist')).toBe(true);
  });

  it('BMO picks from up next first, then the wishlist, and avoids the current game', () => {
    const shelf = sampleShelf();
    const backlog = shelf.filter((g) => g.status === 'backlog');
    for (let i = 0; i < 20; i++) {
      const pick = pickNext(shelf, backlog[0].id)!;
      expect(pick.status).toBe('backlog');
      expect(pick.id).not.toBe(backlog[0].id);
    }
    const noBacklog: Game[] = shelf.map((g) => (g.status === 'backlog' ? { ...g, status: 'finished' } : g));
    expect(pickNext(noBacklog, null)?.status).toBe('wishlist');
    expect(pickNext([], null)).toBeNull();
  });
});

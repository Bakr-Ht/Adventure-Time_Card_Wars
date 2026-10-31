/**
 * Library data model and persistence. Pure logic, no DOM, so it is unit-testable.
 * Everything lives in localStorage under one versioned key.
 */

export type Status = 'playing' | 'backlog' | 'finished' | 'wishlist';

export const STATUSES: readonly Status[] = ['playing', 'backlog', 'finished', 'wishlist'];

export const STATUS_LABEL: Record<Status, string> = {
  playing: 'Playing',
  backlog: 'Up next',
  finished: 'Finished',
  wishlist: 'Wishlist',
};

/** Cartridge shell colours. Picked per game; the label text is always ink on paper. */
export const SHELLS = ['#5b3fa0', '#f2545b', '#5b8def', '#f2b632', '#5fd08a', '#ff7fb0', '#63c1a8', '#9c6b3f', '#8ed8e8'] as const;

export interface Game {
  id: string;
  title: string;
  developer: string;
  year: number | null;
  genre: string;
  platform: string;
  status: Status;
  /** 0 = not rated, 1–5 hearts. */
  rating: number;
  hours: number | null;
  notes: string;
  shell: string;
  addedAt: number;
  /** Only set for games that ship in this repo and can be launched from the shelf. */
  playUrl?: string;
}

export type SortKey = 'recent' | 'title' | 'rating' | 'hours' | 'year';

export interface Query {
  text: string;
  status: Status | 'all';
  genre: string | 'all';
  sort: SortKey;
}

const KEY = 'bmo-shelf/v1';
const MAX_TITLE = 80;
const MAX_TEXT = 60;
const MAX_NOTES = 1000;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * A sample shelf so the first visit is not empty. Only facts that are public and stable
 * (title, studio, original release year, genre). Status is a suggestion; hours and ratings start blank.
 */
export function sampleShelf(now = Date.now()): Game[] {
  const g = (
    title: string,
    developer: string,
    year: number,
    genre: string,
    platform: string,
    status: Status,
    shell: string,
    extra: Partial<Game> = {},
  ): Game => ({
    id: uid(),
    title,
    developer,
    year,
    genre,
    platform,
    status,
    rating: 0,
    hours: null,
    notes: '',
    shell,
    addedAt: now--,
    ...extra,
  });
  return [
    g('Card Wars: Land of Ooo', 'This repo', 2026, 'Card battler', 'Browser', 'playing', '#5b3fa0', {
      playUrl: './index.html',
      notes: 'Lay four landscapes, fill four lanes, FLOOP everything. Plays right here in the browser.',
    }),
    g('Hollow Knight', 'Team Cherry', 2017, 'Metroidvania', 'PC', 'playing', '#5b8def'),
    g('Slay the Spire', 'Mega Crit', 2019, 'Card battler', 'PC', 'finished', '#f2545b'),
    g('Balatro', 'LocalThunk', 2024, 'Card battler', 'PC', 'backlog', '#f2b632'),
    g('Hades', 'Supergiant Games', 2020, 'Roguelike', 'Switch', 'finished', '#ff7fb0'),
    g('Celeste', 'Maddy Makes Games', 2018, 'Platformer', 'Switch', 'backlog', '#63c1a8'),
    g('Stardew Valley', 'ConcernedApe', 2016, 'Farming sim', 'PC', 'backlog', '#5fd08a'),
    g('Outer Wilds', 'Mobius Digital', 2019, 'Exploration', 'PC', 'wishlist', '#9c6b3f'),
    g('Inscryption', 'Daniel Mullins Games', 2021, 'Card battler', 'PC', 'wishlist', '#8ed8e8'),
    g('Portal 2', 'Valve', 2011, 'Puzzle', 'PC', 'finished', '#5b8def'),
  ];
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Coerce anything (localStorage, an imported file) into a valid Game, or null.
 * Imported files are untrusted: every field is type-checked and bounded, and playUrl is dropped
 * unless it is exactly the in-repo game, so an import cannot plant a `javascript:` link.
 */
export function sanitizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, MAX_TITLE);
  if (!title) return null;
  const status = STATUSES.includes(r.status as Status) ? (r.status as Status) : 'backlog';
  const year = typeof r.year === 'number' && Number.isInteger(r.year) && r.year >= 1950 && r.year <= 2100 ? r.year : null;
  const hours =
    typeof r.hours === 'number' && Number.isFinite(r.hours) && r.hours >= 0 && r.hours < 100000
      ? Math.round(r.hours * 10) / 10
      : null;
  const rating = typeof r.rating === 'number' ? Math.max(0, Math.min(5, Math.round(r.rating))) : 0;
  const shell = typeof r.shell === 'string' && /^#[0-9a-f]{6}$/i.test(r.shell) ? r.shell.toLowerCase() : SHELLS[0];
  const game: Game = {
    id: typeof r.id === 'string' && /^[a-z0-9]{4,24}$/i.test(r.id) ? r.id : uid(),
    title,
    developer: str(r.developer, MAX_TEXT),
    year,
    genre: str(r.genre, MAX_TEXT) || 'Unsorted',
    platform: str(r.platform, MAX_TEXT),
    status,
    rating,
    hours,
    notes: str(r.notes, MAX_NOTES),
    shell,
    addedAt: typeof r.addedAt === 'number' && Number.isFinite(r.addedAt) ? r.addedAt : Date.now(),
  };
  if (r.playUrl === './index.html') game.playUrl = './index.html';
  return game;
}

export function sanitizeShelf(raw: unknown): Game[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? (raw as { games?: unknown }).games : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Game[] = [];
  for (const item of list.slice(0, 2000)) {
    const g = sanitizeGame(item);
    if (!g) continue;
    if (seen.has(g.id)) g.id = uid();
    seen.add(g.id);
    out.push(g);
  }
  return out;
}

export function load(storage: Pick<Storage, 'getItem'> = localStorage): Game[] {
  try {
    const raw = storage.getItem(KEY);
    if (raw === null) return sampleShelf();
    return sanitizeShelf(JSON.parse(raw));
  } catch {
    return sampleShelf();
  }
}

export function save(games: Game[], storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    storage.setItem(KEY, JSON.stringify({ version: 1, games }));
    return true;
  } catch {
    return false; // quota or private mode; the UI reports it
  }
}

export function genres(games: readonly Game[]): string[] {
  return [...new Set(games.map((g) => g.genre))].sort((a, b) => a.localeCompare(b));
}

export function filterGames(games: readonly Game[], q: Query): Game[] {
  const needle = q.text.trim().toLowerCase();
  const list = games.filter(
    (g) =>
      (q.status === 'all' || g.status === q.status) &&
      (q.genre === 'all' || g.genre === q.genre) &&
      (!needle ||
        [g.title, g.developer, g.genre, g.platform, g.notes].some((f) => f.toLowerCase().includes(needle))),
  );
  const by: Record<SortKey, (a: Game, b: Game) => number> = {
    recent: (a, b) => b.addedAt - a.addedAt,
    title: (a, b) => a.title.localeCompare(b.title),
    rating: (a, b) => b.rating - a.rating || a.title.localeCompare(b.title),
    hours: (a, b) => (b.hours ?? -1) - (a.hours ?? -1) || a.title.localeCompare(b.title),
    year: (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title),
  };
  return list.sort(by[q.sort]);
}

export function counts(games: readonly Game[]): Record<Status, number> {
  const c: Record<Status, number> = { playing: 0, backlog: 0, finished: 0, wishlist: 0 };
  for (const g of games) c[g.status]++;
  return c;
}

export function totalHours(games: readonly Game[]): number {
  return Math.round(games.reduce((s, g) => s + (g.hours ?? 0), 0) * 10) / 10;
}

/** BMO's pick: from "Up next" first, then wishlist, never the one already selected if there is a choice. */
export function pickNext(games: readonly Game[], avoidId: string | null, rand = Math.random): Game | null {
  for (const status of ['backlog', 'wishlist'] as const) {
    const pool = games.filter((g) => g.status === status);
    if (!pool.length) continue;
    const choices = pool.length > 1 ? pool.filter((g) => g.id !== avoidId) : pool;
    return choices[Math.floor(rand() * choices.length)] ?? null;
  }
  return null;
}

/** Player preferences, persisted in localStorage when available. */
export interface Settings {
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
  aiSpeed: 'relaxed' | 'normal' | 'fast';
}

const KEY = 'cardwars-ooo-settings';

function defaults(): Settings {
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return { volume: 0.6, muted: false, reducedMotion: Boolean(prefersReduced), aiSpeed: 'normal' };
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); defaults are fine.
  }
  return defaults();
}

type Listener = (s: Settings) => void;

class SettingsStore {
  private current: Settings = load();
  private listeners = new Set<Listener>();

  get(): Settings {
    return this.current;
  }

  update(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.current));
    } catch {
      // Non-fatal: the setting still applies for this session.
    }
    for (const fn of this.listeners) fn(this.current);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const settings = new SettingsStore();

/** URL flags. `?debug=true` enables the debug panel; `?speed=N` speeds up animation (tests). */
export const flags = (() => {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const seed = q.get('seed');
  return {
    debug: q.get('debug') === 'true' || q.get('debug') === '1',
    test: q.get('test') === 'true' || q.get('test') === '1',
    speed: Math.max(0.1, Number(q.get('speed') ?? 1) || 1),
    seed: seed !== null && seed !== '' ? Number(seed) : null,
    /** `?renderer=canvas` forces the Canvas renderer (useful for GPU-less debugging). */
    canvasRenderer: q.get('renderer') === 'canvas',
  };
})();

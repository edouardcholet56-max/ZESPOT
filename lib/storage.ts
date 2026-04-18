/**
 * Typed localStorage wrapper.
 * Falls back gracefully on SSR (no window).
 */

const isBrowser = typeof window !== 'undefined';

export const storage = {
  // ── Auth / identity ──────────────────────────────────────────────
  get userName(): string   { return isBrowser ? (localStorage.getItem('userName') || '') : ''; },
  set userName(v: string)  { if (isBrowser) localStorage.setItem('userName', v); },

  get userEmail(): string  { return isBrowser ? (localStorage.getItem('userEmail') || '') : ''; },
  set userEmail(v: string) { if (isBrowser) localStorage.setItem('userEmail', v); },

  get isLoggedIn(): boolean { return isBrowser && !!localStorage.getItem('userName'); },

  // ── Location ─────────────────────────────────────────────────────
  get myAddress(): string   { return isBrowser ? (localStorage.getItem('myAddress') || '') : ''; },
  set myAddress(v: string)  { if (isBrowser) localStorage.setItem('myAddress', v); },

  // ── Preferences ──────────────────────────────────────────────────
  get lastMode(): string   { return isBrowser ? (localStorage.getItem('lastMode') || 'transit') : 'transit'; },
  set lastMode(v: string)  { if (isBrowser) localStorage.setItem('lastMode', v); },

  // ── Events ───────────────────────────────────────────────────────
  get myEventIds(): string[] {
    if (!isBrowser) return [];
    try { return JSON.parse(localStorage.getItem('myEventIds') || '[]'); } catch { return []; }
  },
  addEventId(id: string) {
    if (!isBrowser) return;
    const ids = storage.myEventIds;
    if (!ids.includes(id)) localStorage.setItem('myEventIds', JSON.stringify([id, ...ids]));
  },
  setEventIds(ids: string[]) {
    if (isBrowser) localStorage.setItem('myEventIds', JSON.stringify(ids));
  },

  // ── Chosen Zespots ───────────────────────────────────────────────
  get chosenZespots(): object[] {
    if (!isBrowser) return [];
    try { return JSON.parse(localStorage.getItem('chosenZespots') || '[]'); } catch { return []; }
  },
  setChosenZespots(v: object[]) {
    if (isBrowser) localStorage.setItem('chosenZespots', JSON.stringify(v));
  },

  // ── Per-event metadata (kept in localStorage keyed by event id) ──
  setEventMeta(id: string, meta: object) {
    if (isBrowser) localStorage.setItem(`event_${id}_me`, JSON.stringify(meta));
  },
  getEventMeta(id: string): object | null {
    if (!isBrowser) return null;
    try { return JSON.parse(localStorage.getItem(`event_${id}_me`) || 'null'); } catch { return null; }
  },

  // ── Beta spots (V0) ──────────────────────────────────────────────
  get betaSpots(): object[] {
    if (!isBrowser) return [];
    try { return JSON.parse(localStorage.getItem('betaSpots') || '[]'); } catch { return []; }
  },
  addBetaSpot(spot: object) {
    if (!isBrowser) return;
    const list = storage.betaSpots;
    // Dedupe by code if present (last wins)
    const code = (spot as { code?: string }).code;
    const filtered = code ? list.filter((s) => (s as { code?: string }).code !== code) : list;
    localStorage.setItem('betaSpots', JSON.stringify([spot, ...filtered].slice(0, 50)));
  },
  removeBetaSpot(code: string) {
    if (!isBrowser) return;
    const list = storage.betaSpots.filter((s) => (s as { code?: string }).code !== code);
    localStorage.setItem('betaSpots', JSON.stringify(list));
  },

  // ── Clear auth (logout) ──────────────────────────────────────────
  logout() {
    if (!isBrowser) return;
    ['userName', 'userEmail', 'myAddress', 'lastMode', 'myEventIds', 'chosenZespots', 'betaSpots'].forEach(
      (k) => localStorage.removeItem(k)
    );
    // Also clear event metas
    Object.keys(localStorage)
      .filter((k) => k.startsWith('event_') && k.endsWith('_me'))
      .forEach((k) => localStorage.removeItem(k));
  },
};

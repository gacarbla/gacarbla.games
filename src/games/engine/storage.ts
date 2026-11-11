const PREFIX = 'gg:';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readString(name: string): string | null {
  try {
    return storage()?.getItem(PREFIX + name) ?? null;
  } catch {
    return null;
  }
}

export function writeString(name: string, value: string): void {
  try {
    storage()?.setItem(PREFIX + name, value);
  } catch {
    // Modo privado o cuota llena: el portal sigue funcionando sin persistencia.
  }
}

export function remove(name: string): void {
  try {
    storage()?.removeItem(PREFIX + name);
  } catch {
    // Sin efecto.
  }
}

export function readNumber(name: string, fallback = 0): number {
  const value = Number(readString(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function writeNumber(name: string, value: number): void {
  writeString(name, String(value));
}

export function readJSON<T>(name: string, fallback: T): T {
  const raw = readString(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(name: string, value: unknown): void {
  try {
    writeString(name, JSON.stringify(value));
  } catch {
    // Sin efecto.
  }
}

export function getBest(slug: string): number {
  return readNumber(`best:${slug}`, 0);
}

/** Guarda la marca si mejora. Devuelve true cuando hay récord nuevo. */
export function saveBest(slug: string, score: number): boolean {
  if (!Number.isFinite(score) || score <= 0) return false;
  const best = getBest(slug);
  if (score <= best) return false;
  writeNumber(`best:${slug}`, Math.round(score));
  return true;
}

export interface RecentGame {
  slug: string;
  playedAt: number;
}

export function trackPlay(slug: string): void {
  const recent = readJSON<RecentGame[]>('recent', []);
  const next = [
    { slug, playedAt: Date.now() },
    ...recent.filter((item) => item.slug !== slug),
  ].slice(0, 6);
  writeJSON('recent', next);
}

export function getRecent(): RecentGame[] {
  const recent = readJSON<RecentGame[]>('recent', []);
  return recent.filter(
    (item) => typeof item.slug === 'string' && typeof item.playedAt === 'number',
  );
}

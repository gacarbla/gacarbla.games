import { getRecent, remove } from '../games/engine/storage';

interface GameLink {
  slug: string;
  title: string;
  category: string;
  duration: string;
  accent: string;
}

const section = document.querySelector<HTMLElement>('[data-recent-section]');
const list = document.querySelector<HTMLElement>('[data-recent-list]');
const dataElement = document.querySelector<HTMLScriptElement>('[data-games-json]');
const clearButton = document.querySelector<HTMLButtonElement>('[data-clear-recent]');

if (section && list && dataElement) {
  const games = parseGames(dataElement.textContent);
  const bySlug = new Map(games.map((game) => [game.slug, game]));
  const recent = getRecent()
    .map((entry) => bySlug.get(entry.slug))
    .filter((game): game is GameLink => Boolean(game))
    .slice(0, 3);

  if (recent.length > 0) {
    section.hidden = false;
    for (const game of recent) {
      list.append(buildCard(game));
    }
  }

  clearButton?.addEventListener('click', () => {
    remove('recent');
    section.hidden = true;
    list.replaceChildren();
  });
}

function parseGames(raw: string | null): GameLink[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GameLink =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as GameLink).slug === 'string' &&
        typeof (item as GameLink).title === 'string' &&
        typeof (item as GameLink).accent === 'string',
    );
  } catch {
    return [];
  }
}

function buildCard(game: GameLink): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'continue-card';
  link.href = `/jugar/${game.slug}/`;
  link.style.setProperty('--accent', game.accent);

  const dot = document.createElement('span');
  dot.className = 'continue-card__dot';
  dot.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'continue-card__text';
  const title = document.createElement('strong');
  title.textContent = game.title;
  const meta = document.createElement('small');
  meta.textContent = `${game.category} · ${game.duration}`;
  text.append(title, meta);

  const arrow = document.createElement('span');
  arrow.className = 'continue-card__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';

  link.append(dot, text, arrow);
  return link;
}

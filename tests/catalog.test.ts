import { describe, expect, it } from 'vitest';
import {
  games,
  featuredGame,
  getCategoryCounts,
  getGame,
  getRelatedGames,
} from '../src/data/games';

describe('catálogo', () => {
  it('descubre al menos un juego válido', () => {
    expect(games.length).toBeGreaterThan(0);
    expect(featuredGame).toBeDefined();
  });

  it('no repite slugs y mantiene el orden', () => {
    const slugs = games.map((game) => game.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const orders = games.map((game) => game.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('expone búsquedas coherentes', () => {
    const first = games[0]!;
    expect(getGame(first.slug)?.title).toBe(first.title);
    expect(getGame('no-existe')).toBeUndefined();
    expect(getRelatedGames(first.slug)).toHaveLength(0);
  });

  it('suma las categorías correctamente', () => {
    const counts = getCategoryCounts();
    const total = counts.accion + counts.puzzle + counts.reflejos;
    expect(total).toBe(games.length);
  });
});

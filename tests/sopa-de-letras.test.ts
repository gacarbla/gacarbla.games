import { describe, expect, it } from 'vitest';
import { SOUP_LEVELS, generateSoup, traceSelection } from '../src/games/sopa-de-letras/logic';
import { mulberry32 } from '../src/games/engine/math';

describe('sopa de letras', () => {
  it('coloca las palabras de cada dificultad y rellena el tablero', () => {
    for (const level of SOUP_LEVELS) {
      for (const seed of [1, 2, 3, 17, 2026]) {
        const soup = generateSoup(level, mulberry32(seed));
        expect(soup.letters).toHaveLength(level.size * level.size);
        expect(soup.letters.every((letter) => letter.length === 1)).toBe(true);
        expect(soup.placements.map((placement) => placement.word).sort()).toEqual(
          [...level.words].sort(),
        );

        for (const placement of soup.placements) {
          const text = placement.cells.map((cell) => soup.letters[cell]!).join('');
          expect(text).toBe(placement.word);
        }
      }
    }
  });

  it('reconoce una palabra desde sus dos extremos', () => {
    const soup = generateSoup(SOUP_LEVELS[2]!, mulberry32(99));
    for (const placement of soup.placements) {
      const first = placement.cells[0]!;
      const last = placement.cells[placement.cells.length - 1]!;
      expect(traceSelection(soup, first, last)?.word).toBe(placement.word);
      expect(traceSelection(soup, last, first)?.word).toBe(placement.word);
    }
  });

  it('la dificultad fácil no usa diagonales', () => {
    const level = SOUP_LEVELS[0]!;
    const soup = generateSoup(level, mulberry32(42));
    for (const placement of soup.placements) {
      const first = placement.cells[0]!;
      const last = placement.cells[placement.cells.length - 1]!;
      const dx = Math.abs((first % level.size) - (last % level.size));
      const dy = Math.abs(Math.floor(first / level.size) - Math.floor(last / level.size));
      expect(dx === 0 || dy === 0).toBe(true);
    }
  });

  it('rechaza líneas torcidas o de una sola celda', () => {
    const soup = generateSoup(SOUP_LEVELS[1]!, mulberry32(5));
    expect(traceSelection(soup, 0, 0)).toBeNull();
    expect(traceSelection(soup, 0, 14)).toBeNull();
  });
});

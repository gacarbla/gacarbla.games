import { describe, expect, it } from 'vitest';
import { SOUP_SIZE, WORDS, generateSoup, traceSelection } from '../src/games/sopa-de-letras/logic';
import { mulberry32 } from '../src/games/engine/math';

describe('sopa de letras', () => {
  it('coloca las seis palabras y rellena el tablero', () => {
    for (const seed of [1, 2, 3, 17, 2026]) {
      const soup = generateSoup(mulberry32(seed));
      expect(soup.letters).toHaveLength(SOUP_SIZE * SOUP_SIZE);
      expect(soup.letters.every((letter) => letter.length === 1)).toBe(true);
      expect(soup.placements.map((placement) => placement.word).sort()).toEqual([...WORDS].sort());

      for (const placement of soup.placements) {
        const text = placement.cells.map((cell) => soup.letters[cell]!).join('');
        expect(text).toBe(placement.word);
      }
    }
  });

  it('reconoce una palabra desde sus dos extremos', () => {
    const soup = generateSoup(mulberry32(99));
    for (const placement of soup.placements) {
      const first = placement.cells[0]!;
      const last = placement.cells[placement.cells.length - 1]!;
      expect(traceSelection(soup, first, last)?.word).toBe(placement.word);
      expect(traceSelection(soup, last, first)?.word).toBe(placement.word);
    }
  });

  it('rechaza líneas torcidas o de una sola celda', () => {
    const soup = generateSoup(mulberry32(5));
    expect(traceSelection(soup, 0, 0)).toBeNull();
    expect(traceSelection(soup, 0, 14)).toBeNull();
  });
});

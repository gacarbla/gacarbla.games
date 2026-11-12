import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  SOLVED,
  adjacentCells,
  canSlide,
  isSolved,
  shuffleBoard,
  slide,
} from '../src/games/deslizante/logic';

describe('deslizante', () => {
  it('desordena con 120 movimientos legales y conserva la solubilidad', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const { tiles, moves } = shuffleBoard(mulberry32(seed));
      expect(tiles).toHaveLength(16);
      expect(new Set(tiles).size).toBe(16);
      expect(isSolved(tiles)).toBe(false);
      expect(moves).toHaveLength(120);

      let replay = [...SOLVED];
      for (const cell of moves) {
        const next = slide(replay, cell);
        expect(next).not.toBeNull();
        replay = next!;
      }
      expect(replay).toEqual(tiles);
    }
  });

  it('solo permite movimientos ortogonales al hueco', () => {
    expect(adjacentCells(0)).toEqual([1, 4]);
    expect(canSlide(SOLVED, 14)).toBe(true);
    expect(canSlide(SOLVED, 15)).toBe(false);
    expect(canSlide(SOLVED, 11)).toBe(true);
    expect(canSlide(SOLVED, 10)).toBe(false);
    expect(slide(SOLVED, 10)).toBeNull();
  });
});

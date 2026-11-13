import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MINE_LEVEL,
  MINE_LEVELS,
  createMineBoard,
  neighbors,
  placeMines,
  revealCell,
  toggleFlag,
} from '../src/games/buscaminas/logic';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('buscaminas', () => {
  it('deja libre el primer clic y sus vecinos en cada dificultad', () => {
    for (const level of MINE_LEVELS) {
      const board = createMineBoard(level);
      const center = Math.floor((level.cols * level.rows) / 2);
      placeMines(board, center, seeded(7));
      expect(board.mines.filter(Boolean)).toHaveLength(level.mines);
      expect(board.mines[center]).toBe(false);
      for (const neighbor of neighbors(center, level.cols, level.rows)) {
        expect(board.mines[neighbor]).toBe(false);
      }
    }
  });

  it('calcula los números alrededor de cada mina', () => {
    const level = MINE_LEVELS[DEFAULT_MINE_LEVEL]!;
    const board = createMineBoard(level);
    placeMines(board, 0, seeded(11));
    for (let index = 0; index < board.mines.length; index += 1) {
      const expected = neighbors(index, level.cols, level.rows).filter(
        (neighbor) => board.mines[neighbor],
      ).length;
      expect(board.counts[index]).toBe(expected);
    }
  });

  it('descubre sin pisar minas y respeta las banderas', () => {
    const level = MINE_LEVELS[DEFAULT_MINE_LEVEL]!;
    const board = createMineBoard(level);
    const center = Math.floor((level.cols * level.rows) / 2);
    const result = revealCell(board, center, seeded(3));
    expect(result.hitMine).toBe(false);
    expect(result.opened).toBeGreaterThan(0);
    expect(board.mines[center]).toBe(false);
    expect(board.revealed[center]).toBe(true);

    const hidden = board.revealed.findIndex((revealed) => !revealed);
    if (hidden >= 0) {
      expect(toggleFlag(board, hidden)).toBe(true);
      const blocked = revealCell(board, hidden, seeded(3));
      expect(blocked.opened).toBe(0);
      expect(board.revealed[hidden]).toBe(false);
    }
  });

  it('la dificultad difícil tiene más casillas y más minas', () => {
    const facil = MINE_LEVELS[0]!;
    const dificil = MINE_LEVELS[2]!;
    expect(dificil.cols * dificil.rows).toBeGreaterThan(facil.cols * facil.rows);
    expect(dificil.mines).toBeGreaterThan(facil.mines);
    expect(createMineBoard(dificil).safeCount).toBe(dificil.cols * dificil.rows - dificil.mines);
  });
});

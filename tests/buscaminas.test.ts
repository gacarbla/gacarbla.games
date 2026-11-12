import { describe, expect, it } from 'vitest';
import {
  MINE_COUNT,
  MINE_SIZE,
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
  it('deja libre el primer clic y sus vecinos', () => {
    const board = createMineBoard();
    placeMines(board, 40, seeded(7));
    expect(board.mines.filter(Boolean)).toHaveLength(MINE_COUNT);
    expect(board.mines[40]).toBe(false);
    for (const neighbor of neighbors(40)) expect(board.mines[neighbor]).toBe(false);
  });

  it('calcula los números alrededor de cada mina', () => {
    const board = createMineBoard();
    placeMines(board, 0, seeded(11));
    for (let index = 0; index < MINE_SIZE; index += 1) {
      const expected = neighbors(index).filter((neighbor) => board.mines[neighbor]).length;
      expect(board.counts[index]).toBe(expected);
    }
  });

  it('descubre sin pisar minas y respeta las banderas', () => {
    const board = createMineBoard();
    const result = revealCell(board, 40, seeded(3));
    expect(result.hitMine).toBe(false);
    expect(result.opened).toBeGreaterThan(0);
    expect(board.mines[40]).toBe(false);
    expect(board.revealed[40]).toBe(true);

    const hidden = board.revealed.findIndex((revealed) => !revealed);
    if (hidden >= 0) {
      expect(toggleFlag(board, hidden)).toBe(true);
      const blocked = revealCell(board, hidden, seeded(3));
      expect(blocked.opened).toBe(0);
      expect(board.revealed[hidden]).toBe(false);
    }
  });
});

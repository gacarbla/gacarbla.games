import { describe, expect, it } from 'vitest';
import {
  FLOOD_BONUS_PER_MOVE,
  FLOOD_COLORS,
  FLOOD_MOVES,
  FLOOD_SIZE,
  floodBoard,
  floodedCount,
  floodedPercent,
  floodedRegion,
  floodScore,
  generateBoard,
  greedySolution,
  isFlooded,
  isOutOfMoves,
  remainingMoves,
} from '../src/games/flood/logic';
import { mulberry32 } from '../src/games/engine/math';

const CELLS = FLOOD_SIZE * FLOOD_SIZE;

function emptyBoard(color = 0): number[] {
  return new Array<number>(CELLS).fill(color);
}

describe('flood', () => {
  it('inunda solo la región conexa del mismo color', () => {
    const board = emptyBoard();
    for (let column = 0; column < FLOOD_SIZE; column += 1) {
      board[6 * FLOOD_SIZE + column] = 1;
    }
    board[CELLS - 1] = 2;

    expect(floodedRegion(board)).toHaveLength(60);
    expect(floodedCount(board)).toBe(60);
    expect(floodedPercent(board)).toBe(60);
    expect(isFlooded(board)).toBe(false);

    const opened = floodBoard(board, 1);
    expect(floodedCount(opened)).toBe(99);
    expect(opened[CELLS - 1]).toBe(2);
    expect(isFlooded(opened)).toBe(false);

    const solved = floodBoard(opened, 2);
    expect(isFlooded(solved)).toBe(true);
    expect(floodedPercent(solved)).toBe(100);
  });

  it('no conecta celdas que solo se tocan en diagonal', () => {
    const board = emptyBoard(2);
    board[0] = 0;
    board[1] = 1;
    board[FLOOD_SIZE] = 1;
    board[FLOOD_SIZE + 1] = 0;

    expect(floodedRegion(board)).toEqual([0]);

    const next = floodBoard(board, 1);
    expect(floodedCount(next)).toBe(4);
    expect(next[FLOOD_SIZE + 1]).toBe(1);
  });

  it('ignora un movimiento con el color actual', () => {
    const board = generateBoard(mulberry32(11));
    const color = board[0] ?? 0;
    expect(floodBoard(board, color)).toEqual(board);
  });

  it('gana cuando el tablero es de un solo color', () => {
    const board = emptyBoard(3);
    expect(isFlooded(board)).toBe(true);
    expect(floodedPercent(board)).toBe(100);
    expect(floodScore(board, FLOOD_MOVES)).toBe(CELLS + FLOOD_MOVES * FLOOD_BONUS_PER_MOVE);
  });

  it('genera tableros reproducibles, no resueltos y solubles', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const board = generateBoard(mulberry32(seed));
      const twin = generateBoard(mulberry32(seed));
      expect(board).toEqual(twin);
      expect(board).toHaveLength(CELLS);
      expect(new Set(board).size).toBeGreaterThan(1);
      for (const color of board) {
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThan(FLOOD_COLORS);
      }
      expect(isFlooded(board)).toBe(false);

      const solution = greedySolution(board);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeLessThanOrEqual(FLOOD_MOVES);

      let current = board;
      for (const color of solution!) current = floodBoard(current, color);
      expect(isFlooded(current)).toBe(true);
    }
  });

  it('no devuelve un tablero ya resuelto con azar degenerado', () => {
    const board = generateBoard(() => 0);
    expect(board).toHaveLength(CELLS);
    expect(isFlooded(board)).toBe(false);
    expect(new Set(board).size).toBeGreaterThan(1);
    expect(greedySolution(board)).not.toBeNull();
  });

  it('respeta el límite de movimientos', () => {
    expect(remainingMoves(0)).toBe(FLOOD_MOVES);
    expect(remainingMoves(1)).toBe(FLOOD_MOVES - 1);
    expect(remainingMoves(FLOOD_MOVES)).toBe(0);
    expect(remainingMoves(FLOOD_MOVES + 5)).toBe(0);
    expect(isOutOfMoves(FLOOD_MOVES - 1)).toBe(false);
    expect(isOutOfMoves(FLOOD_MOVES)).toBe(true);

    const stripes = new Array<number>(CELLS);
    for (let index = 0; index < CELLS; index += 1) {
      stripes[index] = (index % FLOOD_SIZE) % FLOOD_COLORS;
    }

    expect(greedySolution(stripes, 8)).toBeNull();
    const exact = greedySolution(stripes, 9);
    expect(exact).not.toBeNull();
    expect(exact).toHaveLength(9);
    expect(remainingMoves(exact!.length)).toBe(FLOOD_MOVES - 9);
  });

  it('suma celdas inundadas y bonus por movimientos sobrantes', () => {
    const board = emptyBoard();
    for (let column = 0; column < FLOOD_SIZE; column += 1) {
      board[6 * FLOOD_SIZE + column] = 1;
    }
    expect(floodScore(board, 10)).toBe(60 + 10 * FLOOD_BONUS_PER_MOVE);
    expect(floodScore(board, 0)).toBe(60);
    expect(floodScore(board, -4)).toBe(60);
  });
});

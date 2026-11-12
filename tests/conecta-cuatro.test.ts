import { describe, expect, it } from 'vitest';
import {
  AI,
  COLS,
  EMPTY,
  HUMAN,
  ROWS,
  cellIndex,
  chooseAiMove,
  createBoard,
  drop,
  isFull,
  winningLine,
  type Board,
} from '../src/games/conecta-cuatro/logic';

function boardWith(discs: readonly [number, number, number][]): Board {
  const board = createBoard();
  for (const [row, column, player] of discs) board[cellIndex(row, column)] = player;
  return board;
}

describe('conecta cuatro', () => {
  it('las fichas caen hasta el fondo de la columna', () => {
    const board = createBoard();
    expect(drop(board, 3, HUMAN)).toBe(cellIndex(ROWS - 1, 3));
    expect(drop(board, 3, AI)).toBe(cellIndex(ROWS - 2, 3));
    expect(drop(board, 3, HUMAN)).toBe(cellIndex(ROWS - 3, 3));
    expect(drop(board, -1, HUMAN)).toBeNull();
  });

  it('detecta victorias en las cuatro direcciones', () => {
    const horizontal = boardWith([
      [5, 0, HUMAN],
      [5, 1, HUMAN],
      [5, 2, HUMAN],
      [5, 3, HUMAN],
    ]);
    expect(winningLine(horizontal, HUMAN)).toHaveLength(4);

    const vertical = boardWith([
      [5, 4, AI],
      [4, 4, AI],
      [3, 4, AI],
      [2, 4, AI],
    ]);
    expect(winningLine(vertical, AI)).toHaveLength(4);

    const diagonal = boardWith([
      [5, 0, HUMAN],
      [4, 1, HUMAN],
      [3, 2, HUMAN],
      [2, 3, HUMAN],
    ]);
    expect(winningLine(diagonal, HUMAN)).toHaveLength(4);

    const counterDiagonal = boardWith([
      [2, 0, AI],
      [3, 1, AI],
      [4, 2, AI],
      [5, 3, AI],
    ]);
    expect(winningLine(counterDiagonal, AI)).toHaveLength(4);
  });

  it('no inventa líneas de tres', () => {
    const board = boardWith([
      [5, 0, HUMAN],
      [5, 1, HUMAN],
      [5, 2, HUMAN],
    ]);
    expect(winningLine(board, HUMAN)).toBeNull();
  });

  it('la IA remata cuando tiene tres en línea', () => {
    const board = boardWith([
      [5, 0, AI],
      [5, 1, AI],
      [5, 2, AI],
      [5, 6, HUMAN],
      [4, 6, HUMAN],
    ]);
    expect(chooseAiMove(board, 4)).toBe(3);
  });

  it('la IA bloquea la victoria inmediata del jugador', () => {
    const board = boardWith([
      [5, 0, HUMAN],
      [5, 1, HUMAN],
      [5, 2, HUMAN],
      [5, 6, AI],
      [4, 6, AI],
    ]);
    expect(chooseAiMove(board, 4)).toBe(3);
  });

  it('llena el tablero y reparte las columnas', () => {
    const board = createBoard();
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLS; column += 1) {
        expect(board[cellIndex(row, column)]).toBe(EMPTY);
      }
    }
    for (let column = 0; column < COLS; column += 1) {
      for (let row = 0; row < ROWS; row += 1) drop(board, column, HUMAN);
    }
    expect(isFull(board)).toBe(true);
    expect(drop(board, 0, AI)).toBeNull();
  });
});

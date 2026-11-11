import { describe, expect, it } from 'vitest';
import {
  applyGravity,
  createBoard,
  dropTile,
  findGroups,
  isBoardFull,
  landingIndex,
  resolveOne,
  spawnValue,
} from '../src/games/fusion/logic';

const COLS = 4;
const ROWS = 5;

describe('dropTile', () => {
  it('coloca la pieza en el hueco más bajo', () => {
    const board = createBoard(COLS, ROWS);
    expect(dropTile(board, 1, 2, COLS, ROWS)).toBe(4 * 4 + 1);
    expect(dropTile(board, 1, 3, COLS, ROWS)).toBe(3 * 4 + 1);
  });

  it('rechaza columnas llenas o fuera del tablero', () => {
    const board = createBoard(COLS, ROWS);
    for (let row = 0; row < ROWS; row += 1) board[row * COLS + 0] = 1;
    expect(dropTile(board, 0, 1, COLS, ROWS)).toBe(-1);
    expect(dropTile(board, -1, 1, COLS, ROWS)).toBe(-1);
    expect(dropTile(board, COLS, 1, COLS, ROWS)).toBe(-1);
  });
});

describe('findGroups', () => {
  it('detecta grupos horizontales y verticales de tres o más', () => {
    const board = createBoard(COLS, ROWS);
    for (let column = 0; column < 3; column += 1) board[4 * COLS + column] = 2;
    for (let row = 2; row < 5; row += 1) board[row * COLS + 3] = 3;

    const groups = findGroups(board, COLS, ROWS);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.cells.length).sort()).toEqual([3, 3]);
  });

  it('no conecta en diagonal ni mezcla valores', () => {
    const board = createBoard(COLS, ROWS);
    board[4 * COLS + 0] = 1;
    board[3 * COLS + 1] = 1;
    board[2 * COLS + 2] = 2;
    expect(findGroups(board, COLS, ROWS)).toHaveLength(0);
  });
});

describe('gravedad', () => {
  it('compacta las columnas y registra los movimientos', () => {
    const board = createBoard(COLS, ROWS);
    board[0 * COLS + 0] = 1;
    board[2 * COLS + 0] = 2;
    const result = applyGravity(board, COLS, ROWS);

    expect(result.board[4 * COLS + 0]).toBe(2);
    expect(result.board[3 * COLS + 0]).toBe(1);
    expect(result.moved).toHaveLength(2);
    expect(result.board.filter((value) => value !== 0)).toHaveLength(2);
  });
});

describe('resolveOne', () => {
  it('fusiona tres iguales en un orbe de valor superior', () => {
    const board = createBoard(COLS, ROWS);
    for (let column = 0; column < 3; column += 1) board[4 * COLS + column] = 1;

    const result = resolveOne(board, COLS, ROWS);
    expect(result.merge).not.toBeNull();
    expect(result.merge?.value).toBe(2);
    expect(result.merge?.size).toBe(3);
    expect(result.gained).toBe(30);
    expect(result.board[result.merge!.index]).toBe(2);
    expect(result.board.filter((value) => value !== 0)).toHaveLength(1);
  });

  it('aplica gravedad y deja el orbe fusionado en su sitio final', () => {
    const board = createBoard(COLS, ROWS);
    board[4 * COLS + 0] = 1;
    board[4 * COLS + 1] = 1;
    board[4 * COLS + 2] = 1;
    board[3 * COLS + 0] = 4;

    const result = resolveOne(board, COLS, ROWS);
    expect(result.merge?.index).toBe(4 * COLS + 1);
    expect(result.board[4 * COLS + 1]).toBe(2);
    expect(result.board[4 * COLS + 0]).toBe(4);
    expect(result.moved.some((move) => move.from === 3 * COLS + 0)).toBe(true);
  });

  it('devuelve la entrada intacta si no hay grupos', () => {
    const board = createBoard(COLS, ROWS);
    board[4 * COLS + 0] = 1;
    board[4 * COLS + 1] = 2;
    const result = resolveOne(board, COLS, ROWS);
    expect(result.merge).toBeNull();
    expect(result.board).toEqual(board);
    expect(result.gained).toBe(0);
  });
});

describe('utilidades', () => {
  it('detecta el tablero lleno solo cuando la fila superior está ocupada', () => {
    const board = createBoard(COLS, ROWS);
    for (let column = 0; column < COLS; column += 1) board[column] = 1;
    expect(isBoardFull(board, COLS)).toBe(true);
    board[0] = 0;
    expect(isBoardFull(board, COLS)).toBe(false);
  });

  it('calcula el índice de aterrizaje', () => {
    const board = createBoard(COLS, ROWS);
    expect(landingIndex(board, 2, COLS, ROWS)).toBe(4 * COLS + 2);
    board[4 * COLS + 2] = 1;
    expect(landingIndex(board, 2, COLS, ROWS)).toBe(3 * COLS + 2);
  });

  it('genera valores entre 1 y 3', () => {
    expect(spawnValue(() => 0)).toBe(1);
    expect(spawnValue(() => 0.5)).toBe(2);
    expect(spawnValue(() => 0.99)).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  GOAL,
  addRandomTile,
  createBoard,
  emptyBoard,
  hasMoves,
  isGameOver,
  maxTile,
  move,
  slide,
  tileCount,
} from '../src/games/2048/logic';

function boardWith(firstRow: readonly number[]): number[] {
  const board = emptyBoard();
  firstRow.forEach((value, index) => {
    board[index] = value;
  });
  return board;
}

function fullBoard(): number[] {
  return [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
}

describe('2048 · fusiones', () => {
  it('funde cada pareja una sola vez por movimiento', () => {
    const doubled = slide(boardWith([2, 2, 2, 2]), 'left');
    expect(doubled.board.slice(0, 4)).toEqual([4, 4, 0, 0]);
    expect(doubled.gained).toBe(8);
    expect(doubled.merged).toHaveLength(2);
    expect(maxTile(doubled.board)).toBe(4);
    expect(doubled.moved).toBe(true);
    expect(GOAL).toBe(2048);

    const chain = slide(boardWith([4, 4, 8, 0]), 'left');
    expect(chain.board.slice(0, 4)).toEqual([8, 8, 0, 0]);
    expect(chain.gained).toBe(8);

    const mixed = slide(boardWith([2, 2, 4, 4]), 'left');
    expect(mixed.board.slice(0, 4)).toEqual([4, 8, 0, 0]);
    expect(mixed.gained).toBe(12);
  });

  it('no vuelve a fusionar una ficha recién creada en el mismo movimiento', () => {
    const result = slide(boardWith([2, 2, 4, 0]), 'left');
    expect(result.board.slice(0, 4)).toEqual([4, 4, 0, 0]);
    expect(result.gained).toBe(4);
    expect(maxTile(result.board)).toBe(4);

    const row = slide(boardWith([8, 8, 8, 8]), 'left');
    expect(row.board.slice(0, 4)).toEqual([16, 16, 0, 0]);
    expect(row.gained).toBe(32);
  });

  it('mueve y fusiona en las cuatro direcciones', () => {
    const right = slide(boardWith([2, 2, 0, 0]), 'right');
    expect(right.board.slice(0, 4)).toEqual([0, 0, 0, 4]);

    const column = emptyBoard();
    [2, 2, 2, 2].forEach((value, row) => {
      column[row * 4] = value;
    });

    const up = slide(column, 'up');
    expect([up.board[0], up.board[4], up.board[8], up.board[12]]).toEqual([4, 4, 0, 0]);

    const down = slide(boardWith([2, 0, 0, 0]), 'down');
    expect([down.board[0], down.board[4], down.board[8], down.board[12]]).toEqual([0, 0, 0, 2]);
  });
});

describe('2048 · aparición de fichas', () => {
  it('añade una única ficha 2 o 4 solo tras un movimiento válido', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const result = move(boardWith([2, 2, 0, 0]), 'left', mulberry32(seed));
      expect(result.moved).toBe(true);
      expect(result.spawn).not.toBeNull();
      expect([2, 4]).toContain(result.spawn!.value);
      expect(result.gained).toBe(4);
      expect(tileCount(result.board)).toBe(2);
    }
  });

  it('no hace aparecer ficha si el tablero no cambia', () => {
    const settled = boardWith([2, 4, 0, 0]);
    const result = move(settled, 'left', mulberry32(5));
    expect(result.moved).toBe(false);
    expect(result.spawn).toBeNull();
    expect(result.board).toEqual(settled);

    const full = fullBoard();
    const blocked = move(full, 'left', mulberry32(9));
    expect(blocked.moved).toBe(false);
    expect(blocked.spawn).toBeNull();
    expect(blocked.board).toEqual(full);
  });

  it('reparte 2 y 4 y empieza con dos fichas', () => {
    const values = new Set<number>();

    for (let seed = 1; seed <= 60; seed += 1) {
      const spawn = addRandomTile(emptyBoard(), mulberry32(seed));
      expect(spawn.index).not.toBeNull();
      expect([2, 4]).toContain(spawn.value);
      expect(tileCount(spawn.board)).toBe(1);
      values.add(spawn.value);

      const board = createBoard(mulberry32(seed));
      expect(board).toHaveLength(16);
      expect(tileCount(board)).toBe(2);
      for (const value of board) {
        expect([0, 2, 4]).toContain(value);
      }
    }

    expect(values).toEqual(new Set([2, 4]));
  });
});

describe('2048 · fin de partida', () => {
  it('detecta el bloqueo solo sin huecos ni parejas contiguas', () => {
    const full = fullBoard();
    expect(hasMoves(full)).toBe(false);
    expect(isGameOver(full)).toBe(true);

    const withPair = [...full];
    withPair[15] = withPair[14]!;
    expect(hasMoves(withPair)).toBe(true);
    expect(isGameOver(withPair)).toBe(false);

    const withHole = [...full];
    withHole[0] = 0;
    expect(hasMoves(withHole)).toBe(true);
    expect(isGameOver(withHole)).toBe(false);
  });

  it('detecta parejas verticales y mantiene la puntuación clásica', () => {
    const verticalPair = [2, 4, 2, 4, 2, 8, 4, 8, 4, 2, 8, 2, 8, 4, 2, 4];
    expect(hasMoves(verticalPair)).toBe(true);

    const result = move(verticalPair, 'up', mulberry32(21));
    expect(result.moved).toBe(true);
    expect(result.gained).toBeGreaterThan(0);
    expect(result.board).toHaveLength(16);
  });
});

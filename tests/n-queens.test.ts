import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  QUEENS_SIZE,
  attackedCells,
  attackedCount,
  conflictingQueens,
  createEmptyRows,
  isAttacked,
  isSolved,
  isValidSolution,
  queenCount,
  toggleQueen,
} from '../src/games/n-queens/logic';

/** Solución clásica: cada índice es una columna y su valor, la fila. */
const KNOWN_SOLUTION = [0, 4, 7, 5, 2, 6, 1, 3] as const;

describe('ocho damas', () => {
  it('acepta una solución conocida de ocho damas', () => {
    expect(KNOWN_SOLUTION).toHaveLength(QUEENS_SIZE);
    expect(isValidSolution(KNOWN_SOLUTION)).toBe(true);
    expect(isSolved(KNOWN_SOLUTION)).toBe(true);
    expect(conflictingQueens(KNOWN_SOLUTION)).toEqual([]);
    expect(queenCount(KNOWN_SOLUTION)).toBe(QUEENS_SIZE);

    let rows = createEmptyRows();
    KNOWN_SOLUTION.forEach((row, column) => {
      rows = toggleQueen(rows, column, row);
    });
    expect(isSolved(rows)).toBe(true);
  });

  it('rechaza tableros incompletos, fuera de rango o con damas atacadas', () => {
    const partial = KNOWN_SOLUTION.slice(0, 7);
    expect(isValidSolution(partial)).toBe(false);
    expect(isSolved(partial)).toBe(false);
    expect(queenCount(partial)).toBe(7);

    expect(isValidSolution([0, 4, 7, 5, 2, 6, 1, 8])).toBe(false);
    expect(isValidSolution([0, 4, 7, 5, 2, 6, 1, -1])).toBe(false);

    // Dos damas en la misma fila.
    expect(isValidSolution([0, 4, 7, 5, 2, 6, 1, 1])).toBe(false);
    // Dos damas en la diagonal principal.
    expect(isValidSolution([0, 1, 2, 3, 4, 5, 6, 7])).toBe(false);
    // Dos damas en la misma diagonal descendente.
    expect(isValidSolution([0, 6, 7, 5, 2, 4, 1, 3])).toBe(false);

    const conflicts = conflictingQueens([EMPTY, EMPTY, EMPTY, 5, 6, EMPTY, EMPTY, EMPTY]);
    expect(conflicts).toEqual([3, 4]);
  });

  it('marca las casillas atacadas por una dama en fila, columna y diagonal', () => {
    const rows = createEmptyRows();
    rows[0] = 0;
    const attacked = attackedCells(rows);

    expect(attacked).toHaveLength(QUEENS_SIZE * QUEENS_SIZE);
    expect(attacked[0]).toBe(false);
    expect(attacked[7]).toBe(true); // (fila 0, columna 7)
    expect(attacked[56]).toBe(true); // (fila 7, columna 0)
    expect(attacked[63]).toBe(true); // diagonal
    expect(attacked[10]).toBe(false); // (fila 1, columna 2)
    expect(attackedCount(rows)).toBe(21);

    expect(isAttacked(rows, 7, 7)).toBe(true);
    expect(isAttacked(rows, 4, 0)).toBe(true);
    expect(isAttacked(rows, 1, 2)).toBe(false);
    expect(isAttacked(rows, 0, 0)).toBe(false);
  });

  it('alterna una dama por columna y la mueve dentro de la columna', () => {
    const empty = createEmptyRows();
    expect(empty.every((row) => row === EMPTY)).toBe(true);
    expect(queenCount(empty)).toBe(0);

    const placed = toggleQueen(empty, 3, 5);
    expect(placed[3]).toBe(5);
    expect(queenCount(placed)).toBe(1);

    const moved = toggleQueen(placed, 3, 2);
    expect(moved[3]).toBe(2);
    expect(queenCount(moved)).toBe(1);
    expect(moved[4]).toBe(EMPTY);

    const removed = toggleQueen(moved, 3, 2);
    expect(removed[3]).toBe(EMPTY);
    expect(queenCount(removed)).toBe(0);

    expect(toggleQueen(empty, -1, 4)).toEqual(empty);
    expect(toggleQueen(empty, 8, 4)).toEqual(empty);
    expect(toggleQueen(empty, 2, 9)).toEqual(empty);
  });

  it('solo da la victoria con ocho damas y ningún ataque', () => {
    const solution = [...KNOWN_SOLUTION];
    expect(isSolved(solution)).toBe(true);

    const attacked = [...solution];
    attacked[7] = 0;
    expect(isValidSolution(attacked)).toBe(false);
    expect(isSolved(attacked)).toBe(false);
    expect(conflictingQueens(attacked)).toEqual(expect.arrayContaining([0, 7]));

    const seven: number[] = [...solution];
    seven[4] = EMPTY;
    expect(isSolved(seven)).toBe(false);
    expect(queenCount(seven)).toBe(7);
  });
});

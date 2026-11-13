export const QUEENS_SIZE = 8;
export const EMPTY = -1;

/** rows[columna] guarda la fila de la dama; EMPTY si la columna está vacía. */
export type QueenRows = readonly number[];

export function createEmptyRows(): number[] {
  return Array<number>(QUEENS_SIZE).fill(EMPTY);
}

function isPlaced(row: number): boolean {
  return Number.isInteger(row) && row >= 0 && row < QUEENS_SIZE;
}

export function queenCount(rows: QueenRows): number {
  let count = 0;
  const limit = Math.min(rows.length, QUEENS_SIZE);
  for (let column = 0; column < limit; column += 1) {
    if (isPlaced(rows[column]!)) count += 1;
  }
  return count;
}

/** Columnas cuyas damas comparten fila o diagonal con otra dama. */
export function conflictingQueens(rows: QueenRows): number[] {
  const limit = Math.min(rows.length, QUEENS_SIZE);
  const flags = new Array<boolean>(limit).fill(false);

  for (let first = 0; first < limit; first += 1) {
    const firstRow = rows[first]!;
    if (!isPlaced(firstRow)) continue;
    for (let second = first + 1; second < limit; second += 1) {
      const secondRow = rows[second]!;
      if (!isPlaced(secondRow)) continue;
      if (firstRow === secondRow || Math.abs(firstRow - secondRow) === second - first) {
        flags[first] = true;
        flags[second] = true;
      }
    }
  }

  const conflicts: number[] = [];
  for (let column = 0; column < flags.length; column += 1) {
    if (flags[column]) conflicts.push(column);
  }
  return conflicts;
}

/** Ocho damas colocadas, una por columna y sin ataques. */
export function isValidSolution(rows: QueenRows): boolean {
  if (rows.length !== QUEENS_SIZE) return false;
  for (let column = 0; column < QUEENS_SIZE; column += 1) {
    if (!isPlaced(rows[column]!)) return false;
  }
  return conflictingQueens(rows).length === 0;
}

export function isSolved(rows: QueenRows): boolean {
  return isValidSolution(rows);
}

/**
 * Pone una dama en la columna indicada. Si la columna ya tenía una dama en esa
 * fila, la retira; si estaba en otra fila, la mueve dentro de la columna.
 */
export function toggleQueen(rows: QueenRows, column: number, row: number): number[] {
  const next = [...rows];
  if (column < 0 || column >= QUEENS_SIZE || row < 0 || row >= QUEENS_SIZE) return next;
  next[column] = next[column] === row ? EMPTY : row;
  return next;
}

/** Mapa de 64 casillas con las que quedan amenazadas por alguna dama. */
export function attackedCells(rows: QueenRows): boolean[] {
  const attacked = new Array<boolean>(QUEENS_SIZE * QUEENS_SIZE).fill(false);
  const limit = Math.min(rows.length, QUEENS_SIZE);

  for (let originColumn = 0; originColumn < limit; originColumn += 1) {
    const originRow = rows[originColumn]!;
    if (!isPlaced(originRow)) continue;

    for (let row = 0; row < QUEENS_SIZE; row += 1) {
      for (let column = 0; column < QUEENS_SIZE; column += 1) {
        if (column === originColumn && row === originRow) continue;
        const sameColumn = column === originColumn;
        const sameRow = row === originRow;
        const sameDiagonal = Math.abs(column - originColumn) === Math.abs(row - originRow);
        if (sameColumn || sameRow || sameDiagonal) {
          attacked[row * QUEENS_SIZE + column] = true;
        }
      }
    }
  }

  return attacked;
}

export function attackedCount(rows: QueenRows): number {
  return attackedCells(rows).reduce((total, cell) => total + (cell ? 1 : 0), 0);
}

/** Indica si otra dama amenaza la casilla indicada. */
export function isAttacked(rows: QueenRows, column: number, row: number): boolean {
  if (column < 0 || column >= QUEENS_SIZE || row < 0 || row >= QUEENS_SIZE) return false;
  const limit = Math.min(rows.length, QUEENS_SIZE);

  for (let originColumn = 0; originColumn < limit; originColumn += 1) {
    const originRow = rows[originColumn]!;
    if (!isPlaced(originRow)) continue;
    if (originColumn === column && originRow === row) continue;
    if (
      originColumn === column ||
      originRow === row ||
      Math.abs(originColumn - column) === Math.abs(originRow - row)
    ) {
      return true;
    }
  }

  return false;
}

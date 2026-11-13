/**
 * Lógica pura de 2048. El tablero es una lista plana de 16 celdas (4×4)
 * donde 0 representa una casilla vacía.
 */

export const SIZE = 4;
export const CELL_COUNT = SIZE * SIZE;
export const GOAL = 2048;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface SpawnResult {
  board: number[];
  /** Índice de la ficha creada, o null si el tablero estaba lleno. */
  index: number | null;
  value: number;
}

export interface SlideResult {
  board: number[];
  /** Puntos ganados con las fusiones de este movimiento. */
  gained: number;
  moved: boolean;
  /** Índices de las fichas resultantes de una fusión. */
  merged: number[];
}

export interface MoveResult extends SlideResult {
  /** Ficha aparecida tras el movimiento; null si no hubo cambios. */
  spawn: { index: number; value: number } | null;
}

interface SlideLineResult {
  values: number[];
  gained: number;
  mergedSlots: number[];
}

function compactLine(line: readonly number[]): number[] {
  const values: number[] = [];
  for (const value of line) {
    if (value !== 0) values.push(value);
  }
  return values;
}

/** Desliza una única línea hacia su inicio y fusiona cada pareja una sola vez. */
function slideLine(line: readonly number[]): SlideLineResult {
  const compact = compactLine(line);
  const values: number[] = [];
  const mergedSlots: number[] = [];
  let gained = 0;

  for (let index = 0; index < compact.length; index += 1) {
    const current = compact[index]!;
    const next = compact[index + 1];

    if (next !== undefined && current === next) {
      const mergedValue = current * 2;
      mergedSlots.push(values.length);
      values.push(mergedValue);
      gained += mergedValue;
      index += 1;
    } else {
      values.push(current);
    }
  }

  while (values.length < SIZE) values.push(0);

  return { values, gained, mergedSlots };
}

/** Posiciones del tablero que forman cada línea, ordenadas hacia el destino. */
function linePositions(direction: Direction, index: number): number[] {
  const positions: number[] = [];

  for (let step = 0; step < SIZE; step += 1) {
    switch (direction) {
      case 'left':
        positions.push(index * SIZE + step);
        break;
      case 'right':
        positions.push(index * SIZE + (SIZE - 1 - step));
        break;
      case 'up':
        positions.push(step * SIZE + index);
        break;
      case 'down':
        positions.push((SIZE - 1 - step) * SIZE + index);
        break;
    }
  }

  return positions;
}

export function emptyBoard(): number[] {
  return new Array<number>(CELL_COUNT).fill(0);
}

/** Coloca una ficha nueva (2 el 90 % de las veces, 4 el resto). */
export function addRandomTile(
  board: readonly number[],
  random: () => number = Math.random,
): SpawnResult {
  const empties: number[] = [];
  board.forEach((value, index) => {
    if (value === 0) empties.push(index);
  });

  if (empties.length === 0) {
    return { board: [...board], index: null, value: 0 };
  }

  const slot = Math.min(empties.length - 1, Math.floor(random() * empties.length));
  const index = empties[slot]!;
  const value = random() < 0.9 ? 2 : 4;
  const next = [...board];
  next[index] = value;

  return { board: next, index, value };
}

/** Tablero inicial con dos fichas. */
export function createBoard(random: () => number = Math.random): number[] {
  const first = addRandomTile(emptyBoard(), random);
  return addRandomTile(first.board, random).board;
}

/** Desliza todas las fichas sin añadir ninguna nueva. */
export function slide(board: readonly number[], direction: Direction): SlideResult {
  const next = emptyBoard();
  const merged: number[] = [];
  let gained = 0;

  for (let line = 0; line < SIZE; line += 1) {
    const positions = linePositions(direction, line);
    const values = positions.map((position) => board[position] ?? 0);
    const result = slideLine(values);

    positions.forEach((position, slot) => {
      next[position] = result.values[slot]!;
    });

    for (const slot of result.mergedSlots) {
      merged.push(positions[slot]!);
    }
    gained += result.gained;
  }

  const moved = next.some((value, index) => value !== (board[index] ?? 0));

  return { board: next, gained, moved, merged };
}

/**
 * Movimiento completo: desliza, suma puntos y, solo si el tablero cambió,
 * hace aparecer una ficha nueva.
 */
export function move(
  board: readonly number[],
  direction: Direction,
  random: () => number = Math.random,
): MoveResult {
  const result = slide(board, direction);

  if (!result.moved) {
    return { ...result, board: [...board], spawn: null };
  }

  const spawn = addRandomTile(result.board, random);

  return {
    board: spawn.board,
    gained: result.gained,
    moved: true,
    merged: result.merged,
    spawn: spawn.index === null ? null : { index: spawn.index, value: spawn.value },
  };
}

export function maxTile(board: readonly number[]): number {
  return board.reduce((highest, value) => Math.max(highest, value), 0);
}

/** Hay partida mientras quede una casilla vacía o una pareja contigua. */
export function hasMoves(board: readonly number[]): boolean {
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      const index = row * SIZE + column;
      const value = board[index] ?? 0;
      if (value === 0) return true;

      const right = column + 1 < SIZE ? (board[index + 1] ?? 0) : -1;
      const below = row + 1 < SIZE ? (board[index + SIZE] ?? 0) : -1;
      if (value === right || value === below) return true;
    }
  }

  return false;
}

export function isGameOver(board: readonly number[]): boolean {
  return !hasMoves(board);
}

export function tileCount(board: readonly number[]): number {
  return board.reduce((count, value) => (value === 0 ? count : count + 1), 0);
}

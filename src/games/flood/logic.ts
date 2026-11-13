export const FLOOD_SIZE = 10;
export const FLOOD_COLORS = 6;
export const FLOOD_MOVES = 22;
export const FLOOD_BONUS_PER_MOVE = 8;

const CELL_COUNT = FLOOD_SIZE * FLOOD_SIZE;

/** Recorre una región conexa que cumple el predicado de color. */
function collectRegion(
  board: readonly number[],
  start: number,
  size: number,
  accepts: (color: number) => boolean,
): number[] {
  if (board.length === 0 || size <= 0 || board.length !== size * size) return [];
  if (start < 0 || start >= board.length) return [];
  const first = board[start];
  if (first === undefined || !accepts(first)) return [];

  const seen = new Uint8Array(board.length);
  const pending: number[] = [start];
  const cells: number[] = [start];
  seen[start] = 1;

  while (pending.length > 0) {
    const index = pending.pop();
    if (index === undefined) break;
    const column = index % size;
    const row = (index - column) / size;
    const neighbours: number[] = [];
    if (column > 0) neighbours.push(index - 1);
    if (column < size - 1) neighbours.push(index + 1);
    if (row > 0) neighbours.push(index - size);
    if (row < size - 1) neighbours.push(index + size);

    for (const neighbour of neighbours) {
      if (seen[neighbour] === 1) continue;
      const color = board[neighbour];
      if (color === undefined || !accepts(color)) continue;
      seen[neighbour] = 1;
      cells.push(neighbour);
      pending.push(neighbour);
    }
  }

  return cells;
}

/** Índices de la región inundada actual, conectada desde la esquina superior izquierda. */
export function floodedRegion(board: readonly number[], start = 0, size = FLOOD_SIZE): number[] {
  const color = board[start];
  if (color === undefined) return [];
  return collectRegion(board, start, size, (candidate) => candidate === color);
}

/**
 * Aplica un movimiento: la región inundada toma el color elegido y absorbe todas
 * las celdas conectadas de ese color. Elegir el color actual no cambia nada.
 */
export function floodBoard(board: readonly number[], color: number, size = FLOOD_SIZE): number[] {
  const current = board[0];
  if (current === undefined) return [];
  if (!Number.isInteger(color) || color < 0 || color >= FLOOD_COLORS || color === current) {
    return [...board];
  }

  const cells = collectRegion(
    board,
    0,
    size,
    (candidate) => candidate === current || candidate === color,
  );
  const next = [...board];
  for (const index of cells) next[index] = color;
  return next;
}

export function floodedCount(board: readonly number[], size = FLOOD_SIZE): number {
  return floodedRegion(board, 0, size).length;
}

export function floodedPercent(board: readonly number[], size = FLOOD_SIZE): number {
  if (board.length === 0) return 0;
  return Math.round((floodedCount(board, size) / board.length) * 100);
}

export function isFlooded(board: readonly number[], size = FLOOD_SIZE): boolean {
  return board.length > 0 && floodedCount(board, size) === board.length;
}

export function remainingMoves(movesUsed: number, maxMoves = FLOOD_MOVES): number {
  return Math.max(0, maxMoves - Math.max(0, movesUsed));
}

export function isOutOfMoves(movesUsed: number, maxMoves = FLOOD_MOVES): boolean {
  return remainingMoves(movesUsed, maxMoves) === 0;
}

/** Puntos = celdas inundadas + bonus por cada movimiento que sobra. */
export function floodScore(board: readonly number[], movesLeft: number, size = FLOOD_SIZE): number {
  return floodedCount(board, size) + Math.max(0, movesLeft) * FLOOD_BONUS_PER_MOVE;
}

/**
 * Solución voraz: en cada paso elige el color que más celdas nuevas absorbe.
 * Devuelve null si no logra inundar el tablero dentro del límite indicado.
 */
export function greedySolution(
  board: readonly number[],
  maxMoves = FLOOD_MOVES,
  size = FLOOD_SIZE,
): number[] | null {
  if (board.length === 0 || board.length !== size * size) return null;
  let current = [...board];
  const moves: number[] = [];

  while (!isFlooded(current, size)) {
    if (moves.length >= maxMoves) return null;
    const currentColor = current[0];
    if (currentColor === undefined) return null;

    let choice = -1;
    let best = -1;
    for (let color = 0; color < FLOOD_COLORS; color += 1) {
      if (color === currentColor) continue;
      const next = floodBoard(current, color, size);
      const count = floodedCount(next, size);
      if (count > best) {
        best = count;
        choice = color;
      }
    }

    if (choice < 0) return null;
    current = floodBoard(current, choice, size);
    moves.push(choice);
  }

  return moves;
}

function randomBoard(random: () => number): number[] {
  const board = new Array<number>(CELL_COUNT);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = Math.floor(random() * FLOOD_COLORS);
    board[index] = Math.min(FLOOD_COLORS - 1, Math.max(0, value));
  }
  return board;
}

/**
 * Tablero de respaldo, por si el generador recibe una fuente de azar degenerada.
 * Las columnas alternan colores y se resuelve en 9 movimientos.
 */
function fallbackBoard(): number[] {
  const board = new Array<number>(CELL_COUNT);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    board[index] = (index % FLOOD_SIZE) % FLOOD_COLORS;
  }
  return board;
}

/**
 * Genera un tablero aleatorio de 10×10 que no esté resuelto de entrada y que
 * tenga una solución voraz dentro de los 22 movimientos disponibles.
 */
export function generateBoard(random: () => number = Math.random): number[] {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const board = randomBoard(random);
    if (isFlooded(board)) continue;
    if (greedySolution(board) === null) continue;
    return board;
  }
  return fallbackBoard();
}

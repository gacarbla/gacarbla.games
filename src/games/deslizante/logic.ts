export const SLIDE_SIZE = 4;
export const SLIDE_CELLS = SLIDE_SIZE * SLIDE_SIZE;

export const SOLVED: readonly number[] = Array.from({ length: SLIDE_CELLS }, (_, index) =>
  index === SLIDE_CELLS - 1 ? 0 : index + 1,
);

export interface ShuffledBoard {
  tiles: number[];
  moves: number[];
}

export function isSolved(tiles: readonly number[]): boolean {
  return tiles.every((tile, index) => tile === (index === SLIDE_CELLS - 1 ? 0 : index + 1));
}

export function blankIndex(tiles: readonly number[]): number {
  return tiles.indexOf(0);
}

export function adjacentCells(index: number): number[] {
  const column = index % SLIDE_SIZE;
  const row = Math.floor(index / SLIDE_SIZE);
  const result: number[] = [];
  if (column > 0) result.push(index - 1);
  if (column < SLIDE_SIZE - 1) result.push(index + 1);
  if (row > 0) result.push(index - SLIDE_SIZE);
  if (row < SLIDE_SIZE - 1) result.push(index + SLIDE_SIZE);
  return result;
}

export function canSlide(tiles: readonly number[], index: number): boolean {
  if (index < 0 || index >= tiles.length || tiles[index] === 0) return false;
  const blank = blankIndex(tiles);
  if (blank === -1) return false;
  const column = index % SLIDE_SIZE;
  const row = Math.floor(index / SLIDE_SIZE);
  const blankColumn = blank % SLIDE_SIZE;
  const blankRow = Math.floor(blank / SLIDE_SIZE);
  return Math.abs(column - blankColumn) + Math.abs(row - blankRow) === 1;
}

/** Devuelve el tablero tras deslizar la pieza indicada, o null si no es legal. */
export function slide(tiles: readonly number[], index: number): number[] | null {
  if (!canSlide(tiles, index)) return null;
  const next = [...tiles];
  const blank = blankIndex(tiles);
  next[blank] = tiles[index]!;
  next[index] = 0;
  return next;
}

/**
 * Desordena desde la posición resuelta con exactamente 120 movimientos legales,
 * evitando deshacer el anterior. Así la solución está garantizada.
 */
export function shuffleBoard(random: () => number = Math.random): ShuffledBoard {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const tiles = [...SOLVED];
    const moves: number[] = [];
    let blank = SLIDE_CELLS - 1;
    let previous = -1;

    for (let step = 0; step < 120; step += 1) {
      const options = adjacentCells(blank).filter((cell) => cell !== previous);
      const next = options[Math.floor(random() * options.length)] ?? blank;
      tiles[blank] = tiles[next]!;
      tiles[next] = 0;
      moves.push(next);
      previous = blank;
      blank = next;
    }

    if (!isSolved(tiles)) return { tiles, moves };
  }

  const fallback = [...SOLVED];
  [fallback[14], fallback[15]] = [fallback[15]!, fallback[14]!];
  return { tiles: fallback, moves: [14] };
}

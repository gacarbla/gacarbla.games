export interface MineLevel {
  id: 'facil' | 'normal' | 'dificil';
  label: string;
  cols: number;
  rows: number;
  mines: number;
}

export const MINE_LEVELS: readonly MineLevel[] = [
  { id: 'facil', label: 'Fácil', cols: 8, rows: 8, mines: 8 },
  { id: 'normal', label: 'Normal', cols: 9, rows: 9, mines: 12 },
  { id: 'dificil', label: 'Difícil', cols: 12, rows: 12, mines: 28 },
] as const;

export const DEFAULT_MINE_LEVEL = 1;

export interface MineBoard {
  cols: number;
  rows: number;
  mineCount: number;
  safeCount: number;
  mines: boolean[];
  counts: number[];
  revealed: boolean[];
  flags: boolean[];
  placed: boolean;
}

export interface RevealResult {
  hitMine: boolean;
  opened: number;
}

export function createMineBoard(level: MineLevel = MINE_LEVELS[DEFAULT_MINE_LEVEL]!): MineBoard {
  const size = level.cols * level.rows;
  return {
    cols: level.cols,
    rows: level.rows,
    mineCount: level.mines,
    safeCount: size - level.mines,
    mines: Array<boolean>(size).fill(false),
    counts: Array<number>(size).fill(0),
    revealed: Array<boolean>(size).fill(false),
    flags: Array<boolean>(size).fill(false),
    placed: false,
  };
}

export function neighbors(index: number, cols: number, rows: number): number[] {
  const column = index % cols;
  const row = Math.floor(index / cols);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (nextColumn < 0 || nextColumn >= cols) continue;
      if (nextRow < 0 || nextRow >= rows) continue;
      result.push(nextRow * cols + nextColumn);
    }
  }
  return result;
}

/** Coloca las minas dejando libre la casilla inicial y sus ocho vecinas. */
export function placeMines(
  board: MineBoard,
  safeIndex: number,
  random: () => number = Math.random,
): void {
  if (board.placed) return;

  const size = board.mines.length;
  const forbidden = new Set<number>([safeIndex, ...neighbors(safeIndex, board.cols, board.rows)]);
  const candidates: number[] = [];
  for (let index = 0; index < size; index += 1) {
    if (!forbidden.has(index)) candidates.push(index);
  }
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const value = candidates[index]!;
    candidates[index] = candidates[swap]!;
    candidates[swap] = value;
  }

  for (let index = 0; index < board.mineCount; index += 1) {
    board.mines[candidates[index]!] = true;
  }

  for (let index = 0; index < size; index += 1) {
    board.counts[index] = neighbors(index, board.cols, board.rows).filter(
      (neighbor) => board.mines[neighbor],
    ).length;
  }
  board.placed = true;
}

/** Descubre una casilla con flood-fill. Devuelve si era mina y cuántas abrió. */
export function revealCell(
  board: MineBoard,
  index: number,
  random: () => number = Math.random,
): RevealResult {
  if (index < 0 || index >= board.mines.length) return { hitMine: false, opened: 0 };
  if (board.revealed[index] || board.flags[index]) return { hitMine: false, opened: 0 };

  if (!board.placed) placeMines(board, index, random);
  if (board.mines[index]) {
    board.revealed[index] = true;
    return { hitMine: true, opened: 0 };
  }

  const pending = [index];
  let opened = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (board.revealed[current] || board.flags[current] || board.mines[current]) continue;
    board.revealed[current] = true;
    opened += 1;
    if (board.counts[current] === 0) {
      for (const neighbor of neighbors(current, board.cols, board.rows)) {
        if (!board.revealed[neighbor] && !board.flags[neighbor]) pending.push(neighbor);
      }
    }
  }
  return { hitMine: false, opened };
}

export function toggleFlag(board: MineBoard, index: number): boolean {
  if (board.revealed[index]) return false;
  board.flags[index] = !board.flags[index];
  return board.flags[index]!;
}

export function flagCount(board: MineBoard): number {
  return board.flags.reduce((total, flag) => total + (flag ? 1 : 0), 0);
}

export function revealedSafeCount(board: MineBoard): number {
  let total = 0;
  for (let index = 0; index < board.mines.length; index += 1) {
    if (board.revealed[index] && !board.mines[index]) total += 1;
  }
  return total;
}

export function revealAllMines(board: MineBoard): void {
  for (let index = 0; index < board.mines.length; index += 1) {
    if (board.mines[index]) board.revealed[index] = true;
  }
}

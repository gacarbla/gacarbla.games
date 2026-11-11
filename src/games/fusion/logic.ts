export const FUSION_COLS = 7;
export const FUSION_ROWS = 8;

export type Board = number[];

export interface Group {
  value: number;
  cells: number[];
}

export interface MergeEvent {
  /** Índice final del orbe fusionado, ya aplicada la gravedad. */
  index: number;
  value: number;
  size: number;
}

export interface MoveEvent {
  from: number;
  to: number;
}

export interface ResolveResult {
  board: Board;
  merge: MergeEvent | null;
  moved: MoveEvent[];
  gained: number;
}

export function createBoard(cols = FUSION_COLS, rows = FUSION_ROWS): Board {
  return Array.from({ length: cols * rows }, () => 0);
}

export function dropTile(
  board: Board,
  column: number,
  value: number,
  cols = FUSION_COLS,
  rows = FUSION_ROWS,
): number {
  if (column < 0 || column >= cols || value <= 0) return -1;
  for (let row = rows - 1; row >= 0; row -= 1) {
    const index = row * cols + column;
    if (board[index] === 0) {
      board[index] = value;
      return index;
    }
  }
  return -1;
}

export function findGroups(board: Board, cols = FUSION_COLS, rows = FUSION_ROWS): Group[] {
  const visited = new Set<number>();
  const groups: Group[] = [];

  for (let index = 0; index < board.length; index += 1) {
    const value = board[index]!;
    if (value <= 0 || visited.has(index)) continue;

    const cells: number[] = [];
    const queue = [index];
    visited.add(index);

    while (queue.length > 0) {
      const current = queue.pop()!;
      cells.push(current);
      const x = current % cols;
      const y = Math.floor(current / cols);
      const neighbours = [
        x > 0 ? current - 1 : -1,
        x < cols - 1 ? current + 1 : -1,
        y > 0 ? current - cols : -1,
        y < rows - 1 ? current + cols : -1,
      ];

      for (const neighbour of neighbours) {
        if (neighbour < 0 || visited.has(neighbour)) continue;
        if (board[neighbour] !== value) continue;
        visited.add(neighbour);
        queue.push(neighbour);
      }
    }

    if (cells.length >= 3) groups.push({ value, cells });
  }

  return groups;
}

export function applyGravity(
  board: Board,
  cols = FUSION_COLS,
  rows = FUSION_ROWS,
): { board: Board; moved: MoveEvent[] } {
  const next = [...board];
  const moved: MoveEvent[] = [];

  for (let column = 0; column < cols; column += 1) {
    const entries: Array<{ value: number; row: number }> = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      const value = board[row * cols + column]!;
      if (value !== 0) entries.push({ value, row });
      next[row * cols + column] = 0;
    }

    let targetRow = rows - 1;
    for (const entry of entries) {
      const target = targetRow * cols + column;
      next[target] = entry.value;
      if (entry.row !== targetRow) {
        moved.push({
          from: entry.row * cols + column,
          to: target,
        });
      }
      targetRow -= 1;
    }
  }

  return { board: next, moved };
}

function chooseAnchor(group: Group, cols: number): number {
  const averageColumn =
    group.cells.reduce((sum, cell) => sum + (cell % cols), 0) / group.cells.length;
  let anchor = group.cells[0]!;
  let bestRow = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const cell of group.cells) {
    const row = Math.floor(cell / cols);
    const distance = Math.abs((cell % cols) - averageColumn);
    if (row > bestRow || (row === bestRow && distance < bestDistance)) {
      anchor = cell;
      bestRow = row;
      bestDistance = distance;
    }
  }

  return anchor;
}

/** Resuelve un solo grupo por pasada para que las cascadas se vean y puntúen. */
export function resolveOne(board: Board, cols = FUSION_COLS, rows = FUSION_ROWS): ResolveResult {
  const groups = findGroups(board, cols, rows);
  if (groups.length === 0) {
    return { board: [...board], merge: null, moved: [], gained: 0 };
  }

  const group = groups.sort((a, b) => b.cells.length - a.cells.length)[0]!;
  const anchor = chooseAnchor(group, cols);
  const mergedValue = group.value + 1;
  const next = [...board];

  for (const cell of group.cells) next[cell] = 0;
  next[anchor] = -mergedValue;

  const gravity = applyGravity(next, cols, rows);
  const finalIndex = gravity.board.findIndex((value) => value === -mergedValue);
  if (finalIndex >= 0) gravity.board[finalIndex] = mergedValue;

  return {
    board: gravity.board,
    merge: {
      index: finalIndex >= 0 ? finalIndex : anchor,
      value: mergedValue,
      size: group.cells.length,
    },
    moved: gravity.moved,
    gained: group.value * 10 * group.cells.length,
  };
}

export function isBoardFull(board: Board, cols = FUSION_COLS): boolean {
  for (let column = 0; column < cols; column += 1) {
    if (board[column] === 0) return false;
  }
  return true;
}

export function spawnValue(random: () => number = Math.random): number {
  const roll = random();
  if (roll < 0.42) return 1;
  if (roll < 0.78) return 2;
  return 3;
}

export function landingIndex(
  board: Board,
  column: number,
  cols = FUSION_COLS,
  rows = FUSION_ROWS,
): number {
  if (column < 0 || column >= cols) return -1;
  for (let row = rows - 1; row >= 0; row -= 1) {
    const index = row * cols + column;
    if (board[index] === 0) return index;
  }
  return -1;
}

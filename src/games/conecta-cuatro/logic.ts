export const COLS = 7;
export const ROWS = 6;
export const EMPTY = 0;
export const HUMAN = 1;
export const AI = 2;

export type Board = number[];

export function createBoard(): Board {
  return new Array<number>(COLS * ROWS).fill(EMPTY);
}

export function cellIndex(row: number, column: number): number {
  return row * COLS + column;
}

export function drop(board: Board, column: number, player: number): number | null {
  if (column < 0 || column >= COLS) return null;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    const index = row * COLS + column;
    if (board[index] === EMPTY) {
      board[index] = player;
      return index;
    }
  }
  return null;
}

export function validColumns(board: Board): number[] {
  const columns: number[] = [];
  for (let column = 0; column < COLS; column += 1) {
    if (board[column] === EMPTY) columns.push(column);
  }
  return columns;
}

export function isFull(board: Board): boolean {
  return board.every((cell) => cell !== EMPTY);
}

const WINDOWS: readonly number[][] = (() => {
  const windows: number[][] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLS; column += 1) {
      if (column + 3 < COLS) {
        windows.push([0, 1, 2, 3].map((offset) => cellIndex(row, column + offset)));
      }
      if (row + 3 < ROWS) {
        windows.push([0, 1, 2, 3].map((offset) => cellIndex(row + offset, column)));
      }
      if (column + 3 < COLS && row + 3 < ROWS) {
        windows.push([0, 1, 2, 3].map((offset) => cellIndex(row + offset, column + offset)));
      }
      if (column + 3 < COLS && row - 3 >= 0) {
        windows.push([0, 1, 2, 3].map((offset) => cellIndex(row - offset, column + offset)));
      }
    }
  }
  return windows;
})();

export function winningLine(board: Board, player: number): number[] | null {
  for (const window of WINDOWS) {
    if (window.every((index) => board[index] === player)) return window;
  }
  return null;
}

function evaluate(board: Board): number {
  let score = 0;
  for (const window of WINDOWS) {
    let ai = 0;
    let human = 0;
    for (const index of window) {
      if (board[index] === AI) ai += 1;
      else if (board[index] === HUMAN) human += 1;
    }
    if (ai > 0 && human > 0) continue;
    if (ai === 3) score += 48;
    else if (ai === 2) score += 7;
    else if (ai === 1) score += 1;
    if (human === 3) score -= 58;
    else if (human === 2) score -= 8;
    else if (human === 1) score -= 1;
  }

  for (let row = 0; row < ROWS; row += 1) {
    const center = board[cellIndex(row, 3)]!;
    if (center === AI) score += 5;
    else if (center === HUMAN) score -= 5;
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (winningLine(board, AI)) return 100_000 + depth * 100;
  if (winningLine(board, HUMAN)) return -100_000 - depth * 100;
  if (depth <= 0 || isFull(board)) return evaluate(board);

  const columns = orderColumns(validColumns(board));
  if (maximizing) {
    let best = -Infinity;
    for (const column of columns) {
      const copy = [...board];
      drop(copy, column, AI);
      const value = minimax(copy, depth - 1, alpha, beta, false);
      if (value > best) best = value;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  for (const column of columns) {
    const copy = [...board];
    drop(copy, column, HUMAN);
    const value = minimax(copy, depth - 1, alpha, beta, true);
    if (value < best) best = value;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

const CENTER_FIRST = [3, 2, 4, 1, 5, 0, 6];

function orderColumns(columns: readonly number[]): number[] {
  return CENTER_FIRST.filter((column) => columns.includes(column));
}

/** IA con alfa-beta: gana si puede, bloquea amenazas y si no busca la mejor línea. */
export function chooseAiMove(board: Board, depth = 4): number {
  const columns = orderColumns(validColumns(board));
  if (columns.length === 0) return -1;

  for (const column of columns) {
    const copy = [...board];
    if (drop(copy, column, AI) !== null && winningLine(copy, AI)) return column;
  }

  for (const column of columns) {
    const copy = [...board];
    if (drop(copy, column, HUMAN) !== null && winningLine(copy, HUMAN)) return column;
  }

  let bestColumn = columns[0]!;
  let bestValue = -Infinity;
  let alpha = -Infinity;
  for (const column of columns) {
    const copy = [...board];
    if (drop(copy, column, AI) === null) continue;
    const value = minimax(copy, depth - 1, alpha, Infinity, false);
    if (value > bestValue) {
      bestValue = value;
      bestColumn = column;
    }
    if (value > alpha) alpha = value;
  }
  return bestColumn;
}

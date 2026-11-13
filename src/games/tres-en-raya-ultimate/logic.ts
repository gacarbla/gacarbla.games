/**
 * Tres en raya definitivo: reglas puras y motor minimax.
 *
 * El tablero global tiene 9 tableros locales de 3×3. La casilla local donde se
 * juega el siguiente turno es la que acaba de ocupar el rival. Si ese tablero
 * ya está ganado, empatado o lleno, se puede elegir cualquier tablero libre.
 */

export const EMPTY = 0;
export const HUMAN = 1;
export const AI = 2;
export const DRAW = 3;

/** Valor de `active` cuando se puede jugar en cualquier tablero libre. */
export const ANY_BOARD = -1;

export const BOARD_COUNT = 9;
export const CELLS_PER_BOARD = 9;
export const TOTAL_CELLS = BOARD_COUNT * CELLS_PER_BOARD;

export const LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Líneas locales que pasan por cada casilla, útil para ordenar jugadas. */
const LINES_BY_CELL: readonly (readonly (readonly number[])[])[] = Array.from(
  { length: CELLS_PER_BOARD },
  (_, cell) => LINES.filter((line) => line.includes(cell)),
);

export interface UltimateState {
  /** 81 casillas: 0 vacía, HUMAN o AI. */
  cells: number[];
  /** 9 tableros: 0 libre, HUMAN, AI o DRAW. */
  boards: number[];
  /** Tablero obligatorio, o ANY_BOARD si hay libertad. */
  active: number;
  /** Turno actual: HUMAN o AI. */
  turn: number;
  /** 0 si sigue la partida, HUMAN, AI o DRAW al terminar. */
  winner: number;
  /** Jugadas realizadas entre ambos jugadores. */
  moves: number;
}

export function createState(): UltimateState {
  return {
    cells: new Array<number>(TOTAL_CELLS).fill(EMPTY),
    boards: new Array<number>(BOARD_COUNT).fill(EMPTY),
    active: ANY_BOARD,
    turn: HUMAN,
    winner: EMPTY,
    moves: 0,
  };
}

export function cloneState(state: UltimateState): UltimateState {
  return {
    cells: [...state.cells],
    boards: [...state.boards],
    active: state.active,
    turn: state.turn,
    winner: state.winner,
    moves: state.moves,
  };
}

export function boardOf(index: number): number {
  return Math.floor(index / CELLS_PER_BOARD);
}

export function cellOf(index: number): number {
  return index % CELLS_PER_BOARD;
}

export function globalIndex(board: number, cell: number): number {
  return board * CELLS_PER_BOARD + cell;
}

/** Devuelve la línea completa de `values` (9 posiciones) si `player` la ocupa. */
export function findWinningLine(
  values: readonly number[],
  player: number,
): readonly number[] | null {
  for (const line of LINES) {
    if (line.every((position) => values[position] === player)) return line;
  }
  return null;
}

/** Ganador de un tablero local a partir de sus 9 casillas. */
export function localWinner(cells: readonly number[], board: number): number {
  const offset = board * CELLS_PER_BOARD;
  for (const line of LINES) {
    const first = cells[offset + line[0]!];
    if (first === undefined || first === EMPTY) continue;
    if (line.every((cell) => cells[offset + cell] === first)) return first;
  }
  for (let cell = 0; cell < CELLS_PER_BOARD; cell += 1) {
    if (cells[offset + cell] === EMPTY) return EMPTY;
  }
  return DRAW;
}

export function countBoards(state: UltimateState, player: number): number {
  let count = 0;
  for (const board of state.boards) {
    if (board === player) count += 1;
  }
  return count;
}

/** Tableros donde todavía se puede jugar este turno. */
export function availableBoards(state: UltimateState): number[] {
  const boards: number[] = [];
  for (let board = 0; board < BOARD_COUNT; board += 1) {
    if (state.boards[board] !== EMPTY) continue;
    if (state.active !== ANY_BOARD && state.active !== board) continue;
    boards.push(board);
  }
  return boards;
}

export function isLegal(state: UltimateState, index: number): boolean {
  if (state.winner !== EMPTY) return false;
  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_CELLS) return false;
  const board = boardOf(index);
  if (state.boards[board] !== EMPTY) return false;
  if (state.active !== ANY_BOARD && state.active !== board) return false;
  return state.cells[index] === EMPTY;
}

export function legalMoves(state: UltimateState): number[] {
  if (state.winner !== EMPTY) return [];
  const moves: number[] = [];
  for (const board of availableBoards(state)) {
    for (let cell = 0; cell < CELLS_PER_BOARD; cell += 1) {
      const index = globalIndex(board, cell);
      if (state.cells[index] === EMPTY) moves.push(index);
    }
  }
  return moves;
}

interface Snapshot {
  index: number;
  previousBoard: number;
  previousActive: number;
  previousWinner: number;
  previousTurn: number;
  previousMoves: number;
}

/** Coloca una ficha asumiendo que la jugada es legal. Devuelve el estado previo. */
function play(state: UltimateState, index: number): Snapshot {
  const board = boardOf(index);
  const cell = cellOf(index);
  const player = state.turn;
  const snapshot: Snapshot = {
    index,
    previousBoard: state.boards[board]!,
    previousActive: state.active,
    previousWinner: state.winner,
    previousTurn: state.turn,
    previousMoves: state.moves,
  };

  state.cells[index] = player;
  const local = localWinner(state.cells, board);
  if (local !== EMPTY) state.boards[board] = local;

  if (findWinningLine(state.boards, player)) {
    state.winner = player;
  } else if (state.boards.every((value) => value !== EMPTY)) {
    state.winner = DRAW;
  }

  state.moves += 1;
  state.active = state.winner === EMPTY && state.boards[cell] === EMPTY ? cell : ANY_BOARD;
  state.turn = player === AI ? HUMAN : AI;

  return snapshot;
}

function undo(state: UltimateState, snapshot: Snapshot): void {
  state.cells[snapshot.index] = EMPTY;
  state.boards[boardOf(snapshot.index)] = snapshot.previousBoard;
  state.active = snapshot.previousActive;
  state.winner = snapshot.previousWinner;
  state.turn = snapshot.previousTurn;
  state.moves = snapshot.previousMoves;
}

/** Aplica una jugada. Devuelve false y no modifica nada si no es legal. */
export function applyMove(state: UltimateState, index: number): boolean {
  if (state.turn !== HUMAN && state.turn !== AI) return false;
  if (!isLegal(state, index)) return false;
  play(state, index);
  return true;
}

function hasImmediateLocalWin(cells: readonly number[], board: number, player: number): boolean {
  const offset = board * CELLS_PER_BOARD;
  for (const line of LINES) {
    let marks = 0;
    let empties = 0;
    let blocked = false;
    for (const cell of line) {
      const value = cells[offset + cell]!;
      if (value === player) marks += 1;
      else if (value === EMPTY) empties += 1;
      else {
        blocked = true;
        break;
      }
    }
    if (!blocked && marks === 2 && empties === 1) return true;
  }
  return false;
}

function countFreeCells(state: UltimateState): number {
  let count = 0;
  for (const board of availableBoards(state)) {
    const offset = board * CELLS_PER_BOARD;
    for (let cell = 0; cell < CELLS_PER_BOARD; cell += 1) {
      if (state.cells[offset + cell] === EMPTY) count += 1;
    }
  }
  return count;
}

const LINE_POTENTIAL: readonly number[] = [0, 7, 62];
const BOARD_WEIGHT = 120;

/** Evaluación estática desde el punto de vista de la IA. */
function evaluate(state: UltimateState): number {
  let score = 0;

  for (const line of LINES) {
    let ai = 0;
    let human = 0;
    for (const board of line) {
      const owner = state.boards[board]!;
      if (owner === AI) ai += 1;
      else if (owner === HUMAN) human += 1;
    }
    if (human === 0 && ai > 0) score += LINE_POTENTIAL[ai] ?? 100;
    else if (ai === 0 && human > 0) score -= (LINE_POTENTIAL[human] ?? 100) * 1.3;
  }

  for (let board = 0; board < BOARD_COUNT; board += 1) {
    const owner = state.boards[board]!;
    if (owner === AI) {
      score += BOARD_WEIGHT;
      continue;
    }
    if (owner === HUMAN) {
      score -= BOARD_WEIGHT * 1.15;
      continue;
    }

    const offset = board * CELLS_PER_BOARD;
    for (const line of LINES) {
      let ai = 0;
      let human = 0;
      for (const cell of line) {
        const value = state.cells[offset + cell]!;
        if (value === AI) ai += 1;
        else if (value === HUMAN) human += 1;
      }
      if (human === 0 && ai === 2) score += 16;
      else if (ai === 0 && human === 2) score -= 21;
      else if (human === 0 && ai === 1) score += 2;
      else if (ai === 0 && human === 1) score -= 3;
    }

    const center = state.cells[offset + 4]!;
    if (center === AI) score += 5;
    else if (center === HUMAN) score -= 6;
  }

  const mobility = countFreeCells(state);
  score += (state.turn === AI ? 1 : -1) * mobility * 1.5;

  return score;
}

function orderScore(state: UltimateState, index: number, player: number): number {
  const board = boardOf(index);
  const cell = cellOf(index);
  const opponent = player === AI ? HUMAN : AI;
  const offset = board * CELLS_PER_BOARD;
  let score = 0;

  for (const line of LINES_BY_CELL[cell]!) {
    let mine = 0;
    let theirs = 0;
    for (const position of line) {
      if (position === cell) continue;
      const value = state.cells[offset + position]!;
      if (value === player) mine += 1;
      else if (value === opponent) theirs += 1;
    }
    if (theirs === 0 && mine === 2) score += 900;
    else if (mine === 0 && theirs === 2) score += 480;
    else if (theirs === 0 && mine === 1) score += 12;
    else if (mine === 0 && theirs === 1) score += 8;
  }

  if (cell === 4) score += 30;
  else if (cell === 0 || cell === 2 || cell === 6 || cell === 8) score += 14;

  // Enviar al rival a un tablero donde gana de inmediato es una mala idea.
  if (state.boards[cell] === EMPTY && hasImmediateLocalWin(state.cells, cell, opponent)) {
    score -= 260;
  }
  if (state.boards[cell] !== EMPTY) score += 10;

  return score;
}

function orderedMoves(state: UltimateState): number[] {
  const player = state.turn;
  return legalMoves(state)
    .map((index) => ({ index, score: orderScore(state, index, player) }))
    .sort((first, second) => second.score - first.score)
    .map((entry) => entry.index);
}

function terminalScore(state: UltimateState, depth: number): number {
  if (state.winner === AI) return 1_000_000 + depth * 100;
  if (state.winner === HUMAN) return -1_000_000 - depth * 100;
  return 0;
}

function search(state: UltimateState, depth: number, alpha: number, beta: number): number {
  if (state.winner !== EMPTY) return terminalScore(state, depth);
  if (depth <= 0) return evaluate(state);

  const moves = orderedMoves(state);
  if (moves.length === 0) return 0;

  if (state.turn === AI) {
    let best = -Infinity;
    for (const move of moves) {
      const snapshot = play(state, move);
      const value = search(state, depth - 1, alpha, beta);
      undo(state, snapshot);
      if (value > best) best = value;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const snapshot = play(state, move);
    const value = search(state, depth - 1, alpha, beta);
    undo(state, snapshot);
    if (value < best) best = value;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Mejor jugada de la IA con poda alfa-beta. Asume que es el turno de la IA;
 * devuelve -1 si la partida terminó o no hay jugadas.
 */
export function chooseAiMove(state: UltimateState, depth = 4): number {
  if (state.winner !== EMPTY || state.turn !== AI) return -1;
  const moves = orderedMoves(state);
  if (moves.length === 0) return -1;

  let bestMove = moves[0]!;
  let bestValue = -Infinity;
  let alpha = -Infinity;

  for (const move of moves) {
    const snapshot = play(state, move);
    const value = search(state, depth - 1, alpha, Infinity);
    undo(state, snapshot);
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
    if (value > alpha) alpha = value;
  }

  return bestMove;
}

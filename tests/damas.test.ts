import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/games/engine/math';
import {
  AI,
  AI_KING,
  AI_MAN,
  EMPTY,
  HUMAN,
  HUMAN_KING,
  HUMAN_MAN,
  SIZE,
  applyMove,
  chooseAiMove,
  countPieces,
  createInitialBoard,
  emptyBoard,
  evaluateBoard,
  generateMoves,
  getWinner,
  indexOf,
  rowOf,
  type Board,
  type Move,
} from '../src/games/damas/logic';

function boardWith(pieces: readonly [number, number, number][]): Board {
  const board = emptyBoard();
  for (const [row, column, piece] of pieces) board[indexOf(row, column)] = piece;
  return board;
}

function sameMove(a: Move, b: Move): boolean {
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.path.length === b.path.length &&
    a.path.every((square, index) => square === b.path[index]) &&
    a.captures.length === b.captures.length &&
    a.captures.every((square, index) => square === b.captures[index])
  );
}

describe('damas', () => {
  it('coloca la posición inicial con doce peones por bando', () => {
    const board = createInitialBoard();
    expect(countPieces(board, HUMAN)).toBe(12);
    expect(countPieces(board, AI)).toBe(12);
    expect(board.filter((piece) => piece !== EMPTY)).toHaveLength(24);
  });

  it('genera los siete movimientos iniciales de cada bando', () => {
    const board = createInitialBoard();
    const humanMoves = generateMoves(board, HUMAN);
    const aiMoves = generateMoves(board, AI);

    expect(humanMoves).toHaveLength(7);
    expect(humanMoves.every((move) => move.captures.length === 0)).toBe(true);
    expect(humanMoves.every((move) => rowOf(move.from) === 5 && rowOf(move.to) === 4)).toBe(true);
    expect(new Set(humanMoves.map((move) => move.from))).toEqual(new Set([40, 42, 44, 46]));

    expect(aiMoves).toHaveLength(7);
    expect(aiMoves.every((move) => rowOf(move.from) === 2 && rowOf(move.to) === 3)).toBe(true);
  });

  it('respeta la dirección de los peones y de las damas', () => {
    const men = boardWith([
      [4, 4, HUMAN_MAN],
      [5, 5, AI_MAN],
    ]);
    const moves = generateMoves(men, HUMAN);
    expect(moves).toHaveLength(2);
    expect(moves.every((move) => move.captures.length === 0)).toBe(true);
    expect(new Set(moves.map((move) => move.to))).toEqual(new Set([indexOf(3, 3), indexOf(3, 5)]));

    const king = boardWith([[4, 4, HUMAN_KING]]);
    const kingMoves = generateMoves(king, HUMAN);
    expect(kingMoves).toHaveLength(4);
    expect(new Set(kingMoves.map((move) => move.to))).toEqual(
      new Set([indexOf(3, 3), indexOf(3, 5), indexOf(5, 3), indexOf(5, 5)]),
    );
  });

  it('obliga a capturar cuando existe una captura', () => {
    const board = boardWith([
      [4, 3, HUMAN_MAN],
      [3, 4, AI_MAN],
      [6, 0, HUMAN_MAN],
    ]);

    const moves = generateMoves(board, HUMAN);
    expect(moves).toHaveLength(1);
    expect(moves[0]!.from).toBe(indexOf(4, 3));
    expect(moves[0]!.to).toBe(indexOf(2, 5));
    expect(moves[0]!.captures).toEqual([indexOf(3, 4)]);
    expect(moves[0]!.path).toEqual([indexOf(2, 5)]);
  });

  it('encadena capturas múltiples y corona al terminar', () => {
    const board = boardWith([
      [6, 1, HUMAN_MAN],
      [5, 2, AI_MAN],
      [3, 4, AI_MAN],
      [1, 6, AI_MAN],
    ]);

    const moves = generateMoves(board, HUMAN);
    expect(moves).toHaveLength(1);

    const move = moves[0]!;
    expect(move.from).toBe(indexOf(6, 1));
    expect(move.to).toBe(indexOf(0, 7));
    expect(move.path).toEqual([indexOf(4, 3), indexOf(2, 5), indexOf(0, 7)]);
    expect(move.captures).toEqual([indexOf(5, 2), indexOf(3, 4), indexOf(1, 6)]);
    expect(move.promotion).toBe(true);

    const after = applyMove(board, move);
    expect(after[indexOf(6, 1)]).toBe(EMPTY);
    expect(after[indexOf(5, 2)]).toBe(EMPTY);
    expect(after[indexOf(3, 4)]).toBe(EMPTY);
    expect(after[indexOf(1, 6)]).toBe(EMPTY);
    expect(after[indexOf(0, 7)]).toBe(HUMAN_KING);
    expect(countPieces(after, AI)).toBe(0);
    expect(getWinner(after, AI)).toBe(HUMAN);
  });

  it('las damas capturan en ambas direcciones', () => {
    const board = boardWith([
      [4, 4, HUMAN_KING],
      [3, 3, AI_MAN],
      [5, 5, AI_MAN],
    ]);

    const moves = generateMoves(board, HUMAN);
    expect(moves).toHaveLength(2);
    expect(moves.every((move) => move.captures.length === 1)).toBe(true);
    expect(new Set(moves.map((move) => move.to))).toEqual(new Set([indexOf(2, 2), indexOf(6, 6)]));
  });

  it('corona a un peón que alcanza la última fila', () => {
    const board = boardWith([
      [1, 2, HUMAN_MAN],
      [2, 3, HUMAN_MAN],
    ]);
    const moves = generateMoves(board, HUMAN);

    const promoting = moves.find((move) => move.from === indexOf(1, 2))!;
    const staying = moves.find((move) => move.from === indexOf(2, 3))!;
    expect(promoting.promotion).toBe(true);
    expect(staying.promotion).toBe(false);

    const after = applyMove(board, promoting);
    expect(after[promoting.to]).toBe(HUMAN_KING);

    const aiBoard = boardWith([[6, 5, AI_MAN]]);
    const aiMoves = generateMoves(aiBoard, AI);
    expect(aiMoves).toHaveLength(2);
    expect(aiMoves.every((move) => move.promotion)).toBe(true);
    expect(applyMove(aiBoard, aiMoves[0]!)[aiMoves[0]!.to]).toBe(AI_KING);
  });

  it('detecta la victoria por piezas y por falta de movimientos', () => {
    expect(getWinner(boardWith([[3, 3, HUMAN_MAN]]), AI)).toBe(HUMAN);
    expect(getWinner(boardWith([[3, 3, AI_MAN]]), HUMAN)).toBe(AI);

    const blocked = boardWith([
      [0, 1, HUMAN_MAN],
      [7, 6, AI_MAN],
    ]);
    expect(generateMoves(blocked, HUMAN)).toHaveLength(0);
    expect(getWinner(blocked, HUMAN)).toBe(AI);

    expect(getWinner(createInitialBoard(), HUMAN)).toBeNull();
    expect(getWinner(createInitialBoard(), AI)).toBeNull();
  });

  it('la IA devuelve una jugada legal y aplica la captura disponible', () => {
    const board = createInitialBoard();
    const legal = generateMoves(board, AI);
    const move = chooseAiMove(board, 4, mulberry32(17));

    expect(move).not.toBeNull();
    expect(legal.some((candidate) => sameMove(candidate, move!))).toBe(true);

    const after = applyMove(board, move!);
    expect(countPieces(after, AI)).toBe(12);
    expect(countPieces(after, HUMAN)).toBe(12);

    const captureBoard = boardWith([
      [1, 2, AI_MAN],
      [2, 3, HUMAN_MAN],
    ]);
    const capture = chooseAiMove(captureBoard, 4, mulberry32(5));
    expect(capture).not.toBeNull();
    expect(capture!.from).toBe(indexOf(1, 2));
    expect(capture!.captures).toEqual([indexOf(2, 3)]);
    expect(capture!.to).toBe(indexOf(3, 4));
    expect(getWinner(applyMove(captureBoard, capture!), HUMAN)).toBe(AI);
  });

  it('la evaluación favorece el material y el avance', () => {
    const balanced = createInitialBoard();
    expect(evaluateBoard(balanced, AI) + evaluateBoard(balanced, HUMAN)).toBe(0);

    const extra = boardWith([
      [4, 4, AI_MAN],
      [3, 3, HUMAN_MAN],
      [1, 1, AI_MAN],
    ]);
    expect(evaluateBoard(extra, AI)).toBeGreaterThan(0);
    expect(evaluateBoard(extra, HUMAN)).toBeLessThan(0);

    const advanced = boardWith([
      [6, 1, AI_MAN],
      [1, 2, AI_MAN],
    ]);
    expect(evaluateBoard(advanced, AI)).toBeGreaterThan(0);
    expect(SIZE).toBe(8);
  });
});

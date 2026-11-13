import { describe, expect, it } from 'vitest';
import {
  AI,
  EMPTY,
  HUMAN,
  NO_PLAYER,
  SIZE,
  applyMove,
  chooseAiMove,
  countDiscs,
  createBoard,
  isGameOver,
  isLegalMove,
  legalMoves,
  nextPlayer,
  opponent,
  parseBoard,
  winner,
} from '../src/games/reversi/logic';

function fullRows(symbol: string): string[] {
  return Array.from({ length: SIZE }, () => symbol.repeat(SIZE));
}

describe('reversi', () => {
  it('monta la posición inicial clásica con negras al turno', () => {
    const board = createBoard();
    expect(countDiscs(board)).toEqual({ human: 2, ai: 2, empty: 60 });
    expect(board[3 * SIZE + 3]).toBe(AI);
    expect(board[3 * SIZE + 4]).toBe(HUMAN);
    expect(board[4 * SIZE + 3]).toBe(HUMAN);
    expect(board[4 * SIZE + 4]).toBe(AI);
    expect(legalMoves(board, HUMAN)).toHaveLength(4);
    expect(legalMoves(board, AI)).toHaveLength(4);
    expect(isLegalMove(board, 3 * SIZE + 2, HUMAN)).toBe(true);
    expect(isLegalMove(board, 0, HUMAN)).toBe(false);
  });

  it('voltea fichas en las ocho direcciones a la vez', () => {
    const board = parseBoard([
      '........',
      '.B.B.B..',
      '..WWW...',
      '.BW.WB..',
      '..WWW...',
      '.B.B.B..',
      '........',
      '........',
    ]);

    const center = 3 * SIZE + 3;
    const result = applyMove(board, center, HUMAN);
    expect(result).not.toBeNull();

    const flipped = [...result!.flipped].sort((left, right) => left - right);
    expect(flipped).toHaveLength(8);
    expect(flipped).toEqual([18, 19, 20, 26, 28, 34, 35, 36]);
    expect(result!.board[center]).toBe(HUMAN);
    for (const index of flipped) expect(result!.board[index]).toBe(HUMAN);
    expect(countDiscs(result!.board)).toEqual({ human: 17, ai: 0, empty: 47 });
  });

  it('rechaza jugadas ilegales o sobre una casilla ocupada', () => {
    const board = createBoard();
    expect(applyMove(board, 0, HUMAN)).toBeNull();
    expect(applyMove(board, 3 * SIZE + 3, HUMAN)).toBeNull();
    expect(applyMove(board, -1, HUMAN)).toBeNull();
    expect(applyMove(board, 64, HUMAN)).toBeNull();
  });

  it('pasa el turno cuando el rival no tiene jugadas', () => {
    const rows = fullRows('B');
    rows[0] = '.WBBBBBB';
    const board = parseBoard(rows);

    expect(countDiscs(board)).toEqual({ human: 62, ai: 1, empty: 1 });
    expect(legalMoves(board, AI)).toHaveLength(0);
    expect(legalMoves(board, HUMAN)).toEqual([0]);
    expect(nextPlayer(board, HUMAN)).toBe(HUMAN);
    expect(isGameOver(board)).toBe(false);

    const result = applyMove(board, 0, HUMAN);
    expect(result).not.toBeNull();
    expect(result!.flipped).toEqual([1]);
    expect(countDiscs(result!.board)).toEqual({ human: 64, ai: 0, empty: 0 });
    expect(isGameOver(result!.board)).toBe(true);
    expect(nextPlayer(result!.board, HUMAN)).toBe(NO_PLAYER);
    expect(winner(result!.board)).toBe(HUMAN);
  });

  it('cierra la partida y decide por número de fichas', () => {
    const draw = parseBoard([
      'BBBBWWWW',
      'BBBBWWWW',
      'BBBBWWWW',
      'BBBBWWWW',
      'WWWWBBBB',
      'WWWWBBBB',
      'WWWWBBBB',
      'WWWWBBBB',
    ]);
    expect(countDiscs(draw)).toEqual({ human: 32, ai: 32, empty: 0 });
    expect(isGameOver(draw)).toBe(true);
    expect(winner(draw)).toBe(EMPTY);

    const whites = parseBoard(fullRows('W'));
    expect(isGameOver(whites)).toBe(true);
    expect(winner(whites)).toBe(AI);

    const blacks = parseBoard(fullRows('B'));
    expect(winner(blacks)).toBe(HUMAN);
    expect(nextPlayer(blacks, AI)).toBe(NO_PLAYER);
  });

  it('la IA devuelve siempre una jugada legal', () => {
    let board = createBoard();
    let player = HUMAN;

    for (let ply = 0; ply < 12; ply += 1) {
      let moves = legalMoves(board, player);
      if (moves.length === 0) {
        player = opponent(player);
        moves = legalMoves(board, player);
        if (moves.length === 0) break;
      }

      if (player === AI) {
        const move = chooseAiMove(board, 4);
        expect(moves).toContain(move);
        const result = applyMove(board, move, AI);
        expect(result).not.toBeNull();
        board = result!.board;
      } else {
        const move = moves[0]!;
        const result = applyMove(board, move, HUMAN);
        expect(result).not.toBeNull();
        board = result!.board;
      }

      player = opponent(player);
    }

    expect(chooseAiMove(parseBoard(fullRows('B')), 4)).toBe(-1);
  });
});

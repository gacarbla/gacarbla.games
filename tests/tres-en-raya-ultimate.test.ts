import { describe, expect, it } from 'vitest';
import {
  AI,
  ANY_BOARD,
  DRAW,
  EMPTY,
  HUMAN,
  applyMove,
  boardOf,
  chooseAiMove,
  cloneState,
  createState,
  findWinningLine,
  globalIndex,
  isLegal,
  legalMoves,
  localWinner,
} from '../src/games/tres-en-raya-ultimate/logic';

describe('tres en raya definitivo', () => {
  it('empieza con los nueve tableros libres y el tablero activo manda', () => {
    const state = createState();
    expect(state.active).toBe(ANY_BOARD);
    expect(legalMoves(state)).toHaveLength(81);

    expect(applyMove(state, globalIndex(4, 4))).toBe(true);
    expect(state.active).toBe(4);
    expect(state.turn).toBe(AI);
    expect(isLegal(state, globalIndex(4, 0))).toBe(true);
    expect(isLegal(state, globalIndex(3, 0))).toBe(false);
    expect(applyMove(state, globalIndex(3, 0))).toBe(false);
    expect(legalMoves(state).every((index) => boardOf(index) === 4)).toBe(true);
  });

  it('libera la elección cuando el tablero de destino ya está cerrado', () => {
    const state = createState();
    state.boards[5] = DRAW;
    state.active = 0;
    state.turn = HUMAN;

    expect(applyMove(state, globalIndex(0, 5))).toBe(true);
    expect(state.active).toBe(ANY_BOARD);
    expect(isLegal(state, globalIndex(8, 8))).toBe(true);
    expect(isLegal(state, globalIndex(5, 0))).toBe(false);
  });

  it('conquista un tablero local con tres en línea', () => {
    const state = createState();
    for (const cell of [0, 1, 2]) {
      state.active = 0;
      state.turn = HUMAN;
      expect(applyMove(state, globalIndex(0, cell))).toBe(true);
    }

    expect(localWinner(state.cells, 0)).toBe(HUMAN);
    expect(state.boards[0]).toBe(HUMAN);
    expect(isLegal(state, globalIndex(0, 4))).toBe(false);
  });

  it('declara la victoria al completar tres tableros locales en línea', () => {
    const partial = new Array<number>(9).fill(EMPTY);
    partial[0] = HUMAN;
    partial[1] = HUMAN;
    expect(findWinningLine(partial, HUMAN)).toBeNull();

    const state = createState();
    state.boards[0] = HUMAN;
    state.boards[1] = HUMAN;
    for (let cell = 0; cell < 3; cell += 1) {
      state.cells[cell] = HUMAN;
      state.cells[9 + cell] = HUMAN;
    }
    state.cells[18] = HUMAN;
    state.cells[19] = HUMAN;
    state.active = 2;
    state.turn = HUMAN;

    expect(applyMove(state, globalIndex(2, 2))).toBe(true);
    expect(state.boards[2]).toBe(HUMAN);
    expect(state.winner).toBe(HUMAN);
    expect(findWinningLine(state.boards, HUMAN)).toEqual([0, 1, 2]);
    expect(legalMoves(state)).toHaveLength(0);
  });

  it('declara el empate cuando los nueve tableros quedan cerrados', () => {
    const state = createState();
    for (let board = 0; board < 8; board += 1) state.boards[board] = DRAW;
    const pattern = [HUMAN, AI, HUMAN, HUMAN, AI, AI, AI, HUMAN, EMPTY];
    for (let cell = 0; cell < 8; cell += 1) state.cells[globalIndex(8, cell)] = pattern[cell]!;
    state.active = 8;
    state.turn = HUMAN;

    expect(applyMove(state, globalIndex(8, 8))).toBe(true);
    expect(state.boards[8]).toBe(DRAW);
    expect(state.winner).toBe(DRAW);
  });

  it('la IA devuelve una jugada legal y no altera el estado', () => {
    const state = createState();
    state.turn = AI;

    const move = chooseAiMove(state, 4);
    expect(move).toBeGreaterThanOrEqual(0);
    expect(isLegal(state, move)).toBe(true);
    expect(state.moves).toBe(0);
    expect(state.active).toBe(ANY_BOARD);
    expect(state.cells.every((value) => value === EMPTY)).toBe(true);
  });

  it('la IA remata su propia línea global', () => {
    const state = createState();
    state.boards[0] = AI;
    state.boards[1] = AI;
    for (let cell = 0; cell < 3; cell += 1) {
      state.cells[cell] = AI;
      state.cells[9 + cell] = AI;
    }
    state.cells[18] = AI;
    state.cells[19] = AI;
    state.active = 2;
    state.turn = AI;

    const move = chooseAiMove(state, 4);
    expect(move).toBe(globalIndex(2, 2));
    expect(state.winner).toBe(EMPTY);
    expect(applyMove(state, move)).toBe(true);
    expect(state.winner).toBe(AI);
  });

  it('la IA evita entregar una victoria inmediata al jugador', () => {
    const state = createState();
    state.boards[0] = HUMAN;
    state.boards[1] = HUMAN;
    for (let cell = 0; cell < 3; cell += 1) {
      state.cells[cell] = HUMAN;
      state.cells[9 + cell] = HUMAN;
    }
    state.cells[18] = HUMAN;
    state.cells[19] = HUMAN;
    state.active = 2;
    state.turn = AI;

    const move = chooseAiMove(state, 4);
    expect(isLegal(state, move)).toBe(true);
    expect(applyMove(state, move)).toBe(true);
    expect(state.winner).toBe(EMPTY);

    for (const reply of legalMoves(state)) {
      const copy = cloneState(state);
      expect(applyMove(copy, reply) && copy.winner === HUMAN).toBe(false);
    }
  });

  it('una partida completa siempre termina con un resultado válido', () => {
    const state = createState();
    let ply = 0;

    while (state.winner === EMPTY && ply < 120) {
      const moves = legalMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      const move = moves[(ply * 17) % moves.length]!;
      expect(applyMove(state, move)).toBe(true);
      ply += 1;
    }

    expect(ply).toBeLessThanOrEqual(81);
    expect([HUMAN, AI, DRAW]).toContain(state.winner);
  });

  it('la IA responde turno tras turno sin producir jugadas ilegales', () => {
    const state = createState();
    let ply = 0;

    while (state.winner === EMPTY && ply < 90) {
      const moves = legalMoves(state);
      expect(moves.length).toBeGreaterThan(0);

      if (state.turn === HUMAN) {
        expect(applyMove(state, moves[0]!)).toBe(true);
      } else {
        const move = chooseAiMove(state, 2);
        expect(isLegal(state, move)).toBe(true);
        expect(applyMove(state, move)).toBe(true);
      }
      ply += 1;
    }

    expect(ply).toBeLessThanOrEqual(81);
    expect([HUMAN, AI, DRAW]).toContain(state.winner);
  });
});

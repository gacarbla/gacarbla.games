import { describe, expect, it } from 'vitest';
import {
  PIECE_KINDS,
  TETROMINO_LEVELS,
  analyzeTiling,
  applyPlacement,
  canPlace,
  emptyGrid,
  isGridFull,
  pieceCells,
  pieceSize,
  placementCells,
} from '../src/games/tetromino/logic';

describe('tetromino', () => {
  it('define cinco niveles con cinco piezas y veinte celdas', () => {
    expect(TETROMINO_LEVELS).toHaveLength(5);
    for (const level of TETROMINO_LEVELS) {
      expect(level.pieces).toHaveLength(5);
      expect(level.cols * level.rows).toBe(20);
      expect([
        [4, 5],
        [5, 4],
      ]).toContainEqual([level.cols, level.rows]);
      for (const kind of level.pieces) {
        expect(PIECE_KINDS).toContain(kind);
        expect(pieceCells(kind, 0)).toHaveLength(4);
      }
    }
  });

  it('las soluciones cubren el tablero exactamente y sin solapes', () => {
    for (const level of TETROMINO_LEVELS) {
      const report = analyzeTiling(level, level.solution);
      expect(report.overlaps).toBe(0);
      expect(report.outOfBounds).toBe(0);
      expect(report.duplicateSlots).toBe(0);
      expect(report.unusedSlots).toEqual([]);
      expect(report.covered).toBe(20);
      expect(report.complete).toBe(true);

      const occupied = new Array<number>(level.cols * level.rows).fill(0);
      for (const placement of level.solution) {
        const kind = level.pieces[placement.slot]!;
        const cells = placementCells(kind, placement);
        expect(cells).toHaveLength(4);
        for (const cell of cells) {
          const index = cell.y * level.cols + cell.x;
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(occupied.length);
          expect(occupied[index]).toBe(0);
          occupied[index] = 1;
        }
      }
      expect(occupied.every((value) => value === 1)).toBe(true);
    }
  });

  it('rechaza soluciones manipuladas o incompletas', () => {
    const level = TETROMINO_LEVELS[0]!;

    const shifted = level.solution.map((placement, index) =>
      index === 0 ? { ...placement, x: placement.x + 1 } : { ...placement },
    );
    expect(analyzeTiling(level, shifted).complete).toBe(false);

    const incomplete = level.solution.slice(0, 4);
    const incompleteReport = analyzeTiling(level, incomplete);
    expect(incompleteReport.complete).toBe(false);
    expect(incompleteReport.unusedSlots).toEqual([4]);

    const duplicated = [...level.solution, { ...level.solution[0]! }];
    const duplicatedReport = analyzeTiling(level, duplicated);
    expect(duplicatedReport.complete).toBe(false);
    expect(duplicatedReport.duplicateSlots).toBe(1);
    expect(duplicatedReport.overlaps).toBeGreaterThan(0);

    const outside = level.solution.map((placement, index) =>
      index === 0 ? { ...placement, y: level.rows - 1 } : { ...placement },
    );
    const outsideReport = analyzeTiling(level, outside);
    expect(outsideReport.complete).toBe(false);
    expect(outsideReport.outOfBounds).toBeGreaterThan(0);
  });

  it('valida colocaciones sueltas sobre la rejilla', () => {
    const level = TETROMINO_LEVELS[1]!;
    const empty = emptyGrid(level);
    expect(canPlace(level, empty, 'O', 0, 0, 0)).toBe(true);
    expect(canPlace(level, empty, 'I', 0, 0, 0)).toBe(true);
    expect(canPlace(level, empty, 'I', 1, 0, 0)).toBe(false);
    expect(canPlace(level, empty, 'I', 0, 0, 1)).toBe(true);
    expect(canPlace(level, empty, 'I', 0, 2, 1)).toBe(false);

    const placed = applyPlacement(level, empty, 0, 0, 0, 0);
    expect(placed).not.toBeNull();
    expect(canPlace(level, placed!, 'O', 0, 0, 0)).toBe(false);
    expect(canPlace(level, placed!, 'O', 2, 0, 0)).toBe(true);
    expect(isGridFull(empty)).toBe(false);
  });

  it('reconstruye un tablero lleno colocando la solución paso a paso', () => {
    for (const level of TETROMINO_LEVELS) {
      let owners = emptyGrid(level);
      for (const placement of level.solution) {
        const next = applyPlacement(
          level,
          owners,
          placement.slot,
          placement.x,
          placement.y,
          placement.rotation,
        );
        expect(next).not.toBeNull();
        owners = next!;
      }
      expect(isGridFull(owners)).toBe(true);
    }
  });

  it('gira las piezas de cuatro en cuatro sin perder celdas', () => {
    for (const kind of PIECE_KINDS) {
      const base = pieceCells(kind, 0);
      expect(base).toHaveLength(4);
      expect(new Set(base.map((cell) => `${cell.x},${cell.y}`)).size).toBe(4);
      expect(pieceCells(kind, 4)).toEqual(base);
      expect(pieceCells(kind, -1)).toEqual(pieceCells(kind, 3));
      expect(Math.min(...base.map((cell) => cell.x))).toBe(0);
      expect(Math.min(...base.map((cell) => cell.y))).toBe(0);
    }

    expect(pieceSize('I', 0)).toEqual({ width: 4, height: 1 });
    expect(pieceSize('I', 1)).toEqual({ width: 1, height: 4 });
    expect(pieceSize('O', 2)).toEqual({ width: 2, height: 2 });
  });
});

import { describe, expect, it } from 'vitest';
import {
  BATTLESHIPS_LEVELS,
  BATTLESHIPS_SIZE,
  FLEET_CELLS,
  cellsFromShips,
  columnCounts,
  emptyGrid,
  expectedFleetCounts,
  extractShips,
  gridIndex,
  isShipInside,
  rowCounts,
  validateBattleships,
  type ExtractedShip,
} from '../src/games/battleships/logic';

const TARGET_FLEET = expectedFleetCounts();

function actualFleet(ships: readonly { length: number }[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const ship of ships) {
    counts[ship.length] = (counts[ship.length] ?? 0) + 1;
  }
  return counts;
}

function touchingPairs(ships: readonly ExtractedShip[]): number {
  const shipAt = new Map<number, number>();
  ships.forEach((ship, index) => {
    for (const cell of ship.cells) shipAt.set(cell, index);
  });

  let touches = 0;
  for (const ship of ships) {
    for (const cell of ship.cells) {
      const row = Math.floor(cell / BATTLESHIPS_SIZE);
      const column = cell % BATTLESHIPS_SIZE;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          const nextRow = row + rowOffset;
          const nextColumn = column + columnOffset;
          if (
            nextRow < 0 ||
            nextRow >= BATTLESHIPS_SIZE ||
            nextColumn < 0 ||
            nextColumn >= BATTLESHIPS_SIZE
          ) {
            continue;
          }
          const next = gridIndex(nextRow, nextColumn);
          const owner = shipAt.get(next);
          if (owner !== undefined && owner !== shipAt.get(cell)) touches += 1;
        }
      }
    }
  }
  return touches;
}

describe('battleships', () => {
  it('define cinco niveles de 8×8 con la flota completa y conteos coherentes', () => {
    expect(BATTLESHIPS_LEVELS).toHaveLength(5);
    expect(FLEET_CELLS).toBe(20);

    for (const level of BATTLESHIPS_LEVELS) {
      expect(level.ships).toHaveLength(10);
      expect(level.rows).toHaveLength(BATTLESHIPS_SIZE);
      expect(level.columns).toHaveLength(BATTLESHIPS_SIZE);
      expect(level.rows.reduce((total, value) => total + value, 0)).toBe(FLEET_CELLS);
      expect(level.columns.reduce((total, value) => total + value, 0)).toBe(FLEET_CELLS);
      for (const ship of level.ships) expect(isShipInside(ship)).toBe(true);

      const cells = cellsFromShips(level.ships);
      expect(cells.filter(Boolean)).toHaveLength(FLEET_CELLS);
      expect(rowCounts(cells)).toEqual([...level.rows]);
      expect(columnCounts(cells)).toEqual([...level.columns]);

      const result = validateBattleships(cells, level);
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    }
  });

  it('la solución de cada nivel cumple flota, conteos y no adyacencia', () => {
    for (const level of BATTLESHIPS_LEVELS) {
      const cells = cellsFromShips(level.ships);
      const ships = extractShips(cells);

      expect(ships).toHaveLength(10);
      expect(actualFleet(ships)).toEqual(TARGET_FLEET);
      expect(ships.every((ship) => ship.straight)).toBe(true);
      expect(ships.every((ship) => ship.length >= 1 && ship.length <= 4)).toBe(true);
      expect(ships.reduce((total, ship) => total + ship.cells.length, 0)).toBe(FLEET_CELLS);
      expect(touchingPairs(ships)).toBe(0);
    }
  });

  it('acepta la solución y rechaza una colocación incompleta', () => {
    const level = BATTLESHIPS_LEVELS[0]!;
    const solution = cellsFromShips(level.ships);
    expect(validateBattleships(solution, level).valid).toBe(true);

    const missing = [...solution];
    const removed = missing.findIndex((cell) => cell === true);
    expect(removed).toBeGreaterThanOrEqual(0);
    missing[removed] = false;
    const missingResult = validateBattleships(missing, level);
    expect(missingResult.valid).toBe(false);
    expect(missingResult.issues.length).toBeGreaterThan(0);
    expect(missingResult.rowErrors.some(Boolean) || missingResult.columnErrors.some(Boolean)).toBe(
      true,
    );

    const isolated = emptyGrid();
    isolated[gridIndex(7, 7)] = true;
    const isolatedResult = validateBattleships(isolated, level);
    expect(isolatedResult.valid).toBe(false);
    expect(isolatedResult.issues.length).toBeGreaterThan(0);
  });

  it('rechaza barcos adyacentes y formas no rectas', () => {
    const level = BATTLESHIPS_LEVELS[0]!;

    const adjacent = cellsFromShips(level.ships);
    adjacent[gridIndex(1, 4)] = true;
    const adjacentResult = validateBattleships(adjacent, level);
    expect(adjacentResult.valid).toBe(false);
    expect(adjacentResult.issues.some((issue) => issue.includes('tocan'))).toBe(true);
    expect(adjacentResult.invalidCells.length).toBeGreaterThan(0);

    const lShape = emptyGrid();
    lShape[gridIndex(0, 0)] = true;
    lShape[gridIndex(1, 0)] = true;
    lShape[gridIndex(1, 1)] = true;
    const shapeResult = validateBattleships(lShape, level);
    expect(shapeResult.valid).toBe(false);
    expect(shapeResult.ships.some((ship) => !ship.straight)).toBe(true);
    expect(shapeResult.issues.some((issue) => issue.includes('recta'))).toBe(true);
  });

  it('calcula los conteos de filas y columnas', () => {
    const cells = emptyGrid();
    cells[gridIndex(2, 3)] = true;
    cells[gridIndex(2, 5)] = true;
    cells[gridIndex(6, 3)] = true;

    expect(rowCounts(cells)).toEqual([0, 0, 2, 0, 0, 0, 1, 0]);
    expect(columnCounts(cells)).toEqual([0, 0, 0, 2, 0, 1, 0, 0]);
    expect(extractShips(cells)).toHaveLength(3);
  });
});

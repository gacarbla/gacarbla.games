import { describe, expect, it } from 'vitest';
import {
  AKARI_CELLS,
  AKARI_LEVELS,
  AKARI_SIZE,
  bulbsFromIndices,
  conflictMask,
  countBulbs,
  isSolved,
  isWallAt,
  lightFrom,
  litMask,
  toggleBulb,
  wallsOf,
  whiteCells,
} from '../src/games/akari/logic';

describe('akari', () => {
  it('define seis niveles de 7 × 7 con muros y celdas blancas', () => {
    expect(AKARI_LEVELS).toHaveLength(6);

    for (const level of AKARI_LEVELS) {
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.rows).toHaveLength(AKARI_SIZE);
      const joined = level.rows.join('');
      expect(joined).toHaveLength(AKARI_CELLS);
      expect(/^[.#]+$/.test(joined)).toBe(true);
      expect(joined).toContain('#');
      expect(joined).toContain('.');
    }
  });

  it('la solución conocida de cada nivel cumple todas las reglas', () => {
    for (const level of AKARI_LEVELS) {
      const bulbs = bulbsFromIndices(level, level.solution);
      expect(countBulbs(bulbs)).toBe(level.solution.length);

      for (const index of level.solution) {
        expect(isWallAt(level, index)).toBe(false);
      }

      expect(conflictMask(level, bulbs).some(Boolean)).toBe(false);

      const lit = litMask(level, bulbs);
      for (const index of whiteCells(level)) {
        expect(lit[index]).toBe(true);
      }

      expect(isSolved(level, bulbs)).toBe(true);
    }
  });

  it('el tablero inicial de cada nivel no está resuelto', () => {
    for (const level of AKARI_LEVELS) {
      const empty = bulbsFromIndices(level, []);
      expect(countBulbs(empty)).toBe(0);
      expect(litMask(level, empty).some(Boolean)).toBe(false);
      expect(isSolved(level, empty)).toBe(false);
    }
  });

  it('rechaza soluciones incompletas o con bombillas sobre muros', () => {
    for (const level of AKARI_LEVELS) {
      const solution = bulbsFromIndices(level, level.solution);
      const incomplete = bulbsFromIndices(level, level.solution.slice(0, -1));
      expect(countBulbs(incomplete)).toBe(level.solution.length - 1);
      expect(isSolved(level, incomplete)).toBe(false);

      const withWall = [...solution];
      const wallIndex = wallsOf(level).findIndex(Boolean);
      expect(wallIndex).toBeGreaterThanOrEqual(0);
      withWall[wallIndex] = true;
      expect(isSolved(level, withWall)).toBe(false);
    }
  });

  it('detecta conflictos entre bombillas y respeta los muros', () => {
    const marco = AKARI_LEVELS[0]!;
    const facing = bulbsFromIndices(marco, [0, 1]);
    const conflicts = conflictMask(marco, facing);
    expect(conflicts[0]).toBe(true);
    expect(conflicts[1]).toBe(true);
    expect(isSolved(marco, facing)).toBe(false);

    const diagonal = AKARI_LEVELS[2]!;
    const separatedByWall = bulbsFromIndices(diagonal, [17, 31]);
    expect(conflictMask(diagonal, separatedByWall).some(Boolean)).toBe(false);

    const sameSegment = bulbsFromIndices(diagonal, [17, 18]);
    expect(conflictMask(diagonal, sameSegment).some(Boolean)).toBe(true);
    expect(isSolved(diagonal, sameSegment)).toBe(false);
  });

  it('la luz se detiene al llegar a un muro', () => {
    const diagonal = AKARI_LEVELS[2]!;

    const fromTop = lightFrom(diagonal, 4);
    expect(fromTop).toContain(6);
    expect(fromTop).not.toContain(0);

    const fromRight = lightFrom(diagonal, 20);
    expect(fromRight).toContain(41);
    expect(fromRight).not.toContain(48);
  });

  it('alterna bombillas solo en celdas blancas', () => {
    const level = AKARI_LEVELS[0]!;
    const empty = bulbsFromIndices(level, []);

    const once = toggleBulb(level, empty, 0);
    expect(once[0]).toBe(true);
    expect(toggleBulb(level, once, 0)[0]).toBe(false);

    const wallIndex = wallsOf(level).findIndex(Boolean);
    const onWall = toggleBulb(level, empty, wallIndex);
    expect(onWall[wallIndex]).toBe(false);
    expect(onWall).toEqual(empty);
  });
});

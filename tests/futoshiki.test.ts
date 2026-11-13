import { describe, expect, it } from 'vitest';
import {
  FUTOSHIKI_CELLS,
  FUTOSHIKI_LEVELS,
  FUTOSHIKI_SIZE,
  candidateValues,
  conflictMask,
  constraintHolds,
  countSolutions,
  isSolved,
  satisfiesConstraints,
  scoreForMistakes,
  solve,
} from '../src/games/futoshiki/logic';

function isLatinSquare(grid: readonly number[]): boolean {
  for (let row = 0; row < FUTOSHIKI_SIZE; row += 1) {
    const values = new Set<number>();
    for (let column = 0; column < FUTOSHIKI_SIZE; column += 1) {
      values.add(grid[row * FUTOSHIKI_SIZE + column]!);
    }
    if (values.size !== FUTOSHIKI_SIZE) return false;
  }
  for (let column = 0; column < FUTOSHIKI_SIZE; column += 1) {
    const values = new Set<number>();
    for (let row = 0; row < FUTOSHIKI_SIZE; row += 1) {
      values.add(grid[row * FUTOSHIKI_SIZE + column]!);
    }
    if (values.size !== FUTOSHIKI_SIZE) return false;
  }
  return true;
}

describe('futoshiki', () => {
  it('define cinco niveles 5×5 con pistas y desigualdades coherentes', () => {
    expect(FUTOSHIKI_LEVELS).toHaveLength(5);
    expect(new Set(FUTOSHIKI_LEVELS.map((level) => level.id)).size).toBe(5);

    for (const level of FUTOSHIKI_LEVELS) {
      expect(level.givens).toHaveLength(FUTOSHIKI_CELLS);
      expect(level.solution).toHaveLength(FUTOSHIKI_CELLS);
      expect(isLatinSquare(level.solution)).toBe(true);

      const givenCount = level.givens.filter((value) => value !== 0).length;
      expect(givenCount).toBeGreaterThanOrEqual(5);
      expect(givenCount).toBeLessThan(FUTOSHIKI_CELLS);
      expect(level.constraints.length).toBeGreaterThanOrEqual(4);

      for (let index = 0; index < FUTOSHIKI_CELLS; index += 1) {
        const given = level.givens[index]!;
        if (given !== 0) expect(given).toBe(level.solution[index]);
      }

      for (const restriction of level.constraints) {
        const horizontal =
          restriction.b === restriction.a + 1 &&
          Math.floor(restriction.a / FUTOSHIKI_SIZE) === Math.floor(restriction.b / FUTOSHIKI_SIZE);
        const vertical = restriction.b === restriction.a + FUTOSHIKI_SIZE;
        expect(horizontal || vertical).toBe(true);
        expect(constraintHolds(level.solution, restriction)).toBe(true);
      }

      expect(satisfiesConstraints(level, level.solution)).toBe(true);
      expect(isSolved(level, level.givens)).toBe(false);
    }
  });

  it('encuentra una única solución en cada nivel', () => {
    for (const level of FUTOSHIKI_LEVELS) {
      expect(countSolutions(level, 2)).toBe(1);
      expect(countSolutions(level, 1)).toBe(1);
      expect(solve(level)).toEqual([...level.solution]);
      expect(isSolved(level, level.solution)).toBe(true);
    }
  });

  it('distingue tableros con varias soluciones o sin solución', () => {
    const loose = {
      id: 'suelto',
      label: 'Suelto',
      givens: [1, 0, 0, 0, 0, ...Array<number>(20).fill(0)],
      constraints: [],
      solution: Array<number>(FUTOSHIKI_CELLS).fill(0),
    };
    expect(countSolutions(loose, 2)).toBe(2);
    expect(countSolutions(loose, 1)).toBe(1);

    const impossible = {
      id: 'imposible',
      label: 'Imposible',
      givens: [1, 1, 0, 0, 0, ...Array<number>(20).fill(0)],
      constraints: [],
      solution: Array<number>(FUTOSHIKI_CELLS).fill(0),
    };
    expect(countSolutions(impossible, 2)).toBe(0);
  });

  it('rechaza tableros incompletos, pistas alteradas y desigualdades incumplidas', () => {
    for (const level of FUTOSHIKI_LEVELS) {
      expect(isSolved(level, level.givens)).toBe(false);

      const rowDuplicate = [...level.solution];
      rowDuplicate[1] = rowDuplicate[0]!;
      expect(isSolved(level, rowDuplicate)).toBe(false);

      const columnDuplicate = [...level.solution];
      columnDuplicate[FUTOSHIKI_SIZE] = columnDuplicate[0]!;
      expect(isSolved(level, columnDuplicate)).toBe(false);

      const alteredGiven = [...level.solution];
      const givenIndex = level.givens.findIndex((value) => value !== 0);
      alteredGiven[givenIndex] = (alteredGiven[givenIndex]! % FUTOSHIKI_SIZE) + 1;
      expect(isSolved(level, alteredGiven)).toBe(false);

      const broken = [...level.solution];
      const restriction = level.constraints[0]!;
      [broken[restriction.a], broken[restriction.b]] = [
        broken[restriction.b]!,
        broken[restriction.a]!,
      ];
      expect(constraintHolds(broken, restriction)).toBe(false);
      expect(satisfiesConstraints(level, broken)).toBe(false);
      expect(isSolved(level, broken)).toBe(false);
    }
  });

  it('marca conflictos de fila, columna y desigualdades', () => {
    const empty = Array<number>(FUTOSHIKI_CELLS).fill(0);

    for (const level of FUTOSHIKI_LEVELS) {
      expect(conflictMask(level, level.solution).some(Boolean)).toBe(false);
      expect(conflictMask(level, empty).some(Boolean)).toBe(false);

      const rowDuplicate = [...level.solution];
      rowDuplicate[1] = rowDuplicate[0]!;
      const rowMask = conflictMask(level, rowDuplicate);
      expect(rowMask[0]).toBe(true);
      expect(rowMask[1]).toBe(true);

      const columnDuplicate = [...level.solution];
      columnDuplicate[FUTOSHIKI_SIZE] = columnDuplicate[0]!;
      const columnMask = conflictMask(level, columnDuplicate);
      expect(columnMask[0]).toBe(true);
      expect(columnMask[FUTOSHIKI_SIZE]).toBe(true);

      const broken = [...level.solution];
      const restriction = level.constraints[0]!;
      [broken[restriction.a], broken[restriction.b]] = [
        broken[restriction.b]!,
        broken[restriction.a]!,
      ];
      const brokenMask = conflictMask(level, broken);
      expect(brokenMask[restriction.a]).toBe(true);
      expect(brokenMask[restriction.b]).toBe(true);
    }
  });

  it('calcula candidatos válidos en el estado inicial', () => {
    for (const level of FUTOSHIKI_LEVELS) {
      for (let index = 0; index < FUTOSHIKI_CELLS; index += 1) {
        if (level.givens[index] !== 0) continue;
        const candidates = candidateValues(level, level.givens, index);
        expect(candidates).toContain(level.solution[index]);

        const row = Math.floor(index / FUTOSHIKI_SIZE);
        const column = index % FUTOSHIKI_SIZE;
        for (const value of candidates) {
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(FUTOSHIKI_SIZE);
          for (let offset = 0; offset < FUTOSHIKI_SIZE; offset += 1) {
            expect(level.givens[row * FUTOSHIKI_SIZE + offset]).not.toBe(value);
            expect(level.givens[offset * FUTOSHIKI_SIZE + column]).not.toBe(value);
          }
        }
      }

      const restriction = level.constraints.find((item) => item.operator === '<')!;
      const grid = Array<number>(FUTOSHIKI_CELLS).fill(0);
      grid[restriction.a] = FUTOSHIKI_SIZE;
      expect(candidateValues(level, grid, restriction.b)).toEqual([]);
    }
  });

  it('puntúa según los fallos con un suelo bajo', () => {
    expect(scoreForMistakes(0)).toBe(1000);
    expect(scoreForMistakes(1)).toBe(940);
    expect(scoreForMistakes(5)).toBe(700);
    expect(scoreForMistakes(100)).toBe(120);
    expect(scoreForMistakes(-3)).toBe(1000);

    for (let mistakes = 0; mistakes < 20; mistakes += 1) {
      expect(scoreForMistakes(mistakes + 1)).toBeLessThanOrEqual(scoreForMistakes(mistakes));
    }
  });
});

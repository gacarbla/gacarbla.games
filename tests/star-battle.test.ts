import { describe, expect, it } from 'vitest';
import {
  CELL_DISCARD,
  CELL_EMPTY,
  CELL_STAR,
  STAR_BATTLE_LEVELS,
  STAR_BATTLE_SIZE,
  conflictMask,
  hasAdjacentStars,
  isSolved,
  isValidArrangement,
  nextMark,
  regionCells,
  regionLabel,
  solutionStars,
  starProgress,
  starsFromMarks,
  type StarBattleLevel,
} from '../src/games/star-battle/logic';

function starsFromColumns(columns: readonly number[]): boolean[] {
  const stars = new Array<boolean>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(false);
  for (let row = 0; row < columns.length; row += 1) {
    const column = columns[row];
    if (column !== undefined) stars[row * STAR_BATTLE_SIZE + column] = true;
  }
  return stars;
}

function marksFromStars(stars: readonly boolean[]): number[] {
  return stars.map((star) => (star ? CELL_STAR : CELL_EMPTY));
}

function regionIsConnected(level: StarBattleLevel, label: number): boolean {
  const cells = regionCells(level, label);
  if (cells.length === 0) return false;

  const members = new Set(cells);
  const visited = new Set<number>([cells[0]!]);
  const pending = [cells[0]!];

  while (pending.length > 0) {
    const index = pending.pop()!;
    const row = Math.floor(index / STAR_BATTLE_SIZE);
    const column = index % STAR_BATTLE_SIZE;
    const neighbours = [
      [row - 1, column],
      [row + 1, column],
      [row, column - 1],
      [row, column + 1],
    ] as const;

    for (const [nextRow, nextColumn] of neighbours) {
      if (
        nextRow < 0 ||
        nextRow >= STAR_BATTLE_SIZE ||
        nextColumn < 0 ||
        nextColumn >= STAR_BATTLE_SIZE
      ) {
        continue;
      }
      const nextIndex = nextRow * STAR_BATTLE_SIZE + nextColumn;
      if (members.has(nextIndex) && !visited.has(nextIndex)) {
        visited.add(nextIndex);
        pending.push(nextIndex);
      }
    }
  }

  return visited.size === cells.length;
}

describe('star-battle', () => {
  it('define cinco tableros 6×6 con seis regiones conexas de seis celdas', () => {
    expect(STAR_BATTLE_LEVELS).toHaveLength(5);

    for (const level of STAR_BATTLE_LEVELS) {
      expect(level.regions).toHaveLength(STAR_BATTLE_SIZE);
      for (const row of level.regions) {
        expect(row).toHaveLength(STAR_BATTLE_SIZE);
        expect(row).toMatch(/^[1-6]{6}$/);
      }

      for (let label = 1; label <= 6; label += 1) {
        expect(regionCells(level, label)).toHaveLength(6);
        expect(regionIsConnected(level, label)).toBe(true);
      }
    }
  });

  it('acepta la solución de cada nivel con una estrella por fila, columna y región', () => {
    for (const level of STAR_BATTLE_LEVELS) {
      expect(level.solution).toHaveLength(STAR_BATTLE_SIZE);
      expect(new Set(level.solution).size).toBe(STAR_BATTLE_SIZE);

      const stars = solutionStars(level);
      expect(stars.filter(Boolean)).toHaveLength(STAR_BATTLE_SIZE);
      expect(hasAdjacentStars(stars)).toBe(false);
      expect(isValidArrangement(level, stars)).toBe(true);
      expect(isSolved(level, marksFromStars(stars))).toBe(true);

      expect(starProgress(level, stars)).toEqual({
        stars: 6,
        rows: 6,
        columns: 6,
        regions: 6,
      });

      const regions = new Set<number>();
      for (let row = 0; row < STAR_BATTLE_SIZE; row += 1) {
        const column = level.solution[row]!;
        const label = regionLabel(level, row, column);
        expect(label).toBeGreaterThanOrEqual(1);
        expect(label).toBeLessThanOrEqual(6);
        regions.add(label);
      }
      expect(regions.size).toBe(6);
    }
  });

  it('rechaza tableros incompletos y disposiciones con columnas repetidas', () => {
    const level = STAR_BATTLE_LEVELS[0]!;
    const empty = new Array<number>(STAR_BATTLE_SIZE * STAR_BATTLE_SIZE).fill(CELL_EMPTY);
    expect(isSolved(level, empty)).toBe(false);

    const threeStars = marksFromStars(starsFromColumns([1, 3, 5, 0, 0, 0]));
    expect(isSolved(level, threeStars)).toBe(false);

    const repeated = [...level.solution];
    repeated[0] = level.solution[1]!;
    const repeatedStars = starsFromColumns(repeated);
    expect(isValidArrangement(level, repeatedStars)).toBe(false);
    expect(isSolved(level, marksFromStars(repeatedStars))).toBe(false);

    const conflicts = conflictMask(level, repeatedStars);
    expect(conflicts[0 * STAR_BATTLE_SIZE + repeated[0]!]).toBe(true);
    expect(conflicts[1 * STAR_BATTLE_SIZE + repeated[1]!]).toBe(true);
    expect(conflicts.filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('rechaza una disposición que solo falla por contacto en diagonal', () => {
    const level = STAR_BATTLE_LEVELS[0]!;
    const columns = [0, 3, 5, 1, 2, 4];
    const stars = starsFromColumns(columns);

    expect(new Set(columns).size).toBe(6);
    expect(level.solution).not.toEqual(columns);
    expect(starProgress(level, stars)).toEqual({
      stars: 6,
      rows: 6,
      columns: 6,
      regions: 6,
    });
    expect(hasAdjacentStars(stars)).toBe(true);
    expect(isValidArrangement(level, stars)).toBe(false);
    expect(isSolved(level, marksFromStars(stars))).toBe(false);

    const conflicts = conflictMask(level, stars);
    expect(conflicts.filter(Boolean).length).toBe(2);
  });

  it('alterna vacío, estrella y descarte sin que los descartes cuenten', () => {
    expect(nextMark(CELL_EMPTY)).toBe(CELL_STAR);
    expect(nextMark(CELL_STAR)).toBe(CELL_DISCARD);
    expect(nextMark(CELL_DISCARD)).toBe(CELL_EMPTY);

    const level = STAR_BATTLE_LEVELS[2]!;
    const marks = marksFromStars(solutionStars(level));
    expect(isSolved(level, marks)).toBe(true);

    const starIndex = marks.findIndex((mark) => mark === CELL_STAR);
    expect(starIndex).toBeGreaterThanOrEqual(0);
    marks[starIndex] = CELL_DISCARD;
    expect(starsFromMarks(marks).filter(Boolean)).toHaveLength(5);
    expect(isSolved(level, marks)).toBe(false);

    const withFreeDiscard = marksFromStars(solutionStars(level));
    const emptyIndex = withFreeDiscard.findIndex((mark) => mark === CELL_EMPTY);
    expect(emptyIndex).toBeGreaterThanOrEqual(0);
    withFreeDiscard[emptyIndex] = CELL_DISCARD;
    expect(isSolved(level, withFreeDiscard)).toBe(true);
  });
});

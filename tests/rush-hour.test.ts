import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  EXIT_ROW,
  LEVELS,
  canMove,
  carAt,
  cellsOf,
  createState,
  isSolved,
  minimumMoves,
  moveCar,
  parseLevel,
  slideCar,
  solve,
} from '../src/games/rush-hour/logic';

describe('hora punta', () => {
  it('define seis niveles de 6×6 con un coche rojo horizontal', () => {
    expect(LEVELS).toHaveLength(6);
    for (const level of LEVELS) {
      expect(level.rows).toHaveLength(BOARD_SIZE);
      expect(level.rows.every((row) => row.length === BOARD_SIZE)).toBe(true);
      expect(level.cars.length).toBeGreaterThanOrEqual(3);

      const red = level.cars.find((car) => car.id === 'R');
      expect(red).toBeDefined();
      expect(red!.orientation).toBe('h');
      expect(red!.row).toBe(EXIT_ROW);
      expect(red!.length).toBe(2);

      for (const car of level.cars) {
        expect(car.length).toBeGreaterThanOrEqual(2);
        expect(car.length).toBeLessThanOrEqual(3);
        for (const cell of cellsOf(car)) {
          expect(cell.row).toBeGreaterThanOrEqual(0);
          expect(cell.row).toBeLessThan(BOARD_SIZE);
          expect(cell.col).toBeGreaterThanOrEqual(0);
          expect(cell.col).toBeLessThan(BOARD_SIZE);
        }
      }
    }
  });

  it('ningún nivel está resuelto al empezar', () => {
    for (const level of LEVELS) {
      expect(isSolved(createState(level)), `nivel ${level.id}`).toBe(false);
    }
  });

  it('cada nivel tiene solución y todos sus movimientos son legales', () => {
    for (const level of LEVELS) {
      const solution = solve(createState(level));
      expect(solution, `nivel ${level.id} sin solución`).not.toBeNull();
      expect(solution!.length).toBeGreaterThan(0);

      let cars = createState(level);
      for (const move of solution!) {
        const next = moveCar(cars, move.carId, move.delta);
        expect(
          next,
          `movimiento ilegal en el nivel ${level.id}: ${move.carId} ${move.delta}`,
        ).not.toBeNull();
        cars = next!;
      }
      expect(isSolved(cars), `el nivel ${level.id} no termina resuelto`).toBe(true);
    }
  });

  it('la solución más corta crece con la dificultad', () => {
    const expected = [7, 8, 9, 11, 12, 14];
    const lengths = LEVELS.map((level) => minimumMoves(createState(level)));
    expect(lengths).toEqual(expected);
    for (let index = 1; index < lengths.length; index += 1) {
      expect(lengths[index]!).toBeGreaterThan(lengths[index - 1]!);
    }
  });

  it('bloquea el borde, los coches vecinos y los desplazamientos vacíos', () => {
    const level = parseLevel(
      ['..A...', '..A...', 'RRA...', '......', '......', '......'],
      'prueba',
    );
    const cars = createState(level);

    expect(canMove(cars, 'R', -1)).toBe(false);
    expect(canMove(cars, 'R', 1)).toBe(false);
    expect(canMove(cars, 'R', 0)).toBe(false);
    expect(canMove(cars, 'Z', 1)).toBe(false);
    expect(moveCar(cars, 'R', 1)).toBeNull();

    expect(canMove(cars, 'A', 1)).toBe(true);
    expect(canMove(cars, 'A', 5)).toBe(false);
    expect(carAt(cars, 2, 1)?.id).toBe('R');
    expect(carAt(cars, 2, 3)).toBeUndefined();
  });

  it('el arrastre avanza hasta el primer obstáculo', () => {
    const level = parseLevel(
      ['..A...', '..A...', 'RRA...', '......', '......', '......'],
      'prueba',
    );
    const cars = createState(level);

    const vertical = slideCar(cars, 'A', 5);
    expect(vertical.steps).toBe(3);
    expect(vertical.cars.find((car) => car.id === 'A')!.row).toBe(3);

    const horizontal = slideCar(vertical.cars, 'R', 9);
    expect(horizontal.steps).toBe(4);
    expect(horizontal.cars.find((car) => car.id === 'R')!.col).toBe(4);
    expect(isSolved(horizontal.cars)).toBe(true);

    const blocked = slideCar(cars, 'R', 3);
    expect(blocked.steps).toBe(0);
    expect(blocked.cars).toEqual(cars);
  });

  it('rechaza tableros mal formados', () => {
    expect(() => parseLevel(['......'])).toThrow();
    expect(() =>
      parseLevel(['.....X', '......', '......', '......', '......', '......']),
    ).toThrow();
    expect(() => parseLevel(['A.....', '.A....', 'RR....', '......', '......', '......'])).toThrow(
      /recto|contiguas/,
    );
    expect(() =>
      parseLevel(['AA....', 'AA....', 'RR....', '......', '......', '......']),
    ).toThrow();
    expect(() => parseLevel(['A.....', 'A.....', 'A.....', '......', '......', '......'])).toThrow(
      /rojo/,
    );
    expect(() => parseLevel(['......', '......', 'RRRR..', '......', '......', '......'])).toThrow(
      /medir/,
    );
    expect(() => parseLevel(['......', '......', '....RR', '......', '......', '......'])).toThrow(
      /resuelto/,
    );
  });
});

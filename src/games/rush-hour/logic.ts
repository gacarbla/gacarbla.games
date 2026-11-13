/** Hora punta: un tablero de 6×6 con coches que solo avanzan por su eje. */

export const BOARD_SIZE = 6;
export const EXIT_ROW = 2;
export const RED_ID = 'R';

export type Orientation = 'h' | 'v';

export interface Car {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly length: number;
  readonly orientation: Orientation;
}

export interface Level {
  readonly id: number;
  readonly name: string;
  readonly rows: readonly string[];
  readonly cars: readonly Car[];
}

export interface Move {
  readonly carId: string;
  readonly delta: number;
}

export interface SlideResult {
  readonly cars: Car[];
  readonly steps: number;
}

interface LevelSource {
  readonly name: string;
  readonly rows: readonly string[];
}

/**
 * Seis atascos hechos a mano. Cada letra es un coche; la R es el coche rojo,
 * que empieza en la fila de salida y debe llegar al borde derecho.
 */
const LEVEL_SOURCES: readonly LevelSource[] = [
  {
    name: 'Primer atasco',
    rows: ['..B...', '..B...', 'RRB...', '......', '......', 'CC....'],
  },
  {
    name: 'Ceda el paso',
    rows: ['..A...', '..A...', 'RRA...', '.BB...', '......', '......'],
  },
  {
    name: 'Fila doble',
    rows: ['..A...', '..A...', 'RRA.B.', '....B.', '......', '.CC...'],
  },
  {
    name: 'Cruce completo',
    rows: ['..A.EE', '..AB.D', 'RRABCD', '....C.', '.G....', '.G.FF.'],
  },
  {
    name: 'Doble bloqueo',
    rows: ['..A.B.', '..A.B.', 'RRA.B.', '......', '..CC..', '......'],
  },
  {
    name: 'Hora punta',
    rows: ['..A...', '..A.B.', 'RRA.BC', 'WW...C', 'V.....', 'VFF.GG'],
  },
];

function isLetter(tile: string): boolean {
  return tile.length === 1 && tile >= 'A' && tile <= 'Z';
}

function assertGrid(rows: readonly string[]): void {
  if (rows.length !== BOARD_SIZE) {
    throw new Error(`El nivel debe tener ${BOARD_SIZE} filas.`);
  }
  for (const row of rows) {
    if (row.length !== BOARD_SIZE) {
      throw new Error(`Cada fila debe tener ${BOARD_SIZE} columnas.`);
    }
    for (const tile of row) {
      if (tile !== '.' && !isLetter(tile)) {
        throw new Error(`Carácter no válido en el tablero: "${tile}".`);
      }
    }
  }
}

/** Convierte un tablero de letras en coches rectos de longitud 2 o 3. */
export function parseLevel(rows: readonly string[], name = '', id = 1): Level {
  assertGrid(rows);

  const groups = new Map<string, { row: number; col: number }[]>();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const tile = rows[row]![col]!;
      if (tile === '.') continue;
      const cells = groups.get(tile) ?? [];
      cells.push({ row, col });
      groups.set(tile, cells);
    }
  }

  const cars: Car[] = [];
  for (const [carId, cells] of groups) {
    if (cells.length < 2 || cells.length > 3) {
      throw new Error(`El coche ${carId} debe medir 2 o 3 celdas.`);
    }
    const rowsUsed = new Set(cells.map((cell) => cell.row));
    const colsUsed = new Set(cells.map((cell) => cell.col));
    if (rowsUsed.size !== 1 && colsUsed.size !== 1) {
      throw new Error(`El coche ${carId} debe ser recto.`);
    }
    const orientation: Orientation = rowsUsed.size === 1 ? 'h' : 'v';
    const sorted = [...cells].sort((a, b) => (orientation === 'h' ? a.col - b.col : a.row - b.row));
    const first = sorted[0]!;
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]!;
      const current = sorted[index]!;
      const contiguous =
        orientation === 'h'
          ? current.row === previous.row && current.col === previous.col + 1
          : current.col === previous.col && current.row === previous.row + 1;
      if (!contiguous) {
        throw new Error(`El coche ${carId} debe ocupar celdas contiguas.`);
      }
    }
    cars.push({
      id: carId,
      row: first.row,
      col: first.col,
      length: sorted.length,
      orientation,
    });
  }

  const red = cars.find((car) => car.id === RED_ID);
  if (!red) throw new Error('El nivel no tiene coche rojo.');
  if (red.orientation !== 'h') throw new Error('El coche rojo debe ser horizontal.');
  if (red.row !== EXIT_ROW) throw new Error(`El coche rojo debe estar en la fila ${EXIT_ROW}.`);
  if (red.length !== 2) throw new Error('El coche rojo debe medir 2 celdas.');
  if (isSolved(cars)) throw new Error('El nivel ya está resuelto de inicio.');

  return { id, name, rows, cars };
}

export const LEVELS: readonly Level[] = LEVEL_SOURCES.map((source, index) =>
  parseLevel(source.rows, source.name, index + 1),
);

export function createState(level: Level): Car[] {
  return level.cars.map((car) => ({ ...car }));
}

export function carAt(cars: readonly Car[], row: number, col: number): Car | undefined {
  return cars.find((car) => {
    if (car.orientation === 'h') {
      return car.row === row && col >= car.col && col < car.col + car.length;
    }
    return car.col === col && row >= car.row && row < car.row + car.length;
  });
}

export function cellsOf(car: Car): { row: number; col: number }[] {
  return Array.from({ length: car.length }, (_, index) => ({
    row: car.row + (car.orientation === 'v' ? index : 0),
    col: car.col + (car.orientation === 'h' ? index : 0),
  }));
}

function occupied(cars: readonly Car[], ignoredId?: string): boolean[] {
  const grid = new Array<boolean>(BOARD_SIZE * BOARD_SIZE).fill(false);
  for (const car of cars) {
    if (car.id === ignoredId) continue;
    for (const cell of cellsOf(car)) {
      grid[cell.row * BOARD_SIZE + cell.col] = true;
    }
  }
  return grid;
}

/** Comprueba un desplazamiento de una o varias celdas por el eje del coche. */
export function canMove(cars: readonly Car[], carId: string, delta: number): boolean {
  const car = cars.find((item) => item.id === carId);
  if (!car || delta === 0 || !Number.isInteger(delta)) return false;

  const row = car.row + (car.orientation === 'v' ? delta : 0);
  const col = car.col + (car.orientation === 'h' ? delta : 0);
  const endRow = row + (car.orientation === 'v' ? car.length - 1 : 0);
  const endCol = col + (car.orientation === 'h' ? car.length - 1 : 0);
  if (row < 0 || col < 0 || endRow >= BOARD_SIZE || endCol >= BOARD_SIZE) return false;

  const grid = occupied(cars, car.id);
  for (let index = 0; index < car.length; index += 1) {
    const cellRow = row + (car.orientation === 'v' ? index : 0);
    const cellCol = col + (car.orientation === 'h' ? index : 0);
    if (grid[cellRow * BOARD_SIZE + cellCol]) return false;
  }
  return true;
}

/** Devuelve un tablero nuevo con el coche desplazado, o null si no cabe. */
export function moveCar(cars: readonly Car[], carId: string, delta: number): Car[] | null {
  if (!canMove(cars, carId, delta)) return null;
  return cars.map((car) =>
    car.id === carId
      ? {
          ...car,
          row: car.row + (car.orientation === 'v' ? delta : 0),
          col: car.col + (car.orientation === 'h' ? delta : 0),
        }
      : { ...car },
  );
}

/** Arrastra el coche todo lo posible hacia la posición pedida. */
export function slideCar(cars: readonly Car[], carId: string, delta: number): SlideResult {
  if (delta === 0) return { cars: cars.map((car) => ({ ...car })), steps: 0 };
  const direction = Math.sign(delta);
  let current = cars.map((car) => ({ ...car }));
  let steps = 0;
  while (steps < Math.abs(delta)) {
    const next = moveCar(current, carId, direction);
    if (!next) break;
    current = next;
    steps += 1;
  }
  return { cars: current, steps };
}

export function isSolved(cars: readonly Car[]): boolean {
  const red = cars.find((car) => car.id === RED_ID);
  return (
    red !== undefined &&
    red.orientation === 'h' &&
    red.row === EXIT_ROW &&
    red.col + red.length === BOARD_SIZE
  );
}

export function stateKey(cars: readonly Car[]): string {
  return [...cars]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((car) => `${car.id}${car.row},${car.col}`)
    .join('|');
}

/**
 * Búsqueda en anchura sobre movimientos de una celda. Devuelve la lista de
 * movimientos de la solución más corta, o null si el tablero no tiene salida.
 */
export function solve(cars: readonly Car[], maxStates = 400_000): Move[] | null {
  const start = cars.map((car) => ({ ...car }));
  const queue: Car[][] = [start];
  const parents: number[] = [-1];
  const moves: (Move | null)[] = [null];
  const seen = new Set<string>([stateKey(start)]);

  for (let head = 0; head < queue.length; head += 1) {
    if (head > maxStates) return null;
    const state = queue[head]!;
    if (isSolved(state)) {
      const path: Move[] = [];
      for (let node = head; node > 0; node = parents[node]!) {
        const move = moves[node];
        if (move) path.unshift(move);
      }
      return path;
    }

    for (const car of state) {
      for (const delta of [-1, 1]) {
        const next = moveCar(state, car.id, delta);
        if (!next) continue;
        const key = stateKey(next);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
        parents.push(head);
        moves.push({ carId: car.id, delta });
      }
    }
  }
  return null;
}

export function minimumMoves(cars: readonly Car[]): number {
  return solve(cars)?.length ?? -1;
}

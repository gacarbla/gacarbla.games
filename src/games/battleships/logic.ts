/**
 * Reglas de la batalla naval lógica sobre un tablero de 8 × 8.
 *
 * La flota es fija: un barco de 4, dos de 3, tres de 2 y cuatro de 1.
 * Los barcos son rectos, no se solapan y no se tocan ni siquiera en diagonal.
 * Las cifras de cada fila y columna indican cuántas casillas están ocupadas.
 */

export const BATTLESHIPS_SIZE = 8;
export const BATTLESHIPS_CELLS = BATTLESHIPS_SIZE * BATTLESHIPS_SIZE;

export interface ShipPlacement {
  readonly row: number;
  readonly column: number;
  readonly length: number;
  readonly horizontal: boolean;
}

export interface BattleshipsLevel {
  readonly name: string;
  /** Colocación conocida de la flota, hecha a mano. */
  readonly ships: readonly ShipPlacement[];
  /** Casillas ocupadas que debe tener cada fila. */
  readonly rows: readonly number[];
  /** Casillas ocupadas que debe tener cada columna. */
  readonly columns: readonly number[];
}

export interface FleetEntry {
  readonly length: number;
  readonly count: number;
}

export const BATTLESHIPS_FLEET: readonly FleetEntry[] = [
  { length: 4, count: 1 },
  { length: 3, count: 2 },
  { length: 2, count: 3 },
  { length: 1, count: 4 },
];

export const FLEET_CELLS = BATTLESHIPS_FLEET.reduce(
  (total, entry) => total + entry.length * entry.count,
  0,
);

const FLEET_SHIP_COUNT = BATTLESHIPS_FLEET.reduce((total, entry) => total + entry.count, 0);

const FLEET_TARGET: Readonly<Record<number, number>> = {
  1: 4,
  2: 3,
  3: 2,
  4: 1,
};

export const BATTLESHIPS_LEVELS: readonly BattleshipsLevel[] = [
  {
    name: 'Aguas tranquilas',
    ships: [
      { row: 0, column: 0, length: 4, horizontal: true },
      { row: 0, column: 5, length: 2, horizontal: true },
      { row: 2, column: 1, length: 3, horizontal: true },
      { row: 2, column: 5, length: 3, horizontal: true },
      { row: 4, column: 0, length: 2, horizontal: true },
      { row: 4, column: 3, length: 2, horizontal: true },
      { row: 6, column: 0, length: 1, horizontal: true },
      { row: 6, column: 2, length: 1, horizontal: true },
      { row: 6, column: 4, length: 1, horizontal: true },
      { row: 6, column: 6, length: 1, horizontal: true },
    ],
    rows: [6, 0, 6, 0, 4, 0, 4, 0],
    columns: [3, 3, 3, 3, 2, 2, 3, 1],
  },
  {
    name: 'Marea alta',
    ships: [
      { row: 0, column: 0, length: 4, horizontal: false },
      { row: 5, column: 2, length: 3, horizontal: false },
      { row: 0, column: 4, length: 3, horizontal: false },
      { row: 0, column: 6, length: 2, horizontal: false },
      { row: 3, column: 6, length: 2, horizontal: false },
      { row: 6, column: 6, length: 2, horizontal: false },
      { row: 5, column: 0, length: 1, horizontal: true },
      { row: 7, column: 0, length: 1, horizontal: true },
      { row: 4, column: 4, length: 1, horizontal: true },
      { row: 6, column: 4, length: 1, horizontal: true },
    ],
    rows: [3, 3, 2, 2, 2, 2, 3, 3],
    columns: [6, 0, 3, 0, 5, 0, 6, 0],
  },
  {
    name: 'Paso estrecho',
    ships: [
      { row: 0, column: 0, length: 4, horizontal: true },
      { row: 0, column: 6, length: 3, horizontal: false },
      { row: 4, column: 0, length: 3, horizontal: true },
      { row: 6, column: 0, length: 2, horizontal: false },
      { row: 4, column: 5, length: 2, horizontal: true },
      { row: 6, column: 3, length: 2, horizontal: true },
      { row: 2, column: 0, length: 1, horizontal: true },
      { row: 2, column: 2, length: 1, horizontal: true },
      { row: 2, column: 4, length: 1, horizontal: true },
      { row: 6, column: 6, length: 1, horizontal: true },
    ],
    rows: [5, 1, 4, 0, 5, 0, 4, 1],
    columns: [5, 2, 3, 2, 2, 1, 5, 0],
  },
  {
    name: 'Flota dispersa',
    ships: [
      { row: 0, column: 0, length: 4, horizontal: true },
      { row: 0, column: 5, length: 3, horizontal: true },
      { row: 2, column: 0, length: 3, horizontal: false },
      { row: 2, column: 3, length: 2, horizontal: true },
      { row: 4, column: 3, length: 2, horizontal: true },
      { row: 6, column: 0, length: 2, horizontal: true },
      { row: 2, column: 6, length: 1, horizontal: true },
      { row: 4, column: 6, length: 1, horizontal: true },
      { row: 6, column: 3, length: 1, horizontal: true },
      { row: 6, column: 5, length: 1, horizontal: true },
    ],
    rows: [7, 0, 4, 1, 4, 0, 4, 0],
    columns: [5, 2, 1, 4, 2, 2, 3, 1],
  },
  {
    name: 'Último avistamiento',
    ships: [
      { row: 0, column: 3, length: 4, horizontal: false },
      { row: 0, column: 0, length: 3, horizontal: false },
      { row: 0, column: 7, length: 3, horizontal: false },
      { row: 5, column: 0, length: 2, horizontal: true },
      { row: 5, column: 3, length: 2, horizontal: true },
      { row: 7, column: 3, length: 2, horizontal: true },
      { row: 5, column: 6, length: 1, horizontal: true },
      { row: 7, column: 0, length: 1, horizontal: true },
      { row: 7, column: 6, length: 1, horizontal: true },
      { row: 3, column: 5, length: 1, horizontal: true },
    ],
    rows: [3, 3, 3, 2, 0, 5, 0, 4],
    columns: [5, 1, 0, 6, 2, 1, 2, 3],
  },
];

export interface ExtractedShip {
  readonly cells: readonly number[];
  readonly length: number;
  readonly horizontal: boolean;
  readonly straight: boolean;
}

export interface BattleshipsValidation {
  readonly valid: boolean;
  readonly ships: readonly ExtractedShip[];
  readonly rows: readonly number[];
  readonly columns: readonly number[];
  readonly rowErrors: readonly boolean[];
  readonly columnErrors: readonly boolean[];
  readonly invalidCells: readonly number[];
  readonly issues: readonly string[];
}

export function emptyGrid(): boolean[] {
  return Array.from({ length: BATTLESHIPS_CELLS }, () => false);
}

export function gridIndex(row: number, column: number): number {
  return row * BATTLESHIPS_SIZE + column;
}

export function isShipInside(ship: ShipPlacement): boolean {
  const endRow = ship.row + (ship.horizontal ? 0 : ship.length - 1);
  const endColumn = ship.column + (ship.horizontal ? ship.length - 1 : 0);
  return (
    ship.length > 0 &&
    ship.row >= 0 &&
    ship.column >= 0 &&
    endRow < BATTLESHIPS_SIZE &&
    endColumn < BATTLESHIPS_SIZE
  );
}

export function shipCells(ship: ShipPlacement): number[] {
  const cells: number[] = [];
  for (let offset = 0; offset < ship.length; offset += 1) {
    const row = ship.row + (ship.horizontal ? 0 : offset);
    const column = ship.column + (ship.horizontal ? offset : 0);
    cells.push(gridIndex(row, column));
  }
  return cells;
}

export function cellsFromShips(ships: readonly ShipPlacement[]): boolean[] {
  const cells = emptyGrid();
  for (const ship of ships) {
    if (!isShipInside(ship)) continue;
    for (const index of shipCells(ship)) {
      cells[index] = true;
    }
  }
  return cells;
}

export function rowCounts(cells: readonly boolean[]): number[] {
  const counts: number[] = [];
  for (let row = 0; row < BATTLESHIPS_SIZE; row += 1) {
    let total = 0;
    for (let column = 0; column < BATTLESHIPS_SIZE; column += 1) {
      if (cells[gridIndex(row, column)] === true) total += 1;
    }
    counts.push(total);
  }
  return counts;
}

export function columnCounts(cells: readonly boolean[]): number[] {
  const counts: number[] = [];
  for (let column = 0; column < BATTLESHIPS_SIZE; column += 1) {
    let total = 0;
    for (let row = 0; row < BATTLESHIPS_SIZE; row += 1) {
      if (cells[gridIndex(row, column)] === true) total += 1;
    }
    counts.push(total);
  }
  return counts;
}

/** Separa las casillas ocupadas en barcos conexos y comprueba si son rectos. */
export function extractShips(cells: readonly boolean[]): ExtractedShip[] {
  const visited = Array.from({ length: BATTLESHIPS_CELLS }, () => false);
  const ships: ExtractedShip[] = [];
  const stack: number[] = [];

  for (let start = 0; start < BATTLESHIPS_CELLS; start += 1) {
    if (cells[start] !== true || visited[start] === true) continue;

    const component: number[] = [];
    stack.length = 0;
    stack.push(start);
    visited[start] = true;

    while (stack.length > 0) {
      const index = stack.pop()!;
      component.push(index);
      const row = Math.floor(index / BATTLESHIPS_SIZE);
      const column = index % BATTLESHIPS_SIZE;
      const neighbours = [
        [row - 1, column],
        [row + 1, column],
        [row, column - 1],
        [row, column + 1],
      ] as const;

      for (const [nextRow, nextColumn] of neighbours) {
        if (
          nextRow < 0 ||
          nextRow >= BATTLESHIPS_SIZE ||
          nextColumn < 0 ||
          nextColumn >= BATTLESHIPS_SIZE
        ) {
          continue;
        }
        const next = gridIndex(nextRow, nextColumn);
        if (cells[next] === true && visited[next] !== true) {
          visited[next] = true;
          stack.push(next);
        }
      }
    }

    component.sort((a, b) => a - b);
    const rowSet = new Set(component.map((index) => Math.floor(index / BATTLESHIPS_SIZE)));
    const columnSet = new Set(component.map((index) => index % BATTLESHIPS_SIZE));

    let horizontal = true;
    let straight = component.length === 1;

    if (component.length > 1) {
      if (rowSet.size === 1) {
        horizontal = true;
        const values = component.map((index) => index % BATTLESHIPS_SIZE);
        straight = Math.max(...values) - Math.min(...values) + 1 === component.length;
      } else if (columnSet.size === 1) {
        horizontal = false;
        const values = component.map((index) => Math.floor(index / BATTLESHIPS_SIZE));
        straight = Math.max(...values) - Math.min(...values) + 1 === component.length;
      } else {
        straight = false;
      }
    }

    ships.push({
      cells: component,
      length: component.length,
      horizontal,
      straight,
    });
  }

  return ships;
}

export function expectedFleetCounts(): Readonly<Record<number, number>> {
  return FLEET_TARGET;
}

export function validateBattleships(
  cells: readonly boolean[],
  level: BattleshipsLevel,
): BattleshipsValidation {
  const rows = rowCounts(cells);
  const columns = columnCounts(cells);
  const rowErrors = rows.map((count, index) => count !== (level.rows[index] ?? 0));
  const columnErrors = columns.map((count, index) => count !== (level.columns[index] ?? 0));
  const ships = extractShips(cells);
  const issues: string[] = [];
  const invalid = new Set<number>();

  if (level.ships.some((ship) => !isShipInside(ship))) {
    issues.push('El nivel contiene un barco fuera del tablero.');
  }

  if (rowErrors.some(Boolean)) {
    issues.push('Las cifras de las filas todavía no coinciden.');
  }
  if (columnErrors.some(Boolean)) {
    issues.push('Las cifras de las columnas todavía no coinciden.');
  }

  const actualFleet: Record<number, number> = {};
  for (const ship of ships) {
    actualFleet[ship.length] = (actualFleet[ship.length] ?? 0) + 1;
  }

  const fleetProblems: string[] = [];
  for (const entry of BATTLESHIPS_FLEET) {
    const found = actualFleet[entry.length] ?? 0;
    if (found !== entry.count) {
      fleetProblems.push(`${entry.length}: ${found}/${entry.count}`);
    }
  }
  if (fleetProblems.length > 0) {
    issues.push(`La flota no coincide (${fleetProblems.join(', ')}).`);
  }

  for (const ship of ships) {
    if (ship.straight !== true) {
      issues.push('Hay un barco con una forma que no es recta.');
      for (const cell of ship.cells) invalid.add(cell);
    }
    const maximum = FLEET_TARGET[ship.length] ?? 0;
    if (ship.length > 4 || (actualFleet[ship.length] ?? 0) > maximum) {
      for (const cell of ship.cells) invalid.add(cell);
    }
  }

  const shipAt = new Map<number, number>();
  ships.forEach((ship, shipIndex) => {
    for (const cell of ship.cells) shipAt.set(cell, shipIndex);
  });

  let touches = false;
  for (let row = 0; row < BATTLESHIPS_SIZE; row += 1) {
    for (let column = 0; column < BATTLESHIPS_SIZE; column += 1) {
      const index = gridIndex(row, column);
      if (cells[index] !== true) continue;

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
          if (cells[next] !== true) continue;
          if (shipAt.get(index) !== shipAt.get(next)) {
            touches = true;
            invalid.add(index);
            invalid.add(next);
          }
        }
      }
    }
  }
  if (touches) {
    issues.push('Dos barcos se tocan, ni siquiera puede ser en diagonal.');
  }

  if (ships.length !== FLEET_SHIP_COUNT && fleetProblems.length === 0) {
    issues.push('El número de barcos no coincide con la flota.');
  }

  return {
    valid: issues.length === 0,
    ships,
    rows,
    columns,
    rowErrors,
    columnErrors,
    invalidCells: [...invalid].sort((a, b) => a - b),
    issues,
  };
}

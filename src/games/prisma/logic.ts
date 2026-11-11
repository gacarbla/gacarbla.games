export type Direction = 0 | 1 | 2 | 3;

export type CellType = 'empty' | 'wall' | 'mirror' | 'splitter' | 'crystal' | 'emitter';

export interface Cell {
  type: CellType;
  /** Giros de 90° de un espejo. El estado efectivo es turns % 2. */
  turns: number;
  /** Dirección de emisión para emisores. */
  direction?: Direction;
}

export interface ParsedLevel {
  cols: number;
  rows: number;
  cells: Cell[];
  crystals: number[];
  mirrors: number[];
  emitters: number[];
}

export interface BeamSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BeamResult {
  segments: BeamSegment[];
  lit: Set<number>;
  solved: boolean;
}

export interface LevelDefinition {
  name: string;
  rows: string[];
}

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

const EMITTER_DIRECTIONS: Record<string, Direction> = {
  '>': 0,
  v: 1,
  '<': 2,
  '^': 3,
};

/** '/' refleja 0↔3 y 1↔2. */
export function reflectSlash(direction: Direction): Direction {
  return (3 - direction) as Direction;
}

/** '\\' refleja 0↔1 y 2↔3. */
export function reflectBackslash(direction: Direction): Direction {
  return (direction ^ 1) as Direction;
}

export function reflect(direction: Direction, turns: number): Direction {
  return turns % 2 === 0 ? reflectSlash(direction) : reflectBackslash(direction);
}

export function parseLevel(level: LevelDefinition): ParsedLevel {
  const rows = level.rows.length;
  const cols = level.rows[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new Error(`[prisma] Nivel vacío: ${level.name}`);

  const cells: Cell[] = [];
  const crystals: number[] = [];
  const mirrors: number[] = [];
  const emitters: number[] = [];

  level.rows.forEach((row, y) => {
    if (row.length !== cols) {
      throw new Error(
        `[prisma] La fila ${y} de "${level.name}" mide ${row.length}; se esperaban ${cols}.`,
      );
    }

    for (let x = 0; x < row.length; x += 1) {
      const symbol = row[x]!;
      const index = y * cols + x;

      switch (symbol) {
        case '.':
          cells.push({ type: 'empty', turns: 0 });
          break;
        case '#':
          cells.push({ type: 'wall', turns: 0 });
          break;
        case 'L':
          cells.push({ type: 'mirror', turns: 0 });
          mirrors.push(index);
          break;
        case 'R':
          cells.push({ type: 'mirror', turns: 1 });
          mirrors.push(index);
          break;
        case '*':
          cells.push({ type: 'splitter', turns: 0 });
          break;
        case 'o':
          cells.push({ type: 'crystal', turns: 0 });
          crystals.push(index);
          break;
        case '>':
        case 'v':
        case '<':
        case '^':
          cells.push({ type: 'emitter', turns: 0, direction: EMITTER_DIRECTIONS[symbol]! });
          emitters.push(index);
          break;
        default:
          throw new Error(`[prisma] Símbolo desconocido "${symbol}" en "${level.name}".`);
      }
    }
  });

  return { cols, rows, cells, crystals, mirrors, emitters };
}

export function traceBeams(level: ParsedLevel): BeamResult {
  const { cols, rows, cells, crystals, emitters } = level;
  const segments: BeamSegment[] = [];
  const lit = new Set<number>();
  const visited = new Set<number>();
  const queue: Array<{ index: number; direction: Direction }> = [];

  for (const index of emitters) {
    queue.push({ index, direction: cells[index]!.direction ?? 0 });
  }

  while (queue.length > 0) {
    const beam = queue.shift()!;
    const key = beam.index * 4 + beam.direction;
    if (visited.has(key)) continue;
    visited.add(key);

    const x = beam.index % cols;
    const y = Math.floor(beam.index / cols);
    const nextX = x + DX[beam.direction]!;
    const nextY = y + DY[beam.direction]!;
    if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) continue;

    segments.push({
      x1: x + 0.5,
      y1: y + 0.5,
      x2: nextX + 0.5,
      y2: nextY + 0.5,
    });

    const nextIndex = nextY * cols + nextX;
    const cell = cells[nextIndex]!;

    switch (cell.type) {
      case 'empty':
        queue.push({ index: nextIndex, direction: beam.direction });
        break;
      case 'mirror':
        queue.push({ index: nextIndex, direction: reflect(beam.direction, cell.turns) });
        break;
      case 'splitter': {
        queue.push({ index: nextIndex, direction: beam.direction });
        queue.push({ index: nextIndex, direction: ((beam.direction + 3) % 4) as Direction });
        queue.push({ index: nextIndex, direction: ((beam.direction + 1) % 4) as Direction });
        break;
      }
      case 'crystal':
        lit.add(nextIndex);
        break;
      case 'wall':
      case 'emitter':
        break;
    }
  }

  return {
    segments,
    lit,
    solved: crystals.length > 0 && crystals.every((index) => lit.has(index)),
  };
}

export function rotateCell(level: ParsedLevel, index: number): boolean {
  const cell = level.cells[index];
  if (!cell || cell.type !== 'mirror') return false;
  cell.turns = (cell.turns + 1) % 2;
  return true;
}

/**
 * Busca una combinación de giros que encienda todos los cristales.
 * Los niveles son pequeños (2^n espejos), así que una búsqueda exhaustiva
 * es instantánea y sirve como garantía de calidad en los tests.
 */
export function solveLevel(level: LevelDefinition): Map<number, number> | null {
  const parsed = parseLevel(level);
  const mirrors = parsed.mirrors;

  if (mirrors.length > 18) {
    throw new Error(`[prisma] "${level.name}" tiene demasiados espejos para el solver.`);
  }

  for (let mask = 0; mask < 2 ** mirrors.length; mask += 1) {
    mirrors.forEach((cellIndex, bit) => {
      parsed.cells[cellIndex]!.turns = (mask >> bit) & 1;
    });

    if (traceBeams(parsed).solved) {
      const solution = new Map<number, number>();
      mirrors.forEach((cellIndex) => {
        solution.set(cellIndex, parsed.cells[cellIndex]!.turns);
      });
      return solution;
    }
  }

  return null;
}

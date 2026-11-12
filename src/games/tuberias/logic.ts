export const PIPE_SIZE = 7;
export const CELL_COUNT = PIPE_SIZE * PIPE_SIZE;

export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

interface PipeDirection {
  bit: number;
  dx: number;
  dy: number;
}

export const PIPE_DIRECTIONS: readonly PipeDirection[] = [
  { bit: NORTH, dx: 0, dy: -1 },
  { bit: EAST, dx: 1, dy: 0 },
  { bit: SOUTH, dx: 0, dy: 1 },
  { bit: WEST, dx: -1, dy: 0 },
];

export interface PipePuzzle {
  masks: number[];
  solution: number[];
  path: number[];
  source: number;
  exit: number;
}

export function rotatePipe(mask: number): number {
  let rotated = 0;
  if (mask & NORTH) rotated |= EAST;
  if (mask & EAST) rotated |= SOUTH;
  if (mask & SOUTH) rotated |= WEST;
  if (mask & WEST) rotated |= NORTH;
  return rotated;
}

export function rotatePipeBy(mask: number, steps: number): number {
  let rotated = mask;
  const turns = ((steps % 4) + 4) % 4;
  for (let turn = 0; turn < turns; turn += 1) rotated = rotatePipe(rotated);
  return rotated;
}

export function oppositeBit(bit: number): number {
  return ((bit << 2) | (bit >> 2)) & 15;
}

function neighbour(index: number, direction: PipeDirection): number | null {
  const column = index % PIPE_SIZE;
  const row = Math.floor(index / PIPE_SIZE);
  const nextColumn = column + direction.dx;
  const nextRow = row + direction.dy;
  if (nextColumn < 0 || nextColumn >= PIPE_SIZE) return null;
  if (nextRow < 0 || nextRow >= PIPE_SIZE) return null;
  return nextRow * PIPE_SIZE + nextColumn;
}

function neighbourList(index: number): { index: number; bit: number }[] {
  const result: { index: number; bit: number }[] = [];
  for (const direction of PIPE_DIRECTIONS) {
    const next = neighbour(index, direction);
    if (next !== null) result.push({ index: next, bit: direction.bit });
  }
  return result;
}

function directionBetween(from: number, to: number): number {
  const fromColumn = from % PIPE_SIZE;
  const fromRow = Math.floor(from / PIPE_SIZE);
  const toColumn = to % PIPE_SIZE;
  const toRow = Math.floor(to / PIPE_SIZE);
  if (toColumn === fromColumn && toRow === fromRow - 1) return NORTH;
  if (toColumn === fromColumn + 1 && toRow === fromRow) return EAST;
  if (toColumn === fromColumn && toRow === fromRow + 1) return SOUTH;
  if (toColumn === fromColumn - 1 && toRow === fromRow) return WEST;
  return 0;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

/** DFS aleatorio con retroceso: devuelve un camino simple entre dos celdas. */
function findPath(start: number, exit: number, random: () => number): number[] {
  const parents = new Int16Array(CELL_COUNT);
  parents.fill(-1);
  const visited = new Uint8Array(CELL_COUNT);
  const stack: number[] = [start];
  visited[start] = 1;

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;
    if (current === exit) break;

    const options = shuffled(neighbourList(current), random).filter(
      (candidate) => visited[candidate.index] === 0,
    );
    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[0]!;
    visited[next.index] = 1;
    parents[next.index] = current;
    stack.push(next.index);
  }

  if (visited[exit] === 0) return [];

  const path: number[] = [];
  let current = exit;
  while (current !== -1) {
    path.push(current);
    current = parents[current]!;
  }
  return path.reverse();
}

/** Celdas alcanzables por el agua desde la fuente, respetando conexiones recíprocas. */
export function connectedFrom(masks: readonly number[], source: number): Set<number> {
  const connected = new Set<number>();
  if (masks[source] === undefined || (masks[source]! & WEST) === 0) return connected;

  connected.add(source);
  const stack: number[] = [source];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const column = current % PIPE_SIZE;
    const row = Math.floor(current / PIPE_SIZE);
    const mask = masks[current]!;

    for (const direction of PIPE_DIRECTIONS) {
      if ((mask & direction.bit) === 0) continue;
      const nextColumn = column + direction.dx;
      const nextRow = row + direction.dy;
      if (nextColumn < 0 || nextColumn >= PIPE_SIZE) continue;
      if (nextRow < 0 || nextRow >= PIPE_SIZE) continue;
      const next = nextRow * PIPE_SIZE + nextColumn;
      if (connected.has(next)) continue;
      if (((masks[next] ?? 0) & oppositeBit(direction.bit)) === 0) continue;
      connected.add(next);
      stack.push(next);
    }
  }
  return connected;
}

export function pipesSolved(masks: readonly number[], source: number, exit: number): boolean {
  const exitMask = masks[exit] ?? 0;
  if ((exitMask & EAST) === 0) return false;
  return connectedFrom(masks, source).has(exit);
}

function randomFillMask(index: number, random: () => number): number {
  const available = neighbourList(index).map((candidate) => candidate.bit);
  const roll = random();
  const count = roll < 0.12 ? 3 : roll < 0.22 ? 1 : 2;
  return shuffled(available, random)
    .slice(0, count)
    .reduce((mask, bit) => mask | bit, 0);
}

function outwardMask(index: number): number {
  const column = index % PIPE_SIZE;
  const row = Math.floor(index / PIPE_SIZE);
  let mask = 0;
  if (column === 0) mask |= WEST;
  if (column === PIPE_SIZE - 1) mask |= EAST;
  if (row === 0) mask |= NORTH;
  if (row === PIPE_SIZE - 1) mask |= SOUTH;
  return mask;
}

export function generatePipes(random: () => number = Math.random): PipePuzzle {
  const sourceRow = Math.floor(random() * PIPE_SIZE);
  const exitRow = Math.floor(random() * PIPE_SIZE);
  const source = sourceRow * PIPE_SIZE;
  const exit = exitRow * PIPE_SIZE + (PIPE_SIZE - 1);

  let path: number[] = [];
  for (let attempt = 0; attempt < 140; attempt += 1) {
    const candidate = findPath(source, exit, random);
    if (candidate.length > path.length) path = candidate;
    if (candidate.length >= 14) break;
  }
  if (path.length < 2) path = findPath(source, exit, random);

  const solution = new Array<number>(CELL_COUNT).fill(0);
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index]!;
    const to = path[index + 1]!;
    const direction = directionBetween(from, to);
    if (direction === 0) continue;
    solution[from]! |= direction;
    solution[to]! |= oppositeBit(direction);
  }
  solution[source]! |= WEST;
  solution[exit]! |= EAST;

  const onPath = new Set(path);
  const masks = new Array<number>(CELL_COUNT).fill(0);

  for (const cell of path) {
    const base = solution[cell]!;
    const allowedOutward = cell === source ? WEST : cell === exit ? EAST : 0;
    const outward = outwardMask(cell) & ~allowedOutward;
    const variants = [1, 2, 3]
      .map((steps) => rotatePipeBy(base, steps))
      .filter((mask) => mask !== base);
    const cleanVariants = variants.filter((mask) => (mask & outward) === 0);
    const pool = cleanVariants.length > 0 ? cleanVariants : variants;
    masks[cell] = pool[Math.floor(random() * pool.length)] ?? rotatePipe(base);
  }

  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (onPath.has(index)) continue;
    masks[index] = randomFillMask(index, random);
  }

  return { masks, solution, path, source, exit };
}

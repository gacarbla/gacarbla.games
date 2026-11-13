export const BRIDGES_SIZE = 7;

export interface BridgesIsland {
  readonly x: number;
  readonly y: number;
  readonly value: number;
}

export interface BridgesLink {
  readonly a: number;
  readonly b: number;
  readonly count: number;
}

export interface BridgesLevel {
  readonly name: string;
  readonly islands: readonly BridgesIsland[];
  readonly links: readonly BridgesLink[];
}

/** Par de islas alineadas sin otra isla entre medias. */
export interface BridgesPair {
  readonly a: number;
  readonly b: number;
}

export interface BridgesEvaluation {
  readonly degrees: readonly number[];
  readonly degreesMet: readonly boolean[];
  readonly allDegrees: boolean;
  /** Índices de los pares implicados en un cruce. */
  readonly crossings: readonly number[];
  readonly connected: boolean;
  readonly solved: boolean;
}

/**
 * Cinco tableros hechos a mano. `links` describe la solución: cada enlace une
 * dos islas alineadas y adyacentes con uno o dos puentes. El número de cada
 * isla es la suma de los puentes que llegan a ella.
 */
export const BRIDGES_LEVELS: readonly BridgesLevel[] = [
  {
    name: 'El claro',
    islands: [
      { x: 0, y: 1, value: 2 },
      { x: 2, y: 1, value: 3 },
      { x: 4, y: 1, value: 2 },
      { x: 0, y: 3, value: 3 },
      { x: 2, y: 3, value: 4 },
      { x: 4, y: 3, value: 3 },
      { x: 6, y: 3, value: 1 },
    ],
    links: [
      { a: 0, b: 1, count: 1 },
      { a: 1, b: 2, count: 1 },
      { a: 3, b: 4, count: 2 },
      { a: 4, b: 5, count: 1 },
      { a: 0, b: 3, count: 1 },
      { a: 1, b: 4, count: 1 },
      { a: 2, b: 5, count: 1 },
      { a: 5, b: 6, count: 1 },
    ],
  },
  {
    name: 'La escalera',
    islands: [
      { x: 1, y: 0, value: 2 },
      { x: 3, y: 0, value: 3 },
      { x: 5, y: 0, value: 3 },
      { x: 1, y: 2, value: 5 },
      { x: 3, y: 2, value: 5 },
      { x: 5, y: 2, value: 4 },
      { x: 1, y: 4, value: 3 },
      { x: 3, y: 4, value: 5 },
      { x: 5, y: 4, value: 3 },
      { x: 3, y: 6, value: 1 },
    ],
    links: [
      { a: 0, b: 1, count: 1 },
      { a: 1, b: 2, count: 1 },
      { a: 3, b: 4, count: 2 },
      { a: 4, b: 5, count: 1 },
      { a: 6, b: 7, count: 1 },
      { a: 7, b: 8, count: 2 },
      { a: 0, b: 3, count: 1 },
      { a: 3, b: 6, count: 2 },
      { a: 1, b: 4, count: 1 },
      { a: 4, b: 7, count: 1 },
      { a: 7, b: 9, count: 1 },
      { a: 2, b: 5, count: 2 },
      { a: 5, b: 8, count: 1 },
    ],
  },
  {
    name: 'La retícula',
    islands: [
      { x: 0, y: 0, value: 3 },
      { x: 3, y: 0, value: 4 },
      { x: 6, y: 0, value: 2 },
      { x: 0, y: 2, value: 3 },
      { x: 3, y: 2, value: 5 },
      { x: 6, y: 2, value: 4 },
      { x: 0, y: 4, value: 4 },
      { x: 3, y: 4, value: 5 },
      { x: 6, y: 4, value: 3 },
      { x: 0, y: 6, value: 2 },
      { x: 3, y: 6, value: 3 },
      { x: 6, y: 6, value: 2 },
    ],
    links: [
      { a: 0, b: 1, count: 2 },
      { a: 1, b: 2, count: 1 },
      { a: 3, b: 4, count: 1 },
      { a: 4, b: 5, count: 2 },
      { a: 6, b: 7, count: 2 },
      { a: 7, b: 8, count: 1 },
      { a: 9, b: 10, count: 1 },
      { a: 10, b: 11, count: 1 },
      { a: 0, b: 3, count: 1 },
      { a: 3, b: 6, count: 1 },
      { a: 6, b: 9, count: 1 },
      { a: 1, b: 4, count: 1 },
      { a: 4, b: 7, count: 1 },
      { a: 7, b: 10, count: 1 },
      { a: 2, b: 5, count: 1 },
      { a: 5, b: 8, count: 1 },
      { a: 8, b: 11, count: 1 },
    ],
  },
  {
    name: 'El cruce',
    islands: [
      { x: 0, y: 0, value: 4 },
      { x: 2, y: 0, value: 4 },
      { x: 6, y: 0, value: 2 },
      { x: 0, y: 2, value: 4 },
      { x: 2, y: 2, value: 5 },
      { x: 4, y: 2, value: 4 },
      { x: 6, y: 2, value: 3 },
      { x: 0, y: 4, value: 3 },
      { x: 2, y: 4, value: 4 },
      { x: 4, y: 4, value: 4 },
      { x: 6, y: 4, value: 5 },
      { x: 0, y: 6, value: 2 },
      { x: 2, y: 6, value: 4 },
      { x: 6, y: 6, value: 4 },
    ],
    links: [
      { a: 0, b: 1, count: 2 },
      { a: 1, b: 2, count: 1 },
      { a: 3, b: 4, count: 1 },
      { a: 4, b: 5, count: 2 },
      { a: 5, b: 6, count: 1 },
      { a: 7, b: 8, count: 1 },
      { a: 8, b: 9, count: 1 },
      { a: 9, b: 10, count: 2 },
      { a: 11, b: 12, count: 1 },
      { a: 12, b: 13, count: 2 },
      { a: 0, b: 3, count: 2 },
      { a: 3, b: 7, count: 1 },
      { a: 7, b: 11, count: 1 },
      { a: 1, b: 4, count: 1 },
      { a: 4, b: 8, count: 1 },
      { a: 8, b: 12, count: 1 },
      { a: 2, b: 6, count: 1 },
      { a: 5, b: 9, count: 1 },
      { a: 6, b: 10, count: 1 },
      { a: 10, b: 13, count: 2 },
    ],
  },
  {
    name: 'La telaraña',
    islands: [
      { x: 0, y: 0, value: 3 },
      { x: 3, y: 0, value: 5 },
      { x: 6, y: 0, value: 3 },
      { x: 0, y: 2, value: 5 },
      { x: 3, y: 2, value: 8 },
      { x: 5, y: 2, value: 4 },
      { x: 6, y: 2, value: 3 },
      { x: 0, y: 4, value: 4 },
      { x: 3, y: 4, value: 7 },
      { x: 5, y: 4, value: 3 },
      { x: 6, y: 4, value: 3 },
      { x: 0, y: 6, value: 2 },
      { x: 3, y: 6, value: 5 },
      { x: 6, y: 6, value: 3 },
    ],
    links: [
      { a: 0, b: 1, count: 1 },
      { a: 1, b: 2, count: 2 },
      { a: 3, b: 4, count: 2 },
      { a: 4, b: 5, count: 2 },
      { a: 5, b: 6, count: 1 },
      { a: 7, b: 8, count: 2 },
      { a: 8, b: 9, count: 1 },
      { a: 9, b: 10, count: 1 },
      { a: 11, b: 12, count: 1 },
      { a: 12, b: 13, count: 2 },
      { a: 0, b: 3, count: 2 },
      { a: 3, b: 7, count: 1 },
      { a: 7, b: 11, count: 1 },
      { a: 1, b: 4, count: 2 },
      { a: 4, b: 8, count: 2 },
      { a: 8, b: 12, count: 2 },
      { a: 2, b: 6, count: 1 },
      { a: 6, b: 10, count: 1 },
      { a: 10, b: 13, count: 1 },
      { a: 5, b: 9, count: 1 },
    ],
  },
];

/** Dos islas están alineadas si comparten fila o columna. */
export function isAligned(first: BridgesIsland, second: BridgesIsland): boolean {
  return first.x === second.x || first.y === second.y;
}

/** Alineadas y sin ninguna otra isla estrictamente entre ellas. */
export function isAdjacentPair(islands: readonly BridgesIsland[], a: number, b: number): boolean {
  const first = islands[a];
  const second = islands[b];
  if (!first || !second || a === b || !isAligned(first, second)) return false;

  const minX = Math.min(first.x, second.x);
  const maxX = Math.max(first.x, second.x);
  const minY = Math.min(first.y, second.y);
  const maxY = Math.max(first.y, second.y);

  for (let index = 0; index < islands.length; index += 1) {
    if (index === a || index === b) continue;
    const other = islands[index]!;
    if (first.y === second.y) {
      if (other.y === first.y && other.x > minX && other.x < maxX) return false;
    } else if (other.x === first.x && other.y > minY && other.y < maxY) {
      return false;
    }
  }
  return true;
}

/** Todos los pares conectables de un tablero. */
export function createPairs(islands: readonly BridgesIsland[]): BridgesPair[] {
  const pairs: BridgesPair[] = [];
  for (let a = 0; a < islands.length; a += 1) {
    for (let b = a + 1; b < islands.length; b += 1) {
      if (isAdjacentPair(islands, a, b)) pairs.push({ a, b });
    }
  }
  return pairs;
}

export function levelPairs(level: BridgesLevel): BridgesPair[] {
  return createPairs(level.islands);
}

/** Posición del par dentro de la lista, o -1 si no son vecinas directas. */
export function findPair(pairs: readonly BridgesPair[], a: number, b: number): number {
  return pairs.findIndex(
    (pair) => (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a),
  );
}

/** 0 → 1 → 2 → 0. */
export function cycleBridge(count: number): number {
  return count >= 2 ? 0 : count + 1;
}

export function degreesOf(
  islands: readonly BridgesIsland[],
  pairs: readonly BridgesPair[],
  bridges: readonly number[],
): number[] {
  const degrees = islands.map(() => 0);
  pairs.forEach((pair, index) => {
    const count = bridges[index] ?? 0;
    if (count <= 0) return;
    degrees[pair.a] = (degrees[pair.a] ?? 0) + count;
    degrees[pair.b] = (degrees[pair.b] ?? 0) + count;
  });
  return degrees;
}

interface Segment {
  horizontal: boolean;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

function segmentOf(islands: readonly BridgesIsland[], pair: BridgesPair): Segment | null {
  const first = islands[pair.a];
  const second = islands[pair.b];
  if (!first || !second) return null;
  return {
    horizontal: first.y === second.y,
    x1: Math.min(first.x, second.x),
    x2: Math.max(first.x, second.x),
    y1: Math.min(first.y, second.y),
    y2: Math.max(first.y, second.y),
  };
}

/** Pares que se cruzan en el interior del tablero (no en una isla). */
export function crossingsOf(
  islands: readonly BridgesIsland[],
  pairs: readonly BridgesPair[],
  bridges: readonly number[],
): number[] {
  const crossings = new Set<number>();
  const active = pairs
    .map((pair, index) => ({ pair, index, count: bridges[index] ?? 0 }))
    .filter((entry) => entry.count > 0);

  for (let first = 0; first < active.length; first += 1) {
    for (let second = first + 1; second < active.length; second += 1) {
      const firstEntry = active[first]!;
      const secondEntry = active[second]!;
      const firstSegment = segmentOf(islands, firstEntry.pair);
      const secondSegment = segmentOf(islands, secondEntry.pair);
      if (!firstSegment || !secondSegment) continue;
      if (firstSegment.horizontal === secondSegment.horizontal) continue;

      const horizontal = firstSegment.horizontal ? firstSegment : secondSegment;
      const vertical = firstSegment.horizontal ? secondSegment : firstSegment;
      const crosses =
        vertical.x1 > horizontal.x1 &&
        vertical.x1 < horizontal.x2 &&
        horizontal.y1 > vertical.y1 &&
        horizontal.y1 < vertical.y2;
      if (!crosses) continue;

      crossings.add(firstEntry.index);
      crossings.add(secondEntry.index);
    }
  }

  return [...crossings].sort((a, b) => a - b);
}

function findRoot(parent: readonly number[], node: number): number {
  let current = node;
  while (parent[current] !== current) {
    const next = parent[current] ?? current;
    if (next === current) break;
    current = next;
  }
  return current;
}

/** Union-find sobre los puentes colocados. */
export function isConnected(
  islands: readonly BridgesIsland[],
  pairs: readonly BridgesPair[],
  bridges: readonly number[],
): boolean {
  if (islands.length <= 1) return true;

  const parent = islands.map((_, index) => index);
  const rank = islands.map(() => 0);

  pairs.forEach((pair, index) => {
    if ((bridges[index] ?? 0) <= 0) return;
    const rootA = findRoot(parent, pair.a);
    const rootB = findRoot(parent, pair.b);
    if (rootA === rootB) return;
    if ((rank[rootA] ?? 0) < (rank[rootB] ?? 0)) {
      parent[rootA] = rootB;
    } else if ((rank[rootA] ?? 0) > (rank[rootB] ?? 0)) {
      parent[rootB] = rootA;
    } else {
      parent[rootB] = rootA;
      rank[rootA] = (rank[rootA] ?? 0) + 1;
    }
  });

  const firstRoot = findRoot(parent, 0);
  return islands.every((_, index) => findRoot(parent, index) === firstRoot);
}

export function evaluate(
  islands: readonly BridgesIsland[],
  pairs: readonly BridgesPair[],
  bridges: readonly number[],
): BridgesEvaluation {
  const degrees = degreesOf(islands, pairs, bridges);
  const degreesMet = islands.map((island, index) => (degrees[index] ?? 0) === island.value);
  const allDegrees = degreesMet.every(Boolean);
  const crossings = crossingsOf(islands, pairs, bridges);
  const connected = isConnected(islands, pairs, bridges);
  return {
    degrees,
    degreesMet,
    allDegrees,
    crossings,
    connected,
    solved: allDegrees && crossings.length === 0 && connected,
  };
}

/** Convierte los enlaces de la solución en el array de puentes del tablero. */
export function solutionBridges(
  level: BridgesLevel,
  pairs: readonly BridgesPair[] = levelPairs(level),
): number[] {
  const positions = new Map<string, number>();
  pairs.forEach((pair, index) => {
    positions.set(`${pair.a}:${pair.b}`, index);
    positions.set(`${pair.b}:${pair.a}`, index);
  });

  const bridges = pairs.map(() => 0);
  for (const link of level.links) {
    const position = positions.get(`${link.a}:${link.b}`);
    if (position === undefined) {
      throw new Error(`El nivel "${level.name}" tiene un enlace no adyacente.`);
    }
    bridges[position] = link.count;
  }
  return bridges;
}

export function isSolved(level: BridgesLevel, bridges: readonly number[]): boolean {
  return evaluate(level.islands, levelPairs(level), bridges).solved;
}

export function bridgeTotal(bridges: readonly number[]): number {
  return bridges.reduce((total, count) => total + count, 0);
}

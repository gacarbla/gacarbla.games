export interface SoupLevel {
  id: 'facil' | 'normal' | 'dificil';
  label: string;
  size: number;
  words: readonly string[];
  diagonals: boolean;
}

export const SOUP_LEVELS: readonly SoupLevel[] = [
  {
    id: 'facil',
    label: 'Fácil',
    size: 10,
    words: ['SOL', 'MAR', 'RIO', 'LUNA', 'FLOR'],
    diagonals: false,
  },
  {
    id: 'normal',
    label: 'Normal',
    size: 12,
    words: ['SOL', 'LUNA', 'MAR', 'RIO', 'NUBE', 'FLOR'],
    diagonals: true,
  },
  {
    id: 'dificil',
    label: 'Difícil',
    size: 15,
    words: ['ESTRELLA', 'MONTANA', 'BOSQUE', 'CAMINO', 'JARDIN', 'VIENTO', 'PUENTE', 'LINTERNA'],
    diagonals: true,
  },
] as const;

export const DEFAULT_SOUP_LEVEL = 1;

export interface Placement {
  word: string;
  cells: number[];
}

export interface Soup {
  level: SoupLevel;
  size: number;
  words: readonly string[];
  letters: string[];
  placements: Placement[];
}

export interface Trace {
  word: string;
  cells: number[];
}

const ALL_DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ORTHOGONAL_DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const FILL_LETTERS = 'AAAAAEEEEIIIIOOOOOUUBCDFGHJLMNPQRSTVYZ';

function directionsFor(level: SoupLevel): readonly [number, number][] {
  return level.diagonals ? ALL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;
}

function placementAt(
  level: SoupLevel,
  letters: string[],
  word: string,
  column: number,
  row: number,
  stepX: number,
  stepY: number,
): Placement | null {
  const cells: number[] = [];
  for (let index = 0; index < word.length; index += 1) {
    const nextColumn = column + stepX * index;
    const nextRow = row + stepY * index;
    if (nextColumn < 0 || nextColumn >= level.size || nextRow < 0 || nextRow >= level.size) {
      return null;
    }
    const cell = nextRow * level.size + nextColumn;
    const existing = letters[cell]!;
    if (existing !== '' && existing !== word[index]) return null;
    cells.push(cell);
  }
  return { word, cells };
}

function writeWord(letters: string[], placement: Placement): void {
  for (let index = 0; index < placement.word.length; index += 1) {
    letters[placement.cells[index]!] = placement.word[index]!;
  }
}

function placeWord(
  level: SoupLevel,
  letters: string[],
  word: string,
  random: () => number,
): Placement | null {
  const directions = directionsFor(level);
  for (let attempt = 0; attempt < 900; attempt += 1) {
    const [stepX, stepY] = directions[Math.floor(random() * directions.length)]!;
    const column = Math.floor(random() * level.size);
    const row = Math.floor(random() * level.size);
    const placement = placementAt(level, letters, word, column, row, stepX, stepY);
    if (placement) {
      writeWord(letters, placement);
      return placement;
    }
  }

  // Reserva determinista: recorre todas las posiciones y direcciones posibles.
  for (const [stepX, stepY] of directions) {
    for (let row = 0; row < level.size; row += 1) {
      for (let column = 0; column < level.size; column += 1) {
        const placement = placementAt(level, letters, word, column, row, stepX, stepY);
        if (!placement) continue;
        writeWord(letters, placement);
        return placement;
      }
    }
  }
  return null;
}

/** Genera una sopa de letras con las palabras y direcciones de la dificultad. */
export function generateSoup(
  level: SoupLevel = SOUP_LEVELS[DEFAULT_SOUP_LEVEL]!,
  random: () => number = Math.random,
): Soup {
  const total = level.size * level.size;

  for (let round = 0; round < 40; round += 1) {
    const letters = new Array<string>(total).fill('');
    const placements: Placement[] = [];
    let complete = true;

    for (const word of level.words) {
      const placement = placeWord(level, letters, word, random);
      if (!placement) {
        complete = false;
        break;
      }
      placements.push(placement);
    }

    if (!complete) continue;

    for (let index = 0; index < letters.length; index += 1) {
      if (letters[index] !== '') continue;
      letters[index] = FILL_LETTERS[Math.floor(random() * FILL_LETTERS.length)]!;
    }

    return { level, size: level.size, words: level.words, letters, placements };
  }

  throw new Error('No se pudo generar la sopa de letras.');
}

/** Devuelve la palabra que une dos celdas, si la línea recta coincide. */
export function traceSelection(soup: Soup, from: number, to: number): Trace | null {
  if (from === to) return null;
  const size = soup.size;
  const fromColumn = from % size;
  const fromRow = Math.floor(from / size);
  const toColumn = to % size;
  const toRow = Math.floor(to / size);
  const dx = toColumn - fromColumn;
  const dy = toRow - fromRow;

  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;

  const length = Math.max(Math.abs(dx), Math.abs(dy)) + 1;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const cells: number[] = [];

  for (let index = 0; index < length; index += 1) {
    const column = fromColumn + stepX * index;
    const row = fromRow + stepY * index;
    if (column < 0 || column >= size || row < 0 || row >= size) return null;
    cells.push(row * size + column);
  }

  const text = cells.map((cell) => soup.letters[cell]!).join('');
  const reversed = [...text].reverse().join('');
  const placement = soup.placements.find(
    (candidate) => candidate.word === text || candidate.word === reversed,
  );
  return placement ? { word: placement.word, cells } : null;
}

export const SOUP_SIZE = 12;
export const WORDS = ['SOL', 'LUNA', 'MAR', 'RIO', 'NUBE', 'FLOR'] as const;

export interface Placement {
  word: string;
  cells: number[];
}

export interface Soup {
  size: number;
  letters: string[];
  placements: Placement[];
}

export interface Trace {
  word: string;
  cells: number[];
}

const DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const FILL_LETTERS = 'AAAAAEEEEIIIIOOOOOUUBCDFGHJLMNPRSTVZ';

function placementAt(
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
    if (nextColumn < 0 || nextColumn >= SOUP_SIZE || nextRow < 0 || nextRow >= SOUP_SIZE) {
      return null;
    }
    const cell = nextRow * SOUP_SIZE + nextColumn;
    const existing = letters[cell]!;
    if (existing !== '' && existing !== word[index]) return null;
    cells.push(cell);
  }
  return { word, cells };
}

function placeWord(letters: string[], word: string, random: () => number): Placement | null {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const [stepX, stepY] = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)]!;
    const column = Math.floor(random() * SOUP_SIZE);
    const row = Math.floor(random() * SOUP_SIZE);
    const placement = placementAt(letters, word, column, row, stepX, stepY);
    if (placement) {
      for (let index = 0; index < word.length; index += 1) {
        letters[placement.cells[index]!] = word[index]!;
      }
      return placement;
    }
  }

  // Reserva determinista: recorre todas las posiciones y direcciones posibles.
  for (const [stepX, stepY] of DIRECTIONS) {
    for (let row = 0; row < SOUP_SIZE; row += 1) {
      for (let column = 0; column < SOUP_SIZE; column += 1) {
        const placement = placementAt(letters, word, column, row, stepX, stepY);
        if (!placement) continue;
        for (let index = 0; index < word.length; index += 1) {
          letters[placement.cells[index]!] = word[index]!;
        }
        return placement;
      }
    }
  }
  return null;
}

/** Genera una sopa de letras con las seis palabras en direcciones variadas. */
export function generateSoup(random: () => number = Math.random): Soup {
  for (let round = 0; round < 30; round += 1) {
    const letters = new Array<string>(SOUP_SIZE * SOUP_SIZE).fill('');
    const placements: Placement[] = [];
    let complete = true;

    for (const word of WORDS) {
      const placement = placeWord(letters, word, random);
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

    return { size: SOUP_SIZE, letters, placements };
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

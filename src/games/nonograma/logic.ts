export const NONOGRAMA_SIZE = 8;

export interface NonogramaLevel {
  name: string;
  rows: readonly string[];
}

/**
 * Patrones dibujados a mano. '#' es relleno y '.' vacío.
 * El orden va de formas sencillas a formas con más tramos por línea.
 */
export const NONOGRAMA_LEVELS: readonly NonogramaLevel[] = [
  {
    name: 'Corazón',
    rows: [
      '.##..##.',
      '########',
      '########',
      '########',
      '.######.',
      '..####..',
      '...##...',
      '........',
    ],
  },
  {
    name: 'Árbol',
    rows: [
      '...##...',
      '..####..',
      '.######.',
      '########',
      '...##...',
      '...##...',
      '..####..',
      '........',
    ],
  },
  {
    name: 'Casa',
    rows: [
      '...##...',
      '..####..',
      '.######.',
      '########',
      '###..###',
      '###..###',
      '###..###',
      '........',
    ],
  },
  {
    name: 'Estrella',
    rows: [
      '...##...',
      '...##...',
      '.######.',
      '########',
      '.######.',
      '..####..',
      '.##..##.',
      '........',
    ],
  },
  {
    name: 'Gato',
    rows: [
      '##....##',
      '###..###',
      '########',
      '##.##.##',
      '########',
      '.######.',
      '.##..##.',
      '.##..##.',
    ],
  },
  {
    name: 'Llave',
    rows: [
      '..###...',
      '.#...#..',
      '.#...#..',
      '..###...',
      '...##...',
      '...##...',
      '...####.',
      '...##...',
    ],
  },
];

/** Tramos consecutivos de una línea. Una línea vacía produce [0]. */
export function cluesForLine(line: string): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const char of line) {
    if (char === '#') {
      run += 1;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length > 0 ? clues : [0];
}

export function rowClues(level: NonogramaLevel): number[][] {
  return level.rows.map((row) => cluesForLine(row));
}

export function columnClues(level: NonogramaLevel): number[][] {
  const columns: number[][] = [];
  for (let column = 0; column < NONOGRAMA_SIZE; column += 1) {
    let line = '';
    for (let row = 0; row < NONOGRAMA_SIZE; row += 1) line += level.rows[row]![column]!;
    columns.push(cluesForLine(line));
  }
  return columns;
}

export function solutionFromLevel(level: NonogramaLevel): boolean[] {
  const solution: boolean[] = [];
  for (const row of level.rows) {
    for (const char of row) solution.push(char === '#');
  }
  return solution;
}

/** Solo cuentan las celdas rellenas: las marcas de vacío son libres. */
export function matchesSolution(level: NonogramaLevel, marks: readonly number[]): boolean {
  const solution = solutionFromLevel(level);
  return solution.every((filled, index) => (marks[index] === 1) === filled);
}

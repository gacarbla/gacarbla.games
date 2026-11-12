/**
 * Los cinco almacenes son compactos (10×10 o menos) y están pensados para
 * resolverse con calma, deshaciendo cuando una caja queda bloqueada.
 */
export const LEVELS: readonly (readonly string[])[] = [
  ['#######', '#     #', '# . . #', '# $ $ #', '#  @  #', '#     #', '#######'],
  [
    '########',
    '#      #',
    '#  #   #',
    '#  $ . #',
    '#  @   #',
    '#   #  #',
    '#  $ . #',
    '#      #',
    '########',
  ],
  ['########', '#      #', '# .#.  #', '# $#$  #', '#  @   #', '#  $   #', '#  .   #', '########'],
  [
    '#########',
    '#       #',
    '# .#.#. #',
    '# $ $ $ #',
    '#   @   #',
    '#  #$#  #',
    '#   .   #',
    '#       #',
    '#########',
  ],
  [
    '##########',
    '#        #',
    '# #    # #',
    '#  $  $  #',
    '#  .##.  #',
    '#  $  $  #',
    '#  .##.  #',
    '#   @    #',
    '#        #',
    '##########',
  ],
];

export const LEVEL_NAMES = [
  'Primeros empujes',
  'Rodear el muro',
  'Tres destinos',
  'Cuatro cajas',
  'Doble pasillo',
] as const;

export interface Level {
  width: number;
  height: number;
  walls: boolean[];
  goals: boolean[];
  start: number;
  boxes: number[];
}

export interface BoxState {
  player: number;
  boxes: number[];
}

export type Move = 0 | 1 | 2 | 3;

export const MOVES: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
] as const;

export function parseLevel(rows: readonly string[]): Level {
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const walls = new Array<boolean>(width * height).fill(false);
  const goals = new Array<boolean>(width * height).fill(false);
  const boxes: number[] = [];
  let start = -1;

  for (let row = 0; row < height; row += 1) {
    const line = rows[row]!;
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const tile = line[column] ?? ' ';
      if (tile === '#') walls[index] = true;
      if (tile === '.' || tile === '*' || tile === '+') goals[index] = true;
      if (tile === '$' || tile === '*') boxes.push(index);
      if (tile === '@' || tile === '+') start = index;
    }
  }

  if (start < 0) throw new Error('El nivel de Sokoban no tiene jugador.');
  return { width, height, walls, goals, start, boxes };
}

export function createState(level: Level): BoxState {
  return { player: level.start, boxes: [...level.boxes] };
}

/** Devuelve el nuevo estado o null si el movimiento es imposible. */
export function tryMove(level: Level, state: BoxState, direction: Move): BoxState | null {
  const { dx, dy } = MOVES[direction]!;
  const width = level.width;
  const column = state.player % width;
  const row = Math.floor(state.player / width);
  const targetColumn = column + dx;
  const targetRow = row + dy;

  if (targetColumn < 0 || targetColumn >= width) return null;
  if (targetRow < 0 || targetRow >= level.height) return null;
  const target = targetRow * width + targetColumn;
  if (level.walls[target]) return null;

  const boxIndex = state.boxes.indexOf(target);
  if (boxIndex < 0) return { player: target, boxes: state.boxes };

  const beyondColumn = targetColumn + dx;
  const beyondRow = targetRow + dy;
  if (beyondColumn < 0 || beyondColumn >= width) return null;
  if (beyondRow < 0 || beyondRow >= level.height) return null;
  const beyond = beyondRow * width + beyondColumn;
  if (level.walls[beyond] || state.boxes.includes(beyond)) return null;

  const boxes = [...state.boxes];
  boxes[boxIndex] = beyond;
  return { player: target, boxes };
}

export function isSolved(level: Level, state: BoxState): boolean {
  return state.boxes.every((box) => level.goals[box]);
}

export function stateKey(state: BoxState): string {
  return `${[...state.boxes].sort((a, b) => a - b).join(',')}|${state.player}`;
}

/**
 * Los diez almacenes son compactos y están pensados para resolverse con calma,
 * deshaciendo cuando una caja queda bloqueada. Los cinco últimos suben la
 * dificultad: más recorrido, pasillos estrechos y menos margen de error.
 */
export const LEVELS: readonly (readonly string[])[] = [
  ['#######', '#     #', '# . . #', '# $ $ #', '#  @  #', '#     #', '#######'],
  [
    '########',
    '#      #',
    '#  #   #',
    '# @$ . #',
    '#      #',
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
  // A partir de aquí, los almacenes piden más recorrido y pasillos estrechos.
  ['####', '#. ##', '#.@ #', '#. $#', '##$ ###', ' # $  #', ' #    #', ' #  ###', ' ####'],
  [
    '      #####',
    '      #.  #',
    '      #.# #',
    '#######.# #',
    '# @ $ $ $ #',
    '# # # # ###',
    '#       #',
    '#########',
  ],
  [
    '#####',
    '#   ####',
    '# # # .#',
    '#    $ ###',
    '### #$.  #',
    '#   #@   #',
    '# # ######',
    '#   #',
    '#####',
  ],
  [
    '########',
    '# @ #  #',
    '#      #',
    '#####$ #',
    '    #  ###',
    ' ## #$ ..#',
    ' ## #  ###',
    '    ####',
  ],
  [
    '  ######',
    '  # ..@#',
    '  # $$ #',
    '  ## ###',
    '   # #',
    '   # #',
    '#### #',
    '#    ##',
    '# #   #',
    '#   # #',
    '###   #',
    '  #####',
  ],
];

export const LEVEL_NAMES = [
  'Primeros empujes',
  'Rodear el muro',
  'Tres destinos',
  'Cuatro cajas',
  'Doble pasillo',
  'Pasillo partido',
  'Tres en fila',
  'Sobre la cornisa',
  'Almacén largo',
  'El desván',
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
  const rawHeight = rows.length;
  const rawWidth = Math.max(...rows.map((row) => row.length));
  const rawSize = rawWidth * rawHeight;
  const rawWalls = new Array<boolean>(rawSize).fill(false);
  const rawGoals = new Array<boolean>(rawSize).fill(false);
  const rawBoxes: number[] = [];
  let rawStart = -1;

  for (let row = 0; row < rawHeight; row += 1) {
    const line = rows[row]!;
    for (let column = 0; column < rawWidth; column += 1) {
      const index = row * rawWidth + column;
      const tile = line[column] ?? ' ';
      if (tile === '#') rawWalls[index] = true;
      if (tile === '.' || tile === '*' || tile === '+') rawGoals[index] = true;
      if (tile === '$' || tile === '*') rawBoxes.push(index);
      if (tile === '@' || tile === '+') rawStart = index;
    }
  }

  if (rawStart < 0) throw new Error('El nivel de Sokoban no tiene jugador.');

  // Los tableros irregulares llegan con relleno fuera de los muros. Se marca
  // como muro todo hueco exterior alcanzable desde el borde, y luego se recorta
  // el tablero a su caja real para que quepa bien en pantalla.
  const exterior = new Array<boolean>(rawSize).fill(false);
  const queue: number[] = [];
  const visit = (row: number, column: number): void => {
    if (row < 0 || row >= rawHeight || column < 0 || column >= rawWidth) return;
    const index = row * rawWidth + column;
    if (exterior[index] || rawWalls[index]) return;
    if ((rows[row]![column] ?? ' ') !== ' ') return;
    exterior[index] = true;
    queue.push(index);
  };

  for (let column = 0; column < rawWidth; column += 1) {
    visit(0, column);
    visit(rawHeight - 1, column);
  }
  for (let row = 0; row < rawHeight; row += 1) {
    visit(row, 0);
    visit(row, rawWidth - 1);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head]!;
    const row = Math.floor(index / rawWidth);
    const column = index % rawWidth;
    visit(row - 1, column);
    visit(row + 1, column);
    visit(row, column - 1);
    visit(row, column + 1);
  }
  for (let index = 0; index < rawSize; index += 1) {
    if (exterior[index]) rawWalls[index] = true;
  }

  let minRow = rawHeight;
  let maxRow = -1;
  let minColumn = rawWidth;
  let maxColumn = -1;
  for (let row = 0; row < rawHeight; row += 1) {
    for (let column = 0; column < rawWidth; column += 1) {
      if (exterior[row * rawWidth + column]) continue;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minColumn = Math.min(minColumn, column);
      maxColumn = Math.max(maxColumn, column);
    }
  }
  if (maxRow < 0) throw new Error('El nivel de Sokoban no tiene interior.');

  const width = maxColumn - minColumn + 1;
  const height = maxRow - minRow + 1;
  const toLocal = (index: number): number => {
    const row = Math.floor(index / rawWidth) - minRow;
    const column = (index % rawWidth) - minColumn;
    return row * width + column;
  };

  const walls = new Array<boolean>(width * height).fill(false);
  const goals = new Array<boolean>(width * height).fill(false);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const raw = row * rawWidth + column;
      const local = (row - minRow) * width + (column - minColumn);
      walls[local] = rawWalls[raw]!;
      goals[local] = rawGoals[raw]!;
    }
  }

  return {
    width,
    height,
    walls,
    goals,
    start: toLocal(rawStart),
    boxes: rawBoxes.map(toLocal),
  };
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

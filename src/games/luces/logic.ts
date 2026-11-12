export const LIGHTS_SIZE = 5;

export interface LightsPuzzle {
  cells: boolean[];
  presses: number[];
}

function toggleInPlace(cells: boolean[], index: number): void {
  const column = index % LIGHTS_SIZE;
  const row = Math.floor(index / LIGHTS_SIZE);
  const targets: readonly [number, number][] = [
    [column, row],
    [column - 1, row],
    [column + 1, row],
    [column, row - 1],
    [column, row + 1],
  ];

  for (const [targetColumn, targetRow] of targets) {
    if (targetColumn < 0 || targetColumn >= LIGHTS_SIZE) continue;
    if (targetRow < 0 || targetRow >= LIGHTS_SIZE) continue;
    const target = targetRow * LIGHTS_SIZE + targetColumn;
    cells[target] = !cells[target];
  }
}

/** Pulsar una casilla alterna ella y sus cuatro vecinas ortogonales. */
export function pressLight(cells: readonly boolean[], index: number): boolean[] {
  const next = [...cells];
  toggleInPlace(next, index);
  return next;
}

export function litCount(cells: readonly boolean[]): number {
  return cells.reduce((total, lit) => total + (lit ? 1 : 0), 0);
}

/**
 * Genera un tablero resoluble aplicando entre 12 y 16 pulsaciones distintas
 * sobre un tablero apagado. Se descartan tableros ya resueltos o demasiado vacíos.
 */
export function generateLights(random: () => number = Math.random): LightsPuzzle {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const order = Array.from({ length: LIGHTS_SIZE * LIGHTS_SIZE }, (_, index) => index);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [order[index], order[swap]] = [order[swap]!, order[index]!];
    }

    const count = 12 + Math.floor(random() * 5);
    const presses = order.slice(0, count);
    const cells = new Array<boolean>(LIGHTS_SIZE * LIGHTS_SIZE).fill(false);
    for (const index of presses) toggleInPlace(cells, index);
    if (litCount(cells) >= 8) return { cells, presses };
  }

  const cells = new Array<boolean>(LIGHTS_SIZE * LIGHTS_SIZE).fill(false);
  const index = 12;
  toggleInPlace(cells, index);
  return { cells, presses: [index] };
}

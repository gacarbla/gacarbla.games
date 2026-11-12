import {
  BaseGame,
  PALETTE,
  alpha,
  cellAt,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawPuzzleHeader,
  puzzleLayout,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type View,
} from '../engine';
import { LIGHTS_SIZE, generateLights, litCount, pressLight } from './logic';

const LAYOUT = {
  top: 124,
  bottom: 92,
  maxCell: 82,
  widthRatio: 0.84,
  heightRatio: 0.54,
} as const;

class Luces extends BaseGame {
  private cells: boolean[] = [];
  private moves = 0;
  private cursor = 12;
  private time = 0;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => {
      const index = cellAt(this.layout(this.runtime.view), point.x, point.y);
      if (index !== null) this.pressAt(index);
    });
    this.input.onKeyDown((code, event) => {
      const isArrow = code.startsWith('Arrow');
      if (event.repeat && !isArrow) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    const puzzle = generateLights();
    this.cells = puzzle.cells;
    this.moves = 0;
    this.cursor = 12;
    this.time = 0;
    this.setScore('MOVIMIENTOS', 0);
  }

  protected update(dt: number): void {
    this.time += dt;
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.butter);
    const layout = this.layout(view);
    const onCount = litCount(this.cells);

    drawPuzzleHeader(
      context,
      view,
      'Luces',
      `${onCount} encendida${onCount === 1 ? '' : 's'} · apágalas todas`,
    );
    drawPuzzleBoard(context, layout);

    const pulse = this.reducedMotion ? 0.5 : 0.5 + Math.sin(this.time * 1.8) * 0.16;

    for (let index = 0; index < this.cells.length; index += 1) {
      const on = this.cells[index]!;
      drawPuzzleCell(context, layout, index, {
        fill: on ? '#f5e6b0' : '#fffdf8',
        stroke: on ? alpha(PALETTE.amber, 0.55) : alpha(PALETTE.ink, 0.12),
        strokeWidth: on ? 1.6 : 1.2,
      });

      if (!on) continue;
      const column = index % LIGHTS_SIZE;
      const row = Math.floor(index / LIGHTS_SIZE);
      const centerX = layout.x + (column + 0.5) * layout.cell;
      const centerY = layout.y + (row + 0.5) * layout.cell;
      const radius = layout.cell * 0.3;

      const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, alpha('#e0bd57', 0.5 * (0.6 + pulse)));
      gradient.addColorStop(1, alpha('#e0bd57', 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = alpha(PALETTE.amber, 0.9);
      context.beginPath();
      context.arc(centerX, centerY, layout.cell * 0.08, 0, Math.PI * 2);
      context.fill();
    }

    const column = this.cursor % LIGHTS_SIZE;
    const row = Math.floor(this.cursor / LIGHTS_SIZE);
    context.save();
    roundedRect(
      context,
      layout.x + column * layout.cell + 4,
      layout.y + row * layout.cell + 4,
      layout.cell - 8,
      layout.cell - 8,
      (layout.cell - 8) * 0.18,
    );
    context.setLineDash([5, 4]);
    context.strokeStyle = alpha(PALETTE.forest, 0.72);
    context.lineWidth = 2;
    context.stroke();
    context.restore();

    drawPuzzleFooter(
      context,
      view,
      `MOVIMIENTOS ${this.moves}`,
      `PUNTOS ${Math.max(0, 800 - this.moves * 20)}`,
      'Flechas mover · ESPACIO pulsar · R reiniciar',
    );
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, LIGHTS_SIZE, LIGHTS_SIZE, LAYOUT);
  }

  private handleKey(code: string): void {
    if (code === 'KeyR') {
      this.reset();
      return;
    }

    const column = this.cursor % LIGHTS_SIZE;
    const row = Math.floor(this.cursor / LIGHTS_SIZE);
    if (code === 'ArrowLeft') this.cursor = row * LIGHTS_SIZE + Math.max(0, column - 1);
    if (code === 'ArrowRight')
      this.cursor = row * LIGHTS_SIZE + Math.min(LIGHTS_SIZE - 1, column + 1);
    if (code === 'ArrowUp') this.cursor = Math.max(0, row - 1) * LIGHTS_SIZE + column;
    if (code === 'ArrowDown') {
      this.cursor = Math.min(LIGHTS_SIZE - 1, row + 1) * LIGHTS_SIZE + column;
    }
    if (code === 'Space') this.pressAt(this.cursor);
  }

  private pressAt(index: number): void {
    if (index < 0 || index >= this.cells.length) return;
    this.cursor = index;
    this.cells = pressLight(this.cells, index);
    this.moves += 1;
    this.setScore('MOVIMIENTOS', this.moves);
    this.audio.tone(this.cells[index] ? 520 : 380, 0.06, { type: 'triangle', gain: 0.06 });

    if (this.cells.every((cell) => !cell)) {
      const score = Math.max(0, 800 - this.moves * 20);
      this.audio.chord([523.25, 659.25, 783.99], 0.45, { type: 'triangle', gain: 0.1 });
      this.finish({
        title: 'Todas apagadas',
        message:
          this.moves <= 12
            ? 'Has encontrado una secuencia muy corta.'
            : `Has apagado el tablero en ${this.moves} pulsaciones.`,
        detail: `${this.moves} movimientos`,
        score,
        scoreLabel: 'PUNTOS',
        tone: 'win',
      });
    }
  }
}

export default {
  mount: (context: GameContext) => new Luces(context),
} satisfies GameModule;

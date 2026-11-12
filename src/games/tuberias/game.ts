import {
  BaseGame,
  PALETTE,
  alpha,
  cellAt,
  clamp,
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
import {
  EAST,
  PIPE_DIRECTIONS,
  PIPE_SIZE,
  WEST,
  connectedFrom,
  generatePipes,
  rotatePipe,
} from './logic';

const LAYOUT = {
  top: 118,
  bottom: 80,
  maxCell: 62,
  widthRatio: 0.9,
  heightRatio: 0.54,
} as const;

class Tuberias extends BaseGame {
  private masks: number[] = [];
  private source = 0;
  private exit = 0;
  private connected = new Set<number>();
  private moves = 0;
  private cursor = 0;
  private time = 0;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => {
      const index = cellAt(this.layout(this.runtime.view), point.x, point.y);
      if (index !== null) this.rotateAt(index);
    });
    this.input.onKeyDown((code, event) => {
      const isArrow = code.startsWith('Arrow');
      if (event.repeat && !isArrow) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    const puzzle = generatePipes();
    this.masks = puzzle.masks;
    this.source = puzzle.source;
    this.exit = puzzle.exit;
    this.connected = connectedFrom(this.masks, this.source);
    this.moves = 0;
    this.cursor = puzzle.source;
    this.time = 0;
    this.setScore('MOVIMIENTOS', 0);
  }

  protected update(dt: number): void {
    this.time += dt;
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.sage);
    const layout = this.layout(view);

    drawPuzzleHeader(
      context,
      view,
      'Tuberías',
      `${this.moves} giro${this.moves === 1 ? '' : 's'} · conecta la fuente con la salida`,
    );
    drawPuzzleBoard(context, layout);

    const fed = (this.masks[this.source]! & WEST) !== 0;
    const exitReached = this.connected.has(this.exit) && (this.masks[this.exit]! & EAST) !== 0;
    const lineWidth = Math.max(3, layout.cell * 0.15);

    for (let index = 0; index < this.masks.length; index += 1) {
      const connected = this.connected.has(index);
      drawPuzzleCell(context, layout, index, {
        fill: connected ? alpha(PALETTE.sage, 0.2) : 'rgba(255, 253, 248, 0.86)',
        stroke: connected ? alpha(PALETTE.forest, 0.3) : alpha(PALETTE.ink, 0.1),
        strokeWidth: connected ? 1.6 : 1.1,
      });

      const column = index % PIPE_SIZE;
      const row = Math.floor(index / PIPE_SIZE);
      const centerX = layout.x + (column + 0.5) * layout.cell;
      const centerY = layout.y + (row + 0.5) * layout.cell;
      const mask = this.masks[index]!;
      const color = connected ? PALETTE.forest : alpha(PALETTE.ink, 0.36);

      context.save();
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      for (const direction of PIPE_DIRECTIONS) {
        if ((mask & direction.bit) === 0) continue;
        const edgeX = centerX + (direction.dx * layout.cell) / 2;
        const edgeY = centerY + (direction.dy * layout.cell) / 2;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(edgeX, edgeY);
        context.stroke();
      }
      context.fillStyle = color;
      context.beginPath();
      context.arc(centerX, centerY, lineWidth * 0.46, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    this.drawMarkers(context, layout, fed, exitReached);

    const column = this.cursor % PIPE_SIZE;
    const row = Math.floor(this.cursor / PIPE_SIZE);
    context.save();
    roundedRect(
      context,
      layout.x + column * layout.cell + 3,
      layout.y + row * layout.cell + 3,
      layout.cell - 6,
      layout.cell - 6,
      layout.cell * 0.16,
    );
    context.setLineDash([5, 4]);
    context.strokeStyle = alpha(PALETTE.apricot, 0.85);
    context.lineWidth = 2;
    context.stroke();
    context.restore();

    drawPuzzleFooter(
      context,
      view,
      `MOVIMIENTOS ${this.moves}`,
      `PUNTOS ${Math.max(0, 1200 - this.moves * 10)}`,
      'Flechas mover · ESPACIO rotar · R reiniciar',
    );
  }

  private drawMarkers(
    context: CanvasRenderingContext2D,
    layout: PuzzleLayout,
    fed: boolean,
    reached: boolean,
  ): void {
    const sourceRow = Math.floor(this.source / PIPE_SIZE);
    const exitRow = Math.floor(this.exit / PIPE_SIZE);
    const offset = clamp(layout.cell * 0.18, 6, 10);
    const radius = clamp(layout.cell * 0.16, 5, 9);
    const sourceX = layout.x - offset;
    const sourceY = layout.y + (sourceRow + 0.5) * layout.cell;
    const exitX = layout.x + layout.width + offset;
    const exitY = layout.y + (exitRow + 0.5) * layout.cell;

    context.save();
    context.lineCap = 'round';
    context.lineWidth = Math.max(3, layout.cell * 0.15);

    context.strokeStyle = fed ? PALETTE.forest : alpha(PALETTE.ink, 0.18);
    context.beginPath();
    context.moveTo(sourceX, sourceY);
    context.lineTo(layout.x, sourceY);
    context.stroke();

    context.strokeStyle = reached ? PALETTE.forest : alpha(PALETTE.ink, 0.18);
    context.beginPath();
    context.moveTo(layout.x + layout.width, exitY);
    context.lineTo(exitX, exitY);
    context.stroke();

    if (fed) {
      const glow = context.createRadialGradient(
        sourceX,
        sourceY,
        0,
        sourceX,
        sourceY,
        layout.cell * 0.5,
      );
      glow.addColorStop(0, alpha(PALETTE.sage, 0.45));
      glow.addColorStop(1, alpha(PALETTE.sage, 0));
      context.fillStyle = glow;
      context.beginPath();
      context.arc(sourceX, sourceY, layout.cell * 0.5, 0, Math.PI * 2);
      context.fill();
    }

    context.beginPath();
    context.arc(sourceX, sourceY, radius, 0, Math.PI * 2);
    context.fillStyle = fed ? PALETTE.forest : alpha(PALETTE.ink, 0.24);
    context.fill();
    context.strokeStyle = PALETTE.surface;
    context.lineWidth = 2;
    context.stroke();

    context.beginPath();
    context.moveTo(exitX + radius, exitY);
    context.lineTo(exitX - radius * 0.7, exitY - radius);
    context.lineTo(exitX - radius * 0.7, exitY + radius);
    context.closePath();
    context.fillStyle = reached ? PALETTE.apricot : alpha(PALETTE.ink, 0.24);
    context.fill();
    context.strokeStyle = PALETTE.surface;
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, PIPE_SIZE, PIPE_SIZE, LAYOUT);
  }

  private handleKey(code: string): void {
    if (code === 'KeyR') {
      this.reset();
      return;
    }
    const column = this.cursor % PIPE_SIZE;
    const row = Math.floor(this.cursor / PIPE_SIZE);
    if (code === 'ArrowLeft' && column > 0) this.cursor -= 1;
    if (code === 'ArrowRight' && column < PIPE_SIZE - 1) this.cursor += 1;
    if (code === 'ArrowUp' && row > 0) this.cursor -= PIPE_SIZE;
    if (code === 'ArrowDown' && row < PIPE_SIZE - 1) this.cursor += PIPE_SIZE;
    if (code === 'Space') this.rotateAt(this.cursor);
  }

  private rotateAt(index: number): void {
    if (index < 0 || index >= this.masks.length) return;
    this.cursor = index;
    this.masks[index] = rotatePipe(this.masks[index]!);
    this.moves += 1;
    this.setScore('MOVIMIENTOS', this.moves);
    this.connected = connectedFrom(this.masks, this.source);
    this.audio.tone(360 + (index % 7) * 35, 0.05, { type: 'triangle', gain: 0.05 });

    const reached = this.connected.has(this.exit) && (this.masks[this.exit]! & EAST) !== 0;
    if (!reached) return;

    const score = Math.max(0, 1200 - this.moves * 10);
    this.audio.chord([392, 523.25, 659.25], 0.5, { type: 'triangle', gain: 0.1 });
    this.finish({
      title: 'Fuente conectada',
      message: 'El agua recorre la red de tuberías hasta la salida.',
      detail: `${this.moves} giros`,
      score,
      scoreLabel: 'PUNTOS',
      tone: 'win',
    });
  }
}

export default {
  mount: (context: GameContext) => new Tuberias(context),
} satisfies GameModule;

import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
  drawUiButton,
  glowCircle,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import { STEPS, generateMaze, neighbor, type Direction, type Maze } from './logic';

const SIZE = 15;
const FOG_RADIUS = 3;
const START_SCORE = 1200;

interface MazeLayout {
  cols: number;
  rows: number;
  cell: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

class Laberinto extends BaseGame {
  private maze: Maze = generateMaze(SIZE);
  private player = 0;
  private collected = new Set<number>();
  private visited = new Set<number>();
  private moves = 0;
  private keysHeld = 0;
  private done = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onKeyDown((code) => {
      const direction = this.directionFor(code);
      if (direction !== null) {
        this.move(direction);
        return;
      }
      if (code === 'KeyR') {
        this.reset();
        this.setStatus('Nuevo laberinto. Las llaves han cambiado de sitio.');
      }
    });

    this.input.onPointerDown((point) => {
      const buttons = this.padButtons(this.runtime.view);
      for (let direction = 0; direction < 4; direction += 1) {
        if (pointInButton(point.x, point.y, buttons[direction]!)) {
          this.move(direction as Direction);
          return;
        }
      }
    });
  }

  protected reset(): void {
    this.maze = generateMaze(SIZE);
    this.player = this.maze.start;
    this.collected = new Set<number>();
    this.visited = new Set<number>([this.maze.start]);
    this.moves = 0;
    this.keysHeld = 0;
    this.done = false;
    this.setScore('PUNTOS', START_SCORE);
  }

  protected update(): void {
    // El laberinto es estático: no hay animación que avanzar.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const accent = '#8fb397';
    drawPuzzleBackground(context, view, accent);

    const layout = this.layout(view);
    drawPuzzleBoard(context, layout, { fill: 'rgba(255, 253, 248, 0.5)' });

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.62);
    context.fillText(
      `LLAVES ${this.keysHeld}/3 · ${this.moves} PASOS`,
      view.width / 2,
      layout.y - 16,
    );
    context.restore();

    const playerColumn = this.player % SIZE;
    const playerRow = Math.floor(this.player / SIZE);

    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const column = index % SIZE;
      const row = Math.floor(index / SIZE);
      const distance = Math.max(Math.abs(column - playerColumn), Math.abs(row - playerRow));

      if (distance > FOG_RADIUS) {
        if (this.visited.has(index)) {
          context.save();
          context.fillStyle = alpha(PALETTE.forest, 0.13);
          context.beginPath();
          context.arc(
            layout.x + column * layout.cell + layout.cell / 2,
            layout.y + row * layout.cell + layout.cell / 2,
            Math.max(1, layout.cell * 0.07),
            0,
            Math.PI * 2,
          );
          context.fill();
          context.restore();
        }
        continue;
      }

      const clarity = distance >= FOG_RADIUS ? 0.55 : 1;
      this.drawCell(context, layout, index, clarity);
    }

    // Llaves y salida se dibujan solo si están dentro de la niebla.
    for (const key of this.maze.keys) {
      if (this.collected.has(key) || !this.isVisible(key)) continue;
      this.drawKey(context, layout, key);
    }

    if (this.isVisible(this.maze.exit)) {
      this.drawExit(context, layout, this.maze.exit, this.keysHeld >= 3);
    }

    const visible = this.isVisible(this.player);
    if (visible) {
      const x = layout.x + playerColumn * layout.cell + layout.cell / 2;
      const y = layout.y + playerRow * layout.cell + layout.cell / 2;
      if (!this.reducedMotion) {
        glowCircle(context, x, y, layout.cell * 3.2, accent, 0.12);
      }
      context.save();
      context.beginPath();
      context.arc(x, y, layout.cell * 0.3, 0, Math.PI * 2);
      context.fillStyle = PALETTE.forest;
      context.fill();
      context.strokeStyle = alpha(PALETTE.surface, 0.9);
      context.lineWidth = Math.max(1.5, layout.cell * 0.08);
      context.stroke();
      context.beginPath();
      context.arc(
        x - layout.cell * 0.08,
        y - layout.cell * 0.05,
        layout.cell * 0.07,
        0,
        Math.PI * 2,
      );
      context.fillStyle = alpha(PALETTE.surface, 0.85);
      context.fill();
      context.restore();
    }

    const buttons = this.padButtons(view);
    const labels = ['↑', '→', '↓', '←'];
    for (let index = 0; index < buttons.length; index += 1) {
      drawUiButton(context, buttons[index]!, labels[index]!, { accent });
    }

    drawPuzzleFooter(
      context,
      view,
      `Llaves ${this.keysHeld}/3 · ${this.moves} pasos`,
      this.keysHeld >= 3 ? `Salida ${this.compass()}` : 'Salida cerrada',
    );
  }

  private layout(view: View): MazeLayout {
    const top = 92;
    const bottom = 132;
    const cell = clamp(
      Math.min((view.width - 24) / SIZE, (view.height - top - bottom) / SIZE),
      10,
      38,
    );
    const width = cell * SIZE;
    const height = cell * SIZE;
    const available = Math.max(120, view.height - top - bottom);
    return {
      cols: SIZE,
      rows: SIZE,
      cell,
      x: (view.width - width) / 2,
      y: top + Math.max(0, (available - height) / 2),
      width,
      height,
    };
  }

  private padButtons(view: View): UiButton[] {
    const layout = this.layout(view);
    const boardBottom = layout.y + layout.height;
    const room = Math.max(60, view.height - 38 - boardBottom);
    const size = clamp(room / 3.7, 20, 42);
    const gap = size * 0.16;
    const centerX = view.width / 2;
    const centerY = boardBottom + room / 2;
    const middle = centerY - size / 2;
    return [
      { x: centerX - size / 2, y: middle - size - gap, width: size, height: size },
      { x: centerX + gap + size / 2, y: middle, width: size, height: size },
      { x: centerX - size / 2, y: middle + size + gap, width: size, height: size },
      { x: centerX - size - gap - size / 2, y: middle, width: size, height: size },
    ];
  }

  private drawCell(
    context: CanvasRenderingContext2D,
    layout: MazeLayout,
    index: number,
    clarity: number,
  ): void {
    const column = index % SIZE;
    const row = Math.floor(index / SIZE);
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;
    const cell = layout.cell;

    context.save();
    roundedRect(context, x + 0.5, y + 0.5, cell - 1, cell - 1, Math.max(2, cell * 0.1));
    context.fillStyle = alpha('#fffdf8', 0.62 * clarity);
    context.fill();
    context.restore();

    const walls = this.maze.walls[index]!;
    context.save();
    context.strokeStyle = alpha(PALETTE.forest, 0.58 * clarity);
    context.lineWidth = Math.max(1.5, cell * 0.09);
    context.lineCap = 'round';
    context.beginPath();
    if (walls & STEPS[0]!.wall) {
      context.moveTo(x, y);
      context.lineTo(x + cell, y);
    }
    if (walls & STEPS[1]!.wall) {
      context.moveTo(x + cell, y);
      context.lineTo(x + cell, y + cell);
    }
    if (walls & STEPS[2]!.wall) {
      context.moveTo(x, y + cell);
      context.lineTo(x + cell, y + cell);
    }
    if (walls & STEPS[3]!.wall) {
      context.moveTo(x, y);
      context.lineTo(x, y + cell);
    }
    context.stroke();
    context.restore();
  }

  private drawKey(context: CanvasRenderingContext2D, layout: MazeLayout, index: number): void {
    const x = layout.x + (index % SIZE) * layout.cell + layout.cell / 2;
    const y = layout.y + Math.floor(index / SIZE) * layout.cell + layout.cell / 2;
    const unit = layout.cell * 0.22;
    context.save();
    context.strokeStyle = PALETTE.amber;
    context.fillStyle = alpha(PALETTE.amber, 0.22);
    context.lineWidth = Math.max(1.5, layout.cell * 0.08);
    context.beginPath();
    context.arc(x - unit * 0.5, y, unit, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(x + unit * 0.4, y);
    context.lineTo(x + unit * 1.4, y);
    context.moveTo(x + unit * 1.1, y);
    context.lineTo(x + unit * 1.1, y + unit * 0.55);
    context.stroke();
    context.restore();
  }

  private drawExit(
    context: CanvasRenderingContext2D,
    layout: MazeLayout,
    index: number,
    open: boolean,
  ): void {
    const x = layout.x + (index % SIZE) * layout.cell + layout.cell / 2;
    const y = layout.y + Math.floor(index / SIZE) * layout.cell + layout.cell / 2;
    const width = layout.cell * 0.52;
    const height = layout.cell * 0.66;
    context.save();
    roundedRect(context, x - width / 2, y - height / 2, width, height, width * 0.32);
    context.fillStyle = open ? alpha(PALETTE.forest, 0.3) : alpha(PALETTE.ink, 0.08);
    context.fill();
    context.strokeStyle = open ? PALETTE.forest : alpha(PALETTE.ink, 0.35);
    context.lineWidth = Math.max(1.5, layout.cell * 0.07);
    context.stroke();
    if (open) {
      context.beginPath();
      context.moveTo(x - width * 0.16, y);
      context.lineTo(x + width * 0.16, y);
      context.moveTo(x, y - height * 0.16);
      context.lineTo(x + width * 0.16, y);
      context.lineTo(x, y + height * 0.16);
      context.strokeStyle = PALETTE.surface;
      context.stroke();
    }
    context.restore();
  }

  private isVisible(index: number): boolean {
    const column = index % SIZE;
    const row = Math.floor(index / SIZE);
    const playerColumn = this.player % SIZE;
    const playerRow = Math.floor(this.player / SIZE);
    return Math.max(Math.abs(column - playerColumn), Math.abs(row - playerRow)) <= FOG_RADIUS;
  }

  private compass(): string {
    const dx = (this.maze.exit % SIZE) - (this.player % SIZE);
    const dy = Math.floor(this.maze.exit / SIZE) - Math.floor(this.player / SIZE);
    if (dx === 0 && dy === 0) return 'aquí';
    const vertical = dy < 0 ? 'N' : dy > 0 ? 'S' : '';
    const horizontal = dx > 0 ? 'E' : dx < 0 ? 'O' : '';
    return `${vertical}${horizontal}`;
  }

  private directionFor(code: string): Direction | null {
    if (code === 'ArrowUp' || code === 'KeyW') return 0;
    if (code === 'ArrowRight' || code === 'KeyD') return 1;
    if (code === 'ArrowDown' || code === 'KeyS') return 2;
    if (code === 'ArrowLeft' || code === 'KeyA') return 3;
    return null;
  }

  private move(direction: Direction): void {
    if (this.done) return;
    const next = neighbor(this.maze, this.player, direction);
    if (next === null) {
      this.audio.tone(150, 0.05, { type: 'triangle', gain: 0.03 });
      return;
    }

    this.player = next;
    this.moves += 1;
    this.visited.add(next);
    this.audio.tone(420 + (direction === 0 ? 30 : 0), 0.035, { gain: 0.025 });
    this.setScore('PUNTOS', this.points());

    if (this.maze.keys.includes(next) && !this.collected.has(next)) {
      this.collected.add(next);
      this.keysHeld = this.collected.size;
      this.audio.chord([523.25, 698.46], 0.28, { gain: 0.08 });
      this.setStatus(
        this.keysHeld === 3
          ? 'Tienes las tres llaves. La salida está abierta.'
          : `Llave ${this.keysHeld} de 3.`,
      );
    }

    if (next === this.maze.exit) {
      if (this.keysHeld >= 3) {
        this.done = true;
        this.audio.chord([392, 523.25, 659.25, 783.99], 0.5, { gain: 0.1 });
        this.finish({
          title: 'Salida encontrada',
          message: 'Las tres llaves abrieron la puerta.',
          detail: `${this.moves} pasos`,
          score: this.points(),
          scoreLabel: 'PUNTOS',
          tone: 'win',
        });
      } else {
        this.toast(`La salida sigue cerrada: faltan ${3 - this.keysHeld} llaves.`);
      }
    }
  }

  private points(): number {
    return Math.max(0, START_SCORE - this.moves * 2);
  }
}

export default {
  mount: (context: GameContext) => new Laberinto(context),
} satisfies GameModule;

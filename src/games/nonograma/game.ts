import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  cellAt,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawUiButton,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  NONOGRAMA_LEVELS,
  NONOGRAMA_SIZE,
  columnClues,
  matchesSolution,
  rowClues,
  type NonogramaLevel,
} from './logic';

interface NonoGeometry {
  layout: PuzzleLayout;
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

const EMPTY = 0;
const FILLED = 1;
const CROSSED = 2;

class Nonograma extends BaseGame {
  private level = 0;
  private marks: number[] = Array<number>(NONOGRAMA_SIZE * NONOGRAMA_SIZE).fill(EMPTY);
  private rowHints: number[][] = rowClues(NONOGRAMA_LEVELS[0]!);
  private columnHints: number[][] = columnClues(NONOGRAMA_LEVELS[0]!);
  private cursor = 0;
  private solved = false;
  private solvedTimer = 0;
  private pendingAdvance = false;
  private finished = false;
  private readonly canvas: HTMLCanvasElement;

  constructor(context: GameContext) {
    super(context);
    this.canvas = context.canvas;
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  destroy(): void {
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    super.destroy();
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.level = (this.level + 1) % NONOGRAMA_LEVELS.length;
    } else {
      this.level = 0;
    }
    this.loadLevel(NONOGRAMA_LEVELS[this.level]!);
    this.setScore('NIVEL', `${this.level + 1}/${NONOGRAMA_LEVELS.length}`);
  }

  private loadLevel(level: NonogramaLevel): void {
    this.marks = Array<number>(NONOGRAMA_SIZE * NONOGRAMA_SIZE).fill(EMPTY);
    this.rowHints = rowClues(level);
    this.columnHints = columnClues(level);
    this.cursor = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.finished = false;
  }

  private currentLevel(): NonogramaLevel {
    return NONOGRAMA_LEVELS[this.level]!;
  }

  private geometry(view: View): NonoGeometry {
    const cell = clamp(Math.min((view.width * 0.84) / 9.7, (view.height * 0.56) / 9.7), 20, 52);
    const clueWidth = cell * 1.7;
    const clueHeight = cell * 1.7;
    const width = cell * NONOGRAMA_SIZE;
    const height = cell * NONOGRAMA_SIZE;
    const totalWidth = clueWidth + width;
    const totalHeight = clueHeight + height;
    const top = 118;
    const bottom = 118;
    const available = view.height - top - bottom;
    const boardY = top + clueHeight + Math.max(0, (available - totalHeight) / 2);
    const boardX = (view.width - totalWidth) / 2 + clueWidth;
    const layout: PuzzleLayout = {
      cols: NONOGRAMA_SIZE,
      rows: NONOGRAMA_SIZE,
      cell,
      x: boardX,
      y: boardY,
      width,
      height,
    };
    const buttonWidth = Math.min(200, view.width * 0.62);
    const buttonHeight = 42;
    return {
      layout,
      nextButton: {
        x: (view.width - buttonWidth) / 2,
        y: view.height / 2 + 38,
        width: buttonWidth,
        height: buttonHeight,
      },
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (
        this.level < NONOGRAMA_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.nextButton)
      ) {
        this.pendingAdvance = true;
        this.restart();
      }
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;
    this.toggleFill(index);
  }

  private handleContextMenu = (event: MouseEvent): void => {
    if (this.state !== 'running' || this.solved) return;
    event.preventDefault();
    const rectangle = this.canvas.getBoundingClientRect();
    const geometry = this.geometry(this.runtime.view);
    const index = cellAt(
      geometry.layout,
      event.clientX - rectangle.left,
      event.clientY - rectangle.top,
    );
    if (index === null) return;
    this.cursor = index;
    this.toggleCross(index);
  };

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.solved) return;
    const column = this.cursor % NONOGRAMA_SIZE;
    const row = Math.floor(this.cursor / NONOGRAMA_SIZE);

    if (code === 'ArrowLeft') {
      this.cursor = row * NONOGRAMA_SIZE + Math.max(0, column - 1);
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowRight') {
      this.cursor = row * NONOGRAMA_SIZE + Math.min(NONOGRAMA_SIZE - 1, column + 1);
      this.audio.tone(320, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowUp') {
      this.cursor = Math.max(0, row - 1) * NONOGRAMA_SIZE + column;
      this.audio.tone(300, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'ArrowDown') {
      this.cursor = Math.min(NONOGRAMA_SIZE - 1, row + 1) * NONOGRAMA_SIZE + column;
      this.audio.tone(320, 0.03, { type: 'triangle', gain: 0.018 });
      return;
    }
    if (code === 'Space' || code === 'Enter') {
      this.toggleFill(this.cursor);
      return;
    }
    if (code === 'KeyX') this.toggleCross(this.cursor);
  }

  private toggleFill(index: number): void {
    if (this.solved) return;
    this.marks[index] = this.marks[index] === FILLED ? EMPTY : FILLED;
    this.audio.tone(this.marks[index] === FILLED ? 430 : 300, 0.045, {
      type: 'triangle',
      gain: 0.03,
    });
    this.checkSolved();
  }

  private toggleCross(index: number): void {
    if (this.solved) return;
    this.marks[index] = this.marks[index] === CROSSED ? EMPTY : CROSSED;
    this.audio.tone(this.marks[index] === CROSSED ? 360 : 280, 0.04, {
      type: 'triangle',
      gain: 0.022,
    });
  }

  private checkSolved(): void {
    if (!matchesSolution(this.currentLevel(), this.marks)) return;
    this.solved = true;
    this.solvedTimer = 0;
    this.audio.chord([392, 494, 587], 0.5, { type: 'sine', gain: 0.09 });
    this.setStatus(`Patrón completado: ${this.currentLevel().name}.`);
    if (this.level === NONOGRAMA_LEVELS.length - 1) {
      this.setScore('NIVEL', `${NONOGRAMA_LEVELS.length}/${NONOGRAMA_LEVELS.length}`);
    }
  }

  private finishSession(): void {
    if (this.finished) return;
    this.finished = true;
    this.setStatus('Los seis patrones están resueltos.');
    this.audio.chord([392, 494, 587, 784], 0.9, { type: 'sine', gain: 0.1 });
    this.finish({
      title: 'Seis patrones',
      message: 'Has completado todos los nonogramas sin dejar una sola pista sin leer.',
      detail: 'Corazón · Árbol · Casa · Estrella · Gato · Llave',
      score: NONOGRAMA_LEVELS.length,
      scoreLabel: 'NIVELES',
      ctaLabel: 'Volver a empezar',
      tone: 'win',
    });
  }

  protected update(dt: number): void {
    if (!this.solved) return;
    this.solvedTimer += dt;
    if (this.level === NONOGRAMA_LEVELS.length - 1 && this.solvedTimer > 1) {
      this.finishSession();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, '#8fb397');
    const geometry = this.geometry(view);
    const { layout } = geometry;

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('NONOGRAMA', view.width / 2, 72);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText(`${this.level + 1} DE ${NONOGRAMA_LEVELS.length} · 8 × 8`, view.width / 2, 90);
    context.restore();

    drawPuzzleBoard(
      context,
      {
        ...layout,
        x: layout.x - layout.cell * 1.7,
        y: layout.y - layout.cell * 1.7,
        width: layout.width + layout.cell * 1.7,
        height: layout.height + layout.cell * 1.7,
      },
      { padding: 0 },
    );
    this.drawHints(context, layout);

    for (let index = 0; index < NONOGRAMA_SIZE * NONOGRAMA_SIZE; index += 1) {
      const column = index % NONOGRAMA_SIZE;
      const row = Math.floor(index / NONOGRAMA_SIZE);
      const state = this.marks[index]!;
      const cursor = index === this.cursor && this.state === 'running' && !this.solved;
      const fill = state === FILLED ? PALETTE.forest : state === CROSSED ? '#f2eee3' : '#fffdf8';
      const stroke =
        state === FILLED
          ? alpha(PALETTE.forest, 0.8)
          : cursor
            ? PALETTE.sky
            : 'rgba(36, 51, 45, 0.13)';

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke,
        strokeWidth: cursor ? 2 : 1.3,
        text: state === CROSSED ? '×' : '',
        textColor: alpha(PALETTE.ink, 0.45),
        fontSize: Math.max(10, layout.cell * 0.38),
      });

      if (state === FILLED) {
        context.save();
        context.fillStyle = alpha(PALETTE.surface, 0.16);
        roundedRect(
          context,
          layout.x + column * layout.cell + layout.cell * 0.28,
          layout.y + row * layout.cell + layout.cell * 0.28,
          layout.cell * 0.44,
          layout.cell * 0.44,
          layout.cell * 0.12,
        );
        context.fill();
        context.restore();
      }
    }

    context.save();
    context.strokeStyle = alpha(PALETTE.forest, 0.22);
    context.lineWidth = 1.5;
    const middleX = layout.x + layout.width / 2;
    const middleY = layout.y + layout.height / 2;
    context.beginPath();
    context.moveTo(middleX, layout.y);
    context.lineTo(middleX, layout.y + layout.height);
    context.moveTo(layout.x, middleY);
    context.lineTo(layout.x + layout.width, middleY);
    context.stroke();
    context.restore();

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${NONOGRAMA_LEVELS.length}`,
      `RELLENAS ${this.filledCount()}`,
      'CLIC RELLENA · DERECHO / X MARCA',
    );

    if (this.solved && this.level < NONOGRAMA_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawHints(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const fontSize = Math.max(9, layout.cell * 0.29);
    const gap = Math.max(9, layout.cell * 0.36);
    context.save();
    context.font = `600 ${fontSize}px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (let row = 0; row < NONOGRAMA_SIZE; row += 1) {
      const hints = this.rowHints[row]!;
      const y = layout.y + (row + 0.5) * layout.cell;
      context.textAlign = 'right';
      for (let index = 0; index < hints.length; index += 1) {
        const x = layout.x - 8 - (hints.length - 1 - index) * gap;
        context.fillStyle =
          this.rowHints[row]![index] === 0 ? alpha(PALETTE.ink, 0.3) : alpha(PALETTE.ink, 0.7);
        context.fillText(String(hints[index]!), x, y + 1);
      }
    }

    for (let column = 0; column < NONOGRAMA_SIZE; column += 1) {
      const hints = this.columnHints[column]!;
      const x = layout.x + (column + 0.5) * layout.cell;
      context.textAlign = 'center';
      for (let index = 0; index < hints.length; index += 1) {
        const y = layout.y - 8 - (hints.length - 1 - index) * gap;
        context.fillStyle = hints[index] === 0 ? alpha(PALETTE.ink, 0.3) : alpha(PALETTE.ink, 0.7);
        context.fillText(String(hints[index]!), x, y);
      }
    }
    context.restore();
  }

  private filledCount(): number {
    return this.marks.reduce((total, mark) => total + (mark === FILLED ? 1 : 0), 0);
  }

  private drawOverlay(context: CanvasRenderingContext2D, view: View, geometry: NonoGeometry): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.26);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.82);
    const height = 196;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 104;
    roundedRect(context, x, y, width, height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.forest, 0.8);
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 38);
    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, y + 72);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText('La siguiente figura espera.', view.width / 2, y + 98);

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.forest,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Nonograma(context),
} satisfies GameModule;

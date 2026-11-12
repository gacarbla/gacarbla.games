import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  cellAt,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  SUDOKU_BOX_COLS,
  SUDOKU_BOX_ROWS,
  SUDOKU_SIZE,
  conflictMask,
  createPuzzle,
  type SudokuPuzzle,
} from './logic';

interface SudokuGeometry {
  layout: PuzzleLayout;
  buttons: UiButton[];
}

interface LocalPoint {
  x: number;
  y: number;
}

class Sudoku extends BaseGame {
  private puzzle: SudokuPuzzle = createPuzzle();
  private values: number[] = [...this.puzzle.puzzle];
  private given: boolean[] = this.puzzle.puzzle.map((value) => value !== 0);
  private selected = 0;
  private errors = 0;
  private finished = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    this.puzzle = createPuzzle();
    this.values = [...this.puzzle.puzzle];
    this.given = this.puzzle.puzzle.map((value) => value !== 0);
    this.selected = this.values.findIndex((value) => value === 0);
    if (this.selected < 0) this.selected = 0;
    this.errors = 0;
    this.finished = false;
    this.setScore('PUNTOS', 800);
  }

  private geometry(view: View): SudokuGeometry {
    const layout = puzzleLayout(view, SUDOKU_SIZE, SUDOKU_SIZE, {
      top: 112,
      bottom: 150,
      widthRatio: 0.68,
      heightRatio: Math.max(0.3, (view.height - 264) / view.height),
      maxCell: 70,
    });
    const gap = 6;
    const width = Math.min(46, (layout.width - gap * (SUDOKU_SIZE - 1)) / SUDOKU_SIZE);
    const total = width * SUDOKU_SIZE + gap * (SUDOKU_SIZE - 1);
    const y = Math.min(view.height - 82, layout.y + layout.height + 16);
    const buttons: UiButton[] = [];
    for (let index = 0; index < SUDOKU_SIZE; index += 1) {
      buttons.push({
        x: (view.width - total) / 2 + index * (width + gap),
        y,
        width,
        height: 36,
      });
    }
    return { layout, buttons };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running' || this.finished) return;
    const geometry = this.geometry(this.runtime.view);

    for (let index = 0; index < geometry.buttons.length; index += 1) {
      if (pointInButton(point.x, point.y, geometry.buttons[index]!)) {
        this.place(index + 1, true);
        this.audio.click();
        return;
      }
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.selected = index;
    this.audio.tone(300, 0.035, { type: 'triangle', gain: 0.025 });
    if (this.given[index]) this.setStatus('Esa pista no se puede cambiar.');
  }

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.finished) return;
    const column = this.selected % SUDOKU_SIZE;
    const row = Math.floor(this.selected / SUDOKU_SIZE);

    if (code === 'ArrowLeft') {
      this.selected = row * SUDOKU_SIZE + Math.max(0, column - 1);
      return;
    }
    if (code === 'ArrowRight') {
      this.selected = row * SUDOKU_SIZE + Math.min(SUDOKU_SIZE - 1, column + 1);
      return;
    }
    if (code === 'ArrowUp') {
      this.selected = Math.max(0, row - 1) * SUDOKU_SIZE + column;
      return;
    }
    if (code === 'ArrowDown') {
      this.selected = Math.min(SUDOKU_SIZE - 1, row + 1) * SUDOKU_SIZE + column;
      return;
    }
    if (code === 'Backspace' || code === 'Delete' || code === 'Digit0' || code === 'Numpad0') {
      this.place(0, false);
      return;
    }

    const digit = code.startsWith('Digit')
      ? Number(code.slice(5))
      : code.startsWith('Numpad')
        ? Number(code.slice(6))
        : 0;
    if (digit >= 1 && digit <= SUDOKU_SIZE) this.place(digit, false);
  }

  private place(value: number, toggle: boolean): void {
    if (this.given[this.selected]) {
      this.audio.tone(180, 0.08, { type: 'triangle', gain: 0.03 });
      return;
    }
    if (toggle && this.values[this.selected] === value) {
      this.place(0, false);
      return;
    }

    const previous = this.values[this.selected]!;
    if (previous === value) return;
    this.values[this.selected] = value;

    if (value !== 0 && value !== this.puzzle.solution[this.selected]) {
      this.errors += 1;
      this.setScore('PUNTOS', this.points());
      this.audio.tone(190, 0.13, { type: 'triangle', gain: 0.05 });
      this.setStatus(`Ese número no es el correcto. ${this.errors} fallos.`);
    } else if (value !== 0) {
      this.setScore('PUNTOS', this.points());
      this.audio.tone(410 + value * 28, 0.055, { type: 'triangle', gain: 0.03 });
    } else {
      this.setScore('PUNTOS', this.points());
      this.audio.tone(280, 0.04, { type: 'triangle', gain: 0.025 });
    }

    if (this.values.every((cell, index) => cell === this.puzzle.solution[index])) this.win();
  }

  private points(): number {
    return Math.max(0, 800 - this.errors * 25);
  }

  private win(): void {
    if (this.finished) return;
    this.finished = true;
    const score = this.points();
    this.setScore('PUNTOS', score);
    this.setStatus(`Sudoku resuelto con ${this.errors} fallos.`);
    this.audio.chord([392, 494, 587, 784], 0.75, { type: 'sine', gain: 0.09 });
    this.finish({
      title: 'Sudoku resuelto',
      message: 'Todas las filas, columnas y cajas respetan la regla del 1 al 6.',
      detail: `${this.errors} fallos · ${this.given.filter(Boolean).length} pistas iniciales`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Otro sudoku',
      tone: 'win',
    });
  }

  protected update(): void {
    // Juego de lógica pausado: la interacción mueve todo el estado.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, '#a78fbf');
    const geometry = this.geometry(view);
    const { layout } = geometry;
    const conflicts = conflictMask(this.values);
    const selectedRow = Math.floor(this.selected / SUDOKU_SIZE);
    const selectedColumn = this.selected % SUDOKU_SIZE;

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('SUDOKU', view.width / 2, 72);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText('6 × 6 · CAJAS 2 × 3', view.width / 2, 90);
    context.restore();

    drawPuzzleBoard(context, layout);

    for (let index = 0; index < this.values.length; index += 1) {
      const row = Math.floor(index / SUDOKU_SIZE);
      const column = index % SUDOKU_SIZE;
      const value = this.values[index]!;
      const sameBox =
        Math.floor(row / SUDOKU_BOX_ROWS) === Math.floor(selectedRow / SUDOKU_BOX_ROWS) &&
        Math.floor(column / SUDOKU_BOX_COLS) === Math.floor(selectedColumn / SUDOKU_BOX_COLS);
      const sameUnit = row === selectedRow || column === selectedColumn || sameBox;
      const selected = index === this.selected;

      let fill = '#fffdf8';
      if (conflicts[index]) fill = alpha(PALETTE.apricot, 0.2);
      else if (selected) fill = alpha(PALETTE.sky, 0.2);
      else if (this.given[index]) fill = '#f7f2e7';
      else if (sameUnit) fill = alpha(PALETTE.sky, 0.06);

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke: selected ? PALETTE.sky : 'rgba(36, 51, 45, 0.12)',
        strokeWidth: selected ? 2 : 1.2,
        text: value > 0 ? String(value) : '',
        textColor: conflicts[index]
          ? PALETTE.apricot
          : this.given[index]
            ? PALETTE.ink
            : PALETTE.forest,
      });
    }

    context.save();
    context.strokeStyle = alpha(PALETTE.forest, 0.6);
    context.lineWidth = 2;
    for (let row = SUDOKU_BOX_ROWS; row < SUDOKU_SIZE; row += SUDOKU_BOX_ROWS) {
      const y = layout.y + row * layout.cell;
      context.beginPath();
      context.moveTo(layout.x, y);
      context.lineTo(layout.x + layout.width, y);
      context.stroke();
    }
    for (let column = SUDOKU_BOX_COLS; column < SUDOKU_SIZE; column += SUDOKU_BOX_COLS) {
      const x = layout.x + column * layout.cell;
      context.beginPath();
      context.moveTo(x, layout.y);
      context.lineTo(x, layout.y + layout.height);
      context.stroke();
    }
    context.strokeStyle = alpha(PALETTE.forest, 0.7);
    context.lineWidth = 2.2;
    context.strokeRect(layout.x, layout.y, layout.width, layout.height);
    context.restore();

    const selectedValue = this.values[this.selected] ?? 0;
    for (let index = 0; index < geometry.buttons.length; index += 1) {
      drawUiButton(context, geometry.buttons[index]!, String(index + 1), {
        active: selectedValue === index + 1,
        accent: PALETTE.sky,
        disabled: this.given[this.selected],
      });
    }

    drawPuzzleFooter(
      context,
      view,
      `FALLOS ${this.errors}`,
      `PUNTOS ${this.points()}`,
      'FLECHAS MUEVEN · 1–6 ESCRIBE · BORRAR',
    );
  }
}

export default {
  mount: (context: GameContext) => new Sudoku(context),
} satisfies GameModule;

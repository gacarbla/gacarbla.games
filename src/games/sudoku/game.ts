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
  drawSegmented,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  segmentedButtons,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  DEFAULT_SUDOKU_LEVEL,
  SUDOKU_LEVELS,
  conflictMask,
  createPuzzle,
  type SudokuLevel,
  type SudokuPuzzle,
} from './logic';

interface SudokuGeometry {
  layout: PuzzleLayout;
  buttons: UiButton[];
  difficulty: UiButton[];
}

interface LocalPoint {
  x: number;
  y: number;
}

class Sudoku extends BaseGame {
  private difficulty = DEFAULT_SUDOKU_LEVEL;
  private level: SudokuLevel = SUDOKU_LEVELS[this.difficulty]!;
  private puzzle: SudokuPuzzle = createPuzzle(this.level);
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
    this.puzzle = createPuzzle(this.level);
    this.values = [...this.puzzle.puzzle];
    this.given = this.puzzle.puzzle.map((value) => value !== 0);
    this.selected = this.values.findIndex((value) => value === 0);
    if (this.selected < 0) this.selected = 0;
    this.errors = 0;
    this.finished = false;
    this.setScore('PUNTOS', this.points());
  }

  private setDifficulty(index: number): void {
    if (index < 0 || index >= SUDOKU_LEVELS.length || index === this.difficulty) return;
    this.difficulty = index;
    this.level = SUDOKU_LEVELS[index]!;
    this.reset();
    this.audio.click();
    this.setStatus(
      `${this.level.label}: sudoku ${this.level.size}×${this.level.size} con ${this.level.minGivens} pistas o menos.`,
    );
  }

  private geometry(view: View): SudokuGeometry {
    const size = this.level.size;
    const layout = puzzleLayout(view, size, size, {
      top: 156,
      bottom: 150,
      widthRatio: size === 9 ? 0.84 : 0.68,
      heightRatio: Math.max(0.3, (view.height - 306) / view.height),
      maxCell: size === 9 ? 54 : 70,
    });
    const gap = 6;
    const maxWidth = size === 9 ? 34 : 46;
    const width = Math.min(maxWidth, (layout.width - gap * (size - 1)) / size);
    const total = width * size + gap * (size - 1);
    const y = Math.min(view.height - 82, layout.y + layout.height + 16);
    const buttons: UiButton[] = [];
    for (let index = 0; index < size; index += 1) {
      buttons.push({
        x: (view.width - total) / 2 + index * (width + gap),
        y,
        width,
        height: 36,
      });
    }
    return {
      layout,
      buttons,
      difficulty: segmentedButtons(view, SUDOKU_LEVELS.length, 104),
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running' || this.finished) return;
    const geometry = this.geometry(this.runtime.view);

    const difficultyIndex = geometry.difficulty.findIndex((button) =>
      pointInButton(point.x, point.y, button),
    );
    if (difficultyIndex >= 0) {
      this.setDifficulty(difficultyIndex);
      return;
    }

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
    const size = this.level.size;
    const column = this.selected % size;
    const row = Math.floor(this.selected / size);

    if (code === 'ArrowLeft') {
      this.selected = row * size + Math.max(0, column - 1);
      return;
    }
    if (code === 'ArrowRight') {
      this.selected = row * size + Math.min(size - 1, column + 1);
      return;
    }
    if (code === 'ArrowUp') {
      this.selected = Math.max(0, row - 1) * size + column;
      return;
    }
    if (code === 'ArrowDown') {
      this.selected = Math.min(size - 1, row + 1) * size + column;
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
    if (digit >= 1 && digit <= size) this.place(digit, false);
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
      message: 'Todas las filas, columnas y cajas respetan la regla.',
      detail: `${this.level.size}×${this.level.size} · ${this.errors} fallos · ${this.given.filter(Boolean).length} pistas`,
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
    const size = this.level.size;
    const conflicts = conflictMask(this.level, this.values);
    const selectedRow = Math.floor(this.selected / size);
    const selectedColumn = this.selected % size;

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('SUDOKU', view.width / 2, 70);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText(
      `${size} × ${size} · CAJAS ${this.level.boxRows} × ${this.level.boxCols}`,
      view.width / 2,
      88,
    );
    context.restore();

    drawSegmented(
      context,
      geometry.difficulty,
      SUDOKU_LEVELS.map((level) => level.label),
      this.difficulty,
      PALETTE.sky,
    );

    drawPuzzleBoard(context, layout);

    for (let index = 0; index < this.values.length; index += 1) {
      const row = Math.floor(index / size);
      const column = index % size;
      const value = this.values[index]!;
      const sameBox =
        Math.floor(row / this.level.boxRows) === Math.floor(selectedRow / this.level.boxRows) &&
        Math.floor(column / this.level.boxCols) === Math.floor(selectedColumn / this.level.boxCols);
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
    for (let row = this.level.boxRows; row < size; row += this.level.boxRows) {
      const y = layout.y + row * layout.cell;
      context.beginPath();
      context.moveTo(layout.x, y);
      context.lineTo(layout.x + layout.width, y);
      context.stroke();
    }
    for (let column = this.level.boxCols; column < size; column += this.level.boxCols) {
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
      `FLECHAS MUEVEN · 1–${size} ESCRIBE · BORRAR`,
    );
  }
}

export default {
  mount: (context: GameContext) => new Sudoku(context),
} satisfies GameModule;

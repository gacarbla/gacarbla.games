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
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  DEFAULT_SKYSCRAPER_LEVEL,
  SKYSCRAPER_LEVELS,
  SKYSCRAPER_SIZE,
  clueViolations,
  conflictMask,
  isColumnComplete,
  isRowComplete,
  isSolved,
  type SkyscraperLevel,
} from './logic';

const ACCENT = '#7fa9c2';

interface CompletePanel {
  x: number;
  y: number;
  width: number;
  height: number;
  button: UiButton;
}

interface SkyscraperGeometry {
  layout: PuzzleLayout;
  gutter: number;
  clueSize: number;
  numbers: UiButton[];
  erase: UiButton;
  reset: UiButton;
  panel: CompletePanel;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Skyscrapers extends BaseGame {
  private levelIndex = DEFAULT_SKYSCRAPER_LEVEL;
  private level: SkyscraperLevel = SKYSCRAPER_LEVELS[DEFAULT_SKYSCRAPER_LEVEL]!;
  private values: number[] = [...this.level.givens];
  private given: boolean[] = this.level.givens.map((value) => value !== 0);
  private selected = 0;
  private errors = 0;
  private complete = false;
  private pendingAdvance = false;
  private finished = false;
  private levelScores: number[] = [];

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.levelIndex = Math.min(this.levelIndex + 1, SKYSCRAPER_LEVELS.length - 1);
      this.pendingAdvance = false;
    } else if (this.finished) {
      this.levelIndex = DEFAULT_SKYSCRAPER_LEVEL;
      this.levelScores = [];
    }

    this.level = SKYSCRAPER_LEVELS[this.levelIndex]!;
    this.values = [...this.level.givens];
    this.given = this.level.givens.map((value) => value !== 0);
    this.selected = this.values.findIndex((value) => value === 0);
    if (this.selected < 0) this.selected = 0;
    this.errors = 0;
    this.complete = false;
    this.finished = false;
    this.setScore('PUNTOS', this.earnedScore());
  }

  private earnedScore(): number {
    return this.levelScores.reduce((total, value) => total + value, 0);
  }

  private levelScore(): number {
    return Math.max(200, 1000 - this.errors * 50);
  }

  private geometry(view: View): SkyscraperGeometry {
    const layout = puzzleLayout(view, SKYSCRAPER_SIZE, SKYSCRAPER_SIZE, {
      top: 132,
      bottom: 166,
      widthRatio: 0.7,
      heightRatio: 0.54,
      maxCell: 72,
    });

    const gutter = Math.max(22, Math.min(32, layout.cell * 0.46));
    const clueSize = Math.min(24, Math.max(18, layout.cell * 0.4));

    const gap = 6;
    const buttonWidth = Math.min(
      52,
      (layout.width - gap * (SKYSCRAPER_SIZE - 1)) / SKYSCRAPER_SIZE,
    );
    const buttonsWidth = buttonWidth * SKYSCRAPER_SIZE + gap * (SKYSCRAPER_SIZE - 1);
    const buttonsY = Math.min(
      view.height - 110,
      layout.y + layout.height + gutter * 0.9 + clueSize / 2 + 14,
    );
    const numbers = Array.from({ length: SKYSCRAPER_SIZE }, (_, index) => ({
      x: (view.width - buttonsWidth) / 2 + index * (buttonWidth + gap),
      y: buttonsY,
      width: buttonWidth,
      height: 40,
    }));

    const utilityWidth = Math.min(140, (layout.width - 8) / 2);
    const utilityY = buttonsY + 40 + 8;
    const erase: UiButton = {
      x: view.width / 2 - utilityWidth - 4,
      y: utilityY,
      width: utilityWidth,
      height: 34,
    };
    const reset: UiButton = {
      x: view.width / 2 + 4,
      y: utilityY,
      width: utilityWidth,
      height: 34,
    };

    return {
      layout,
      gutter,
      clueSize,
      numbers,
      erase,
      reset,
      panel: this.completePanel(view, layout),
    };
  }

  private completePanel(view: View, layout: PuzzleLayout): CompletePanel {
    const width = Math.min(360, Math.max(280, view.width * 0.8));
    const height = 214;
    const y = Math.max(
      128,
      Math.min(view.height - height - 96, layout.y + layout.height / 2 - height / 2),
    );
    const buttonWidth = Math.min(220, width - 56);
    return {
      x: (view.width - width) / 2,
      y,
      width,
      height,
      button: {
        x: (view.width - buttonWidth) / 2,
        y: y + height - 62,
        width: buttonWidth,
        height: 40,
      },
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.complete) {
      if (this.pendingAdvance && pointInButton(point.x, point.y, geometry.panel.button)) {
        this.advance();
      }
      return;
    }

    if (pointInButton(point.x, point.y, geometry.erase)) {
      this.place(0, false);
      return;
    }
    if (pointInButton(point.x, point.y, geometry.reset)) {
      this.restartLevel();
      return;
    }

    const number = geometry.numbers.findIndex((button) => pointInButton(point.x, point.y, button));
    if (number >= 0) {
      this.place(number + 1, true);
      this.audio.click();
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.selected = index;
    this.audio.tone(300, 0.035, { type: 'triangle', gain: 0.025 });
    if (this.given[index]) {
      this.setStatus('Esa pista no se puede cambiar.');
    } else {
      const row = Math.floor(index / SKYSCRAPER_SIZE) + 1;
      const column = (index % SKYSCRAPER_SIZE) + 1;
      this.setStatus(`Celda seleccionada: fila ${row}, columna ${column}.`);
    }
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.complete) {
      if (code === 'Enter' || code === 'Space') this.advance();
      return;
    }

    const size = SKYSCRAPER_SIZE;
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
    if (code === 'KeyR') {
      this.restartLevel();
      return;
    }

    const digit = code.startsWith('Digit')
      ? Number(code.slice(5))
      : code.startsWith('Numpad')
        ? Number(code.slice(6))
        : 0;
    if (digit >= 1 && digit <= size) this.place(digit, false);
  }

  private restartLevel(): void {
    if (this.complete) return;
    this.audio.click();
    this.reset();
    this.setStatus(`Nivel ${this.levelIndex + 1} reiniciado.`);
  }

  private place(value: number, toggle: boolean): void {
    if (this.state !== 'running' || this.complete) return;

    if (this.given[this.selected]) {
      this.audio.tone(170, 0.08, { type: 'triangle', gain: 0.03 });
      this.setStatus('Esa pista no se puede cambiar.');
      return;
    }

    const current = this.values[this.selected] ?? 0;
    const next = toggle && value !== 0 && current === value ? 0 : value;
    if (current === next) return;
    this.values[this.selected] = next;

    const conflicts = conflictMask(this.values);
    let broken = next !== 0 && conflicts[this.selected] === true;
    if (!broken && next !== 0) broken = this.lineClueBroken(this.selected);

    if (broken) {
      this.errors += 1;
      this.audio.tone(185, 0.12, { type: 'triangle', gain: 0.05 });
      this.setStatus(
        conflicts[this.selected]
          ? 'Ese número repite en la fila o en la columna.'
          : 'Las pistas de esa línea todavía no cuadran.',
      );
    } else if (next === 0) {
      this.audio.tone(280, 0.04, { type: 'triangle', gain: 0.025 });
    } else {
      this.audio.tone(360 + next * 36, 0.05, { type: 'triangle', gain: 0.03 });
    }

    if (isSolved(this.values, this.level.clues)) {
      this.solveLevel();
      return;
    }

    if (this.values.every((cell) => cell !== 0)) {
      this.setStatus('El tablero está lleno, pero alguna pista no cuadra.');
    }
  }

  private lineClueBroken(index: number): boolean {
    const row = Math.floor(index / SKYSCRAPER_SIZE);
    const column = index % SKYSCRAPER_SIZE;
    const violations = clueViolations(this.values, this.level.clues);
    const rowBroken =
      isRowComplete(this.values, row) &&
      (violations.left[row] === true || violations.right[row] === true);
    const columnBroken =
      isColumnComplete(this.values, column) &&
      (violations.top[column] === true || violations.bottom[column] === true);
    return rowBroken || columnBroken;
  }

  private solveLevel(): void {
    if (this.complete) return;
    this.complete = true;
    const score = this.levelScore();
    this.levelScores[this.levelIndex] = score;
    this.setScore('PUNTOS', this.earnedScore());
    this.audio.chord([392, 494, 587, 784], 0.6, { type: 'sine', gain: 0.09 });

    if (this.levelIndex >= SKYSCRAPER_LEVELS.length - 1) {
      this.finished = true;
      const total = this.earnedScore();
      this.setStatus(`Rascacielos resuelto con ${this.errors} fallos.`);
      this.finish({
        title: 'Rascacielos resuelto',
        message: 'Las cinco torres respetan filas, columnas y pistas.',
        detail: `${SKYSCRAPER_LEVELS.length} niveles · ${this.errors} fallos`,
        score: total,
        scoreLabel: 'PUNTOS',
        ctaLabel: 'Jugar de nuevo',
        tone: 'win',
      });
      return;
    }

    this.pendingAdvance = true;
    this.setStatus(`Nivel ${this.levelIndex + 1} completado. Pulsa Siguiente nivel.`);
  }

  private advance(): void {
    if (!this.complete || !this.pendingAdvance) return;
    this.audio.click();
    this.pendingAdvance = true;
    this.restart();
    this.setStatus(
      `Nivel ${this.levelIndex + 1} de ${SKYSCRAPER_LEVELS.length}: ${this.level.label}.`,
    );
  }

  protected update(): void {
    // Juego de lógica pausado: la interacción mueve todo el estado.
  }

  private drawClue(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: number,
    options: { size: number; highlight: boolean; bad: boolean },
  ): void {
    const { size, highlight, bad } = options;
    const half = size / 2;
    roundedRect(context, x - half, y - half, size, size, size * 0.32);
    context.fillStyle = bad
      ? alpha(PALETTE.apricot, 0.22)
      : highlight
        ? alpha(ACCENT, 0.26)
        : 'rgba(255, 253, 248, 0.94)';
    context.fill();
    context.strokeStyle = bad
      ? alpha(PALETTE.apricot, 0.85)
      : highlight
        ? alpha(ACCENT, 0.8)
        : alpha(PALETTE.ink, 0.16);
    context.lineWidth = bad || highlight ? 1.8 : 1.2;
    context.stroke();

    context.font = `700 ${Math.max(10, size * 0.62)}px ${FONT_MONO}`;
    context.fillStyle = bad ? PALETTE.apricot : highlight ? PALETTE.ink : PALETTE.inkSoft;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(value), x, y + 1);
  }

  private drawComplete(context: CanvasRenderingContext2D, view: View): void {
    const panel = this.geometry(view).panel;
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.12);
    context.fillRect(0, 0, view.width, view.height);

    roundedRect(context, panel.x, panel.y, panel.width, panel.height, 20);
    context.fillStyle = 'rgba(255, 253, 248, 0.97)';
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    context.font = `600 20px ${FONT_SANS}`;
    context.fillText('Nivel completado', view.width / 2, panel.y + 44);

    context.fillStyle = alpha(PALETTE.ink, 0.6);
    context.font = `500 12px ${FONT_SANS}`;
    const failures = this.errors === 1 ? '1 fallo' : `${this.errors} fallos`;
    context.fillText(
      `${this.level.label} · ${failures} · nivel ${this.levelIndex + 1} de ${SKYSCRAPER_LEVELS.length}`,
      view.width / 2,
      panel.y + 72,
    );

    context.fillStyle = PALETTE.forest;
    context.font = `600 12px ${FONT_MONO}`;
    context.fillText(
      `+${this.levelScores[this.levelIndex] ?? this.levelScore()} puntos`,
      view.width / 2,
      panel.y + 98,
    );

    drawUiButton(context, panel.button, 'Siguiente nivel', {
      active: true,
      accent: ACCENT,
    });

    context.fillStyle = alpha(PALETTE.ink, 0.48);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillText('Enter o toque para continuar', view.width / 2, panel.y + 202);
    context.restore();
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const geometry = this.geometry(view);
    const { layout, gutter, clueSize } = geometry;
    const size = SKYSCRAPER_SIZE;
    const conflicts = conflictMask(this.values);
    const violations = clueViolations(this.values, this.level.clues);
    const selectedRow = Math.floor(this.selected / size);
    const selectedColumn = this.selected % size;

    drawPuzzleHeader(
      context,
      view,
      'RASCACIELOS',
      `NIVEL ${this.levelIndex + 1} DE ${SKYSCRAPER_LEVELS.length} · 6 × 6`,
    );

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 9px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.5);
    context.fillText(
      'Cada pista indica cuántos edificios se ven desde ese borde.',
      view.width / 2,
      122,
    );
    context.restore();

    drawPuzzleBoard(context, layout, { padding: 9 });

    for (let index = 0; index < this.values.length; index += 1) {
      const row = Math.floor(index / size);
      const column = index % size;
      const value = this.values[index] ?? 0;
      const selected = index === this.selected;
      const sameRow = row === selectedRow;
      const sameColumn = column === selectedColumn;

      let fill = '#fffdf8';
      if (conflicts[index]) fill = alpha(PALETTE.apricot, 0.22);
      else if (selected) fill = alpha(ACCENT, 0.22);
      else if (this.given[index]) fill = '#f4f0e6';
      else if (sameRow || sameColumn) fill = alpha(ACCENT, 0.07);

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke: selected ? ACCENT : 'rgba(36, 51, 45, 0.12)',
        strokeWidth: selected ? 2.2 : 1.2,
        text: value > 0 ? String(value) : '',
        textColor: conflicts[index]
          ? PALETTE.apricot
          : this.given[index]
            ? PALETTE.ink
            : PALETTE.forest,
        fontSize: Math.max(14, layout.cell * 0.38),
      });
    }

    const clueY = layout.y - gutter * 0.9;
    const clueBottomY = layout.y + layout.height + gutter * 0.9;
    const clueLeftX = layout.x - gutter * 0.9;
    const clueRightX = layout.x + layout.width + gutter * 0.9;

    for (let column = 0; column < size; column += 1) {
      const centerX = layout.x + column * layout.cell + layout.cell / 2;
      this.drawClue(context, centerX, clueY, this.level.clues.top[column]!, {
        size: clueSize,
        highlight: column === selectedColumn,
        bad: violations.top[column] === true,
      });
      this.drawClue(context, centerX, clueBottomY, this.level.clues.bottom[column]!, {
        size: clueSize,
        highlight: column === selectedColumn,
        bad: violations.bottom[column] === true,
      });
    }
    for (let row = 0; row < size; row += 1) {
      const centerY = layout.y + row * layout.cell + layout.cell / 2;
      this.drawClue(context, clueLeftX, centerY, this.level.clues.left[row]!, {
        size: clueSize,
        highlight: row === selectedRow,
        bad: violations.left[row] === true,
      });
      this.drawClue(context, clueRightX, centerY, this.level.clues.right[row]!, {
        size: clueSize,
        highlight: row === selectedRow,
        bad: violations.right[row] === true,
      });
    }

    const selectedValue = this.values[this.selected] ?? 0;
    const locked = this.given[this.selected] === true;
    for (let index = 0; index < geometry.numbers.length; index += 1) {
      drawUiButton(context, geometry.numbers[index]!, String(index + 1), {
        active: selectedValue === index + 1,
        accent: ACCENT,
        disabled: locked,
      });
    }
    drawUiButton(context, geometry.erase, 'Borrar', {
      accent: ACCENT,
      disabled: locked || selectedValue === 0,
    });
    drawUiButton(context, geometry.reset, 'Reiniciar', { accent: PALETTE.apricot });

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.levelIndex + 1}/${SKYSCRAPER_LEVELS.length}`,
      `FALLOS ${this.errors}`,
      'Flechas · 1–6 · Borrar · R reinicia',
    );

    if (this.complete && this.pendingAdvance) this.drawComplete(context, view);
  }
}

export default {
  mount: (context: GameContext) => new Skyscrapers(context),
} satisfies GameModule;

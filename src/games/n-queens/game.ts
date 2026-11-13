import {
  BaseGame,
  FONT_MONO,
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
  readNumber,
  roundedRect,
  writeNumber,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  QUEENS_SIZE,
  attackedCells,
  conflictingQueens,
  createEmptyRows,
  isSolved,
  queenCount,
  toggleQueen,
} from './logic';

const ACCENT = '#a78fbf';
const RECORD_KEY = 'n-queens:record';
const LAYOUT = {
  top: 126,
  bottom: 92,
  widthRatio: 0.84,
  heightRatio: 0.68,
  maxCell: 78,
} as const;

class OchoDamas extends BaseGame {
  private rows: number[] = createEmptyRows();
  private cursor = 27;
  private placements = 0;
  private record = 0;
  private elapsed = 0;
  private solved = false;
  private solvedTimer = 0;
  private finished = false;
  private finalScore = 0;
  private finalTime = 0;
  private newRecord = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point.x, point.y));
    this.input.onKeyDown((code, event) => {
      if (event.repeat) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    this.rows = createEmptyRows();
    this.cursor = 27;
    this.placements = 0;
    this.elapsed = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.finished = false;
    this.finalScore = 0;
    this.finalTime = 0;
    this.newRecord = false;
    this.record = readNumber(RECORD_KEY, 0);
    this.setScore('COLOCACIONES', 0);
  }

  protected update(dt: number): void {
    if (this.solved) {
      this.solvedTimer += dt;
      if (this.solvedTimer >= 0.85) this.finishGame();
      return;
    }
    this.elapsed += dt;
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const layout = this.layout(view);
    const attackMap = attackedCells(this.rows);
    const conflicts = new Set(conflictingQueens(this.rows));
    const queens = queenCount(this.rows);

    drawPuzzleHeader(
      context,
      view,
      'OCHO DAMAS',
      `${queens} de 8 damas · ${
        conflicts.size === 0
          ? 'sin ataques'
          : conflicts.size === 1
            ? '1 dama atacada'
            : `${conflicts.size} damas atacadas`
      }`,
    );
    drawPuzzleBoard(context, layout, { padding: 10 });
    this.drawCoordinates(context, layout);

    for (let index = 0; index < QUEENS_SIZE * QUEENS_SIZE; index += 1) {
      const column = index % QUEENS_SIZE;
      const row = Math.floor(index / QUEENS_SIZE);
      const dark = (column + row) % 2 === 1;
      const occupied = this.rows[column] === row;
      const threatened = !occupied && attackMap[index] === true;
      const selected = this.state === 'running' && !this.solved && index === this.cursor;
      const conflict = occupied && conflicts.has(column);

      const fill = threatened ? (dark ? '#ecd2c2' : '#f6e1d3') : dark ? '#e5d9c6' : '#f7f1e4';

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke: conflict
          ? PALETTE.apricot
          : selected
            ? alpha(PALETTE.forest, 0.82)
            : alpha(PALETTE.ink, 0.12),
        strokeWidth: conflict || selected ? 2 : 1.2,
        dashed: selected,
      });

      const centerX = layout.x + (column + 0.5) * layout.cell;
      const centerY = layout.y + (row + 0.5) * layout.cell;

      if (threatened) {
        context.save();
        context.fillStyle = alpha(PALETTE.apricot, 0.38);
        context.beginPath();
        context.arc(centerX, centerY, layout.cell * 0.052, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      if (occupied) {
        this.drawQueen(
          context,
          centerX,
          centerY,
          layout.cell,
          conflict ? PALETTE.apricot : PALETTE.violet,
        );
      }
    }

    const button = this.resetButton(layout, view);
    drawUiButton(context, button, this.solved ? 'TABLERO RESUELTO' : 'REINICIAR', {
      active: this.solved,
      accent: ACCENT,
    });

    drawPuzzleFooter(
      context,
      view,
      `COLOCACIONES ${this.placements}`,
      this.record > 0 ? `RÉCORD ${this.record} mov.` : 'RÉCORD —',
      'Flechas mover · ESPACIO colocar · R reiniciar',
    );
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, QUEENS_SIZE, QUEENS_SIZE, LAYOUT);
  }

  private resetButton(layout: PuzzleLayout, view: View): UiButton {
    const width = Math.min(190, view.width * 0.56);
    return {
      x: (view.width - width) / 2,
      y: layout.y + layout.height + 16,
      width,
      height: 36,
    };
  }

  private drawCoordinates(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    context.save();
    context.font = `600 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.42);
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (let column = 0; column < QUEENS_SIZE; column += 1) {
      context.fillText(
        String.fromCharCode(65 + column),
        layout.x + (column + 0.5) * layout.cell,
        layout.y - 15,
      );
    }
    for (let row = 0; row < QUEENS_SIZE; row += 1) {
      context.fillText(
        String(QUEENS_SIZE - row),
        layout.x - 15,
        layout.y + (row + 0.5) * layout.cell,
      );
    }
    context.restore();
  }

  private drawQueen(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    color: string,
  ): void {
    context.save();
    context.translate(centerX, centerY);
    context.fillStyle = color;
    context.shadowColor = alpha(PALETTE.ink, 0.2);
    context.shadowBlur = size * 0.08;
    context.shadowOffsetY = size * 0.03;

    roundedRect(context, -size * 0.27, size * 0.16, size * 0.54, size * 0.1, size * 0.04);
    context.fill();

    context.beginPath();
    context.moveTo(-size * 0.21, size * 0.18);
    context.lineTo(-size * 0.11, -size * 0.02);
    context.lineTo(size * 0.11, -size * 0.02);
    context.lineTo(size * 0.21, size * 0.18);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(-size * 0.24, -size * 0.04);
    context.lineTo(-size * 0.2, -size * 0.22);
    context.lineTo(-size * 0.07, -size * 0.08);
    context.lineTo(0, -size * 0.27);
    context.lineTo(size * 0.07, -size * 0.08);
    context.lineTo(size * 0.2, -size * 0.22);
    context.lineTo(size * 0.24, -size * 0.04);
    context.closePath();
    context.fill();

    context.shadowColor = 'transparent';
    context.fillStyle = alpha(PALETTE.surface, 0.7);
    context.beginPath();
    context.arc(0, -size * 0.27, size * 0.034, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }

  private handlePointer(x: number, y: number): void {
    if (this.state !== 'running' || this.solved) return;
    const view = this.runtime.view;
    const layout = this.layout(view);

    if (pointInButton(x, y, this.resetButton(layout, view))) {
      this.reset();
      this.audio.click();
      return;
    }

    const index = cellAt(layout, x, y);
    if (index !== null) this.toggleAt(index);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (code === 'KeyR') {
      this.reset();
      this.audio.click();
      return;
    }
    if (this.solved) return;

    const column = this.cursor % QUEENS_SIZE;
    const row = Math.floor(this.cursor / QUEENS_SIZE);
    let nextColumn = column;
    let nextRow = row;

    if (code === 'ArrowLeft') nextColumn = Math.max(0, column - 1);
    else if (code === 'ArrowRight') nextColumn = Math.min(QUEENS_SIZE - 1, column + 1);
    else if (code === 'ArrowUp') nextRow = Math.max(0, row - 1);
    else if (code === 'ArrowDown') nextRow = Math.min(QUEENS_SIZE - 1, row + 1);
    else if (code === 'Space' || code === 'Enter') {
      this.toggleAt(this.cursor);
      return;
    } else return;

    this.cursor = nextRow * QUEENS_SIZE + nextColumn;
    this.audio.tone(300, 0.025, { type: 'triangle', gain: 0.016 });
  }

  private toggleAt(index: number): void {
    if (this.state !== 'running' || this.solved) return;

    const column = index % QUEENS_SIZE;
    const row = Math.floor(index / QUEENS_SIZE);
    this.rows = toggleQueen(this.rows, column, row);
    this.cursor = index;

    const placed = this.rows[column] === row;
    if (placed) {
      this.placements += 1;
      this.setScore('COLOCACIONES', this.placements);
    }

    const conflicts = conflictingQueens(this.rows);
    const hasConflict = conflicts.length > 0;
    if (placed && conflicts.includes(column)) {
      this.audio.tone(220, 0.09, { type: 'triangle', gain: 0.035 });
    } else if (placed) {
      this.audio.tone(520, 0.07, { type: 'triangle', gain: 0.04 });
    } else {
      this.audio.tone(320, 0.05, { type: 'triangle', gain: 0.024 });
    }

    const queens = queenCount(this.rows);
    const square = `${String.fromCharCode(65 + column)}${QUEENS_SIZE - row}`;
    this.setStatus(
      placed
        ? `Dama en ${square}. ${queens} de 8 colocadas.${
            hasConflict ? ' Hay damas que se atacan.' : ''
          }`
        : `Dama retirada de ${square}. ${queens} de 8 colocadas.`,
    );

    this.checkSolved();
  }

  private checkSolved(): void {
    if (this.solved || !isSolved(this.rows)) return;

    this.solved = true;
    this.solvedTimer = 0;
    this.finalTime = this.elapsed;
    const extraPlacements = Math.max(0, this.placements - QUEENS_SIZE);
    this.finalScore = Math.max(100, 1200 - extraPlacements * 60);

    if (this.record === 0 || this.placements < this.record) {
      this.record = this.placements;
      this.newRecord = true;
      writeNumber(RECORD_KEY, this.record);
    }

    this.audio.chord([392, 523.25, 659.25, 783.99], 0.7, { type: 'sine', gain: 0.09 });
    this.setStatus('Ocho damas sin ataques. Tablero resuelto.');
  }

  private finishGame(): void {
    if (this.finished) return;
    this.finished = true;

    const perfect = this.placements === QUEENS_SIZE;
    const recordText = this.newRecord
      ? 'Nuevo récord de movimientos.'
      : `Récord: ${this.record} colocaciones.`;

    this.finish({
      title: 'Ocho damas',
      message: perfect
        ? 'Solución perfecta: ocho damas y ni una sola amenaza.'
        : `Has colocado las ocho damas con ${this.placements} colocaciones.`,
      detail: `${this.placements} colocaciones · ${this.formatTime(this.finalTime)} · ${recordText}`,
      score: this.finalScore,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Nueva partida',
      tone: 'win',
    });
  }

  private formatTime(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }
}

export default {
  mount: (context: GameContext) => new OchoDamas(context),
} satisfies GameModule;

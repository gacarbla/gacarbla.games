import {
  BaseGame,
  FONT_SANS,
  PALETTE,
  alpha,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
  glowCircle,
  puzzleLayout,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  AI,
  COLS,
  HUMAN,
  ROWS,
  chooseAiMove,
  createBoard,
  winningLine,
  drop,
  isFull,
  validColumns,
  type Board,
} from './logic';

const AI_DELAY = 0.45;
const ROUND_PAUSE = 1.5;
const END_PAUSE = 1.1;

class ConectaCuatro extends BaseGame {
  private board: Board = createBoard();
  private wins = 0;
  private turn = HUMAN;
  private line: number[] = [];
  private pendingEnd: 'round' | 'lose' | 'draw' | null = null;
  private pauseTimer = 0;
  private aiTimer = -1;
  private hover = -1;
  private clock = 0;
  private done = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerMove((point) => {
      this.hover = this.columnAt(point.x, point.y) ?? -1;
    });

    this.input.onPointerDown((point) => {
      const column = this.columnAt(point.x, point.y);
      if (column === null) return;
      this.play(column);
    });

    this.input.onKeyDown((code) => {
      if (!code.startsWith('Digit')) return;
      const column = Number.parseInt(code.slice(5), 10) - 1;
      if (column >= 0 && column < COLS) this.play(column);
    });
  }

  protected reset(): void {
    this.board = createBoard();
    this.wins = 0;
    this.turn = HUMAN;
    this.line = [];
    this.pendingEnd = null;
    this.pauseTimer = 0;
    this.aiTimer = -1;
    this.hover = -1;
    this.clock = 0;
    this.done = false;
    this.setScore('VICTORIAS', 0);
  }

  protected update(dt: number): void {
    this.clock += dt;

    if (this.pendingEnd !== null) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        const ending = this.pendingEnd;
        this.pendingEnd = null;
        if (ending === 'round') {
          this.startRound();
        } else {
          this.finishGame(ending);
        }
      }
      return;
    }

    if (this.aiTimer > 0) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiTimer = -1;
        this.aiPlay();
      }
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const accent = '#df8b6c';
    drawPuzzleBackground(context, view, accent);
    const layout = this.layout(view);
    drawPuzzleBoard(context, layout, { fill: 'rgba(247, 238, 224, 0.92)' });

    const cell = layout.cell;
    const radius = cell * 0.34;

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLS; column += 1) {
        const x = layout.x + column * cell + cell / 2;
        const y = layout.y + row * cell + cell / 2;
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = '#e5d8c4';
        context.fill();
        context.strokeStyle = 'rgba(36, 51, 45, 0.08)';
        context.lineWidth = 1;
        context.stroke();
        context.restore();
      }
    }

    if (this.turn === HUMAN && this.pendingEnd === null && this.hover >= 0) {
      const row = this.landingRow(this.hover);
      if (row !== null) {
        const x = layout.x + this.hover * cell + cell / 2;
        const y = layout.y + row * cell + cell / 2;
        context.save();
        context.globalAlpha = 0.32;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = accent;
        context.fill();
        context.restore();
      }
      context.save();
      context.fillStyle = alpha(accent, 0.08);
      context.fillRect(layout.x + this.hover * cell, layout.y, cell, layout.height);
      context.restore();
    }

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLS; column += 1) {
        const index = row * COLS + column;
        const player = this.board[index]!;
        if (player === 0) continue;
        const x = layout.x + column * cell + cell / 2;
        const y = layout.y + row * cell + cell / 2;
        const color = player === HUMAN ? PALETTE.apricot : PALETTE.butter;
        if (!this.reducedMotion && this.line.includes(index)) {
          glowCircle(context, x, y, cell * 0.75, color, 0.3);
        }
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
        context.strokeStyle = alpha(PALETTE.ink, 0.18);
        context.lineWidth = 1.2;
        context.stroke();
        context.beginPath();
        context.arc(x - radius * 0.26, y - radius * 0.3, radius * 0.24, 0, Math.PI * 2);
        context.fillStyle = alpha(PALETTE.surface, 0.35);
        context.fill();
        context.restore();
      }
    }

    if (this.line.length > 0) {
      const first = this.line[0]!;
      const last = this.line[this.line.length - 1]!;
      const firstRow = Math.floor(first / COLS);
      const firstColumn = first % COLS;
      const lastRow = Math.floor(last / COLS);
      const lastColumn = last % COLS;
      context.save();
      context.strokeStyle = this.board[first] === HUMAN ? PALETTE.apricot : PALETTE.butter;
      context.lineWidth = 3;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(
        layout.x + firstColumn * cell + cell / 2,
        layout.y + firstRow * cell + cell / 2,
      );
      context.lineTo(layout.x + lastColumn * cell + cell / 2, layout.y + lastRow * cell + cell / 2);
      context.stroke();
      context.restore();
    }

    this.drawHeader(context, view);

    drawPuzzleFooter(
      context,
      view,
      `Rondas ganadas ${this.wins}`,
      'Tú: rojo · Máquina: amarillo',
      this.pendingEnd === null ? 'Toca una columna' : '',
    );
  }

  private drawHeader(context: CanvasRenderingContext2D, view: View): void {
    let title = 'Tu turno';
    let subtitle = 'Cuatro en línea';

    if (this.pendingEnd === 'round') {
      title = 'Ronda ganada';
      subtitle = 'Preparando la siguiente…';
    } else if (this.turn === AI && this.pendingEnd === null) {
      const dots = this.reducedMotion ? '' : '.'.repeat(1 + (Math.floor(this.clock * 3) % 3));
      title = `La máquina piensa${dots}`;
      subtitle = 'Calculando la mejor jugada';
    } else if (this.pendingEnd === 'lose') {
      title = 'La máquina conecta cuatro';
    } else if (this.pendingEnd === 'draw') {
      title = 'Tablero lleno';
    }

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    context.font = `600 15px ${FONT_SANS}`;
    context.fillText(title, view.width / 2, 78);
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.font = `500 10px ${FONT_SANS}`;
    context.fillText(subtitle, view.width / 2, 98);
    context.restore();
  }

  private layout(view: View): ReturnType<typeof puzzleLayout> {
    return puzzleLayout(view, COLS, ROWS, {
      maxCell: 76,
      top: 110,
      bottom: 86,
      widthRatio: 0.9,
      heightRatio: 0.58,
    });
  }

  private columnAt(x: number, y: number): number | null {
    const layout = this.layout(this.runtime.view);
    if (x < layout.x || x > layout.x + layout.width) return null;
    if (y < layout.y || y > layout.y + layout.height) return null;
    const column = Math.floor((x - layout.x) / layout.cell);
    return column >= 0 && column < COLS ? column : null;
  }

  private landingRow(column: number): number | null {
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (this.board[row * COLS + column] === 0) return row;
    }
    return null;
  }

  private play(column: number): void {
    if (this.done || this.pendingEnd !== null) return;
    if (this.turn !== HUMAN || this.aiTimer > 0) return;

    const index = drop(this.board, column, HUMAN);
    if (index === null) {
      this.audio.tone(170, 0.06, { type: 'triangle', gain: 0.03 });
      return;
    }

    this.audio.tone(300, 0.08, { gain: 0.04, type: 'triangle' });
    this.hover = -1;
    const win = winningLine(this.board, HUMAN);
    if (win) {
      this.line = win;
      this.wins += 1;
      this.setScore('VICTORIAS', this.wins);
      this.audio.chord([523.25, 659.25, 783.99, 1046.5], 0.45, { gain: 0.1 });
      this.pendingEnd = 'round';
      this.pauseTimer = ROUND_PAUSE;
      this.setStatus(`Ronda ganada. Llevas ${this.wins} victorias.`);
      return;
    }

    if (isFull(this.board)) {
      this.pendingEnd = 'draw';
      this.pauseTimer = END_PAUSE;
      this.setStatus('El tablero se ha llenado. Empate.');
      return;
    }

    this.turn = AI;
    this.aiTimer = AI_DELAY;
    this.setStatus('La máquina está pensando.');
  }

  private aiPlay(): void {
    if (this.done || this.pendingEnd !== null) return;
    const column = chooseAiMove(this.board, 4);
    if (column < 0 || validColumns(this.board).length === 0) {
      this.pendingEnd = 'draw';
      this.pauseTimer = END_PAUSE;
      return;
    }

    const index = drop(this.board, column, AI);
    if (index === null) return;
    this.audio.tone(240, 0.09, { gain: 0.04, type: 'sine' });

    const win = winningLine(this.board, AI);
    if (win) {
      this.line = win;
      this.pendingEnd = 'lose';
      this.pauseTimer = END_PAUSE;
      this.audio.tone(180, 0.4, { gain: 0.06, type: 'sine', slideTo: 130 });
      this.setStatus('La máquina ha conectado cuatro.');
      return;
    }

    if (isFull(this.board)) {
      this.pendingEnd = 'draw';
      this.pauseTimer = END_PAUSE;
      this.setStatus('El tablero se ha llenado. Empate.');
      return;
    }

    this.turn = HUMAN;
    this.setStatus('Tu turno.');
  }

  private startRound(): void {
    this.board = createBoard();
    this.turn = HUMAN;
    this.line = [];
    this.pendingEnd = null;
    this.pauseTimer = 0;
    this.aiTimer = -1;
    this.hover = -1;
    this.setStatus('Nueva ronda. Empiezas tú.');
  }

  private finishGame(ending: 'lose' | 'draw'): void {
    if (this.done) return;
    this.done = true;
    const won =
      ending === 'lose' ? 'La máquina conectó cuatro antes que tú.' : 'Nadie pudo conectar cuatro.';
    this.finish({
      title: ending === 'lose' ? 'Racha terminada' : 'Empate',
      message: `${won} Vuelve a intentarlo.`,
      detail: `${this.wins} ${this.wins === 1 ? 'victoria' : 'victorias'} en esta partida`,
      score: this.wins,
      scoreLabel: 'VICTORIAS',
      tone: 'lose',
      ctaLabel: 'Jugar otra vez',
    });
  }
}

export default {
  mount: (context: GameContext) => new ConectaCuatro(context),
} satisfies GameModule;

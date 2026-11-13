import {
  BaseGame,
  FONT_SANS,
  PALETTE,
  TAU,
  alpha,
  cellAt,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
  glowCircle,
  puzzleLayout,
  roundedRect,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  AI,
  EMPTY,
  HUMAN,
  SIZE,
  applyMove,
  chooseAiMove,
  colOf,
  countPieces,
  createInitialBoard,
  generateMoves,
  getWinner,
  isKing,
  playerOf,
  rowOf,
  type Board,
  type Move,
} from './logic';

const ACCENT = '#7fa9c2';
const AI_DELAY = 0.55;
const END_DELAY = 0.9;

type Ending = 'win' | 'lose';

class Damas extends BaseGame {
  private board: Board = createInitialBoard();
  private turn = HUMAN;
  private legal: Move[] = [];
  private selected: number | null = null;
  private chain: number[] = [];
  private moves = 0;
  private clock = 0;
  private aiTimer = -1;
  private pendingEnd: Ending | null = null;
  private endTimer = 0;
  private done = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => {
      const index = cellAt(this.layout(this.runtime.view), point.x, point.y);
      if (index === null) return;
      this.tapCell(index);
    });

    this.input.onKeyDown((code) => {
      if (code !== 'Escape') return;
      if (this.selected !== null) {
        this.clearSelection();
        this.setStatus('Selección cancelada.');
      }
    });
  }

  protected reset(): void {
    this.board = createInitialBoard();
    this.turn = HUMAN;
    this.legal = generateMoves(this.board, HUMAN);
    this.selected = null;
    this.chain = [];
    this.moves = 0;
    this.clock = 0;
    this.aiTimer = -1;
    this.pendingEnd = null;
    this.endTimer = 0;
    this.done = false;
    this.setScore('PIEZAS', countPieces(this.board, HUMAN));
  }

  protected update(dt: number): void {
    this.clock += dt;

    if (this.pendingEnd !== null) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        const ending = this.pendingEnd;
        this.pendingEnd = null;
        this.finishGame(ending);
      }
      return;
    }

    if (this.turn === AI && this.aiTimer > 0) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiTimer = -1;
        this.playAi();
      }
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const layout = this.layout(view);
    drawPuzzleBoard(context, layout, { fill: 'rgba(244, 235, 219, 0.95)' });

    context.save();
    roundedRect(context, layout.x, layout.y, layout.width, layout.height, 12);
    context.clip();
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const dark = (row + col) % 2 === 1;
        context.fillStyle = dark ? '#c8ab85' : '#f3e8d5';
        context.fillRect(
          layout.x + col * layout.cell,
          layout.y + row * layout.cell,
          layout.cell,
          layout.cell,
        );
      }
    }
    context.restore();

    context.save();
    roundedRect(context, layout.x, layout.y, layout.width, layout.height, 12);
    context.strokeStyle = alpha(PALETTE.ink, 0.14);
    context.lineWidth = 1.2;
    context.stroke();
    context.restore();

    this.drawSelection(context, layout);
    this.drawPieces(context, layout);

    this.drawHeader(context, view);

    const humanPieces = countPieces(this.board, HUMAN);
    const aiPieces = countPieces(this.board, AI);
    drawPuzzleFooter(
      context,
      view,
      `Tú: ${humanPieces} ${humanPieces === 1 ? 'pieza' : 'piezas'}`,
      `Máquina: ${aiPieces}`,
      this.footerHint(),
    );
  }

  private layout(view: View): ReturnType<typeof puzzleLayout> {
    return puzzleLayout(view, SIZE, SIZE, {
      maxCell: 78,
      top: 112,
      bottom: 92,
      widthRatio: 0.92,
      heightRatio: 0.68,
    });
  }

  private footerHint(): string {
    if (this.pendingEnd !== null) {
      return this.pendingEnd === 'win' ? 'Partida ganada' : 'Partida perdida';
    }
    if (this.turn === AI) return 'La máquina calcula su jugada';
    if (this.hasMandatoryCapture()) return 'Captura obligatoria';
    if (this.selected !== null) return 'Elige una casilla resaltada';
    return 'Toca una pieza y su destino';
  }

  private hasMandatoryCapture(): boolean {
    return this.turn === HUMAN && this.legal.some((move) => move.captures.length > 0);
  }

  private drawHeader(context: CanvasRenderingContext2D, view: View): void {
    let title = 'Tu turno';
    let subtitle = 'Damas · 8×8';

    if (this.pendingEnd === 'win') {
      title = 'Victoria';
      subtitle = 'La máquina se ha quedado sin jugadas';
    } else if (this.pendingEnd === 'lose') {
      title = 'Derrota';
      subtitle = 'La máquina domina el tablero';
    } else if (this.turn === AI) {
      const dots = this.reducedMotion ? '' : '.'.repeat(1 + (Math.floor(this.clock * 3) % 3));
      title = `La máquina piensa${dots}`;
      subtitle = 'Buscando la mejor captura';
    } else if (this.hasMandatoryCapture()) {
      subtitle = 'Captura obligatoria';
    } else if (this.selected !== null) {
      subtitle = 'Elige el destino';
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

  private drawSelection(
    context: CanvasRenderingContext2D,
    layout: ReturnType<typeof puzzleLayout>,
  ): void {
    if (this.selected === null) {
      if (this.turn === HUMAN && this.pendingEnd === null) {
        for (const index of this.movablePieces()) {
          const x = layout.x + colOf(index) * layout.cell + layout.cell / 2;
          const y = layout.y + rowOf(index) * layout.cell + layout.cell / 2;
          context.save();
          context.beginPath();
          context.arc(x, y, layout.cell * 0.4, 0, TAU);
          context.strokeStyle = alpha(ACCENT, 0.5);
          context.lineWidth = Math.max(1.2, layout.cell * 0.03);
          context.stroke();
          context.restore();
        }
      }
      return;
    }

    const x = layout.x + colOf(this.selected) * layout.cell;
    const y = layout.y + rowOf(this.selected) * layout.cell;
    context.save();
    roundedRect(context, x + 2, y + 2, layout.cell - 4, layout.cell - 4, layout.cell * 0.16);
    context.fillStyle = alpha(ACCENT, 0.18);
    context.fill();
    context.strokeStyle = alpha(ACCENT, 0.9);
    context.lineWidth = 2;
    context.stroke();
    context.restore();

    for (const destination of this.nextDestinations()) {
      const destX = layout.x + colOf(destination) * layout.cell + layout.cell / 2;
      const destY = layout.y + rowOf(destination) * layout.cell + layout.cell / 2;
      if (!this.reducedMotion) {
        glowCircle(context, destX, destY, layout.cell * 0.32, ACCENT, 0.22);
      }
      context.save();
      context.beginPath();
      context.arc(destX, destY, layout.cell * 0.13, 0, TAU);
      context.fillStyle = alpha(ACCENT, 0.92);
      context.fill();
      context.strokeStyle = alpha(PALETTE.surface, 0.8);
      context.lineWidth = 1.4;
      context.stroke();
      context.restore();
    }
  }

  private movablePieces(): number[] {
    const origins = new Set<number>();
    for (const move of this.legal) origins.add(move.from);
    return [...origins];
  }

  private nextDestinations(): number[] {
    if (this.selected === null) return [];
    const prefix = this.chain.slice(1);
    const destinations = new Set<number>();

    for (const move of this.legal) {
      if (move.from !== this.selected) continue;
      if (move.path.length <= prefix.length) continue;
      if (!prefix.every((square, index) => move.path[index] === square)) continue;
      destinations.add(move.path[prefix.length]!);
    }

    return [...destinations];
  }

  private drawPieces(
    context: CanvasRenderingContext2D,
    layout: ReturnType<typeof puzzleLayout>,
  ): void {
    const board = this.visualBoard();

    for (let index = 0; index < board.length; index += 1) {
      const piece = board[index]!;
      if (piece === EMPTY) continue;

      const cell = layout.cell;
      const x = layout.x + colOf(index) * cell + cell / 2;
      const y = layout.y + rowOf(index) * cell + cell / 2;
      const radius = cell * 0.33;
      const color = playerOf(piece) === HUMAN ? PALETTE.apricot : PALETTE.forest;

      context.save();
      context.beginPath();
      context.arc(x, y + radius * 0.09, radius, 0, TAU);
      context.fillStyle = alpha(PALETTE.ink, 0.18);
      context.fill();

      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = alpha(PALETTE.ink, 0.28);
      context.lineWidth = Math.max(1.2, cell * 0.035);
      context.stroke();

      context.beginPath();
      context.arc(x, y, radius * 0.72, 0, TAU);
      context.strokeStyle = alpha(PALETTE.surface, 0.3);
      context.lineWidth = Math.max(1, cell * 0.025);
      context.stroke();

      if (isKing(piece)) {
        const width = radius * 0.52;
        const height = radius * 0.4;
        context.beginPath();
        context.moveTo(x - width, y + height * 0.65);
        context.lineTo(x - width, y - height * 0.1);
        context.lineTo(x - width * 0.45, y + height * 0.12);
        context.lineTo(x, y - height * 0.55);
        context.lineTo(x + width * 0.45, y + height * 0.12);
        context.lineTo(x + width, y - height * 0.1);
        context.lineTo(x + width, y + height * 0.65);
        context.closePath();
        context.fillStyle = PALETTE.butter;
        context.fill();
      } else {
        context.beginPath();
        context.arc(x - radius * 0.27, y - radius * 0.3, radius * 0.17, 0, TAU);
        context.fillStyle = alpha(PALETTE.surface, 0.3);
        context.fill();
      }

      context.restore();
    }
  }

  /** Tablero que se dibuja: durante una cadena la pieza viaja por sus saltos. */
  private visualBoard(): Board {
    if (this.chain.length < 2) return this.board;

    const next = this.board.slice();
    const origin = this.chain[0]!;
    const piece = next[origin]!;
    if (piece === EMPTY) return this.board;

    next[origin] = EMPTY;
    for (let index = 1; index < this.chain.length; index += 1) {
      const from = this.chain[index - 1]!;
      const to = this.chain[index]!;
      const middle = indexOfMidpoint(from, to);
      if (middle !== null) next[middle] = EMPTY;
    }

    next[this.chain[this.chain.length - 1]!] = piece;
    return next;
  }

  private tapCell(index: number): void {
    if (this.done || this.pendingEnd !== null) return;
    if (this.turn !== HUMAN) return;

    if (this.selected === null) {
      if (this.canMoveFrom(index)) {
        this.select(index);
      } else {
        this.audio.tone(165, 0.06, { gain: 0.03, type: 'triangle' });
      }
      return;
    }

    const origin = this.chain[0]!;
    if (index === origin && this.chain.length === 1) {
      this.clearSelection();
      return;
    }

    const prefix = this.chain.slice(1);
    const matches = this.legal.filter(
      (move) =>
        move.from === origin &&
        move.path.length > prefix.length &&
        prefix.every((square, position) => move.path[position] === square) &&
        move.path[prefix.length] === index,
    );

    if (matches.length === 0) {
      if (this.chain.length === 1 && this.canMoveFrom(index)) {
        this.select(index);
      } else {
        this.audio.tone(165, 0.06, { gain: 0.03, type: 'triangle' });
      }
      return;
    }

    const nextChain = [...this.chain, index];
    const complete = matches.find((move) => move.path.length === nextChain.length - 1);

    if (complete) {
      this.commitMove(complete);
      return;
    }

    this.chain = nextChain;
    this.audio.tone(560, 0.055, { gain: 0.03, type: 'triangle' });
    this.setStatus('Captura encadenada: sigue saltando.');
  }

  private canMoveFrom(index: number): boolean {
    if (playerOf(this.board[index]!) !== HUMAN) return false;
    return this.legal.some((move) => move.from === index);
  }

  private select(index: number): void {
    this.selected = index;
    this.chain = [index];
    this.audio.click();
    this.setStatus(
      this.hasMandatoryCapture()
        ? 'Captura obligatoria: elige el salto.'
        : 'Elige la casilla de destino.',
    );
  }

  private clearSelection(): void {
    this.selected = null;
    this.chain = [];
  }

  private commitMove(move: Move): void {
    const captured = move.captures.length;
    this.board = applyMove(this.board, move);
    this.turn = AI;
    this.moves += 1;
    this.clearSelection();
    this.legal = generateMoves(this.board, AI);
    this.setScore('PIEZAS', countPieces(this.board, HUMAN));

    if (captured > 0) {
      this.audio.noise(0.1, { gain: 0.04, frequency: 1100 });
      this.audio.tone(310, 0.09, { gain: 0.05, type: 'triangle', slideTo: 400 });
    } else {
      this.audio.tone(410, 0.06, { gain: 0.04, type: 'triangle' });
    }

    if (getWinner(this.board, AI) === HUMAN) {
      this.scheduleEnd('win');
      return;
    }

    this.aiTimer = AI_DELAY;
    this.setStatus('Turno de la máquina.');
  }

  private playAi(): void {
    if (this.done || this.pendingEnd !== null || this.turn !== AI) return;

    const move = chooseAiMove(this.board, 4);
    if (move === null) {
      this.scheduleEnd('win');
      return;
    }

    this.board = applyMove(this.board, move);
    this.turn = HUMAN;
    this.legal = generateMoves(this.board, HUMAN);
    this.setScore('PIEZAS', countPieces(this.board, HUMAN));

    if (move.captures.length > 0) {
      this.audio.noise(0.1, { gain: 0.03, frequency: 900 });
      this.audio.tone(270, 0.09, { gain: 0.04, type: 'triangle', slideTo: 210 });
    } else {
      this.audio.tone(330, 0.06, { gain: 0.035, type: 'triangle' });
    }

    if (getWinner(this.board, HUMAN) === AI) {
      this.scheduleEnd('lose');
      return;
    }

    this.setStatus('Tu turno.');
  }

  private scheduleEnd(ending: Ending): void {
    this.pendingEnd = ending;
    this.endTimer = END_DELAY;
    this.aiTimer = -1;
    this.clearSelection();

    if (ending === 'win') {
      this.audio.chord([523.25, 659.25, 783.99], 0.4, { gain: 0.09 });
      this.setStatus('Has ganado la partida.');
    } else {
      this.audio.tone(190, 0.45, { gain: 0.06, type: 'sine', slideTo: 130 });
      this.setStatus('La máquina ha ganado la partida.');
    }
  }

  private finishGame(ending: Ending): void {
    if (this.done) return;
    this.done = true;

    const humanPieces = countPieces(this.board, HUMAN);
    const aiPieces = countPieces(this.board, AI);
    const score =
      ending === 'win' ? Math.max(100, 1000 + humanPieces * 60 - this.moves * 5) : humanPieces * 40;

    this.finish({
      title: ending === 'win' ? 'Victoria' : 'Derrota',
      message:
        ending === 'win'
          ? 'Has dejado a la máquina sin piezas ni movimientos legales.'
          : 'La máquina te ha dejado sin piezas ni movimientos legales.',
      detail: `${this.moves} ${this.moves === 1 ? 'movimiento' : 'movimientos'} · ${humanPieces} frente a ${aiPieces}`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Revancha',
      tone: ending,
    });
  }
}

function indexOfMidpoint(from: number, to: number): number | null {
  const row = (rowOf(from) + rowOf(to)) / 2;
  const col = (colOf(from) + colOf(to)) / 2;
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return row * SIZE + col;
}

export default {
  mount: (context: GameContext) => new Damas(context),
} satisfies GameModule;

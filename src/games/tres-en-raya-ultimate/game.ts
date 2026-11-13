import {
  BaseGame,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  glowCircle,
  roundedRect,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  AI,
  ANY_BOARD,
  BOARD_COUNT,
  DRAW,
  EMPTY,
  HUMAN,
  applyMove,
  chooseAiMove,
  countBoards,
  createState,
  findWinningLine,
  globalIndex,
  isLegal,
  type UltimateState,
} from './logic';

const ACCENT = '#df8b6c';
const AI_DELAY = 0.5;
const END_DELAY = 1.1;

interface BoardGeometry {
  x: number;
  y: number;
  size: number;
  boardSize: number;
  pad: number;
}

interface CellBox {
  x: number;
  y: number;
  size: number;
}

class TresEnRayaUltimate extends BaseGame {
  private round: UltimateState = createState();
  private hover = -1;
  private cursor = 40;
  private keyboard = false;
  private aiTimer = -1;
  private pendingEnd: 'win' | 'lose' | 'draw' | null = null;
  private endTimer = 0;
  private winningLine: readonly number[] = [];
  private lastPlaced = -1;
  private clock = 0;
  private done = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerMove((point) => {
      this.keyboard = false;
      this.hover = this.indexAt(point.x, point.y) ?? -1;
    });

    this.input.onPointerDown((point) => {
      this.keyboard = false;
      const index = this.indexAt(point.x, point.y);
      if (index === null) return;
      this.playHuman(index);
    });

    this.input.onKeyDown((code) => {
      if (code === 'KeyR') {
        this.reset();
        return;
      }
      if (this.round.turn !== HUMAN || this.pendingEnd !== null || this.done) return;

      if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') {
        this.keyboard = true;
        this.playHuman(this.cursor);
        return;
      }

      const row = Math.floor(this.cursor / 9);
      const column = this.cursor % 9;
      let nextRow = row;
      let nextColumn = column;

      if (code === 'ArrowUp') nextRow = (row + 8) % 9;
      else if (code === 'ArrowDown') nextRow = (row + 1) % 9;
      else if (code === 'ArrowLeft') nextColumn = (column + 8) % 9;
      else if (code === 'ArrowRight') nextColumn = (column + 1) % 9;
      else return;

      this.keyboard = true;
      this.cursor = nextRow * 9 + nextColumn;
    });
  }

  protected reset(): void {
    this.round = createState();
    this.hover = -1;
    this.cursor = 40;
    this.keyboard = false;
    this.aiTimer = -1;
    this.pendingEnd = null;
    this.endTimer = 0;
    this.winningLine = [];
    this.lastPlaced = -1;
    this.clock = 0;
    this.done = false;
    this.setScore('TABLEROS', '0–0');
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

    if (this.aiTimer > 0) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiTimer = -1;
        this.aiPlay();
      }
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const layout = this.geometry(view);

    this.drawBoards(context, layout);
    this.drawGlobalLine(context, layout);
    this.drawHeader(context, view);

    const humanBoards = countBoards(this.round, HUMAN);
    const aiBoards = countBoards(this.round, AI);
    const hint =
      this.round.winner !== EMPTY
        ? ''
        : this.round.active === ANY_BOARD
          ? 'Elige cualquier tablero libre'
          : 'Toca una celda del tablero resaltado';

    drawPuzzleFooter(
      context,
      view,
      `Tableros ${humanBoards}–${aiBoards}`,
      'Tú: X · Máquina: O',
      hint,
    );
  }

  private geometry(view: View): BoardGeometry {
    const top = 116;
    const bottom = 82;
    const available = Math.max(220, view.height - top - bottom);
    const size = clamp(Math.min(view.width * 0.9, available, 580), 240, 580);
    const boardSize = size / 3;
    return {
      x: (view.width - size) / 2,
      y: top + Math.max(0, (available - size) / 2),
      size,
      boardSize,
      pad: Math.max(3, boardSize * 0.05),
    };
  }

  private cellBox(layout: BoardGeometry, board: number, cell: number): CellBox {
    const boardX = layout.x + (board % 3) * layout.boardSize + layout.pad;
    const boardY = layout.y + Math.floor(board / 3) * layout.boardSize + layout.pad;
    const inner = layout.boardSize - layout.pad * 2;
    const gap = Math.max(1.5, inner * 0.04);
    const size = (inner - gap * 2) / 3;
    return {
      x: boardX + (cell % 3) * (size + gap),
      y: boardY + Math.floor(cell / 3) * (size + gap),
      size,
    };
  }

  private indexAt(x: number, y: number): number | null {
    const layout = this.geometry(this.runtime.view);
    const localX = x - layout.x;
    const localY = y - layout.y;
    if (localX < 0 || localY < 0 || localX >= layout.size || localY >= layout.size) return null;

    const boardColumn = Math.floor(localX / layout.boardSize);
    const boardRow = Math.floor(localY / layout.boardSize);
    const board = boardRow * 3 + boardColumn;

    const boardX = localX - boardColumn * layout.boardSize - layout.pad;
    const boardY = localY - boardRow * layout.boardSize - layout.pad;
    const inner = layout.boardSize - layout.pad * 2;
    if (boardX < 0 || boardY < 0 || boardX >= inner || boardY >= inner) return null;

    const cellColumn = Math.min(2, Math.floor((boardX / inner) * 3));
    const cellRow = Math.min(2, Math.floor((boardY / inner) * 3));
    return globalIndex(board, cellRow * 3 + cellColumn);
  }

  private drawBoards(context: CanvasRenderingContext2D, layout: BoardGeometry): void {
    const hoverLegal =
      this.round.turn === HUMAN && this.pendingEnd === null && this.round.winner === EMPTY;

    for (let board = 0; board < BOARD_COUNT; board += 1) {
      const originX = layout.x + (board % 3) * layout.boardSize;
      const originY = layout.y + Math.floor(board / 3) * layout.boardSize;
      const outer = layout.pad * 0.35;
      const boxSize = layout.boardSize - outer * 2;
      const owner = this.round.boards[board]!;
      const active = this.round.active === board;
      const free = owner === EMPTY;
      const available = free && this.round.active === ANY_BOARD;

      context.save();
      roundedRect(context, originX + outer, originY + outer, boxSize, boxSize, boxSize * 0.1);
      if (owner === HUMAN) context.fillStyle = alpha(PALETTE.apricot, 0.16);
      else if (owner === AI) context.fillStyle = alpha(PALETTE.forest, 0.14);
      else if (owner === DRAW) context.fillStyle = alpha(PALETTE.ink, 0.07);
      else context.fillStyle = 'rgba(255, 253, 248, 0.72)';
      context.fill();
      context.restore();

      if (active && free) {
        if (!this.reducedMotion) {
          glowCircle(
            context,
            originX + layout.boardSize / 2,
            originY + layout.boardSize / 2,
            layout.boardSize * 0.55,
            ACCENT,
            0.12,
          );
        }
        context.save();
        roundedRect(context, originX + outer, originY + outer, boxSize, boxSize, boxSize * 0.1);
        context.strokeStyle = ACCENT;
        context.lineWidth = 2.6;
        context.stroke();
        context.restore();
      } else if (available) {
        context.save();
        roundedRect(context, originX + outer, originY + outer, boxSize, boxSize, boxSize * 0.1);
        context.strokeStyle = alpha(ACCENT, 0.45);
        context.lineWidth = 1.4;
        context.setLineDash([5, 5]);
        context.stroke();
        context.setLineDash([]);
        context.restore();
      } else {
        context.save();
        roundedRect(context, originX + outer, originY + outer, boxSize, boxSize, boxSize * 0.1);
        context.strokeStyle = alpha(PALETTE.ink, 0.1);
        context.lineWidth = 1.2;
        context.stroke();
        context.restore();
      }

      if (owner === HUMAN || owner === AI) {
        this.drawMark(
          context,
          originX + layout.boardSize / 2,
          originY + layout.boardSize / 2,
          layout.boardSize * 0.66,
          owner,
          0.82,
        );
        continue;
      }

      if (owner === DRAW) {
        context.save();
        context.fillStyle = alpha(PALETTE.ink, 0.5);
        context.font = `600 ${Math.max(7, layout.boardSize * 0.1)}px ${FONT_SANS}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('EMPATE', originX + layout.boardSize / 2, originY + layout.boardSize / 2);
        context.restore();
        continue;
      }

      for (let cell = 0; cell < 9; cell += 1) {
        const index = globalIndex(board, cell);
        const box = this.cellBox(layout, board, cell);
        const value = this.round.cells[index]!;
        const hovered = hoverLegal && this.hover === index && isLegal(this.round, index);
        const cursorHere =
          this.keyboard && hoverLegal && this.cursor === index && isLegal(this.round, index);

        context.save();
        roundedRect(context, box.x, box.y, box.size, box.size, box.size * 0.18);
        if (hovered) context.fillStyle = alpha(ACCENT, 0.18);
        else if (index === this.lastPlaced) context.fillStyle = alpha(PALETTE.butter, 0.16);
        else context.fillStyle = '#fffdf8';
        context.fill();
        if (cursorHere) {
          context.strokeStyle = PALETTE.butter;
          context.lineWidth = 2;
          context.stroke();
        }
        context.restore();

        if (value !== EMPTY) {
          this.drawMark(context, box.x + box.size / 2, box.y + box.size / 2, box.size, value, 1);
        }
      }
    }
  }

  private drawMark(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    player: number,
    opacity: number,
  ): void {
    context.save();
    context.globalAlpha = opacity;
    context.lineCap = 'round';
    context.lineWidth = Math.max(1.8, size * 0.11);
    if (player === HUMAN) {
      const inset = size * 0.27;
      context.strokeStyle = PALETTE.apricot;
      context.beginPath();
      context.moveTo(x - inset, y - inset);
      context.lineTo(x + inset, y + inset);
      context.moveTo(x + inset, y - inset);
      context.lineTo(x - inset, y + inset);
      context.stroke();
    } else {
      context.strokeStyle = PALETTE.forest;
      context.beginPath();
      context.arc(x, y, size * 0.29, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  private drawGlobalLine(context: CanvasRenderingContext2D, layout: BoardGeometry): void {
    if (this.winningLine.length !== 3) return;
    const points = this.winningLine.map((board) => ({
      x: layout.x + ((board % 3) + 0.5) * layout.boardSize,
      y: layout.y + (Math.floor(board / 3) + 0.5) * layout.boardSize,
    }));
    const first = points[0]!;
    const last = points[points.length - 1]!;

    context.save();
    context.lineCap = 'round';
    context.strokeStyle = alpha(PALETTE.surface, 0.8);
    context.lineWidth = Math.max(7, layout.boardSize * 0.1);
    context.beginPath();
    context.moveTo(first.x, first.y);
    context.lineTo(last.x, last.y);
    context.stroke();

    context.strokeStyle = alpha(PALETTE.butter, 0.72);
    context.lineWidth = Math.max(3, layout.boardSize * 0.045);
    context.beginPath();
    context.moveTo(first.x, first.y);
    context.lineTo(last.x, last.y);
    context.stroke();
    context.restore();
  }

  private drawHeader(context: CanvasRenderingContext2D, view: View): void {
    let title = 'Tu turno';
    let subtitle =
      this.round.active === ANY_BOARD
        ? 'Puedes jugar en cualquier tablero libre'
        : `Tablero ${this.round.active + 1} obligatorio`;

    if (this.pendingEnd === 'win') {
      title = 'Victoria';
      subtitle = 'Tres tableros en línea';
    } else if (this.pendingEnd === 'lose') {
      title = 'Derrota';
      subtitle = 'La máquina ha conquistado la línea';
    } else if (this.pendingEnd === 'draw') {
      title = 'Empate';
      subtitle = 'Ningún bando logró la línea';
    } else if (this.round.turn === AI) {
      const dots = this.reducedMotion ? '' : '.'.repeat(1 + (Math.floor(this.clock * 3) % 3));
      title = `La máquina piensa${dots}`;
      subtitle = 'Buscando la mejor casilla';
    }

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    context.font = `600 15px ${FONT_SANS}`;
    context.fillText(title, view.width / 2, 74);
    context.fillStyle = alpha(PALETTE.ink, 0.56);
    context.font = `500 10px ${FONT_SANS}`;
    context.fillText(subtitle, view.width / 2, 94);
    context.restore();
  }

  private playHuman(index: number): void {
    if (this.done || this.pendingEnd !== null) return;
    if (this.round.turn !== HUMAN || this.aiTimer > 0) return;
    if (!isLegal(this.round, index)) {
      this.audio.tone(170, 0.06, { type: 'triangle', gain: 0.025 });
      this.setStatus('Esa casilla no está disponible. Fíjate en el tablero resaltado.');
      return;
    }
    this.place(index);
  }

  private place(index: number): void {
    const player = this.round.turn;
    const boardsBefore = [...this.round.boards];
    if (!applyMove(this.round, index)) return;

    this.lastPlaced = index;
    this.hover = -1;
    const conquered = this.round.boards.some((value, board) => value !== boardsBefore[board]);

    if (player === HUMAN) this.audio.tone(330, 0.08, { type: 'triangle', gain: 0.045 });
    else this.audio.tone(235, 0.09, { type: 'sine', gain: 0.04 });

    if (conquered && this.round.winner === EMPTY) {
      this.audio.chord(player === HUMAN ? [392, 523.25, 659.25] : [220, 277.18, 329.63], 0.24, {
        gain: 0.06,
      });
    }

    this.updateScore();

    if (this.round.winner !== EMPTY) {
      this.endGame();
      return;
    }

    if (this.round.turn === AI) {
      this.aiTimer = AI_DELAY;
      this.setStatus('La máquina está pensando.');
    } else if (this.round.active === ANY_BOARD) {
      this.setStatus('Tablero libre. Elige cualquier tablero disponible.');
    } else {
      this.setStatus(`Tu turno en el tablero ${this.round.active + 1}.`);
    }
  }

  private aiPlay(): void {
    if (this.done || this.pendingEnd !== null) return;
    if (this.round.turn !== AI || this.round.winner !== EMPTY) return;

    const move = chooseAiMove(this.round, 4);
    if (move < 0) {
      this.pendingEnd = 'draw';
      this.endTimer = 0.7;
      return;
    }
    this.place(move);
  }

  private updateScore(): void {
    const humanBoards = countBoards(this.round, HUMAN);
    const aiBoards = countBoards(this.round, AI);
    this.setScore('TABLEROS', `${humanBoards}–${aiBoards}`);
  }

  private endGame(): void {
    const winner = this.round.winner;
    if (winner === HUMAN || winner === AI) {
      this.winningLine = findWinningLine(this.round.boards, winner) ?? [];
    } else {
      this.winningLine = [];
    }

    this.pendingEnd = winner === HUMAN ? 'win' : winner === AI ? 'lose' : 'draw';
    this.endTimer = END_DELAY;

    if (winner === HUMAN) {
      this.audio.chord([523.25, 659.25, 783.99, 1046.5], 0.45, { gain: 0.1 });
      this.setStatus('Has conquistado tres tableros en línea. Victoria.');
    } else if (winner === AI) {
      this.audio.tone(190, 0.4, { type: 'sine', gain: 0.06, slideTo: 130 });
      this.setStatus('La máquina ha conquistado tres tableros en línea.');
    } else {
      this.audio.tone(260, 0.25, { type: 'triangle', gain: 0.05 });
      this.setStatus('Todos los tableros están cerrados. Empate.');
    }
  }

  private finishGame(ending: 'win' | 'lose' | 'draw'): void {
    if (this.done) return;
    this.done = true;

    const humanBoards = countBoards(this.round, HUMAN);
    const aiBoards = countBoards(this.round, AI);
    const moves = this.round.moves;
    const score =
      ending === 'win'
        ? 900 + humanBoards * 120 + Math.max(0, 81 - moves) * 6
        : ending === 'draw'
          ? 350 + humanBoards * 80
          : humanBoards * 90;

    if (ending === 'win') {
      this.finish({
        title: 'Victoria',
        message: 'Has conquistado tres tableros en línea y dominado el tablero definitivo.',
        detail: `${moves} movimientos · ${humanBoards}–${aiBoards} tableros`,
        score,
        scoreLabel: 'PUNTOS',
        ctaLabel: 'Jugar otra vez',
        tone: 'win',
      });
      return;
    }

    if (ending === 'lose') {
      this.finish({
        title: 'Derrota',
        message: 'La máquina ha cerrado su línea de tres tableros. Prueba otra estrategia.',
        detail: `${moves} movimientos · ${humanBoards}–${aiBoards} tableros`,
        score,
        scoreLabel: 'PUNTOS',
        ctaLabel: 'Revancha',
        tone: 'lose',
      });
      return;
    }

    this.finish({
      title: 'Empate',
      message: 'Los nueve tableros quedaron cerrados sin una línea completa.',
      detail: `${moves} movimientos · ${humanBoards}–${aiBoards} tableros`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Jugar otra vez',
    });
  }
}

export default {
  mount: (context: GameContext) => new TresEnRayaUltimate(context),
} satisfies GameModule;

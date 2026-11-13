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
  puzzleLayout,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type View,
} from '../engine';
import {
  AI,
  CELLS,
  EMPTY,
  HUMAN,
  SIZE,
  applyMove,
  chooseAiMove,
  countDiscs,
  createBoard,
  isLegalMove,
  legalMoves,
  nextPlayer,
  type Board,
} from './logic';

const ACCENT = '#6f9a80';
const AI_DELAY = 0.5;
const FLIP_GLOW = 0.55;
const END_PAUSE = 1.1;
const DARK_DISC = '#2f3b35';

class Reversi extends BaseGame {
  private board: Board = createBoard();
  private turn = HUMAN;
  private hover = -1;
  private lastMove = -1;
  private flipped: number[] = [];
  private glow = 0;
  private aiTimer = -1;
  private ending = false;
  private endTimer = 0;
  private done = false;
  private clock = 0;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerMove((point) => {
      this.hover = cellAt(this.layout(this.runtime.view), point.x, point.y) ?? -1;
    });

    this.input.onPointerDown((point) => {
      const index = cellAt(this.layout(this.runtime.view), point.x, point.y);
      if (index !== null) this.playHuman(index);
    });

    this.input.onKeyDown((code) => {
      if (code === 'KeyR') this.restart();
    });
  }

  protected reset(): void {
    this.board = createBoard();
    this.turn = HUMAN;
    this.hover = -1;
    this.lastMove = -1;
    this.flipped = [];
    this.glow = 0;
    this.aiTimer = -1;
    this.ending = false;
    this.endTimer = 0;
    this.done = false;
    this.clock = 0;
    this.setScore('FICHAS', '2 · 2');
  }

  protected update(dt: number): void {
    this.clock += dt;
    if (this.glow > 0) this.glow = Math.max(0, this.glow - dt);

    if (this.ending) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        this.ending = false;
        this.finishGame();
      }
      return;
    }

    if (this.aiTimer > 0) {
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
    drawPuzzleBoard(context, layout, { fill: 'rgba(246, 241, 231, 0.92)' });

    const discs = countDiscs(this.board);
    const canPlay = !this.done && !this.ending && this.turn === HUMAN && this.aiTimer < 0;

    for (let index = 0; index < CELLS; index += 1) {
      const row = Math.floor(index / SIZE);
      const column = index % SIZE;
      const light = (row + column) % 2 === 0;
      drawPuzzleCell(context, layout, index, {
        fill: light ? '#e9efe2' : '#dce7d6',
        stroke: 'rgba(36, 51, 45, 0.10)',
        strokeWidth: 1,
      });
    }

    if (canPlay && this.hover >= 0 && isLegalMove(this.board, this.hover, HUMAN)) {
      drawPuzzleCell(context, layout, this.hover, {
        fill: alpha(ACCENT, 0.16),
        stroke: alpha(ACCENT, 0.42),
        strokeWidth: 1.5,
      });
    }

    if (canPlay) {
      for (const move of legalMoves(this.board, HUMAN)) {
        const center = this.cellCenter(layout, move);
        const active = this.hover === move;
        context.save();
        context.beginPath();
        context.arc(center.x, center.y, layout.cell * (active ? 0.18 : 0.13), 0, Math.PI * 2);
        context.fillStyle = alpha(ACCENT, active ? 0.8 : 0.42);
        context.fill();
        if (active) {
          context.strokeStyle = alpha(PALETTE.surface, 0.9);
          context.lineWidth = 1.5;
          context.stroke();
        }
        context.restore();
      }
    }

    for (let index = 0; index < CELLS; index += 1) {
      const player = this.board[index] ?? EMPTY;
      if (player === EMPTY) continue;

      const center = this.cellCenter(layout, index);
      this.drawDisc(context, center.x, center.y, layout.cell * 0.38, player);

      if (this.glow > 0 && this.flipped.includes(index)) {
        context.save();
        context.beginPath();
        context.arc(center.x, center.y, layout.cell * 0.44, 0, Math.PI * 2);
        context.strokeStyle = alpha(ACCENT, (this.glow / FLIP_GLOW) * 0.9);
        context.lineWidth = 2;
        context.stroke();
        context.restore();
      }
    }

    if (this.lastMove >= 0) {
      drawPuzzleCell(context, layout, this.lastMove, {
        fill: 'transparent',
        stroke: alpha(ACCENT, 0.85),
        strokeWidth: 2,
      });
    }

    drawPuzzleHeader(context, view, this.title(), this.subtitle());
    this.drawCounters(context, view);

    drawPuzzleFooter(
      context,
      view,
      `Tú ${discs.human} fichas`,
      `Máquina ${discs.ai} fichas`,
      this.hint(),
    );
  }

  private playHuman(index: number): void {
    if (this.done || this.ending || this.turn !== HUMAN) return;

    if (!isLegalMove(this.board, index, HUMAN)) {
      this.audio.tone(180, 0.06, { type: 'triangle', gain: 0.03 });
      return;
    }

    this.commit(index, HUMAN);
  }

  private playAi(): void {
    if (this.done || this.ending || this.turn !== AI) return;

    const move = chooseAiMove(this.board, 4);
    if (move < 0) {
      this.afterMove(AI);
      return;
    }

    this.commit(move, AI);
  }

  private commit(index: number, player: number): void {
    const result = applyMove(this.board, index, player);
    if (!result) return;

    this.board = result.board;
    this.lastMove = index;
    this.flipped = result.flipped;
    this.glow = FLIP_GLOW;

    if (player === HUMAN) {
      this.audio.click();
    } else {
      this.audio.tone(300, 0.07, { type: 'sine', gain: 0.04 });
    }

    this.afterMove(player);
  }

  private afterMove(player: number): void {
    const discs = countDiscs(this.board);
    this.setScore('FICHAS', `${discs.human} · ${discs.ai}`);

    const next = nextPlayer(this.board, player);
    if (next === EMPTY) {
      this.ending = true;
      this.endTimer = END_PAUSE;
      this.setStatus('Ninguno puede jugar. Se cierra la partida.');
      this.audio.chord(player === HUMAN ? [392, 523.25, 659.25] : [392, 329.63, 261.63], 0.35, {
        gain: 0.08,
      });
      return;
    }

    if (next === player) {
      this.setStatus(
        player === HUMAN
          ? 'La máquina no tiene jugadas. Repites turno.'
          : 'No tienes jugadas. La máquina repite turno.',
      );
    } else {
      this.setStatus(next === HUMAN ? 'Tu turno.' : 'La máquina piensa su jugada.');
    }

    this.turn = next;
    if (next === AI) this.aiTimer = AI_DELAY;
  }

  private finishGame(): void {
    if (this.done) return;
    this.done = true;

    const { human, ai } = countDiscs(this.board);
    const won = human > ai;
    const draw = human === ai;

    this.finish({
      title: won ? 'Victoria' : draw ? 'Empate' : 'Derrota',
      message: won
        ? 'Has cerrado el tablero con más fichas que la máquina.'
        : draw
          ? 'Tablero igualado: nadie se lleva la partida.'
          : 'La máquina ha conservado más fichas. Prueba otra vez.',
      detail: `${human} fichas tuyas · ${ai} de la máquina`,
      score: human * 10,
      scoreLabel: 'PUNTOS',
      tone: won ? 'win' : 'lose',
      ctaLabel: 'Revancha',
    });
  }

  private title(): string {
    if (this.done) return 'Partida terminada';
    if (this.ending) return 'Fin de la partida';
    return this.turn === HUMAN ? 'Tu turno' : 'Turno de la máquina';
  }

  private subtitle(): string {
    if (this.ending || this.done) {
      const { human, ai } = countDiscs(this.board);
      if (human === ai) return 'Tablero igualado';
      return human > ai ? 'Tienes más fichas' : 'La máquina va por delante';
    }

    if (this.turn === AI) {
      const dots = this.reducedMotion ? '' : '.'.repeat(1 + (Math.floor(this.clock * 2.5) % 3));
      return `Calculando la mejor jugada${dots}`;
    }

    const moves = legalMoves(this.board, HUMAN).length;
    return `${moves} ${moves === 1 ? 'jugada disponible' : 'jugadas disponibles'}`;
  }

  private hint(): string {
    if (this.done || this.ending) return '';
    if (this.turn === AI) return 'La máquina piensa';
    return 'Toca un punto resaltado';
  }

  private drawCounters(context: CanvasRenderingContext2D, view: View): void {
    const { human, ai } = countDiscs(this.board);
    const y = 84;

    this.drawDisc(context, 34, y, 8, HUMAN);
    this.drawDisc(context, view.width - 34, y, 8, AI);

    context.save();
    context.font = `700 13px ${FONT_MONO}`;
    context.fillStyle = PALETTE.ink;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(String(human), 48, y + 1);
    context.textAlign = 'right';
    context.fillText(String(ai), view.width - 48, y + 1);
    context.restore();
  }

  private drawDisc(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    player: number,
  ): void {
    context.save();

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = player === HUMAN ? DARK_DISC : PALETTE.surface;
    context.fill();
    context.lineWidth = Math.max(1, radius * 0.1);
    context.strokeStyle = player === HUMAN ? 'rgba(255, 255, 255, 0.18)' : alpha(PALETTE.ink, 0.4);
    context.stroke();

    context.beginPath();
    context.arc(x - radius * 0.26, y - radius * 0.28, radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = player === HUMAN ? 'rgba(255, 255, 255, 0.16)' : 'rgba(47, 93, 80, 0.10)';
    context.fill();

    if (player === AI) {
      context.beginPath();
      context.arc(x, y, radius * 0.72, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(47, 93, 80, 0.16)';
      context.lineWidth = 1;
      context.stroke();
    }

    context.restore();
  }

  private cellCenter(layout: PuzzleLayout, index: number): { x: number; y: number } {
    const row = Math.floor(index / SIZE);
    const column = index % SIZE;
    return {
      x: layout.x + column * layout.cell + layout.cell / 2,
      y: layout.y + row * layout.cell + layout.cell / 2,
    };
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, SIZE, SIZE, {
      maxCell: 76,
      top: 124,
      bottom: 60,
      widthRatio: 0.9,
      heightRatio: 0.55,
    });
  }
}

export default {
  mount: (context: GameContext) => new Reversi(context),
} satisfies GameModule;

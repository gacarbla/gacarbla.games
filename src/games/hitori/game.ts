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
import { HITORI_LEVELS, HITORI_SIZE, analyzeHitori, levelNumbers, type HitoriLevel } from './logic';

interface HitoriGeometry {
  layout: PuzzleLayout;
  resetButton: UiButton;
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

const ACCENT = '#8fb397';

class Hitori extends BaseGame {
  private level = 0;
  private completed = 0;
  private moves = 0;
  private numbers: number[] = [];
  private shaded: boolean[] = [];
  private cursor = 0;
  private solved = false;
  private solvedTimer = 0;
  private pendingAdvance = false;
  private finished = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code, event) => {
      if (event.repeat && !code.startsWith('Arrow')) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.level = (this.level + 1) % HITORI_LEVELS.length;
    } else {
      this.level = 0;
      this.completed = 0;
      this.moves = 0;
    }
    this.loadLevel(this.level);
    this.setScore('PUNTOS', this.points());
  }

  private loadLevel(index: number): void {
    const level = HITORI_LEVELS[index]!;
    this.numbers = levelNumbers(level);
    this.shaded = Array<boolean>(HITORI_SIZE * HITORI_SIZE).fill(false);
    this.cursor = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.finished = false;
  }

  private currentLevel(): HitoriLevel {
    return HITORI_LEVELS[this.level]!;
  }

  private points(): number {
    return this.completed * 100;
  }

  private geometry(view: View): HitoriGeometry {
    const layout = puzzleLayout(view, HITORI_SIZE, HITORI_SIZE, {
      top: 140,
      bottom: 172,
      widthRatio: 0.84,
      heightRatio: 0.6,
      maxCell: 72,
    });
    const resetWidth = Math.min(190, view.width * 0.58);
    const resetButton: UiButton = {
      x: (view.width - resetWidth) / 2,
      y: Math.min(view.height - 112, layout.y + layout.height + 20),
      width: resetWidth,
      height: 34,
    };
    const nextWidth = Math.min(224, view.width * 0.64);
    const nextButton: UiButton = {
      x: (view.width - nextWidth) / 2,
      y: view.height / 2 + 40,
      width: nextWidth,
      height: 42,
    };
    return { layout, resetButton, nextButton };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (this.level < HITORI_LEVELS.length - 1) {
        if (pointInButton(point.x, point.y, geometry.nextButton)) this.advance();
      } else {
        this.finishSession();
      }
      return;
    }

    if (pointInButton(point.x, point.y, geometry.resetButton)) {
      this.loadLevel(this.level);
      this.audio.click();
      this.setStatus('Nivel reiniciado.');
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;
    this.toggle(index);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running') return;

    if (this.solved) {
      if (code === 'Space' || code === 'Enter') {
        if (this.level < HITORI_LEVELS.length - 1) this.advance();
        else this.finishSession();
      }
      return;
    }

    if (code === 'KeyR') {
      this.loadLevel(this.level);
      this.audio.tone(330, 0.05, { type: 'triangle', gain: 0.03 });
      this.setStatus('Nivel reiniciado.');
      return;
    }

    const column = this.cursor % HITORI_SIZE;
    const row = Math.floor(this.cursor / HITORI_SIZE);

    if (code === 'ArrowLeft') {
      this.cursor = row * HITORI_SIZE + Math.max(0, column - 1);
      this.audio.tone(300, 0.025, { type: 'triangle', gain: 0.015 });
      return;
    }
    if (code === 'ArrowRight') {
      this.cursor = row * HITORI_SIZE + Math.min(HITORI_SIZE - 1, column + 1);
      this.audio.tone(320, 0.025, { type: 'triangle', gain: 0.015 });
      return;
    }
    if (code === 'ArrowUp') {
      this.cursor = Math.max(0, row - 1) * HITORI_SIZE + column;
      this.audio.tone(300, 0.025, { type: 'triangle', gain: 0.015 });
      return;
    }
    if (code === 'ArrowDown') {
      this.cursor = Math.min(HITORI_SIZE - 1, row + 1) * HITORI_SIZE + column;
      this.audio.tone(320, 0.025, { type: 'triangle', gain: 0.015 });
      return;
    }
    if (code === 'Space' || code === 'Enter') this.toggle(this.cursor);
  }

  private toggle(index: number): void {
    if (this.solved) return;
    this.shaded[index] = !this.shaded[index];
    this.moves += 1;
    this.audio.tone(this.shaded[index] ? 330 : 470, 0.05, {
      type: 'triangle',
      gain: 0.035,
    });
    this.evaluate();
  }

  private evaluate(): void {
    const analysis = analyzeHitori(this.numbers, this.shaded);
    if (!analysis.solved) {
      if (analysis.repeated.some(Boolean) || analysis.adjacent.some(Boolean)) {
        this.setStatus('Hay conflictos en albaricoque.');
      }
      return;
    }

    this.solved = true;
    this.solvedTimer = 0;
    this.completed = Math.max(this.completed, this.level + 1);
    this.setScore('PUNTOS', this.points());
    this.setStatus(`Nivel ${this.level + 1} resuelto: ${this.currentLevel().name}.`);
    this.audio.chord([392, 494, 587], 0.5, { type: 'sine', gain: 0.09 });
  }

  private advance(): void {
    if (this.level >= HITORI_LEVELS.length - 1) return;
    this.pendingAdvance = true;
    this.audio.click();
    this.restart();
    this.setStatus(`Nivel ${this.level + 1}: ${this.currentLevel().name}.`);
  }

  private finishSession(): void {
    if (this.finished) return;
    this.finished = true;
    this.setStatus('Los cinco tableros están resueltos.');
    this.audio.chord([392, 494, 587, 784], 0.9, { type: 'sine', gain: 0.1 });
    this.finish({
      title: 'Cinco tableros',
      message:
        'Has sombreado cada tablero sin repetir números, sin sombras pegadas y sin separar las celdas claras.',
      detail: `${HITORI_LEVELS.length} niveles · ${this.moves} marcas`,
      score: this.points(),
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Volver a empezar',
      tone: 'win',
    });
  }

  protected update(dt: number): void {
    if (!this.solved) return;
    this.solvedTimer += dt;
    if (this.level === HITORI_LEVELS.length - 1 && this.solvedTimer > 1) {
      this.finishSession();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    if (this.numbers.length === 0) return;

    const geometry = this.geometry(view);
    const { layout } = geometry;
    const analysis = analyzeHitori(this.numbers, this.shaded);

    drawPuzzleHeader(
      context,
      view,
      'HITORI',
      `6 × 6 · nivel ${this.level + 1} de ${HITORI_LEVELS.length} · ${this.currentLevel().name}`,
    );
    drawPuzzleBoard(context, layout);

    for (let index = 0; index < this.numbers.length; index += 1) {
      const isShaded = this.shaded[index]!;
      const repeated = analysis.repeated[index]!;
      const adjacent = analysis.adjacent[index]!;
      const conflict = repeated || adjacent;
      const cursor = index === this.cursor && !this.solved;

      let fill = isShaded ? PALETTE.forest : '#fffdf8';
      if (!isShaded && cursor) fill = alpha(PALETTE.sky, 0.16);
      if (conflict) {
        fill = isShaded ? alpha(PALETTE.apricot, 0.92) : alpha(PALETTE.apricot, 0.22);
      }

      const stroke = cursor
        ? PALETTE.sky
        : conflict
          ? PALETTE.apricot
          : isShaded
            ? alpha(PALETTE.forest, 0.85)
            : 'rgba(36, 51, 45, 0.13)';

      drawPuzzleCell(context, layout, index, {
        fill,
        stroke,
        strokeWidth: cursor ? 2.4 : 1.4,
        text: String(this.numbers[index]!),
        textColor: isShaded
          ? alpha(PALETTE.surface, 0.9)
          : conflict
            ? PALETTE.apricot
            : PALETTE.ink,
        fontSize: Math.max(14, layout.cell * 0.4),
      });
    }

    if (!this.solved) {
      drawUiButton(context, geometry.resetButton, 'REINICIAR NIVEL', {
        accent: PALETTE.forest,
      });
    }

    if (!analysis.connected && !this.solved && analysis.shadedCount > 0) {
      context.save();
      context.font = `600 9px ${FONT_MONO}`;
      context.fillStyle = alpha(PALETTE.apricot, 0.9);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('CELDAS CLARAS DESCONECTADAS', view.width / 2, view.height - 64);
      context.restore();
    }

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${HITORI_LEVELS.length}`,
      `SOMBREADAS ${analysis.shadedCount}`,
      'FLECHAS MUEVEN · ESPACIO SOMBREA · R REINICIA',
    );

    if (this.solved && this.level < HITORI_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: HitoriGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.26);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(360, view.width * 0.84);
    const height = 204;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 112;
    roundedRect(context, x, y, width, height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 10px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.forest, 0.82);
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 34);

    context.font = `600 24px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, y + 68);

    const next = HITORI_LEVELS[this.level + 1]!;
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.6);
    context.fillText(`Siguiente: ${next.name}`, view.width / 2, y + 98);

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.forest,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Hitori(context),
} satisfies GameModule;

import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawUiButton,
  pointInButton,
  puzzleLayout,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import {
  LEVELS,
  LEVEL_NAMES,
  createState,
  isSolved,
  parseLevel,
  tryMove,
  type BoxState,
  type Level,
  type Move,
} from './logic';

class Sokoban extends BaseGame {
  private level = 0;
  private levelData: Level = parseLevel(LEVELS[0]!);
  private player: number = this.levelData.start;
  private boxes: number[] = [...this.levelData.boxes];
  private history: BoxState[] = [];
  private moves = 0;
  private complete = false;
  private pendingAdvance = false;
  private finishTimer = 0;
  private finished = false;

  constructor(context: GameContext) {
    super(context);

    this.input.onKeyDown((code) => {
      if (code === 'Enter' || code === 'Space') {
        if (this.complete) this.advance();
        return;
      }
      if (code === 'KeyZ') {
        this.undo();
        return;
      }
      if (code === 'KeyR') {
        this.reset();
        this.setStatus(`Nivel ${this.level + 1} reiniciado.`);
        return;
      }
      const direction = this.directionFor(code);
      if (direction !== null) this.move(direction);
    });

    this.input.onPointerDown((point) => {
      if (this.complete) {
        if (pointInButton(point.x, point.y, this.advanceButton(this.runtime.view))) {
          this.advance();
        }
        return;
      }

      const buttons = this.touchButtons(this.runtime.view);
      const index = buttons.findIndex((button) => pointInButton(point.x, point.y, button));
      if (index < 0) return;
      if (index < 4) {
        this.move([0, 3, 2, 1][index] as Move);
      } else if (index === 4) {
        this.undo();
      } else {
        this.reset();
        this.setStatus(`Nivel ${this.level + 1} reiniciado.`);
      }
    });
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.level += 1;
      this.pendingAdvance = false;
    }
    this.level = Math.min(this.level, LEVELS.length - 1);
    this.levelData = parseLevel(LEVELS[this.level]!);
    const state = createState(this.levelData);
    this.player = state.player;
    this.boxes = [...state.boxes];
    this.history = [];
    this.moves = 0;
    this.complete = false;
    this.finishTimer = 0;
    this.finished = false;
    this.setScore('NIVEL', this.level + 1);
  }

  protected update(dt: number): void {
    if (!this.complete || this.pendingAdvance || this.finished) return;
    this.finishTimer -= dt;
    if (this.finishTimer <= 0) this.finishRun();
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const accent = '#7fa9c2';
    drawPuzzleBackground(context, view, accent);

    const layout = puzzleLayout(view, this.levelData.width, this.levelData.height, {
      maxCell: 54,
      top: 92,
      bottom: 82,
      widthRatio: 0.86,
      heightRatio: 0.62,
    });
    drawPuzzleBoard(context, layout);

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.62);
    context.fillText(
      `NIVEL ${this.level + 1}/${LEVELS.length} · ${LEVEL_NAMES[this.level]!.toUpperCase()}`,
      view.width / 2,
      layout.y - 16,
    );
    context.restore();

    const width = this.levelData.width;
    const cell = layout.cell;
    for (let index = 0; index < this.levelData.walls.length; index += 1) {
      if (this.levelData.walls[index]) {
        drawPuzzleCell(context, layout, index, {
          fill: alpha(PALETTE.forest, 0.94),
          stroke: alpha(PALETTE.forest, 0.55),
          strokeWidth: 1,
        });
        continue;
      }

      drawPuzzleCell(context, layout, index, {
        fill: '#f8f2e6',
        stroke: 'rgba(36, 51, 45, 0.07)',
        strokeWidth: 1,
      });

      const column = index % width;
      const row = Math.floor(index / width);
      const centerX = layout.x + column * cell + cell / 2;
      const centerY = layout.y + row * cell + cell / 2;

      if (this.levelData.goals[index]) {
        context.save();
        context.beginPath();
        context.arc(centerX, centerY, cell * 0.16, 0, Math.PI * 2);
        context.fillStyle = alpha(PALETTE.amber, 0.22);
        context.fill();
        context.strokeStyle = alpha(PALETTE.amber, 0.8);
        context.lineWidth = Math.max(1.2, cell * 0.05);
        context.stroke();
        context.restore();
      }
    }

    for (const box of this.boxes) {
      const column = box % width;
      const row = Math.floor(box / width);
      const size = cell * 0.58;
      const x = layout.x + column * cell + (cell - size) / 2;
      const y = layout.y + row * cell + (cell - size) / 2;
      const onGoal = this.levelData.goals[box] === true;
      context.save();
      roundedRect(context, x, y, size, size, size * 0.16);
      context.fillStyle = onGoal ? '#6f9a80' : '#c58a61';
      context.fill();
      context.strokeStyle = onGoal ? alpha(PALETTE.forest, 0.9) : 'rgba(112, 64, 42, 0.55)';
      context.lineWidth = Math.max(1.2, cell * 0.05);
      context.stroke();
      roundedRect(context, x + size * 0.22, y + size * 0.22, size * 0.56, size * 0.56, size * 0.08);
      context.strokeStyle = alpha(PALETTE.surface, 0.5);
      context.lineWidth = 1;
      context.stroke();
      context.restore();
    }

    const px = layout.x + (this.player % width) * cell + cell / 2;
    const py = layout.y + Math.floor(this.player / width) * cell + cell / 2;
    context.save();
    context.beginPath();
    context.arc(px, py, cell * 0.29, 0, Math.PI * 2);
    context.fillStyle = PALETTE.forest;
    context.fill();
    context.strokeStyle = alpha(PALETTE.surface, 0.9);
    context.lineWidth = Math.max(1.5, cell * 0.07);
    context.stroke();
    context.beginPath();
    context.arc(px - cell * 0.08, py - cell * 0.06, cell * 0.06, 0, Math.PI * 2);
    context.fillStyle = alpha(PALETTE.surface, 0.85);
    context.fill();
    context.restore();

    if (!this.complete) this.drawTouchControls(context, view, layout);
    if (this.complete) this.drawComplete(context, view, layout);

    drawPuzzleFooter(
      context,
      view,
      `${this.moves} movimientos`,
      `${this.boxes.filter((box) => this.levelData.goals[box]).length}/${this.boxes.length} cajas`,
      this.complete ? '' : 'Flechas o botones · Z deshace · R reinicia',
    );
  }

  private drawComplete(
    context: CanvasRenderingContext2D,
    view: View,
    layout: ReturnType<typeof puzzleLayout>,
  ): void {
    const panelWidth = Math.min(view.width * 0.82, 360);
    const panelHeight = 190;
    const panelX = (view.width - panelWidth) / 2;
    const panelY = layout.y + layout.height / 2 - panelHeight / 2;

    context.save();
    roundedRect(context, panelX, panelY, panelWidth, panelHeight, 18);
    context.fillStyle = 'rgba(255, 253, 248, 0.95)';
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    context.font = `600 20px ${FONT_SANS}`;
    context.fillText(
      this.level === LEVELS.length - 1 ? 'Último nivel completado' : 'Nivel completado',
      view.width / 2,
      panelY + 46,
    );
    context.fillStyle = alpha(PALETTE.ink, 0.6);
    context.font = `500 12px ${FONT_SANS}`;
    context.fillText(
      `${this.moves} movimientos · ${this.level + 1} de ${LEVELS.length}`,
      view.width / 2,
      panelY + 74,
    );

    if (this.pendingAdvance) {
      drawUiButton(context, this.advanceButton(view), 'Siguiente nivel', {
        active: true,
        accent: '#7fa9c2',
      });
      context.fillStyle = alpha(PALETTE.ink, 0.5);
      context.font = `500 9px ${FONT_MONO}`;
      context.fillText('Enter para continuar', view.width / 2, panelY + 172);
    }
    context.restore();
  }

  private advanceButton(view: View): UiButton {
    const layout = puzzleLayout(view, this.levelData.width, this.levelData.height, {
      maxCell: 54,
      top: 92,
      bottom: 82,
      widthRatio: 0.86,
      heightRatio: 0.62,
    });
    const width = Math.min(220, view.width * 0.62);
    return {
      x: (view.width - width) / 2,
      y: layout.y + layout.height / 2 + 26,
      width,
      height: 40,
    };
  }

  private touchButtons(view: View): UiButton[] {
    const layout = puzzleLayout(view, this.levelData.width, this.levelData.height, {
      maxCell: 54,
      top: 92,
      bottom: 82,
      widthRatio: 0.86,
      heightRatio: 0.62,
    });
    const width = 42;
    const height = 36;
    const gap = 6;
    const total = width * 6 + gap * 5;
    const startX = (view.width - total) / 2;
    const y = Math.min(view.height - 96, layout.y + layout.height + 22);
    return Array.from({ length: 6 }, (_, index) => ({
      x: startX + index * (width + gap),
      y,
      width,
      height,
    }));
  }

  private drawTouchControls(
    context: CanvasRenderingContext2D,
    view: View,
    _layout: ReturnType<typeof puzzleLayout>,
  ): void {
    const labels = ['↑', '←', '↓', '→', '↶', 'R'];
    const buttons = this.touchButtons(view);
    buttons.forEach((button, index) => {
      drawUiButton(context, button, labels[index]!, {
        accent: index === 5 ? PALETTE.apricot : '#7fa9c2',
      });
    });
  }

  private directionFor(code: string): Move | null {
    if (code === 'ArrowUp' || code === 'KeyW') return 0;
    if (code === 'ArrowRight' || code === 'KeyD') return 1;
    if (code === 'ArrowDown' || code === 'KeyS') return 2;
    if (code === 'ArrowLeft' || code === 'KeyA') return 3;
    return null;
  }

  private move(direction: Move): void {
    if (this.complete || this.finished) return;
    const current: BoxState = { player: this.player, boxes: this.boxes };
    const next = tryMove(this.levelData, current, direction);
    if (!next) {
      this.audio.tone(145, 0.05, { type: 'triangle', gain: 0.025 });
      return;
    }

    this.history.push(current);
    if (this.history.length > 800) this.history.shift();
    const pushed = next.boxes !== this.boxes;
    this.player = next.player;
    this.boxes = next.boxes;
    this.moves += 1;
    this.audio.tone(pushed ? 185 : 320, 0.04, { gain: 0.03, type: 'triangle' });

    if (isSolved(this.levelData, next)) this.solved();
  }

  private solved(): void {
    this.complete = true;
    this.pendingAdvance = this.level < LEVELS.length - 1;
    this.audio.chord([523.25, 659.25, 783.99], 0.4, { gain: 0.1 });

    if (!this.pendingAdvance) {
      this.finishTimer = 1.4;
      this.setScore('NIVEL', LEVELS.length);
      this.setStatus(`Nivel ${LEVELS.length} completado. Fin de la partida.`);
    } else {
      this.setStatus(`Nivel ${this.level + 1} completado.`);
    }
  }

  private advance(): void {
    if (!this.complete || !this.pendingAdvance) return;
    this.audio.click();
    this.reset();
    this.setStatus(`Nivel ${this.level + 1}: ${LEVEL_NAMES[this.level]}.`);
  }

  private undo(): void {
    if (this.complete || this.finished) return;
    const previous = this.history.pop();
    if (!previous) {
      this.audio.tone(220, 0.05, { type: 'triangle', gain: 0.02 });
      return;
    }
    this.player = previous.player;
    this.boxes = [...previous.boxes];
    this.moves = Math.max(0, this.moves - 1);
    this.audio.tone(260, 0.05, { gain: 0.025, type: 'triangle' });
  }

  private finishRun(): void {
    if (this.finished) return;
    this.finished = true;
    this.setScore('NIVEL', LEVELS.length);
    this.finish({
      title: 'Almacén en orden',
      message: 'Has resuelto los cinco niveles de Sokoban.',
      detail: `${this.moves} movimientos en el último nivel`,
      score: LEVELS.length,
      scoreLabel: 'NIVEL',
      tone: 'win',
      ctaLabel: 'Jugar de nuevo',
    });
    this.level = 0;
  }
}

export default {
  mount: (context: GameContext) => new Sokoban(context),
} satisfies GameModule;

import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
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
  BOARD_SIZE,
  EXIT_ROW,
  LEVELS,
  RED_ID,
  canMove,
  carAt,
  createState,
  isSolved,
  moveCar,
  slideCar,
  type Car,
} from './logic';

const ACCENT = '#cf8a8a';
const RED_BODY = '#c35c47';
const RED_STROKE = '#8c3f30';

const LAYOUT = {
  top: 116,
  bottom: 188,
  maxCell: 70,
  widthRatio: 0.8,
  heightRatio: 0.52,
} as const;

const CAR_COLORS: Readonly<Record<string, string>> = {
  A: PALETTE.sky,
  B: PALETTE.sage,
  C: PALETTE.butter,
  D: PALETTE.lilac,
  E: '#6f9a80',
  F: '#c58a61',
  G: PALETTE.violet,
  H: PALETTE.amber,
  V: '#8a9ec2',
  W: '#7f9d8a',
};

const FALLBACK_COLORS = [
  '#7fa9c2',
  '#8fb397',
  '#d9b95f',
  '#a78fbf',
  '#6f9a80',
  '#c58a61',
  '#8a9ec2',
  '#b8952f',
] as const;

interface Controls {
  up: UiButton;
  left: UiButton;
  down: UiButton;
  right: UiButton;
  reset: UiButton;
}

interface DragState {
  carId: string;
  startX: number;
  startY: number;
  startCol: number;
  startRow: number;
  axis: 'h' | 'v';
}

class RushHour extends BaseGame {
  private level = 0;
  private cars: Car[] = createState(LEVELS[0]!);
  private selectedId = RED_ID;
  private moves = 0;
  private runMoves = 0;
  private complete = false;
  private completeTimer = 0;
  private pendingAdvance = false;
  private finishedRun = false;
  private drag: DragState | null = null;

  constructor(context: GameContext) {
    super(context);

    this.input.onPointerDown((point) => this.pointerDown(point.x, point.y));
    this.input.onPointerMove((point) => this.pointerMove(point.x, point.y));
    this.input.onKeyDown((code, event) => this.keyDown(code, event));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.level += 1;
    } else if (this.finishedRun) {
      this.finishedRun = false;
      this.level = 0;
      this.runMoves = 0;
    }
    this.level = Math.min(this.level, LEVELS.length - 1);
    this.loadLevel(this.level);
  }

  private loadLevel(index: number): void {
    const level = LEVELS[index]!;
    this.cars = createState(level);
    this.selectedId = RED_ID;
    this.moves = 0;
    this.complete = false;
    this.completeTimer = 0;
    this.pendingAdvance = false;
    this.drag = null;
    this.setScore('MOVIMIENTOS', 0);
  }

  protected update(dt: number): void {
    if (!this.complete) return;
    this.completeTimer = Math.min(this.completeTimer + dt, 2);
    if (!this.pendingAdvance && !this.finishedRun && this.completeTimer >= 1.1) {
      this.finishRun();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const layout = this.layout(view);

    drawPuzzleHeader(
      context,
      view,
      'Hora punta',
      `Nivel ${this.level + 1} de ${LEVELS.length} · ${LEVELS[this.level]!.name}`,
    );

    drawPuzzleBoard(context, layout, { padding: 10, fill: 'rgba(255, 253, 248, 0.72)' });
    this.drawGrid(context, layout);
    this.drawExit(context, view, layout);
    this.drawCars(context, layout);

    if (!this.complete) this.drawControls(context, view);
    if (this.complete && this.completeTimer > 0.45) this.drawComplete(context, view, layout);

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.level + 1}/${LEVELS.length} · ${LEVELS[this.level]!.name.toUpperCase()}`,
      `MOVIMIENTOS ${this.moves}`,
      this.complete ? 'Salida libre.' : 'Toca o arrastra · Tab cambia · R reinicia',
    );
  }

  private layout(view: View): PuzzleLayout {
    return puzzleLayout(view, BOARD_SIZE, BOARD_SIZE, LAYOUT);
  }

  private selectedCar(): Car | undefined {
    return this.cars.find((car) => car.id === this.selectedId);
  }

  private colorFor(car: Car, index: number): string {
    if (car.id === RED_ID) return RED_BODY;
    return CAR_COLORS[car.id] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
  }

  private drawGrid(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    context.save();
    context.strokeStyle = alpha(PALETTE.ink, 0.06);
    context.lineWidth = 1;
    for (let index = 1; index < BOARD_SIZE; index += 1) {
      const x = layout.x + index * layout.cell;
      context.beginPath();
      context.moveTo(x, layout.y + 2);
      context.lineTo(x, layout.y + layout.height - 2);
      context.stroke();
      const y = layout.y + index * layout.cell;
      context.beginPath();
      context.moveTo(layout.x + 2, y);
      context.lineTo(layout.x + layout.width - 2, y);
      context.stroke();
    }
    context.restore();
  }

  private drawExit(context: CanvasRenderingContext2D, view: View, layout: PuzzleLayout): void {
    const x = layout.x + layout.width;
    const y = layout.y + EXIT_ROW * layout.cell;
    const laneWidth = Math.max(16, Math.min(26, layout.cell * 0.42));

    context.save();
    roundedRect(context, x - 3, y + 3, laneWidth + 4, layout.cell - 6, 9);
    context.fillStyle = alpha(RED_BODY, 0.12);
    context.fill();
    context.setLineDash([4, 4]);
    context.strokeStyle = alpha(RED_STROKE, 0.6);
    context.lineWidth = 1.5;
    context.stroke();
    context.setLineDash([]);

    const centerY = y + layout.cell / 2;
    context.strokeStyle = alpha(RED_STROKE, 0.9);
    context.lineWidth = 2;
    for (let index = 0; index < 2; index += 1) {
      const start = x + 3 + index * 7;
      context.beginPath();
      context.moveTo(start, centerY - 5);
      context.lineTo(start + 5, centerY);
      context.lineTo(start, centerY + 5);
      context.stroke();
    }

    context.fillStyle = alpha(RED_STROKE, 0.85);
    context.font = `700 ${Math.max(7, layout.cell * 0.13)}px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText('SALIDA', x + laneWidth / 2, y - 4);

    if (view.width > 720) {
      context.fillStyle = alpha(PALETTE.ink, 0.45);
      context.font = `500 9px ${FONT_SANS}`;
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillText('El coche rojo sale por aquí', x + laneWidth + 10, centerY);
    }
    context.restore();
  }

  private drawCars(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const cell = layout.cell;
    const selected = this.selectedCar();
    const exitProgress = this.complete ? clamp(this.completeTimer / 0.45, 0, 1) : 0;

    this.cars.forEach((car, index) => {
      const x0 = layout.x + car.col * cell;
      const y0 = layout.y + car.row * cell;
      const width = car.orientation === 'h' ? cell * car.length : cell;
      const height = car.orientation === 'v' ? cell * car.length : cell;
      const inset = Math.max(2.5, cell * 0.075);
      const slide = car.id === RED_ID ? exitProgress * cell * 1.5 : 0;
      const x = x0 + inset + slide;
      const y = y0 + inset;
      const w = width - inset * 2;
      const h = height - inset * 2;
      const radius = Math.min(w, h) * 0.24;
      const color = this.colorFor(car, index);
      const isSelected = selected?.id === car.id && !this.complete;

      if (isSelected) {
        context.save();
        roundedRect(context, x - 3, y - 3, w + 6, h + 6, radius + 3);
        context.strokeStyle = alpha(PALETTE.forest, 0.5);
        context.lineWidth = 2.5;
        context.stroke();
        context.restore();
      }

      context.save();
      context.shadowColor = alpha(PALETTE.ink, 0.2);
      context.shadowBlur = isSelected ? 12 : 7;
      context.shadowOffsetY = 3;
      roundedRect(context, x, y, w, h, radius);
      context.fillStyle = color;
      context.fill();
      context.restore();

      context.save();
      roundedRect(context, x, y, w, h, radius);
      const shine = context.createLinearGradient(x, y, x, y + h);
      shine.addColorStop(0, 'rgba(255, 253, 248, 0.3)');
      shine.addColorStop(0.55, 'rgba(255, 253, 248, 0.02)');
      shine.addColorStop(1, 'rgba(36, 51, 45, 0.12)');
      context.fillStyle = shine;
      context.fill();

      roundedRect(context, x, y, w, h, radius);
      context.strokeStyle = car.id === RED_ID ? alpha(RED_STROKE, 0.9) : alpha(PALETTE.ink, 0.3);
      context.lineWidth = car.id === RED_ID ? 2 : 1.4;
      context.stroke();

      const pad = Math.min(w, h) * 0.2;
      roundedRect(context, x + pad, y + pad, w - pad * 2, h - pad * 2, radius * 0.7);
      context.fillStyle = 'rgba(255, 253, 248, 0.2)';
      context.fill();
      context.strokeStyle = 'rgba(255, 253, 248, 0.32)';
      context.lineWidth = 1;
      context.stroke();

      const light = Math.min(w, h) * 0.055;
      context.fillStyle = 'rgba(255, 253, 248, 0.75)';
      if (car.orientation === 'h') {
        context.beginPath();
        context.arc(x + w - pad * 0.8, y + h * 0.32, light, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(x + w - pad * 0.8, y + h * 0.68, light, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.arc(x + w * 0.32, y + h - pad * 0.8, light, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.arc(x + w * 0.68, y + h - pad * 0.8, light, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });
  }

  private pointerDown(x: number, y: number): void {
    const view = this.runtime.view;
    if (this.complete) {
      if (this.pendingAdvance && this.completeTimer > 0.45) {
        if (pointInButton(x, y, this.advanceButton(view))) this.advance();
      }
      return;
    }

    this.drag = null;
    const controls = this.controls(view);
    if (pointInButton(x, y, controls.reset)) {
      this.restartLevel();
      this.setStatus(`Nivel ${this.level + 1} reiniciado.`);
      return;
    }
    const direction = this.controlDirection(controls, x, y);
    if (direction !== null) {
      this.tryMoveSelected(direction);
      return;
    }

    const cell = this.pointToCell(view, x, y);
    if (!cell) return;
    const car = carAt(this.cars, cell.row, cell.col);
    if (!car) return;

    this.selectedId = car.id;
    this.drag = {
      carId: car.id,
      startX: x,
      startY: y,
      startCol: car.col,
      startRow: car.row,
      axis: car.orientation,
    };
    this.audio.click();
  }

  private pointerMove(x: number, y: number): void {
    const drag = this.drag;
    if (!drag || this.complete) return;
    if (!this.input.pointer.down) {
      this.drag = null;
      return;
    }
    const car = this.cars.find((item) => item.id === drag.carId);
    if (!car) {
      this.drag = null;
      return;
    }
    const cell = this.layout(this.runtime.view).cell;
    const offset =
      drag.axis === 'h'
        ? Math.round((x - drag.startX) / cell)
        : Math.round((y - drag.startY) / cell);
    const target = drag.axis === 'h' ? drag.startCol + offset : drag.startRow + offset;
    const current = drag.axis === 'h' ? car.col : car.row;
    if (target === current) return;
    this.slideSelected(target - current);
  }

  private pointToCell(view: View, x: number, y: number): { row: number; col: number } | null {
    const layout = this.layout(view);
    if (
      x < layout.x ||
      x >= layout.x + layout.width ||
      y < layout.y ||
      y >= layout.y + layout.height
    ) {
      return null;
    }
    return {
      row: Math.floor((y - layout.y) / layout.cell),
      col: Math.floor((x - layout.x) / layout.cell),
    };
  }

  private keyDown(code: string, event: KeyboardEvent): void {
    if (code === 'Tab') {
      event.preventDefault();
      this.cycleCar();
      return;
    }
    if (code === 'KeyR') {
      this.restartLevel();
      this.setStatus(`Nivel ${this.level + 1} reiniciado.`);
      return;
    }
    if (code === 'Enter' || code === 'Space') {
      if (this.complete) this.advance();
      return;
    }
    if (this.complete) return;

    const car = this.selectedCar();
    if (!car) return;
    let delta = 0;
    if (code === 'ArrowLeft') delta = car.orientation === 'h' ? -1 : 0;
    if (code === 'ArrowRight') delta = car.orientation === 'h' ? 1 : 0;
    if (code === 'ArrowUp') delta = car.orientation === 'v' ? -1 : 0;
    if (code === 'ArrowDown') delta = car.orientation === 'v' ? 1 : 0;
    if (delta === 0) {
      if (code.startsWith('Arrow')) {
        this.audio.tone(170, 0.04, { type: 'triangle', gain: 0.02 });
        this.setStatus(
          car.orientation === 'h'
            ? 'Este coche se mueve en horizontal.'
            : 'Este coche se mueve en vertical.',
        );
      }
      return;
    }
    this.tryMoveSelected(delta);
  }

  private cycleCar(): void {
    if (this.cars.length === 0) return;
    const index = this.cars.findIndex((car) => car.id === this.selectedId);
    const next = this.cars[(index + 1) % this.cars.length]!;
    this.selectedId = next.id;
    this.audio.tone(420, 0.04, { type: 'triangle', gain: 0.03 });
    this.setStatus(`Coche ${next.id} seleccionado.`);
  }

  private tryMoveSelected(delta: number): void {
    if (this.complete) return;
    const car = this.selectedCar();
    if (!car) return;
    const next = moveCar(this.cars, car.id, delta);
    if (!next) {
      this.audio.tone(150, 0.05, { type: 'triangle', gain: 0.02 });
      this.setStatus('Ese hueco está ocupado.');
      return;
    }
    this.applyMove(next, 1, 260 + this.moves * 4);
  }

  private slideSelected(delta: number): void {
    if (this.complete) return;
    const result = slideCar(this.cars, this.selectedId, delta);
    if (result.steps === 0) return;
    this.applyMove(result.cars, result.steps, 260 + this.moves * 4);
  }

  private applyMove(cars: Car[], steps: number, tone: number): void {
    this.cars = cars;
    this.moves += steps;
    this.runMoves += steps;
    this.setScore('MOVIMIENTOS', this.moves);
    this.audio.tone(tone, 0.04, { type: 'triangle', gain: 0.03 });
    if (isSolved(this.cars)) this.solvedLevel();
  }

  private solvedLevel(): void {
    if (this.complete) return;
    this.complete = true;
    this.completeTimer = 0;
    this.drag = null;
    this.pendingAdvance = this.level < LEVELS.length - 1;
    this.audio.chord([523.25, 659.25, 783.99], 0.4, { gain: 0.09 });
    this.setStatus(
      this.pendingAdvance
        ? `Nivel ${this.level + 1} resuelto.`
        : 'Último nivel resuelto. El coche rojo ha salido.',
    );
  }

  private advance(): void {
    if (!this.complete || !this.pendingAdvance) return;
    this.audio.click();
    this.reset();
    this.setStatus(`Nivel ${this.level + 1}: ${LEVELS[this.level]!.name}.`);
  }

  private restartLevel(): void {
    this.loadLevel(this.level);
  }

  private finishRun(): void {
    if (this.finishedRun) return;
    this.finishedRun = true;
    const score = Math.max(120, 1400 - this.runMoves * 6);
    this.finish({
      title: 'Atasco resuelto',
      message: 'Has despejado la hora punta y el coche rojo ha salido por la derecha.',
      detail: `${this.runMoves} movimientos en total`,
      score,
      scoreLabel: 'PUNTOS',
      tone: 'win',
      ctaLabel: 'Jugar de nuevo',
    });
  }

  private controls(view: View): Controls {
    const layout = this.layout(view);
    const size = view.width < 480 ? 42 : 46;
    const gap = 6;
    const centerX = view.width / 2;
    const baseY = Math.min(view.height - 154, layout.y + layout.height + 22);
    const resetWidth = 104;
    return {
      up: { x: centerX - size / 2, y: baseY, width: size, height: size },
      left: {
        x: centerX - size * 1.5 - gap,
        y: baseY + size + gap,
        width: size,
        height: size,
      },
      down: {
        x: centerX - size / 2,
        y: baseY + size + gap,
        width: size,
        height: size,
      },
      right: {
        x: centerX + size / 2 + gap,
        y: baseY + size + gap,
        width: size,
        height: size,
      },
      reset: {
        x: centerX - resetWidth / 2,
        y: baseY + (size + gap) * 2 + 8,
        width: resetWidth,
        height: 30,
      },
    };
  }

  private controlDirection(controls: Controls, x: number, y: number): number | null {
    const car = this.selectedCar();
    if (!car) return null;
    let delta = 0;
    if (pointInButton(x, y, controls.up)) delta = car.orientation === 'v' ? -1 : 0;
    else if (pointInButton(x, y, controls.down)) delta = car.orientation === 'v' ? 1 : 0;
    else if (pointInButton(x, y, controls.left)) delta = car.orientation === 'h' ? -1 : 0;
    else if (pointInButton(x, y, controls.right)) delta = car.orientation === 'h' ? 1 : 0;
    return delta === 0 ? null : delta;
  }

  private drawControls(context: CanvasRenderingContext2D, view: View): void {
    const controls = this.controls(view);
    const car = this.selectedCar();
    const horizontal = car !== undefined && car.orientation === 'h';
    const vertical = car !== undefined && car.orientation === 'v';
    const leftFree = car !== undefined && horizontal && canMove(this.cars, car.id, -1);
    const rightFree = car !== undefined && horizontal && canMove(this.cars, car.id, 1);
    const upFree = car !== undefined && vertical && canMove(this.cars, car.id, -1);
    const downFree = car !== undefined && vertical && canMove(this.cars, car.id, 1);

    drawUiButton(context, controls.up, '▲', {
      accent: ACCENT,
      disabled: !upFree,
    });
    drawUiButton(context, controls.left, '◀', {
      accent: ACCENT,
      disabled: !leftFree,
    });
    drawUiButton(context, controls.down, '▼', {
      accent: ACCENT,
      disabled: !downFree,
    });
    drawUiButton(context, controls.right, '▶', {
      accent: ACCENT,
      disabled: !rightFree,
    });
    drawUiButton(context, controls.reset, 'Reiniciar', {
      accent: PALETTE.apricot,
    });
  }

  private advanceButton(view: View): UiButton {
    const layout = this.layout(view);
    const panelY = layout.y + layout.height / 2 - 95;
    const width = Math.min(220, view.width * 0.62);
    return {
      x: (view.width - width) / 2,
      y: panelY + 116,
      width,
      height: 38,
    };
  }

  private drawComplete(context: CanvasRenderingContext2D, view: View, layout: PuzzleLayout): void {
    const panelWidth = Math.min(view.width * 0.84, 350);
    const panelHeight = 190;
    const panelX = (view.width - panelWidth) / 2;
    const panelY = layout.y + layout.height / 2 - panelHeight / 2;

    context.save();
    roundedRect(context, panelX, panelY, panelWidth, panelHeight, 18);
    context.fillStyle = 'rgba(255, 253, 248, 0.96)';
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    context.font = `600 20px ${FONT_SANS}`;
    context.fillText(
      this.pendingAdvance ? 'Nivel completado' : 'Salida libre',
      view.width / 2,
      panelY + 44,
    );
    context.fillStyle = alpha(PALETTE.ink, 0.6);
    context.font = `500 12px ${FONT_SANS}`;
    context.fillText(
      `${this.moves} movimiento${this.moves === 1 ? '' : 's'} · nivel ${this.level + 1} de ${LEVELS.length}`,
      view.width / 2,
      panelY + 72,
    );

    if (this.pendingAdvance) {
      drawUiButton(context, this.advanceButton(view), 'Siguiente nivel', {
        active: true,
        accent: ACCENT,
      });
      context.fillStyle = alpha(PALETTE.ink, 0.5);
      context.font = `500 9px ${FONT_MONO}`;
      context.fillText('Enter o toca el botón para continuar', view.width / 2, panelY + 170);
    } else {
      context.fillStyle = alpha(PALETTE.ink, 0.5);
      context.font = `500 10px ${FONT_SANS}`;
      context.fillText('El coche rojo ya está fuera del tablero.', view.width / 2, panelY + 112);
    }
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new RushHour(context),
} satisfies GameModule;

import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  Particles,
  ScreenShake,
  TAU,
  alpha,
  clamp,
  damp,
  glowCircle,
  readJSON,
  roundedRect,
  writeJSON,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  parseLevel,
  rotateCell,
  traceBeams,
  type BeamSegment,
  type Cell,
  type LevelDefinition,
  type ParsedLevel,
} from './logic';
import { levels } from './levels';

const PROGRESS_KEY = 'prisma:progress';

interface Progress {
  level: number;
}

interface Geometry {
  cell: number;
  originX: number;
  originY: number;
  boardWidth: number;
  boardHeight: number;
}

class Prisma extends BaseGame {
  private levelIndex = 0;
  private level!: LevelDefinition;
  private parsed!: ParsedLevel;
  private cells: Cell[] = [];
  private beams: BeamSegment[] = [];
  private lit = new Set<number>();
  private angles: number[] = [];
  private targetAngles: number[] = [];
  private moves = 0;
  private hoverIndex = -1;
  private focusIndex = -1;
  private locked = false;
  private winTimer = 0;
  private pendingAdvance = false;
  private time = 0;
  private particles = new Particles();
  private shake = new ScreenShake();

  constructor(context: GameContext) {
    super(context);

    const progress = readJSON<Progress>(PROGRESS_KEY, { level: 0 });
    const savedLevel = typeof progress.level === 'number' ? progress.level : 0;
    this.levelIndex = clamp(Math.round(savedLevel), 0, levels.length - 1);

    this.input.onPointerDown((point) => this.pointerDown(point.x, point.y));
    this.input.onPointerMove((point) => this.pointerMove(point.x, point.y));
    this.input.onKeyDown((code) => this.keyDown(code));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.levelIndex = (this.levelIndex + 1) % levels.length;
      this.pendingAdvance = false;
    }
    this.loadLevel(this.levelIndex);
  }

  private loadLevel(index: number): void {
    this.levelIndex = index;
    this.level = levels[index]!;
    this.parsed = parseLevel(this.level);
    this.cells = this.parsed.cells;
    this.moves = 0;
    this.hoverIndex = -1;
    this.focusIndex = this.parsed.mirrors[0] ?? -1;
    this.locked = false;
    this.winTimer = 0;
    this.pendingAdvance = false;
    this.particles.clear();
    this.shake = new ScreenShake();

    this.angles = this.cells.map((cell) =>
      cell.type === 'mirror' ? -Math.PI / 4 + (cell.turns % 2) * (Math.PI / 2) : 0,
    );
    this.targetAngles = [...this.angles];
    this.recompute();
    this.setScore('NIVEL', `${index + 1}/${levels.length}`);
  }

  private recompute(): void {
    const result = traceBeams(this.parsed);
    this.beams = result.segments;
    this.lit = result.lit;
  }

  private geometry(view: View): Geometry {
    const cell = clamp(
      Math.min((view.width * 0.84) / this.parsed.cols, (view.height * 0.64) / this.parsed.rows),
      28,
      86,
    );
    const boardWidth = cell * this.parsed.cols;
    const boardHeight = cell * this.parsed.rows;
    return {
      cell,
      originX: (view.width - boardWidth) / 2,
      originY: Math.max(72, (view.height - boardHeight) / 2 - 10),
      boardWidth,
      boardHeight,
    };
  }

  private cellAt(x: number, y: number): number {
    const geometry = this.geometry(this.runtime.view);
    const column = Math.floor((x - geometry.originX) / geometry.cell);
    const row = Math.floor((y - geometry.originY) / geometry.cell);
    if (column < 0 || column >= this.parsed.cols || row < 0 || row >= this.parsed.rows) return -1;
    return row * this.parsed.cols + column;
  }

  private pointerDown(x: number, y: number): void {
    if (this.state !== 'running' || this.locked) return;
    const index = this.cellAt(x, y);
    if (index < 0) return;
    if (this.cells[index]?.type === 'mirror') this.focusIndex = index;
    this.rotate(index);
  }

  private pointerMove(x: number, y: number): void {
    this.hoverIndex = this.cellAt(x, y);
  }

  private keyDown(code: string): void {
    if (this.state !== 'running' || this.locked) return;
    const columns = this.parsed.cols;

    if (code === 'KeyR') {
      this.pendingAdvance = false;
      this.restart();
      return;
    }

    if (code === 'Space' || code === 'Enter') {
      this.rotate(this.focusIndex);
      return;
    }

    const x = this.focusIndex % columns;
    const y = Math.floor(this.focusIndex / columns);
    let nextX = x;
    let nextY = y;

    if (code === 'ArrowLeft' || code === 'KeyA') nextX -= 1;
    else if (code === 'ArrowRight' || code === 'KeyD') nextX += 1;
    else if (code === 'ArrowUp' || code === 'KeyW') nextY -= 1;
    else if (code === 'ArrowDown' || code === 'KeyS') nextY += 1;
    else return;

    nextX = (nextX + columns) % columns;
    nextY = (nextY + this.parsed.rows) % this.parsed.rows;
    this.focusIndex = nextY * columns + nextX;
    this.audio.tone(240, 0.04, { type: 'triangle', gain: 0.025 });
  }

  private rotate(index: number): void {
    if (index < 0) return;
    if (!rotateCell(this.parsed, index)) {
      this.audio.tone(140, 0.06, { type: 'sawtooth', gain: 0.03 });
      return;
    }

    this.moves += 1;
    this.targetAngles[index] = this.targetAngles[index]! + Math.PI / 2;
    this.audio.tone(430 + (index % 7) * 38, 0.07, { type: 'triangle', gain: 0.06 });

    const geometry = this.geometry(this.runtime.view);
    const x = geometry.originX + ((index % this.parsed.cols) + 0.5) * geometry.cell;
    const y = geometry.originY + (Math.floor(index / this.parsed.cols) + 0.5) * geometry.cell;
    this.particles.burst(x, y, PALETTE.cyan, {
      count: this.reducedMotion ? 4 : 10,
      speed: 90,
      size: 2,
      life: 0.35,
    });

    this.recompute();
    this.checkWin();
  }

  private checkWin(): void {
    if (this.locked) return;
    const solved = this.parsed.crystals.every((index) => this.lit.has(index));
    if (!solved) return;

    this.locked = true;
    this.winTimer = 0.85;
    this.audio.chord([523.25, 659.25, 783.99, 1046.5], 0.55, { type: 'sine', gain: 0.12 });
    this.setStatus('Nivel completado. Todos los cristales están encendidos.');

    const geometry = this.geometry(this.runtime.view);
    for (const index of this.parsed.crystals) {
      const x = geometry.originX + ((index % this.parsed.cols) + 0.5) * geometry.cell;
      const y = geometry.originY + (Math.floor(index / this.parsed.cols) + 0.5) * geometry.cell;
      this.particles.burst(x, y, PALETTE.lime, {
        count: this.reducedMotion ? 8 : 20,
        speed: 160,
        size: 2.6,
        life: 0.8,
      });
    }
    if (!this.reducedMotion) this.shake.add(5, 0.25);
  }

  private finishLevel(): void {
    if (!this.pendingAdvance) {
      this.pendingAdvance = true;
      writeJSON(PROGRESS_KEY, { level: (this.levelIndex + 1) % levels.length } satisfies Progress);
    }

    const isLast = this.levelIndex === levels.length - 1;
    this.finish({
      title: isLast ? 'Prisma completado' : `Nivel ${this.levelIndex + 1} completado`,
      message: isLast
        ? 'Has encendido la última constelación. Puedes volver a empezar cuando quieras.'
        : 'Todos los cristales están encendidos. El siguiente nivel te espera.',
      detail: `${this.moves} movimiento${this.moves === 1 ? '' : 's'} · ${this.level.name}`,
      score: this.levelIndex + 1,
      scoreLabel: 'NIVEL',
      ctaLabel: isLast ? 'Volver al primer nivel' : 'Siguiente nivel',
      tone: 'win',
    });
  }

  protected update(dt: number): void {
    this.time += dt;
    for (let index = 0; index < this.angles.length; index += 1) {
      if (this.cells[index]?.type !== 'mirror') continue;
      this.angles[index] = damp(this.angles[index]!, this.targetAngles[index]!, 15, dt);
    }
    this.particles.update(dt);
    this.shake.update(dt);

    if (this.locked && this.winTimer > 0) {
      this.winTimer -= dt;
      if (this.winTimer <= 0) this.finishLevel();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const geometry = this.geometry(view);
    const { originX, originY, boardWidth, boardHeight } = geometry;

    const background = context.createRadialGradient(
      view.width / 2,
      view.height / 2,
      0,
      view.width / 2,
      view.height / 2,
      Math.max(view.width, view.height) * 0.72,
    );
    background.addColorStop(0, '#0b1113');
    background.addColorStop(0.6, '#080a0c');
    background.addColorStop(1, PALETTE.bg);
    context.fillStyle = background;
    context.fillRect(0, 0, view.width, view.height);

    glowCircle(context, view.width / 2, view.height / 2, boardWidth * 0.78, PALETTE.cyan, 0.07);

    context.save();
    if (!this.reducedMotion) this.shake.apply(context);

    roundedRect(context, originX - 8, originY - 8, boardWidth + 16, boardHeight + 16, 18);
    context.fillStyle = 'rgba(255, 255, 255, 0.018)';
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    context.lineWidth = 1;
    context.stroke();

    this.drawCells(context, geometry);
    this.drawBeams(context, geometry);
    this.drawSymbols(context, geometry);
    this.drawFocus(context, geometry);
    this.particles.draw(context);
    context.restore();

    this.drawFooter(context, geometry, view);
  }

  private drawCells(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cell, originX, originY } = geometry;
    const inset = Math.max(1.5, cell * 0.035);
    const size = cell - inset * 2;
    const radius = cell * 0.16;

    for (let index = 0; index < this.cells.length; index += 1) {
      const cellData = this.cells[index]!;
      const column = index % this.parsed.cols;
      const row = Math.floor(index / this.parsed.cols);
      const x = originX + column * cell + inset;
      const y = originY + row * cell + inset;

      roundedRect(context, x, y, size, size, radius);

      if (cellData.type === 'wall') {
        context.fillStyle = 'rgba(255, 255, 255, 0.05)';
        context.fill();
        context.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        context.stroke();
        continue;
      }

      if (cellData.type === 'crystal') {
        const isLit = this.lit.has(index);
        context.fillStyle = isLit ? alpha(PALETTE.lime, 0.12) : 'rgba(255, 255, 255, 0.025)';
        context.fill();
        context.strokeStyle = isLit ? alpha(PALETTE.lime, 0.4) : alpha(PALETTE.ink, 0.3);
        context.stroke();
        continue;
      }

      if (cellData.type === 'emitter') {
        context.fillStyle = alpha(PALETTE.coral, 0.08);
        context.fill();
        context.strokeStyle = alpha(PALETTE.coral, 0.28);
        context.stroke();
        continue;
      }

      context.fillStyle = 'rgba(255, 255, 255, 0.03)';
      context.fill();
      context.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      context.stroke();
    }
  }

  private drawBeams(context: CanvasRenderingContext2D, geometry: Geometry): void {
    if (this.beams.length === 0) return;
    const { cell, originX, originY } = geometry;

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';

    for (const pass of [
      { width: Math.max(8, cell * 0.16), color: alpha(PALETTE.cyan, 0.1) },
      { width: Math.max(2.4, cell * 0.045), color: alpha(PALETTE.cyan, 0.82) },
      { width: Math.max(1, cell * 0.018), color: alpha('#ffffff', 0.55) },
    ]) {
      context.strokeStyle = pass.color;
      context.lineWidth = pass.width;
      context.beginPath();
      for (const segment of this.beams) {
        context.moveTo(originX + segment.x1 * cell, originY + segment.y1 * cell);
        context.lineTo(originX + segment.x2 * cell, originY + segment.y2 * cell);
      }
      context.stroke();
    }

    context.restore();
  }

  private drawSymbols(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cell, originX, originY } = geometry;
    const half = cell * 0.26;

    for (let index = 0; index < this.cells.length; index += 1) {
      const cellData = this.cells[index]!;
      if (cellData.type === 'empty' || cellData.type === 'wall') continue;

      const column = index % this.parsed.cols;
      const row = Math.floor(index / this.parsed.cols);
      const cx = originX + (column + 0.5) * cell;
      const cy = originY + (row + 0.5) * cell;

      if (cellData.type === 'mirror') {
        const angle = this.angles[index] ?? 0;
        context.save();
        context.translate(cx, cy);
        context.rotate(angle);
        context.lineCap = 'round';

        context.strokeStyle = alpha(PALETTE.cyan, 0.22);
        context.lineWidth = Math.max(8, cell * 0.14);
        context.beginPath();
        context.moveTo(-half, 0);
        context.lineTo(half, 0);
        context.stroke();

        context.strokeStyle = PALETTE.cyan;
        context.lineWidth = Math.max(2.5, cell * 0.055);
        context.beginPath();
        context.moveTo(-half, 0);
        context.lineTo(half, 0);
        context.stroke();

        context.strokeStyle = alpha('#ffffff', 0.75);
        context.lineWidth = Math.max(1, cell * 0.018);
        context.beginPath();
        context.moveTo(-half * 0.7, 0);
        context.lineTo(half * 0.7, 0);
        context.stroke();
        context.restore();
        continue;
      }

      if (cellData.type === 'splitter') {
        context.save();
        context.translate(cx, cy);
        context.strokeStyle = PALETTE.violet;
        context.lineWidth = Math.max(2, cell * 0.045);
        context.lineCap = 'round';
        for (let spoke = 0; spoke < 4; spoke += 1) {
          const angle = (spoke / 4) * TAU;
          context.beginPath();
          context.moveTo(Math.cos(angle) * cell * 0.08, Math.sin(angle) * cell * 0.08);
          context.lineTo(Math.cos(angle) * half, Math.sin(angle) * half);
          context.stroke();
        }
        context.fillStyle = PALETTE.ink;
        context.beginPath();
        context.arc(0, 0, Math.max(2, cell * 0.045), 0, TAU);
        context.fill();
        context.restore();
        continue;
      }

      if (cellData.type === 'emitter') {
        const direction = cellData.direction ?? 0;
        const angle = (direction * Math.PI) / 2;
        context.save();
        context.translate(cx, cy);
        context.rotate(angle);
        glowCircle(context, 0, 0, cell * 0.32, PALETTE.coral, 0.25);
        context.fillStyle = PALETTE.coral;
        context.beginPath();
        context.moveTo(cell * 0.16, 0);
        context.lineTo(-cell * 0.1, -cell * 0.12);
        context.lineTo(-cell * 0.1, cell * 0.12);
        context.closePath();
        context.fill();
        context.restore();
        continue;
      }

      if (cellData.type === 'crystal') {
        const isLit = this.lit.has(index);
        const pulse = isLit ? 1 + Math.sin(this.time * 3 + index) * 0.08 : 1;
        const size = cell * 0.18 * pulse;
        if (isLit) glowCircle(context, cx, cy, cell * 0.5, PALETTE.lime, 0.32);
        context.save();
        context.translate(cx, cy);
        context.rotate(Math.PI / 4);
        context.fillStyle = isLit ? PALETTE.lime : 'rgba(255, 255, 255, 0.04)';
        context.strokeStyle = isLit ? alpha('#ffffff', 0.75) : alpha(PALETTE.ink, 0.25);
        context.lineWidth = Math.max(1.2, cell * 0.025);
        context.beginPath();
        context.rect(-size / 2, -size / 2, size, size);
        context.fill();
        context.stroke();
        context.restore();
      }
    }
  }

  private drawFocus(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const index = this.hoverIndex >= 0 ? this.hoverIndex : this.focusIndex;
    if (index < 0 || index >= this.cells.length) return;
    if (this.cells[index]?.type !== 'mirror') return;

    const { cell, originX, originY } = geometry;
    const column = index % this.parsed.cols;
    const row = Math.floor(index / this.parsed.cols);
    const x = originX + column * cell + 2;
    const y = originY + row * cell + 2;
    context.save();
    context.setLineDash([3, 4]);
    context.strokeStyle = alpha(PALETTE.lime, 0.9);
    context.lineWidth = 1.5;
    roundedRect(context, x, y, cell - 4, cell - 4, cell * 0.15);
    context.stroke();
    context.restore();
  }

  private drawFooter(context: CanvasRenderingContext2D, geometry: Geometry, view: View): void {
    const y = Math.min(view.height - 22, geometry.originY + geometry.boardHeight + 30);
    context.save();
    context.font = `500 10px ${FONT_MONO}`;
    context.fillStyle = PALETTE.muted;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(
      `NIVEL ${String(this.levelIndex + 1).padStart(2, '0')} · ${this.level.name.toUpperCase()}`,
      geometry.originX,
      y,
    );
    context.textAlign = 'right';
    context.fillText(
      `MOVIMIENTOS ${String(this.moves).padStart(2, '0')}`,
      geometry.originX + geometry.boardWidth,
      y,
    );

    if (this.moves === 0 && !this.locked) {
      context.textAlign = 'center';
      context.fillStyle = alpha(PALETTE.inkSoft, 0.75);
      context.fillText('TOCA UN ESPEJO PARA GIRARLO', view.width / 2, y + 22);
    }
    context.restore();
  }
}

const gameModule: GameModule = {
  mount: (context) => new Prisma(context),
};

export default gameModule;

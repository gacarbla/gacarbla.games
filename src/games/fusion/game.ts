import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  Particles,
  ScreenShake,
  alpha,
  clamp,
  damp,
  glowCircle,
  roundedRect,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  FUSION_COLS,
  FUSION_ROWS,
  createBoard,
  dropTile,
  isBoardFull,
  landingIndex,
  resolveOne,
  spawnValue,
  type Board,
} from './logic';

type Phase = 'aim' | 'dropping' | 'resolving';

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface Geometry {
  cell: number;
  originX: number;
  originY: number;
  boardWidth: number;
  boardHeight: number;
  sideX: number;
  wide: boolean;
}

const TILE_COLORS = ['#5f8f6f', '#4f7f9c', '#7d629b', '#c8684a', '#a8872f', '#2f5d50', '#2f5d50'];

function tileColor(value: number): string {
  return TILE_COLORS[Math.min(Math.max(value - 1, 0), TILE_COLORS.length - 1)]!;
}

class Fusion extends BaseGame {
  private board: Board = createBoard();
  private currentValue = 1;
  private nextValue = 2;
  private score = 0;
  private moves = 0;
  private merges = 0;
  private chain = 1;
  private maxChain = 1;
  private phase: Phase = 'aim';
  private aimColumn = Math.floor(FUSION_COLS / 2);
  private dropTimer = 0;
  private resolveTimer = 0;
  private time = 0;
  private anims = new Map<number, number>();
  private pops = new Map<number, number>();
  private floaters: Floater[] = [];
  private particles = new Particles();
  private shake = new ScreenShake();

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerMove((point) => this.aimAt(point.x));
    this.input.onPointerDown((point) => this.pointerDrop(point.x, point.y));
    this.input.onKeyDown((code) => this.keyDown(code));
  }

  protected reset(): void {
    this.board = createBoard();
    this.currentValue = 1;
    this.nextValue = spawnValue();
    this.score = 0;
    this.moves = 0;
    this.merges = 0;
    this.chain = 1;
    this.maxChain = 1;
    this.phase = 'aim';
    this.aimColumn = Math.floor(FUSION_COLS / 2);
    this.dropTimer = 0;
    this.resolveTimer = 0;
    this.anims.clear();
    this.pops.clear();
    this.floaters = [];
    this.particles.clear();
    this.shake = new ScreenShake();
    this.setScore('PUNTOS', 0);
  }

  private geometry(view: View): Geometry {
    const wide = view.width >= 1000;
    const sideWidth = wide ? 210 : 0;
    const available = view.width - sideWidth - (wide ? 44 : 22);
    const cell = clamp(
      Math.min(available / FUSION_COLS, (view.height * 0.68) / FUSION_ROWS),
      32,
      76,
    );
    const boardWidth = cell * FUSION_COLS;
    const boardHeight = cell * FUSION_ROWS;
    const totalWidth = boardWidth + sideWidth;
    return {
      cell,
      originX: (view.width - totalWidth) / 2,
      originY: Math.max(76, (view.height - boardHeight) / 2 - 6),
      boardWidth,
      boardHeight,
      sideX: (view.width - totalWidth) / 2 + boardWidth + 48,
      wide,
    };
  }

  private columnAt(x: number): number {
    const geometry = this.geometry(this.runtime.view);
    if (x < geometry.originX || x > geometry.originX + geometry.boardWidth) return -1;
    return clamp(Math.floor((x - geometry.originX) / geometry.cell), 0, FUSION_COLS - 1);
  }

  private aimAt(x: number): void {
    if (this.state !== 'running' || this.phase !== 'aim') return;
    const column = this.columnAt(x);
    if (column < 0 || column === this.aimColumn) return;
    this.aimColumn = column;
    this.audio.tone(300 + column * 30, 0.03, { type: 'triangle', gain: 0.018 });
  }

  private pointerDrop(x: number, y: number): void {
    if (this.state !== 'running' || this.phase !== 'aim') return;
    const geometry = this.geometry(this.runtime.view);
    if (y < geometry.originY - geometry.cell * 0.6) return;
    const column = this.columnAt(x);
    if (column >= 0) this.aimColumn = column;
    this.drop();
  }

  private keyDown(code: string): void {
    if (this.state !== 'running') return;

    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.aimColumn = (this.aimColumn + FUSION_COLS - 1) % FUSION_COLS;
      this.audio.tone(280, 0.04, { type: 'triangle', gain: 0.02 });
      return;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      this.aimColumn = (this.aimColumn + 1) % FUSION_COLS;
      this.audio.tone(320, 0.04, { type: 'triangle', gain: 0.02 });
      return;
    }
    if (code === 'Space' || code === 'ArrowDown' || code === 'KeyS' || code === 'Enter') {
      this.drop();
    }
  }

  private drop(): void {
    if (this.phase !== 'aim') return;

    const target = landingIndex(this.board, this.aimColumn);
    if (target < 0) {
      this.audio.tone(180, 0.1, { type: 'triangle', gain: 0.04 });
      this.addFloater(
        this.columnCenterX(this.aimColumn),
        this.geometry(this.runtime.view).originY + 24,
        'LLENA',
        PALETTE.coral,
      );
      this.setStatus('Esa columna está llena. Prueba con otra.');
      return;
    }

    const index = dropTile(this.board, this.aimColumn, this.currentValue);
    if (index < 0) return;

    this.moves += 1;
    const geometry = this.geometry(this.runtime.view);
    const row = Math.floor(index / FUSION_COLS);
    this.anims.set(index, -((row + 1.8) * geometry.cell));
    this.phase = 'dropping';
    this.dropTimer = 0.24;

    this.audio.tone(240, 0.12, { type: 'triangle', gain: 0.04, slideTo: 150 });
    this.audio.noise(0.06, { gain: 0.025, filter: 'lowpass', frequency: 380 });

    this.currentValue = this.nextValue;
    this.nextValue = spawnValue();
  }

  private resolveStep(): void {
    const geometry = this.geometry(this.runtime.view);
    const result = resolveOne(this.board);

    if (!result.merge) {
      this.phase = 'aim';
      this.chain = 1;
      this.anims.clear();
      if (isBoardFull(this.board)) this.finishGame();
      return;
    }

    this.board = result.board;
    this.anims.clear();
    for (const move of result.moved) {
      const fromRow = Math.floor(move.from / FUSION_COLS);
      const toRow = Math.floor(move.to / FUSION_COLS);
      this.anims.set(move.to, -(toRow - fromRow) * geometry.cell);
    }

    const multiplier = this.chain;
    const gained = result.gained * multiplier;
    this.score += gained;
    this.merges += 1;
    this.maxChain = Math.max(this.maxChain, multiplier);
    this.chain += 1;
    this.setScore('PUNTOS', this.score);

    const column = result.merge.index % FUSION_COLS;
    const row = Math.floor(result.merge.index / FUSION_COLS);
    const x = geometry.originX + (column + 0.5) * geometry.cell;
    const y = geometry.originY + (row + 0.5) * geometry.cell;
    this.pops.set(result.merge.index, 0.42);
    this.addFloater(x, y - geometry.cell * 0.3, `+${gained}`, tileColor(result.merge.value));
    this.particles.burst(x, y, tileColor(result.merge.value), {
      count: this.reducedMotion ? 8 : Math.min(26, 8 + result.merge.size * 3),
      speed: 170,
      size: 2.6,
      life: 0.6,
      shape: 'spark',
    });

    const pitch = 360 + result.merge.value * 70;
    this.audio.tone(pitch, 0.12, { type: 'triangle', gain: 0.08, slideTo: pitch * 1.4 });
    if (multiplier > 1) {
      this.audio.tone(pitch * 1.5, 0.16, {
        type: 'sine',
        gain: 0.07,
        delay: 0.04,
      });
      if (multiplier >= 3) this.toast(`Cadena ×${multiplier}`);
      if (!this.reducedMotion) this.shake.add(2 + multiplier, 0.2);
    }

    this.phase = 'resolving';
    this.resolveTimer = 0.28;
  }

  private finishGame(): void {
    this.setStatus(`Fin de la partida. Puntuación ${this.score}.`);
    this.audio.chord([392, 311, 233], 0.8, { type: 'sine', gain: 0.1 });
    this.finish({
      title: 'El tablero se llenó',
      message: 'Las piezas han ocupado todo el espacio. La próxima cadena puede ser mejor.',
      detail: `${this.merges} fusiones · cadena máxima ×${this.maxChain}`,
      score: this.score,
      ctaLabel: 'Otra partida',
      tone: 'lose',
    });
  }

  private addFloater(x: number, y: number, text: string, color: string): void {
    this.floaters.push({ x, y, text, life: 0.9, color });
  }

  private columnCenterX(column: number): number {
    const geometry = this.geometry(this.runtime.view);
    return geometry.originX + (column + 0.5) * geometry.cell;
  }

  protected update(dt: number): void {
    this.time += dt;
    for (const [index, offset] of this.anims) {
      const next = damp(offset, 0, 18, dt);
      if (Math.abs(next) < 0.5) this.anims.delete(index);
      else this.anims.set(index, next);
    }
    for (const [index, pop] of this.pops) {
      const next = pop - dt;
      if (next <= 0) this.pops.delete(index);
      else this.pops.set(index, next);
    }

    for (const floater of this.floaters) {
      floater.life -= dt;
      floater.y -= dt * 32;
    }
    this.floaters = this.floaters.filter((floater) => floater.life > 0);

    this.particles.update(dt);
    this.shake.update(dt);

    if (this.phase === 'dropping') {
      this.dropTimer -= dt;
      if (this.dropTimer <= 0) {
        this.phase = 'resolving';
        this.resolveTimer = 0.06;
      }
    } else if (this.phase === 'resolving') {
      this.resolveTimer -= dt;
      if (this.resolveTimer <= 0) this.resolveStep();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const geometry = this.geometry(view);
    const background = context.createRadialGradient(
      view.width / 2,
      view.height / 2,
      0,
      view.width / 2,
      view.height / 2,
      Math.max(view.width, view.height) * 0.75,
    );
    background.addColorStop(0, '#fbf0e8');
    background.addColorStop(0.55, '#fbf5eb');
    background.addColorStop(1, PALETTE.bg);
    context.fillStyle = background;
    context.fillRect(0, 0, view.width, view.height);

    glowCircle(
      context,
      view.width / 2,
      view.height / 2,
      geometry.boardWidth * 0.8,
      PALETTE.coral,
      0.05,
    );

    context.save();
    if (!this.reducedMotion) this.shake.apply(context);
    this.drawBoard(context, geometry);
    this.drawAim(context, geometry);
    this.drawTiles(context, geometry);
    this.particles.draw(context);
    this.drawFloaters(context);
    context.restore();

    this.drawSide(context, geometry);
    this.drawFooter(context, geometry, view);
  }

  private drawBoard(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cell, originX, originY, boardWidth, boardHeight } = geometry;

    roundedRect(context, originX - 8, originY - 8, boardWidth + 16, boardHeight + 16, 20);
    context.fillStyle = 'rgba(255, 253, 248, 0.78)';
    context.fill();
    context.strokeStyle = 'rgba(36, 51, 45, 0.16)';
    context.lineWidth = 1;
    context.stroke();

    const inset = Math.max(1.5, cell * 0.035);
    for (let index = 0; index < this.board.length; index += 1) {
      const column = index % FUSION_COLS;
      const row = Math.floor(index / FUSION_COLS);
      roundedRect(
        context,
        originX + column * cell + inset,
        originY + row * cell + inset,
        cell - inset * 2,
        cell - inset * 2,
        cell * 0.18,
      );
      context.fillStyle = '#fffdf8';
      context.fill();
      context.strokeStyle = 'rgba(36, 51, 45, 0.13)';
      context.stroke();
    }

    if (this.board.some((value, index) => index < FUSION_COLS && value !== 0)) {
      context.strokeStyle = alpha(PALETTE.apricot, 0.6);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(originX, originY + 1);
      context.lineTo(originX + boardWidth, originY + 1);
      context.stroke();
      glowCircle(
        context,
        originX + boardWidth / 2,
        originY,
        boardWidth * 0.45,
        PALETTE.coral,
        0.12,
      );
    }
  }

  private drawAim(context: CanvasRenderingContext2D, geometry: Geometry): void {
    if (this.phase !== 'aim') return;
    const { cell, originX, originY, boardHeight } = geometry;
    const x = originX + this.aimColumn * cell;
    const target = landingIndex(this.board, this.aimColumn);

    context.save();
    context.fillStyle = alpha(PALETTE.forest, 0.06);
    context.fillRect(x + 2, originY + 2, cell - 4, boardHeight - 4);
    context.strokeStyle = alpha(PALETTE.forest, 0.28);
    context.lineWidth = 1;
    context.strokeRect(x + 2, originY + 2, cell - 4, boardHeight - 4);

    if (target >= 0) {
      const row = Math.floor(target / FUSION_COLS);
      const cx = x + cell / 2;
      const cy = originY + (row + 0.5) * cell;
      this.drawGhost(context, cx, cy, cell, this.currentValue);
    }
    context.restore();
  }

  private drawGhost(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cell: number,
    value: number,
  ): void {
    const size = cell * 0.84;
    context.save();
    context.setLineDash([4, 5]);
    roundedRect(context, cx - size / 2, cy - size / 2, size, size, size * 0.28);
    context.strokeStyle = alpha(tileColor(value), 0.55);
    context.lineWidth = 2;
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 0.4;
    this.drawTile(context, cx, cy, size, value, 1);
    context.restore();
  }

  private drawTiles(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cell, originX, originY } = geometry;
    const size = cell * 0.84;

    for (let index = 0; index < this.board.length; index += 1) {
      const value = this.board[index]!;
      if (value === 0) continue;
      const column = index % FUSION_COLS;
      const row = Math.floor(index / FUSION_COLS);
      const cx = originX + (column + 0.5) * cell;
      const cy = originY + (row + 0.5) * cell + (this.anims.get(index) ?? 0);
      const pop = this.pops.get(index) ?? 0;
      const scale = 1 + Math.sin((pop / 0.42) * Math.PI) * 0.16;
      this.drawTile(context, cx, cy, size, value, scale);
    }
  }

  private drawTile(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    value: number,
    scale: number,
  ): void {
    const color = tileColor(value);
    if (value >= 4) glowCircle(context, cx, cy, size * 0.95, color, 0.22);

    context.save();
    context.translate(cx, cy);
    context.scale(scale, scale);
    roundedRect(context, -size / 2, -size / 2, size, size, size * 0.26);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = alpha('#ffffff', 0.3);
    context.lineWidth = Math.max(1, size * 0.018);
    context.stroke();

    context.strokeStyle = alpha('#ffffff', 0.24);
    context.lineWidth = Math.max(1, size * 0.02);
    context.beginPath();
    context.moveTo(-size * 0.28, -size * 0.34);
    context.lineTo(size * 0.28, -size * 0.34);
    context.stroke();

    context.font = `600 ${Math.max(12, size * 0.38)}px ${FONT_MONO}`;
    context.fillStyle = PALETTE.surface;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(value), 0, size * 0.02);
    context.restore();
  }

  private drawSide(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cell, originX, originY, boardWidth, sideX, wide } = geometry;

    if (wide) {
      context.save();
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.font = `500 9px ${FONT_MONO}`;
      context.fillStyle = PALETTE.muted;
      context.fillText('SIGUIENTE', sideX, originY + 22);
      this.drawTile(context, sideX + 34, originY + 78, cell * 0.82, this.nextValue, 1);

      context.fillStyle = PALETTE.muted;
      context.fillText('CADENA', sideX, originY + 158);
      context.font = `600 22px ${FONT_MONO}`;
      context.fillStyle = this.chain > 1 ? PALETTE.amber : PALETTE.inkSoft;
      context.fillText(`×${this.chain}`, sideX, originY + 188);

      context.font = `500 9px ${FONT_MONO}`;
      context.fillStyle = PALETTE.muted;
      context.fillText('FUSIONES', sideX, originY + 246);
      context.font = `600 22px ${FONT_MONO}`;
      context.fillStyle = PALETTE.inkSoft;
      context.fillText(String(this.merges).padStart(2, '0'), sideX, originY + 276);

      context.font = `500 9px ${FONT_MONO}`;
      context.fillStyle = PALETTE.inkSoft;
      context.fillText('CONECTA 3', sideX, originY + 340);
      context.fillText('IGUALES', sideX, originY + 356);
      context.restore();
      return;
    }

    const right = originX + boardWidth;
    if (originY < 108) return;
    context.save();
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = PALETTE.muted;
    context.fillText('SIGUIENTE', right - 52, originY - 26);
    this.drawTile(context, right - 24, originY - 26, cell * 0.62, this.nextValue, 1);
    context.restore();
  }

  private drawFloaters(context: CanvasRenderingContext2D): void {
    context.save();
    context.font = `600 13px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const floater of this.floaters) {
      const alphaValue = clamp(floater.life / 0.9, 0, 1);
      context.fillStyle = alpha(floater.color, alphaValue);
      context.fillText(floater.text, floater.x, floater.y);
    }
    context.restore();
  }

  private drawFooter(context: CanvasRenderingContext2D, geometry: Geometry, view: View): void {
    const y = Math.min(view.height - 24, geometry.originY + geometry.boardHeight + 30);
    context.save();
    context.font = `500 10px ${FONT_MONO}`;
    context.fillStyle = PALETTE.muted;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText('FUSIÓN · 7 × 8', geometry.originX, y);
    context.textAlign = 'right';
    context.fillText(`CADENA MÁX ×${this.maxChain}`, geometry.originX + geometry.boardWidth, y);

    if (this.moves < 3 && this.phase === 'aim') {
      context.textAlign = 'center';
      context.fillStyle = alpha(PALETTE.inkSoft, 0.7);
      context.fillText('ELIGE COLUMNA Y SUELTA', view.width / 2, y + 22);
    }
    context.restore();
  }
}

const gameModule: GameModule = {
  mount: (context) => new Fusion(context),
};

export default gameModule;

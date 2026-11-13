import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  cellAt,
  clamp,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleCell,
  drawPuzzleFooter,
  drawPuzzleHeader,
  drawUiButton,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type PuzzleLayout,
  type UiButton,
  type View,
} from '../engine';
import {
  TETROMINO_LEVELS,
  applyPlacement,
  canPlace,
  emptyGrid,
  isGridFull,
  pieceCells,
  pieceSize,
  placementCells,
  type TetrominoKind,
  type TetrominoLevel,
  type TetrominoPlacement,
} from './logic';

const ACCENT = '#8fb397';

const SLOT_COLORS: readonly string[] = [
  PALETTE.sky,
  PALETTE.butter,
  PALETTE.lilac,
  PALETTE.apricot,
  PALETTE.sage,
];

const PIECE_NAMES: Record<TetrominoKind, string> = {
  I: 'barra',
  O: 'cuadrado',
  T: 'te',
  S: 'ese',
  Z: 'zeta',
  J: 'jota',
  L: 'ele',
};

interface TetrominoGeometry {
  layout: PuzzleLayout;
  slots: UiButton[];
  rotateButton: UiButton;
  nextButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Tetromino extends BaseGame {
  private levelIndex = 0;
  private owners: number[] = [];
  private placements: (TetrominoPlacement | null)[] = [];
  private rotations: number[] = [];
  private selected: number | null = null;
  private cursor = 0;
  private pendingAdvance = false;
  private solved = false;
  private solvedTimer = 0;
  private moves = 0;
  private finished = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onPointerMove((point) => this.handleHover(point));
    this.input.onKeyDown((code, event) => {
      if (event.repeat && (code === 'Space' || code === 'KeyR')) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.levelIndex = Math.min(TETROMINO_LEVELS.length - 1, this.levelIndex + 1);
    } else {
      this.levelIndex = 0;
      this.moves = 0;
    }
    this.loadLevel(this.currentLevel());
    this.setScore('NIVEL', `${this.levelIndex + 1}/${TETROMINO_LEVELS.length}`);
  }

  private loadLevel(level: TetrominoLevel): void {
    this.owners = emptyGrid(level);
    this.placements = level.pieces.map(() => null);
    this.rotations = level.pieces.map(() => 0);
    this.selected = null;
    this.cursor = 0;
    this.solved = false;
    this.solvedTimer = 0;
    this.finished = false;
  }

  private currentLevel(): TetrominoLevel {
    return TETROMINO_LEVELS[this.levelIndex]!;
  }

  protected update(dt: number): void {
    if (!this.solved) return;
    this.solvedTimer += dt;
    if (this.levelIndex === TETROMINO_LEVELS.length - 1 && this.solvedTimer > 1) {
      this.finishSession();
    }
  }

  private geometry(view: View): TetrominoGeometry {
    const level = this.currentLevel();
    const mobile = view.width < 560;
    const top = 118;
    const bottom = 62;
    const trayReserve = mobile ? 100 : 116;
    const buttonReserve = 50;
    const boardSpace = Math.max(180, view.height - top - bottom - trayReserve - buttonReserve);
    const cell = clamp(
      Math.min((view.width * (mobile ? 0.84 : 0.6)) / level.cols, boardSpace / level.rows, 84),
      24,
      84,
    );
    const width = cell * level.cols;
    const height = cell * level.rows;
    const layout: PuzzleLayout = {
      cols: level.cols,
      rows: level.rows,
      cell,
      x: (view.width - width) / 2,
      y: top + Math.max(0, (boardSpace - height) / 2),
      width,
      height,
    };

    const gap = mobile ? 7 : 10;
    const slotSize = clamp((view.width - 40 - gap * 4) / 5, 40, mobile ? 56 : 72);
    const trayWidth = slotSize * 5 + gap * 4;
    const trayY = layout.y + layout.height + (mobile ? 16 : 22);
    const startX = (view.width - trayWidth) / 2;
    const slots = Array.from({ length: 5 }, (_, index) => ({
      x: startX + index * (slotSize + gap),
      y: trayY,
      width: slotSize,
      height: slotSize,
    }));

    const buttonY = trayY + slotSize + (mobile ? 10 : 14);
    const rotateWidth = Math.min(170, view.width * 0.5);
    const nextWidth = Math.min(200, view.width * 0.62);

    return {
      layout,
      slots,
      rotateButton: {
        x: (view.width - rotateWidth) / 2,
        y: buttonY,
        width: rotateWidth,
        height: 36,
      },
      nextButton: {
        x: (view.width - nextWidth) / 2,
        y: view.height / 2 + 40,
        width: nextWidth,
        height: 42,
      },
    };
  }

  private anchorFor(kind: TetrominoKind, rotation: number, cursor: number): LocalPoint {
    const level = this.currentLevel();
    const size = pieceSize(kind, rotation);
    const column = cursor % level.cols;
    const row = Math.floor(cursor / level.cols);
    return {
      x: clamp(column, 0, Math.max(0, level.cols - size.width)),
      y: clamp(row, 0, Math.max(0, level.rows - size.height)),
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (
        this.levelIndex < TETROMINO_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.nextButton)
      ) {
        this.audio.click();
        this.pendingAdvance = true;
        this.restart();
      }
      return;
    }

    for (let slot = 0; slot < geometry.slots.length; slot += 1) {
      const rectangle = geometry.slots[slot]!;
      if (!pointInButton(point.x, point.y, rectangle)) continue;
      if (this.placements[slot]) {
        this.setStatus('Esa pieza ya está en el tablero. Tócala allí para devolverla.');
        this.audio.tone(300, 0.05, { type: 'triangle', gain: 0.02 });
        return;
      }
      this.selectSlot(this.selected === slot ? null : slot);
      return;
    }

    if (pointInButton(point.x, point.y, geometry.rotateButton)) {
      this.rotateSelected();
      return;
    }

    const index = cellAt(geometry.layout, point.x, point.y);
    if (index === null) return;
    this.cursor = index;

    const owner = this.owners[index]!;
    if (owner >= 0) {
      this.returnPlacement(owner);
      return;
    }

    if (this.selected === null) {
      this.setStatus('Selecciona una pieza de la bandeja.');
      this.audio.tone(280, 0.04, { type: 'sine', gain: 0.02 });
      return;
    }
    this.placeSelected();
  }

  private handleHover(point: LocalPoint): void {
    if (this.state !== 'running' || this.solved) return;
    const index = cellAt(this.geometry(this.runtime.view).layout, point.x, point.y);
    if (index !== null) this.cursor = index;
  }

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.solved) return;
    const level = this.currentLevel();

    if (code.startsWith('Digit')) {
      const slot = Number.parseInt(code.slice(5), 10) - 1;
      if (slot < 0 || slot >= level.pieces.length) return;
      if (this.placements[slot]) {
        this.setStatus('Esa pieza ya está colocada.');
        return;
      }
      this.selectSlot(this.selected === slot ? null : slot);
      return;
    }

    const column = this.cursor % level.cols;
    const row = Math.floor(this.cursor / level.cols);
    if (code === 'ArrowLeft') {
      this.cursor = row * level.cols + Math.max(0, column - 1);
    } else if (code === 'ArrowRight') {
      this.cursor = row * level.cols + Math.min(level.cols - 1, column + 1);
    } else if (code === 'ArrowUp') {
      this.cursor = Math.max(0, row - 1) * level.cols + column;
    } else if (code === 'ArrowDown') {
      this.cursor = Math.min(level.rows - 1, row + 1) * level.cols + column;
    } else if (code === 'Space' || code === 'Enter') {
      this.placeSelected();
    } else if (code === 'KeyR') {
      this.rotateSelected();
    } else {
      return;
    }

    this.audio.tone(310, 0.03, { type: 'triangle', gain: 0.016 });
  }

  private selectSlot(slot: number | null): void {
    this.selected = slot;
    if (slot === null) {
      this.setStatus('Ninguna pieza seleccionada.');
      this.audio.tone(300, 0.04, { type: 'triangle', gain: 0.02 });
      return;
    }
    const kind = this.currentLevel().pieces[slot]!;
    this.setStatus(`Pieza ${slot + 1} (${PIECE_NAMES[kind]}) seleccionada. R para girar.`);
    this.audio.tone(420 + slot * 28, 0.05, { type: 'triangle', gain: 0.03 });
  }

  private rotateSelected(): void {
    if (this.selected === null) {
      this.setStatus('Elige una pieza de la bandeja para girarla.');
      this.audio.tone(290, 0.05, { type: 'sine', gain: 0.02 });
      return;
    }
    this.rotations[this.selected] = (this.rotations[this.selected]! + 1) % 4;
    this.setStatus(`Pieza ${this.selected + 1} girada.`);
    this.audio.tone(360, 0.05, { type: 'triangle', gain: 0.028 });
  }

  private placeSelected(): void {
    const slot = this.selected;
    if (slot === null) {
      this.setStatus('Primero elige una pieza de la bandeja.');
      return;
    }

    const level = this.currentLevel();
    const kind = level.pieces[slot]!;
    const rotation = this.rotations[slot]!;
    const anchor = this.anchorFor(kind, rotation, this.cursor);
    const owners = applyPlacement(level, this.owners, slot, anchor.x, anchor.y, rotation);
    if (!owners) {
      this.setStatus('La pieza no cabe ahí. Muévela o gírala.');
      this.audio.tone(240, 0.08, { type: 'triangle', gain: 0.03 });
      return;
    }

    this.owners = owners;
    this.placements[slot] = { slot, x: anchor.x, y: anchor.y, rotation };
    this.selected = null;
    this.moves += 1;
    this.audio.tone(430 + slot * 24, 0.06, { type: 'triangle', gain: 0.04 });
    this.setStatus('Pieza colocada.');

    if (isGridFull(this.owners)) this.completeLevel();
  }

  private returnPlacement(slot: number): void {
    const placement = this.placements[slot];
    if (!placement) return;
    const level = this.currentLevel();
    this.placements[slot] = null;
    this.rotations[slot] = placement.rotation;
    this.owners = this.rebuildOwners(level);
    this.selected = null;
    this.audio.tone(320, 0.06, { type: 'triangle', gain: 0.03 });
    this.setStatus(`Pieza ${slot + 1} devuelta a la bandeja.`);
  }

  private rebuildOwners(level: TetrominoLevel): number[] {
    const owners = emptyGrid(level);
    this.placements.forEach((placement) => {
      if (!placement) return;
      const kind = level.pieces[placement.slot]!;
      for (const cell of placementCells(kind, placement)) {
        const index = cell.y * level.cols + cell.x;
        if (index >= 0 && index < owners.length) owners[index] = placement.slot;
      }
    });
    return owners;
  }

  private completeLevel(): void {
    this.solved = true;
    this.solvedTimer = 0;
    this.selected = null;
    this.audio.chord([392, 494, 587], 0.5, { type: 'sine', gain: 0.09 });
    this.setStatus(`Tablero completado: ${this.currentLevel().name}.`);
  }

  private finishSession(): void {
    if (this.finished) return;
    this.finished = true;
    const score = Math.max(100, 1000 - Math.max(0, this.moves - 25) * 12);
    this.setStatus('Los cinco tableros están completos.');
    this.audio.chord([392, 494, 587, 784], 0.9, { type: 'sine', gain: 0.1 });
    this.finish({
      title: 'Cinco encajes',
      message: 'Has completado los cinco tableros sin dejar una sola celda libre.',
      detail: `${this.moves} colocaciones`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Volver a jugar',
      tone: 'win',
    });
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, ACCENT);
    const geometry = this.geometry(view);
    const level = this.currentLevel();
    const { layout } = geometry;

    drawPuzzleHeader(
      context,
      view,
      'Tetrominó',
      `${level.name} · ${level.cols} × ${level.rows} · ${this.placedCount()} de 5 piezas`,
    );
    drawPuzzleBoard(context, layout);
    this.drawBoard(context, layout);
    this.drawPreview(context, layout);
    this.drawCursor(context, layout);
    this.drawTray(context, geometry);
    this.drawControls(context, geometry);

    const hint =
      this.solved && this.levelIndex < TETROMINO_LEVELS.length - 1
        ? 'TABLERO COMPLETO'
        : this.selected === null
          ? 'TOCA UNA PIEZA Y LUEGO UNA CELDA'
          : 'TOCA EL TABLERO · R GIRA LA PIEZA';

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.levelIndex + 1}/${TETROMINO_LEVELS.length}`,
      `PIEZAS ${this.placedCount()}/5`,
      hint,
    );

    if (this.solved && this.levelIndex < TETROMINO_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private placedCount(): number {
    return this.placements.reduce((count, placement) => count + (placement ? 1 : 0), 0);
  }

  private drawBoard(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const level = this.currentLevel();
    const total = level.cols * level.rows;

    for (let index = 0; index < total; index += 1) {
      const owner = this.owners[index]!;
      const color = owner >= 0 ? SLOT_COLORS[owner % SLOT_COLORS.length]! : '#fffdf8';
      drawPuzzleCell(context, layout, index, {
        fill: owner >= 0 ? color : '#fffdf8',
        stroke: owner >= 0 ? alpha(color, 0.9) : alpha(PALETTE.ink, 0.11),
        strokeWidth: owner >= 0 ? 1.4 : 1.1,
      });

      if (owner < 0) continue;
      const column = index % level.cols;
      const row = Math.floor(index / level.cols);
      context.save();
      context.fillStyle = alpha('#ffffff', 0.3);
      roundedRect(
        context,
        layout.x + column * layout.cell + layout.cell * 0.3,
        layout.y + row * layout.cell + layout.cell * 0.3,
        layout.cell * 0.4,
        layout.cell * 0.4,
        layout.cell * 0.1,
      );
      context.fill();
      context.restore();
    }
  }

  private drawPreview(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    if (this.selected === null || this.solved) return;
    const level = this.currentLevel();
    const slot = this.selected;
    const kind = level.pieces[slot]!;
    const rotation = this.rotations[slot]!;
    const anchor = this.anchorFor(kind, rotation, this.cursor);
    const color = SLOT_COLORS[slot % SLOT_COLORS.length]!;
    const fits = canPlace(level, this.owners, kind, anchor.x, anchor.y, rotation);

    for (const cell of pieceCells(kind, rotation)) {
      const column = anchor.x + cell.x;
      const row = anchor.y + cell.y;
      if (column < 0 || column >= level.cols || row < 0 || row >= level.rows) continue;
      drawPuzzleCell(context, layout, row * level.cols + column, {
        fill: fits ? alpha(color, 0.32) : alpha(PALETTE.apricot, 0.26),
        stroke: fits ? alpha(color, 0.8) : alpha(PALETTE.apricot, 0.9),
        strokeWidth: 1.6,
        dashed: true,
      });
    }
  }

  private drawCursor(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    if (this.state !== 'running' || this.solved) return;
    const column = this.cursor % layout.cols;
    const row = Math.floor(this.cursor / layout.cols);
    context.save();
    roundedRect(
      context,
      layout.x + column * layout.cell + 3,
      layout.y + row * layout.cell + 3,
      layout.cell - 6,
      layout.cell - 6,
      layout.cell * 0.16,
    );
    context.setLineDash([5, 4]);
    context.strokeStyle = alpha(PALETTE.apricot, 0.85);
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }

  private drawTray(context: CanvasRenderingContext2D, geometry: TetrominoGeometry): void {
    const level = this.currentLevel();

    geometry.slots.forEach((rectangle, slot) => {
      const placed = this.placements[slot] !== null;
      const isSelected = this.selected === slot;
      const color = SLOT_COLORS[slot % SLOT_COLORS.length]!;

      context.save();
      roundedRect(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 14);
      context.fillStyle = isSelected ? alpha(color, 0.16) : '#fffdf8';
      context.globalAlpha = placed ? 0.55 : 1;
      context.fill();
      context.strokeStyle = isSelected ? color : alpha(PALETTE.ink, placed ? 0.12 : 0.18);
      context.lineWidth = isSelected ? 2 : 1.3;
      if (placed) context.setLineDash([4, 4]);
      context.stroke();
      context.restore();

      context.save();
      context.font = `600 9px ${FONT_MONO}`;
      context.fillStyle = alpha(PALETTE.ink, placed ? 0.35 : 0.55);
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillText(String(slot + 1), rectangle.x + 6, rectangle.y + 5);
      context.restore();

      this.drawMiniPiece(
        context,
        rectangle,
        level.pieces[slot]!,
        this.rotations[slot]!,
        color,
        placed ? 0.2 : isSelected ? 1 : 0.82,
      );
    });
  }

  private drawMiniPiece(
    context: CanvasRenderingContext2D,
    rectangle: UiButton,
    kind: TetrominoKind,
    rotation: number,
    color: string,
    opacity: number,
  ): void {
    const cells = pieceCells(kind, rotation);
    const bounds = pieceSize(kind, rotation);
    const cell = Math.min(
      (rectangle.width - 16) / bounds.width,
      (rectangle.height - 24) / bounds.height,
      15,
    );
    const width = cell * bounds.width;
    const height = cell * bounds.height;
    const originX = rectangle.x + (rectangle.width - width) / 2;
    const originY = rectangle.y + (rectangle.height - height) / 2 + 4;

    context.save();
    context.globalAlpha = opacity;
    for (const block of cells) {
      roundedRect(
        context,
        originX + block.x * cell + 1,
        originY + block.y * cell + 1,
        cell - 2,
        cell - 2,
        cell * 0.22,
      );
      context.fillStyle = color;
      context.fill();
    }
    context.restore();
  }

  private drawControls(context: CanvasRenderingContext2D, geometry: TetrominoGeometry): void {
    const selected = this.selected;
    const accent = selected === null ? PALETTE.forest : SLOT_COLORS[selected % SLOT_COLORS.length]!;
    drawUiButton(context, geometry.rotateButton, 'GIRAR PIEZA', {
      active: selected !== null,
      accent,
      disabled: selected === null,
    });
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: TetrominoGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.26);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.82);
    const height = 196;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 104;
    roundedRect(context, x, y, width, height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.forest, 0.8);
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 38);
    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, y + 72);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText('Otro tablero espera con cinco piezas nuevas.', view.width / 2, y + 98);

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.forest,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Tetromino(context),
} satisfies GameModule;

import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  drawPuzzleBackground,
  drawPuzzleBoard,
  drawPuzzleFooter,
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
  BRIDGES_LEVELS,
  BRIDGES_SIZE,
  bridgeTotal,
  crossingsOf,
  cycleBridge,
  degreesOf,
  evaluate,
  findPair,
  levelPairs,
  type BridgesIsland,
  type BridgesLevel,
  type BridgesPair,
} from './logic';

interface BridgesGeometry {
  layout: PuzzleLayout;
  clearButton: UiButton;
  nextButton: UiButton;
}

class Bridges extends BaseGame {
  private levelIndex = 0;
  private pairs: BridgesPair[] = [];
  private bridges: number[] = [];
  private selected: number | null = null;
  private neighborCursor = 0;
  private solved = false;
  private solveTimer = 0;
  private pendingAdvance = false;
  private finished = false;
  private levelsCompleted = 0;
  private totalMoves = 0;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    if (this.pendingAdvance) {
      this.pendingAdvance = false;
      this.levelIndex = Math.min(this.levelIndex + 1, BRIDGES_LEVELS.length - 1);
    } else {
      this.levelIndex = 0;
      this.levelsCompleted = 0;
      this.totalMoves = 0;
    }
    this.loadLevel();
  }

  private currentLevel(): BridgesLevel {
    return BRIDGES_LEVELS[this.levelIndex] ?? BRIDGES_LEVELS[0]!;
  }

  private loadLevel(): void {
    const level = this.currentLevel();
    this.pairs = levelPairs(level);
    this.bridges = this.pairs.map(() => 0);
    this.selected = null;
    this.neighborCursor = 0;
    this.solved = false;
    this.solveTimer = 0;
    this.finished = false;
    this.setScore('NIVEL', `${this.levelIndex + 1}/${BRIDGES_LEVELS.length}`);
  }

  private geometry(view: View): BridgesGeometry {
    const layout = puzzleLayout(view, BRIDGES_SIZE, BRIDGES_SIZE, {
      maxCell: 66,
      top: 108,
      bottom: 104,
      widthRatio: 0.86,
      heightRatio: 0.66,
    });
    const clearWidth = 128;
    const clearHeight = 30;
    const nextWidth = Math.min(212, view.width * 0.66);
    return {
      layout,
      clearButton: {
        x: view.width - 22 - clearWidth,
        y: view.height - 92,
        width: clearWidth,
        height: clearHeight,
      },
      nextButton: {
        x: (view.width - nextWidth) / 2,
        y: view.height / 2 + 42,
        width: nextWidth,
        height: 42,
      },
    };
  }

  private centerOf(layout: PuzzleLayout, island: BridgesIsland): { x: number; y: number } {
    return {
      x: layout.x + (island.x + 0.5) * layout.cell,
      y: layout.y + (island.y + 0.5) * layout.cell,
    };
  }

  private islandAt(point: { x: number; y: number }): number | null {
    const { layout } = this.geometry(this.runtime.view);
    const islands = this.currentLevel().islands;
    let best = -1;
    let bestDistance = layout.cell * 0.46;
    islands.forEach((island, index) => {
      const center = this.centerOf(layout, island);
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      if (distance <= bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best >= 0 ? best : null;
  }

  private handlePointer(point: { x: number; y: number }): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);

    if (this.solved) {
      if (
        this.levelIndex < BRIDGES_LEVELS.length - 1 &&
        pointInButton(point.x, point.y, geometry.nextButton)
      ) {
        this.pendingAdvance = true;
        this.restart();
      }
      return;
    }

    if (pointInButton(point.x, point.y, geometry.clearButton)) {
      this.clearLevel();
      return;
    }

    const index = this.islandAt(point);
    if (index === null) {
      this.selected = null;
      this.neighborCursor = 0;
      return;
    }
    this.selectIsland(index);
  }

  private selectIsland(index: number): void {
    const level = this.currentLevel();
    const island = level.islands[index];
    if (!island) return;

    if (this.selected === null) {
      this.selected = index;
      this.neighborCursor = 0;
      this.audio.click();
      this.setStatus(`Isla de ${island.value} conexiones seleccionada.`);
      return;
    }

    if (this.selected === index) {
      this.selected = null;
      this.neighborCursor = 0;
      this.audio.tone(280, 0.04, { type: 'triangle', gain: 0.025 });
      this.setStatus('Selección cancelada.');
      return;
    }

    const pairIndex = findPair(this.pairs, this.selected, index);
    if (pairIndex < 0) {
      this.selected = index;
      this.neighborCursor = 0;
      this.audio.tone(320, 0.05, { type: 'triangle', gain: 0.028 });
      this.setStatus('Elige una isla alineada y sin islas entre medias.');
      return;
    }

    this.bridges[pairIndex] = cycleBridge(this.bridges[pairIndex] ?? 0);
    const count = this.bridges[pairIndex] ?? 0;
    this.totalMoves += 1;
    this.selected = index;
    this.neighborCursor = 0;
    if (count === 0) {
      this.audio.tone(300, 0.05, { type: 'triangle', gain: 0.028 });
      this.setStatus('Puente retirado.');
    } else if (count === 1) {
      this.audio.tone(480, 0.06, { type: 'triangle', gain: 0.034 });
      this.setStatus('Un puente. Toca de nuevo para duplicarlo.');
    } else {
      this.audio.chord([520, 660], 0.08, { type: 'triangle', gain: 0.045 });
      this.setStatus('Puente doble. Otro toque lo retira.');
    }
    this.checkSolved();
  }

  private clearLevel(): void {
    if (!this.bridges.some((count) => count > 0)) return;
    this.bridges = this.pairs.map(() => 0);
    this.selected = null;
    this.neighborCursor = 0;
    this.solved = false;
    this.solveTimer = 0;
    this.audio.noise(0.12, { gain: 0.05, frequency: 700 });
    this.setStatus('Puentes borrados. Empieza de nuevo el nivel.');
  }

  private checkSolved(): void {
    const level = this.currentLevel();
    const evaluation = evaluate(level.islands, this.pairs, this.bridges);
    if (!evaluation.solved) {
      if (evaluation.allDegrees && evaluation.crossings.length > 0) {
        this.setStatus('Los números cuadran, pero hay puentes cruzados.');
      } else if (evaluation.allDegrees && !evaluation.connected) {
        this.setStatus('Los números cuadran, pero faltan islas por conectar.');
      }
      return;
    }

    this.solved = true;
    this.solveTimer = 0;
    this.selected = null;
    this.levelsCompleted = Math.max(this.levelsCompleted, this.levelIndex + 1);
    this.audio.chord([392, 494, 587], 0.55, { type: 'sine', gain: 0.09 });
    this.setStatus(`Nivel resuelto: ${level.name}.`);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.solved) return;

    if (code === 'KeyR') {
      this.clearLevel();
      return;
    }
    if (code === 'ArrowLeft') {
      this.moveSelection(-1, 0);
      return;
    }
    if (code === 'ArrowRight') {
      this.moveSelection(1, 0);
      return;
    }
    if (code === 'ArrowUp') {
      this.moveSelection(0, -1);
      return;
    }
    if (code === 'ArrowDown') {
      this.moveSelection(0, 1);
      return;
    }
    if (code === 'Space' || code === 'Enter') {
      this.connectFromSelection();
    }
  }

  private moveSelection(dx: number, dy: number): void {
    const islands = this.currentLevel().islands;
    if (islands.length === 0) return;

    if (this.selected === null) {
      this.selected = 0;
      this.neighborCursor = 0;
      this.audio.click();
      return;
    }

    const from = islands[this.selected];
    if (!from) return;

    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    islands.forEach((island, index) => {
      if (index === this.selected) return;
      const offsetX = island.x - from.x;
      const offsetY = island.y - from.y;
      if (dx !== 0) {
        if (offsetY !== 0 || offsetX * dx <= 0) return;
        const distance = Math.abs(offsetX);
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
        return;
      }
      if (offsetX !== 0 || offsetY * dy <= 0) return;
      const distance = Math.abs(offsetY);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });

    if (best >= 0) {
      this.selected = best;
      this.neighborCursor = 0;
      this.audio.tone(360, 0.03, { type: 'triangle', gain: 0.018 });
    }
  }

  private connectFromSelection(): void {
    if (this.selected === null) {
      this.selected = 0;
      this.neighborCursor = 0;
      this.audio.click();
      return;
    }

    const neighbors: number[] = [];
    this.pairs.forEach((pair, index) => {
      if (pair.a === this.selected || pair.b === this.selected) neighbors.push(index);
    });
    if (neighbors.length === 0) {
      this.audio.tone(240, 0.06, { type: 'triangle', gain: 0.025 });
      this.setStatus('Esta isla no tiene vecinas alineadas.');
      return;
    }

    const neighbor = this.neighborCursor % neighbors.length;
    const pairIndex = neighbors[neighbor] ?? neighbors[0]!;
    this.bridges[pairIndex] = cycleBridge(this.bridges[pairIndex] ?? 0);
    const count = this.bridges[pairIndex] ?? 0;
    this.totalMoves += 1;

    if (count === 0) {
      this.neighborCursor = (neighbor + 1) % neighbors.length;
      this.audio.tone(300, 0.05, { type: 'triangle', gain: 0.028 });
      this.setStatus('Puente retirado. Siguiente isla alineada preparada.');
    } else if (count === 1) {
      this.audio.tone(480, 0.06, { type: 'triangle', gain: 0.034 });
      this.setStatus('Un puente. Pulsa Espacio de nuevo para duplicarlo.');
    } else {
      this.audio.chord([520, 660], 0.08, { type: 'triangle', gain: 0.045 });
      this.setStatus('Puente doble. Pulsa Espacio otra vez para retirarlo.');
    }
    this.checkSolved();
  }

  private finishSession(): void {
    if (this.finished) return;
    this.finished = true;
    const bonus = Math.max(0, 220 - Math.max(0, this.totalMoves - 30) * 4);
    const score = this.levelsCompleted * 200 + bonus;
    this.setStatus('Los cinco tableros están conectados.');
    this.audio.chord([392, 494, 587, 784], 0.9, { type: 'sine', gain: 0.1 });
    this.finish({
      title: 'Cinco tableros',
      message: 'Has unido todas las islas sin cruzar un solo puente.',
      detail: `${this.totalMoves} movimientos · ${this.levelsCompleted} niveles`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Jugar de nuevo',
      tone: 'win',
    });
  }

  protected update(dt: number): void {
    if (!this.solved) return;
    this.solveTimer += dt;
    if (this.levelIndex === BRIDGES_LEVELS.length - 1 && this.solveTimer > 1.1) {
      this.finishSession();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, '#7fa9c2');
    const geometry = this.geometry(view);
    const { layout } = geometry;

    this.drawHeader(context, view);
    drawPuzzleBoard(context, layout, { padding: 14, fill: 'rgba(255, 253, 248, 0.74)' });
    this.drawGrid(context, layout);
    this.drawBridges(context, layout);
    this.drawIslands(context, layout);

    drawPuzzleFooter(
      context,
      view,
      `NIVEL ${this.levelIndex + 1}/${BRIDGES_LEVELS.length}`,
      `PUENTES ${bridgeTotal(this.bridges)}`,
      'TOCA DOS ISLAS · ESPACIO CONECTA · R REINICIA',
    );

    drawUiButton(context, geometry.clearButton, 'BORRAR PUENTES', {
      accent: PALETTE.sky,
      disabled: this.solved,
    });

    if (this.solved && this.levelIndex < BRIDGES_LEVELS.length - 1) {
      this.drawOverlay(context, view, geometry);
    }
  }

  private drawHeader(context: CanvasRenderingContext2D, view: View): void {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('PUENTES', view.width / 2, 70);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText(
      `NIVEL ${this.levelIndex + 1} DE ${BRIDGES_LEVELS.length} · ${this.currentLevel().name.toUpperCase()}`,
      view.width / 2,
      88,
    );
    context.restore();
  }

  private drawGrid(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    context.save();
    context.strokeStyle = alpha(PALETTE.ink, 0.055);
    context.lineWidth = 1;
    for (let index = 0; index <= BRIDGES_SIZE; index += 1) {
      const x = layout.x + index * layout.cell;
      const y = layout.y + index * layout.cell;
      context.beginPath();
      context.moveTo(x, layout.y);
      context.lineTo(x, layout.y + layout.height);
      context.stroke();
      context.beginPath();
      context.moveTo(layout.x, y);
      context.lineTo(layout.x + layout.width, y);
      context.stroke();
    }
    context.restore();
  }

  private drawBridges(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const islands = this.currentLevel().islands;
    const degrees = degreesOf(islands, this.pairs, this.bridges);
    const conflicts = new Set(crossingsOf(islands, this.pairs, this.bridges));

    context.save();
    context.lineCap = 'round';
    this.pairs.forEach((pair, index) => {
      const count = this.bridges[index] ?? 0;
      if (count <= 0) return;
      const first = islands[pair.a];
      const second = islands[pair.b];
      if (!first || !second) return;

      const start = this.centerOf(layout, first);
      const end = this.centerOf(layout, second);
      const overflow =
        (degrees[pair.a] ?? 0) > first.value || (degrees[pair.b] ?? 0) > second.value;
      const color = conflicts.has(index) || overflow ? PALETTE.apricot : PALETTE.sky;
      const horizontal = first.y === second.y;

      if (count === 1) {
        context.strokeStyle = alpha(color, 0.9);
        context.lineWidth = Math.max(2.4, layout.cell * 0.075);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        return;
      }

      const offset = Math.max(3.4, layout.cell * 0.1);
      context.strokeStyle = alpha(color, 0.9);
      context.lineWidth = Math.max(1.8, layout.cell * 0.055);
      for (const direction of [-1, 1]) {
        const shiftX = horizontal ? 0 : direction * offset;
        const shiftY = horizontal ? direction * offset : 0;
        context.beginPath();
        context.moveTo(start.x + shiftX, start.y + shiftY);
        context.lineTo(end.x + shiftX, end.y + shiftY);
        context.stroke();
      }
    });
    context.restore();
  }

  private drawIslands(context: CanvasRenderingContext2D, layout: PuzzleLayout): void {
    const islands = this.currentLevel().islands;
    const degrees = degreesOf(islands, this.pairs, this.bridges);
    const size = Math.min(layout.cell * 0.58, 42);

    islands.forEach((island, index) => {
      const center = this.centerOf(layout, island);
      const degree = degrees[index] ?? 0;
      const complete = degree === island.value;
      const overflow = degree > island.value;
      const selected = index === this.selected && this.state === 'running' && !this.solved;
      const left = center.x - size / 2;
      const top = center.y - size / 2;

      context.save();
      if (selected) {
        context.strokeStyle = alpha(PALETTE.sky, 0.45);
        context.lineWidth = 3;
        context.beginPath();
        context.arc(center.x, center.y, size * 0.68, 0, Math.PI * 2);
        context.stroke();
      }

      roundedRect(context, left, top, size, size, size * 0.26);
      context.fillStyle = overflow
        ? alpha(PALETTE.apricot, 0.24)
        : complete
          ? alpha(PALETTE.sage, 0.5)
          : PALETTE.surface;
      context.fill();
      context.strokeStyle = overflow
        ? PALETTE.apricot
        : selected
          ? PALETTE.sky
          : complete
            ? alpha(PALETTE.forest, 0.6)
            : alpha(PALETTE.ink, 0.26);
      context.lineWidth = selected ? 2.4 : 1.6;
      context.stroke();

      context.fillStyle = overflow ? PALETTE.apricot : complete ? PALETTE.forest : PALETTE.ink;
      context.font = `700 ${Math.max(13, size * 0.5)}px ${FONT_MONO}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(island.value), center.x, center.y + size * 0.03);
      context.restore();
    });
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: BridgesGeometry,
  ): void {
    context.save();
    context.fillStyle = alpha(PALETTE.ink, 0.26);
    context.fillRect(0, 0, view.width, view.height);

    const width = Math.min(340, view.width * 0.84);
    const height = 200;
    const x = (view.width - width) / 2;
    const y = view.height / 2 - 106;
    roundedRect(context, x, y, width, height, 22);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 1.5;
    context.stroke();

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 11px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.sky, 0.9);
    context.fillText('NIVEL COMPLETADO', view.width / 2, y + 38);
    context.font = `600 22px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(this.currentLevel().name, view.width / 2, y + 74);
    context.font = `500 11px ${FONT_SANS}`;
    context.fillStyle = alpha(PALETTE.ink, 0.58);
    context.fillText('El siguiente tablero espera.', view.width / 2, y + 100);

    drawUiButton(context, geometry.nextButton, 'SIGUIENTE NIVEL', {
      active: true,
      accent: PALETTE.sky,
    });
    context.restore();
  }
}

export default {
  mount: (context: GameContext) => new Bridges(context),
} satisfies GameModule;

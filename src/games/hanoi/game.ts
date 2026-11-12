import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  drawPuzzleHeader,
  roundedRect,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';

const DISCS = 5;
const MIN_MOVES = 31;
const TOWER_COUNT = 3;
const DISC_COLORS = [PALETTE.rose, PALETTE.apricot, PALETTE.butter, PALETTE.sage, PALETTE.sky];

interface BoardGeometry {
  left: number;
  width: number;
  slot: number;
  topY: number;
  baseY: number;
  discHeight: number;
}

class Hanoi extends BaseGame {
  private towers: number[][] = [];
  private selected: number | null = null;
  private cursor = 0;
  private moves = 0;
  private time = 0;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => {
      const tower = this.towerAt(point.x, point.y);
      if (tower !== null) this.pressTower(tower);
    });
    this.input.onKeyDown((code, event) => {
      const isArrow = code.startsWith('Arrow');
      if (event.repeat && !isArrow) return;
      this.handleKey(code);
    });
  }

  protected reset(): void {
    this.towers = Array.from({ length: TOWER_COUNT }, () => []);
    for (let disc = DISCS; disc >= 1; disc -= 1) this.towers[0]!.push(disc);
    this.selected = null;
    this.cursor = 0;
    this.moves = 0;
    this.time = 0;
    this.setScore('MOVIMIENTOS', `0 / ${MIN_MOVES}`);
  }

  protected update(dt: number): void {
    this.time += dt;
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.sky);
    drawPuzzleHeader(
      context,
      view,
      'Torres de Hanoi',
      `${this.moves} movimiento${this.moves === 1 ? '' : 's'} · mínimo ${MIN_MOVES}`,
    );

    const board = this.geometry(view);
    const pulse = this.reducedMotion ? 0 : Math.sin(this.time * 2.4) * 2;

    for (let tower = 0; tower < TOWER_COUNT; tower += 1) {
      const centerX = board.left + board.slot * (tower + 0.5);
      const slotX = board.left + board.slot * tower;

      if (this.selected === tower) {
        context.save();
        context.beginPath();
        roundedRect(
          context,
          slotX + 5,
          board.topY - 20,
          board.slot - 10,
          board.baseY - board.topY + 34,
          16,
        );
        context.fillStyle = alpha(PALETTE.sky, 0.14);
        context.fill();
        context.restore();
      }

      context.save();
      roundedRect(context, centerX - 3, board.topY - 6, 6, board.baseY - board.topY + 6, 3);
      context.fillStyle = alpha(PALETTE.ink, 0.2);
      context.fill();
      roundedRect(context, centerX - board.slot * 0.44, board.baseY, board.slot * 0.88, 12, 6);
      context.fillStyle = alpha(PALETTE.ink, 0.13);
      context.fill();
      roundedRect(context, centerX - board.slot * 0.44, board.baseY, board.slot * 0.88, 4, 2);
      context.fillStyle = alpha(PALETTE.ink, 0.16);
      context.fill();
      context.restore();

      const discs = this.towers[tower]!;
      discs.forEach((size, index) => {
        const isTop = index === discs.length - 1;
        const lifted = this.selected === tower && isTop ? 9 + pulse : 0;
        const height = board.discHeight - 3;
        const width = board.slot * (0.3 + 0.52 * ((size - 1) / (DISCS - 1)));
        const x = centerX - width / 2;
        const y = board.baseY - (index + 1) * board.discHeight - lifted;

        context.save();
        context.shadowColor = alpha(PALETTE.ink, 0.12);
        context.shadowBlur = 7;
        context.shadowOffsetY = 3;
        roundedRect(context, x, y, width, height, height / 2);
        context.fillStyle = DISC_COLORS[size - 1] ?? PALETTE.sage;
        context.fill();
        context.restore();

        roundedRect(context, x, y, width, height, height / 2);
        context.strokeStyle = alpha(PALETTE.ink, 0.18);
        context.lineWidth = 1.2;
        context.stroke();

        roundedRect(
          context,
          x + width * 0.08,
          y + height * 0.18,
          width * 0.84,
          height * 0.22,
          height * 0.11,
        );
        context.fillStyle = alpha(PALETTE.surface, 0.28);
        context.fill();
      });

      context.save();
      context.font = `500 10px ${FONT_MONO}`;
      context.fillStyle = alpha(PALETTE.ink, this.cursor === tower ? 0.62 : 0.32);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(tower + 1), centerX, board.baseY + 28);
      context.restore();

      if (this.cursor === tower) {
        context.save();
        context.setLineDash([5, 5]);
        roundedRect(
          context,
          slotX + 8,
          board.topY - 14,
          board.slot - 16,
          board.baseY - board.topY + 24,
          14,
        );
        context.strokeStyle = alpha(PALETTE.forest, 0.5);
        context.lineWidth = 1.5;
        context.stroke();
        context.restore();
      }
    }

    const score = this.score();
    drawPuzzleFooter(
      context,
      view,
      `MOVIMIENTOS ${this.moves} · MÍNIMO ${MIN_MOVES}`,
      `PUNTOS ${score}`,
      '1 2 3 torre · ESPACIO coger/soltar · R reiniciar',
    );

    if (this.moves > 0) {
      context.save();
      context.font = `500 9px ${FONT_SANS}`;
      context.fillStyle = alpha(PALETTE.ink, 0.4);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        'Regla: un disco nunca descansa sobre otro más pequeño.',
        view.width / 2,
        view.height - 60,
      );
      context.restore();
    }
  }

  private geometry(view: View): BoardGeometry {
    const width = Math.min(view.width * 0.92, 620);
    const baseY = view.height * 0.72;
    const topY = Math.max(128, view.height * 0.25);
    return {
      left: (view.width - width) / 2,
      width,
      slot: width / TOWER_COUNT,
      topY,
      baseY,
      discHeight: clamp((baseY - topY) / 8, 12, 30),
    };
  }

  private towerAt(x: number, y: number): number | null {
    const board = this.geometry(this.runtime.view);
    if (x < board.left || x > board.left + board.width) return null;
    if (y < board.topY - 40 || y > board.baseY + 32) return null;
    return clamp(Math.floor((x - board.left) / board.slot), 0, TOWER_COUNT - 1);
  }

  private handleKey(code: string): void {
    if (code === 'KeyR') {
      this.reset();
      return;
    }
    if (code === 'Space') {
      if (this.selected === null) {
        this.pressTower(this.cursor);
        return;
      }
      if (this.selected === this.cursor) {
        this.selected = null;
        return;
      }
      if (this.tryMove(this.selected, this.cursor)) this.selected = null;
      return;
    }
    if (code === 'ArrowLeft') {
      this.cursor = Math.max(0, this.cursor - 1);
      return;
    }
    if (code === 'ArrowRight') {
      this.cursor = Math.min(TOWER_COUNT - 1, this.cursor + 1);
      return;
    }

    const tower = code.startsWith('Digit')
      ? Number(code.slice(5)) - 1
      : code.startsWith('Numpad')
        ? Number(code.slice(6)) - 1
        : -1;
    if (tower >= 0 && tower < TOWER_COUNT) this.cursor = tower;
  }

  private pressTower(tower: number): void {
    this.cursor = tower;
    if (this.selected === null) {
      if (this.towers[tower]!.length === 0) {
        this.audio.tone(180, 0.07, { type: 'sine', gain: 0.04 });
        return;
      }
      this.selected = tower;
      this.audio.tone(430, 0.06, { type: 'triangle', gain: 0.06 });
      return;
    }

    if (this.selected === tower) {
      this.selected = null;
      return;
    }

    if (this.tryMove(this.selected, tower)) this.selected = null;
  }

  private tryMove(from: number, to: number): boolean {
    const source = this.towers[from]!;
    const target = this.towers[to]!;
    const disc = source[source.length - 1];
    if (disc === undefined) return false;

    const top = target[target.length - 1];
    if (top !== undefined && top < disc) {
      this.toast('No puedes poner un disco grande sobre uno pequeño.');
      this.audio.tone(170, 0.12, { type: 'sine', gain: 0.05 });
      return false;
    }

    source.pop();
    target.push(disc);
    this.moves += 1;
    this.setScore('MOVIMIENTOS', `${this.moves} / ${MIN_MOVES}`);
    this.audio.tone(300 + disc * 55, 0.1, { type: 'triangle', gain: 0.07 });
    this.checkWin();
    return true;
  }

  private score(): number {
    return Math.max(0, 2000 - Math.max(0, this.moves - MIN_MOVES) * 40);
  }

  private checkWin(): void {
    if (this.towers[TOWER_COUNT - 1]!.length !== DISCS) return;

    const score = this.score();
    const perfect = this.moves === MIN_MOVES;
    this.audio.chord([392, 523.25, 659.25, 783.99], 0.5, { type: 'triangle', gain: 0.1 });
    this.finish({
      title: perfect ? 'Solución perfecta' : 'Torres resueltas',
      message: perfect
        ? 'Has hecho el mínimo posible: 31 movimientos.'
        : `Has necesitado ${this.moves} movimientos; el mínimo es ${MIN_MOVES}.`,
      detail: `${this.moves} movimientos`,
      score,
      scoreLabel: 'PUNTOS',
      tone: 'win',
    });
  }
}

export default {
  mount: (context: GameContext) => new Hanoi(context),
} satisfies GameModule;

import {
  BaseGame,
  FONT_MONO,
  FONT_SANS,
  PALETTE,
  alpha,
  clamp,
  drawPuzzleBackground,
  drawPuzzleFooter,
  drawUiButton,
  pointInButton,
  roundedRect,
  type GameContext,
  type GameModule,
  type UiButton,
  type View,
} from '../engine';
import {
  NIM_MAX_TAKE,
  NIM_START,
  applyMove,
  chooseMove,
  totalObjects,
  type NimMove,
  type Piles,
} from './logic';

type Phase = 'player' | 'ai' | 'pause';

interface NimGeometry {
  panelX: number;
  panelTop: number;
  panelWidth: number;
  panelBottom: number;
  centers: number[];
  tokenRadius: number;
  takeButtons: UiButton[];
}

interface LocalPoint {
  x: number;
  y: number;
}

const PILE_COLORS = [PALETTE.forest, PALETTE.sky, PALETTE.amber];

class Nim extends BaseGame {
  private piles: Piles = [NIM_START[0], NIM_START[1], NIM_START[2]];
  private take = 1;
  private focus = 0;
  private phase: Phase = 'player';
  private wins = 0;
  private round = 1;
  private aiTimer = 0;
  private pauseTimer = 0;
  private time = 0;
  private lastAiMove: NimMove | null = null;
  private finished = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    this.piles = [NIM_START[0], NIM_START[1], NIM_START[2]];
    this.take = 1;
    this.focus = 0;
    this.phase = 'player';
    this.wins = 0;
    this.round = 1;
    this.aiTimer = 0;
    this.pauseTimer = 0;
    this.time = 0;
    this.lastAiMove = null;
    this.finished = false;
    this.setScore('VICTORIAS', 0);
  }

  private geometry(view: View): NimGeometry {
    const panelWidth = Math.min(view.width * 0.74, 430);
    const panelX = (view.width - panelWidth) / 2;
    const panelTop = 138;
    const buttonHeight = 40;
    const buttonsY = view.height - 116;
    const panelBottom = buttonsY - 20;
    const panelHeight = panelBottom - panelTop;
    const tokenRadius = clamp(Math.min(view.width * 0.048, panelHeight / 13), 9, 21);
    const buttonWidth = 54;
    const gap = 10;
    const total = buttonWidth * NIM_MAX_TAKE + gap * (NIM_MAX_TAKE - 1);
    const takeButtons: UiButton[] = [];
    for (let index = 0; index < NIM_MAX_TAKE; index += 1) {
      takeButtons.push({
        x: (view.width - total) / 2 + index * (buttonWidth + gap),
        y: buttonsY,
        width: buttonWidth,
        height: buttonHeight,
      });
    }
    const centers = [0, 1, 2].map((index) => panelX + (panelWidth * (index + 0.5)) / 3);
    return {
      panelX,
      panelTop,
      panelWidth,
      panelBottom,
      centers,
      tokenRadius,
      takeButtons,
    };
  }

  private pileAt(point: LocalPoint, geometry: NimGeometry): number | null {
    if (point.y < geometry.panelTop || point.y > geometry.panelBottom) return null;
    for (let index = 0; index < 3; index += 1) {
      const left = geometry.panelX + (geometry.panelWidth * index) / 3;
      const right = geometry.panelX + (geometry.panelWidth * (index + 1)) / 3;
      if (point.x >= left && point.x <= right) return index;
    }
    return null;
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running' || this.finished) return;
    const geometry = this.geometry(this.runtime.view);

    for (let index = 0; index < geometry.takeButtons.length; index += 1) {
      if (pointInButton(point.x, point.y, geometry.takeButtons[index]!)) {
        this.take = index + 1;
        this.audio.click();
        return;
      }
    }

    const pile = this.pileAt(point, geometry);
    if (pile === null) return;
    this.focus = pile;
    if (this.phase === 'player') this.playerMove(pile);
  }

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.finished) return;

    if (code === 'Digit1' || code === 'Numpad1') {
      this.take = 1;
      this.audio.tone(320, 0.04, { type: 'triangle', gain: 0.025 });
      return;
    }
    if (code === 'Digit2' || code === 'Numpad2') {
      this.take = 2;
      this.audio.tone(340, 0.04, { type: 'triangle', gain: 0.025 });
      return;
    }
    if (code === 'Digit3' || code === 'Numpad3') {
      this.take = 3;
      this.audio.tone(360, 0.04, { type: 'triangle', gain: 0.025 });
      return;
    }
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.focus = (this.focus + 2) % 3;
      this.audio.tone(300, 0.035, { type: 'triangle', gain: 0.02 });
      return;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      this.focus = (this.focus + 1) % 3;
      this.audio.tone(330, 0.035, { type: 'triangle', gain: 0.02 });
      return;
    }
    if (code === 'Space' || code === 'Enter') {
      if (this.phase === 'player') this.playerMove(this.focus);
    }
  }

  private playerMove(pile: number): void {
    if (this.phase !== 'player' || this.finished) return;
    const available = this.piles[pile]!;
    if (available < this.take) {
      this.audio.tone(180, 0.1, { type: 'triangle', gain: 0.04 });
      this.toast('No quedan suficientes objetos');
      return;
    }

    this.piles = applyMove(this.piles, { pile, take: this.take });
    this.lastAiMove = null;
    this.audio.tone(410, 0.07, { type: 'triangle', gain: 0.04 });
    this.audio.noise(0.05, { gain: 0.015, filter: 'lowpass', frequency: 500 });

    if (totalObjects(this.piles) === 0) {
      this.finishLoss('Has cogido el último objeto.');
      return;
    }

    this.phase = 'ai';
    this.aiTimer = 0.62;
    this.setStatus(`Has retirado ${this.take} de la pila ${pile + 1}. La máquina piensa.`);
  }

  private aiMove(): void {
    const move = chooseMove(this.piles);
    if (!move) {
      this.phase = 'player';
      return;
    }

    this.piles = applyMove(this.piles, move);
    this.lastAiMove = move;
    this.audio.tone(330, 0.08, { type: 'triangle', gain: 0.045 });
    this.audio.noise(0.05, { gain: 0.015, filter: 'lowpass', frequency: 460 });

    if (totalObjects(this.piles) === 0) {
      this.roundWon();
      return;
    }

    this.phase = 'player';
    this.focus = move.pile;
    this.setStatus(`La máquina retira ${move.take} de la pila ${move.pile + 1}. Te toca.`);
  }

  private roundWon(): void {
    this.wins += 1;
    this.round += 1;
    this.setScore('VICTORIAS', this.wins);
    this.phase = 'pause';
    this.pauseTimer = 0.9;
    this.audio.chord([392, 494, 587], 0.45, { type: 'sine', gain: 0.08 });
    this.toast(`Ronda ganada · ${this.wins}`);
    this.setStatus(`Ronda ganada. La máquina ha cogido el último objeto.`);
  }

  private nextRound(): void {
    this.piles = [NIM_START[0], NIM_START[1], NIM_START[2]];
    this.take = 1;
    this.focus = 0;
    this.phase = 'player';
    this.aiTimer = 0;
    this.lastAiMove = null;
    this.audio.tone(420, 0.1, { type: 'triangle', gain: 0.035 });
    this.setStatus('Nueva ronda. Empiezas tú.');
  }

  private finishLoss(message: string): void {
    if (this.finished) return;
    this.finished = true;
    this.setScore('VICTORIAS', this.wins);
    this.setStatus(`${message} ${this.wins} rondas ganadas.`);
    this.audio.tone(220, 0.35, { type: 'sine', gain: 0.08, slideTo: 130 });
    this.finish({
      title: this.wins > 0 ? 'La racha termina' : 'Ronda perdida',
      message: `${message} La máquina no regala ninguna ventaja.`,
      detail: `${this.wins} rondas ganadas · ronda ${this.round}`,
      score: this.wins,
      scoreLabel: 'VICTORIAS',
      ctaLabel: 'Revancha',
      tone: 'lose',
    });
  }

  protected update(dt: number): void {
    this.time += dt;
    if (this.phase === 'ai') {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) this.aiMove();
    } else if (this.phase === 'pause') {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) this.nextRound();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.butter);
    const geometry = this.geometry(view);

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('NIM', view.width / 2, 72);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText('MISÈRE · 3 PILAS · QUIEN COGE EL ÚLTIMO PIERDE', view.width / 2, 90);
    context.restore();

    this.drawTurn(context, view);
    this.drawPanel(context, geometry);
    this.drawPiles(context, geometry);

    context.save();
    context.font = `600 9px ${FONT_MONO}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText('QUITAR', view.width / 2, geometry.takeButtons[0]!.y - 16);
    context.restore();

    for (let index = 0; index < geometry.takeButtons.length; index += 1) {
      drawUiButton(context, geometry.takeButtons[index]!, String(index + 1), {
        active: this.take === index + 1,
        accent: PALETTE.forest,
      });
    }

    drawPuzzleFooter(
      context,
      view,
      `RONDA ${this.round}`,
      `VICTORIAS ${this.wins}`,
      this.lastAiMove && this.phase === 'player'
        ? `LA MÁQUINA RETIRÓ ${this.lastAiMove.take} DE LA PILA ${this.lastAiMove.pile + 1}`
        : 'ELIGE 1–3 Y TOCA UNA PILA',
    );
  }

  private drawTurn(context: CanvasRenderingContext2D, view: View): void {
    const label =
      this.phase === 'player'
        ? 'TU TURNO'
        : this.phase === 'ai'
          ? 'LA MÁQUINA PIENSA'
          : 'RONDA GANADA';
    const width = Math.min(220, view.width * 0.56);
    const x = (view.width - width) / 2;
    const y = 110;
    context.save();
    roundedRect(context, x, y, width, 24, 12);
    context.fillStyle = alpha(PALETTE.surface, 0.7);
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.12);
    context.lineWidth = 1;
    context.stroke();

    const pulse = this.reducedMotion
      ? 0.8
      : this.phase === 'ai'
        ? 0.55 + Math.sin(this.time * 4) * 0.35
        : 0.8;
    context.beginPath();
    context.arc(x + 16, y + 12, 3.5, 0, Math.PI * 2);
    context.fillStyle = alpha(
      this.phase === 'player' ? PALETTE.forest : this.phase === 'ai' ? PALETTE.amber : PALETTE.sage,
      pulse,
    );
    context.fill();

    context.font = `600 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.68);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x + width / 2 + 6, y + 12);
    context.restore();
  }

  private drawPanel(context: CanvasRenderingContext2D, geometry: NimGeometry): void {
    roundedRect(
      context,
      geometry.panelX,
      geometry.panelTop,
      geometry.panelWidth,
      geometry.panelBottom - geometry.panelTop,
      20,
    );
    context.fillStyle = 'rgba(255, 253, 248, 0.68)';
    context.fill();
    context.strokeStyle = 'rgba(36, 51, 45, 0.14)';
    context.lineWidth = 1.4;
    context.stroke();
  }

  private drawPiles(context: CanvasRenderingContext2D, geometry: NimGeometry): void {
    const spacing = geometry.tokenRadius * 1.8;
    const tokenWidth = geometry.tokenRadius * 2.35;
    const tokenHeight = geometry.tokenRadius * 1.24;
    const centerY = (geometry.panelTop + geometry.panelBottom) / 2;

    for (let pile = 0; pile < 3; pile += 1) {
      const centerX = geometry.centers[pile]!;
      const columnWidth = geometry.panelWidth / 3;

      if (this.phase === 'player' && pile === this.focus && !this.finished) {
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = alpha(PALETTE.forest, 0.35);
        context.lineWidth = 1.5;
        roundedRect(
          context,
          centerX - columnWidth / 2 + 8,
          geometry.panelTop + 10,
          columnWidth - 16,
          geometry.panelBottom - geometry.panelTop - 20,
          16,
        );
        context.stroke();
        context.setLineDash([]);
        context.restore();
      }

      const count = this.piles[pile]!;
      const baseY = centerY + ((count - 1) * spacing) / 2;
      for (let token = 0; token < count; token += 1) {
        const y = baseY - token * spacing;
        const fill = PILE_COLORS[pile]!;
        context.save();
        context.beginPath();
        context.ellipse(centerX, y, tokenWidth / 2, tokenHeight / 2, 0, 0, Math.PI * 2);
        context.fillStyle = fill;
        context.fill();
        context.strokeStyle = alpha(PALETTE.ink, 0.2);
        context.lineWidth = 1.1;
        context.stroke();
        context.beginPath();
        context.ellipse(
          centerX - tokenWidth * 0.18,
          y - tokenHeight * 0.16,
          tokenWidth * 0.2,
          tokenHeight * 0.14,
          0,
          0,
          Math.PI * 2,
        );
        context.fillStyle = alpha(PALETTE.surface, 0.32);
        context.fill();
        context.restore();
      }

      context.save();
      context.font = `700 12px ${FONT_MONO}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = alpha(PALETTE.ink, count === 0 ? 0.25 : 0.7);
      context.fillText(String(count), centerX, geometry.panelBottom - 15);
      context.restore();
    }
  }
}

export default {
  mount: (context: GameContext) => new Nim(context),
} satisfies GameModule;

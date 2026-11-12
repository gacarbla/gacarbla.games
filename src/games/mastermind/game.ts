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
  CODE_LENGTH,
  COLOR_COUNT,
  MASTERMIND_COLORS,
  MAX_ATTEMPTS,
  formatCode,
  randomCode,
  scoreGuess,
} from './logic';

interface Attempt {
  guess: number[];
  exact: number;
  partial: number;
}

interface MastermindGeometry {
  x: number;
  top: number;
  width: number;
  rowHeight: number;
  gap: number;
  pegRadius: number;
  checkButton: UiButton;
}

interface LocalPoint {
  x: number;
  y: number;
}

class Mastermind extends BaseGame {
  private secret: number[] = randomCode();
  private current: number[] = Array<number>(CODE_LENGTH).fill(0);
  private attempts: Attempt[] = [];
  private active = 0;
  private finished = false;

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerDown((point) => this.handlePointer(point));
    this.input.onKeyDown((code) => this.handleKey(code));
  }

  protected reset(): void {
    this.secret = randomCode();
    this.current = Array<number>(CODE_LENGTH).fill(0);
    this.attempts = [];
    this.active = 0;
    this.finished = false;
    this.setScore('INTENTOS', `0/${MAX_ATTEMPTS}`);
  }

  private geometry(view: View): MastermindGeometry {
    const width = Math.min(440, view.width * 0.86);
    const gap = 7;
    const topMargin = 112;
    const bottomSpace = 112;
    const available = Math.max(180, view.height - topMargin - bottomSpace);
    const rowHeight = clamp((available - gap * (MAX_ATTEMPTS - 1)) / MAX_ATTEMPTS, 24, 48);
    const total = rowHeight * MAX_ATTEMPTS + gap * (MAX_ATTEMPTS - 1);
    const top = topMargin + Math.max(0, (available - total) / 2);
    const checkWidth = Math.min(176, view.width * 0.52);
    const checkHeight = 40;
    return {
      x: (view.width - width) / 2,
      top,
      width,
      rowHeight,
      gap,
      pegRadius: Math.min(rowHeight * 0.27, width * 0.043),
      checkButton: {
        x: (view.width - checkWidth) / 2,
        y: Math.min(view.height - 80, top + total + 14),
        width: checkWidth,
        height: checkHeight,
      },
    };
  }

  private rowTop(index: number, geometry: MastermindGeometry): number {
    return geometry.top + index * (geometry.rowHeight + geometry.gap);
  }

  private pegCenter(
    geometry: MastermindGeometry,
    rowIndex: number,
    slot: number,
  ): { x: number; y: number } {
    return {
      x: geometry.x + geometry.width * 0.1 + slot * geometry.width * 0.115,
      y: this.rowTop(rowIndex, geometry) + geometry.rowHeight / 2,
    };
  }

  private handlePointer(point: LocalPoint): void {
    if (this.state !== 'running' || this.finished) return;
    const geometry = this.geometry(this.runtime.view);

    if (pointInButton(point.x, point.y, geometry.checkButton)) {
      this.submit();
      return;
    }

    const rowIndex = this.attempts.length;
    const top = this.rowTop(rowIndex, geometry);
    if (point.y < top || point.y > top + geometry.rowHeight) return;

    for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
      const center = this.pegCenter(geometry, rowIndex, slot);
      if (Math.hypot(point.x - center.x, point.y - center.y) > geometry.pegRadius * 1.9) {
        continue;
      }
      this.active = slot;
      this.current[slot] = (this.current[slot]! + 1) % COLOR_COUNT;
      this.audio.tone(360 + this.current[slot]! * 55, 0.055, {
        type: 'triangle',
        gain: 0.032,
      });
      return;
    }
  }

  private handleKey(code: string): void {
    if (this.state !== 'running' || this.finished) return;

    if (code === 'ArrowLeft') {
      this.active = (this.active + CODE_LENGTH - 1) % CODE_LENGTH;
      this.audio.tone(300, 0.035, { type: 'triangle', gain: 0.02 });
      return;
    }
    if (code === 'ArrowRight') {
      this.active = (this.active + 1) % CODE_LENGTH;
      this.audio.tone(330, 0.035, { type: 'triangle', gain: 0.02 });
      return;
    }
    if (code === 'Enter' || code === 'NumpadEnter') {
      this.submit();
      return;
    }

    const digit = code.startsWith('Digit')
      ? Number(code.slice(5))
      : code.startsWith('Numpad')
        ? Number(code.slice(6))
        : 0;
    if (digit >= 1 && digit <= COLOR_COUNT) {
      this.current[this.active] = digit - 1;
      this.audio.tone(360 + (digit - 1) * 55, 0.055, {
        type: 'triangle',
        gain: 0.032,
      });
    }
  }

  private submit(): void {
    if (this.finished || this.attempts.length >= MAX_ATTEMPTS) return;
    const guess = [...this.current];
    const feedback = scoreGuess(this.secret, guess);
    this.attempts.push({ guess, exact: feedback.exact, partial: feedback.partial });
    this.setScore('INTENTOS', `${this.attempts.length}/${MAX_ATTEMPTS}`);

    if (feedback.exact === CODE_LENGTH) {
      this.win();
      return;
    }

    if (this.attempts.length >= MAX_ATTEMPTS) {
      this.lose();
      return;
    }

    this.audio.tone(feedback.exact > 0 ? 520 : 300, 0.09, {
      type: 'triangle',
      gain: 0.04,
    });
    this.setStatus(
      `${feedback.exact} exactos y ${feedback.partial} en otra posición. Quedan ${
        MAX_ATTEMPTS - this.attempts.length
      } intentos.`,
    );
  }

  private win(): void {
    this.finished = true;
    const score = Math.max(250, 1000 - (this.attempts.length - 1) * 150);
    this.setScore('PUNTOS', score);
    this.setStatus(`Código descifrado en ${this.attempts.length} intentos.`);
    this.audio.chord([392, 494, 587, 784], 0.7, { type: 'sine', gain: 0.09 });
    this.finish({
      title: 'Código descifrado',
      message: `Has encontrado la combinación en ${this.attempts.length} ${
        this.attempts.length === 1 ? 'intento' : 'intentos'
      }.`,
      detail: `${formatCode(this.secret)} · ${this.attempts.length}/${MAX_ATTEMPTS}`,
      score,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Nuevo código',
      tone: 'win',
    });
  }

  private lose(): void {
    this.finished = true;
    this.setScore('PUNTOS', 0);
    this.setStatus(`Sin intentos. El código era ${formatCode(this.secret)}.`);
    this.audio.tone(220, 0.3, { type: 'sine', gain: 0.07, slideTo: 140 });
    this.finish({
      title: 'El código se resiste',
      message: 'Se han agotado los seis intentos. El código queda a la vista.',
      detail: formatCode(this.secret),
      score: 0,
      scoreLabel: 'PUNTOS',
      ctaLabel: 'Reintentar',
      tone: 'lose',
    });
  }

  protected update(): void {
    // La partida avanza únicamente con las comprobaciones del jugador.
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    drawPuzzleBackground(context, view, PALETTE.apricot);
    const geometry = this.geometry(view);

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 13px ${FONT_SANS}`;
    context.fillStyle = PALETTE.ink;
    context.fillText('MASTERMIND', view.width / 2, 72);
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.55);
    context.fillText('4 COLORES · 6 INTENTOS · SE PERMITE REPETIR', view.width / 2, 90);
    context.restore();

    for (let row = 0; row < MAX_ATTEMPTS; row += 1) {
      this.drawRow(context, geometry, row);
    }

    drawUiButton(context, geometry.checkButton, 'COMPROBAR', {
      active: true,
      accent: PALETTE.apricot,
    });

    this.drawLegend(context, view, geometry);

    drawPuzzleFooter(
      context,
      view,
      `INTENTO ${Math.min(this.attempts.length + 1, MAX_ATTEMPTS)}/${MAX_ATTEMPTS}`,
      `ACIERTOS ${this.lastExact()}`,
      'CLIC CICLA COLOR · 1–6 · ENTER COMPRUEBA',
    );
  }

  private drawRow(
    context: CanvasRenderingContext2D,
    geometry: MastermindGeometry,
    row: number,
  ): void {
    const top = this.rowTop(row, geometry);
    const current = row === this.attempts.length && !this.finished;
    const attempt = this.attempts[row];

    context.save();
    roundedRect(context, geometry.x, top, geometry.width, geometry.rowHeight, 14);
    context.fillStyle = current
      ? alpha(PALETTE.sky, 0.12)
      : attempt
        ? 'rgba(255, 253, 248, 0.82)'
        : 'rgba(255, 253, 248, 0.35)';
    context.fill();
    context.strokeStyle = current ? PALETTE.sky : 'rgba(36, 51, 45, 0.1)';
    context.lineWidth = current ? 2 : 1;
    context.stroke();

    context.font = `600 ${Math.max(8, geometry.rowHeight * 0.2)}px ${FONT_MONO}`;
    context.fillStyle = alpha(PALETTE.ink, 0.35);
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(String(row + 1), geometry.x + 7, top + geometry.rowHeight / 2);
    context.restore();

    const guess = attempt?.guess ?? (current ? this.current : null);
    if (guess) {
      for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
        const center = this.pegCenter(geometry, row, slot);
        this.drawPeg(
          context,
          center.x,
          center.y,
          geometry.pegRadius,
          MASTERMIND_COLORS[guess[slot]!]!.hex,
        );
        if (current && slot === this.active) {
          context.save();
          context.strokeStyle = PALETTE.ink;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(center.x, center.y, geometry.pegRadius + 4, 0, Math.PI * 2);
          context.stroke();
          context.restore();
        }
      }
    }

    if (attempt) this.drawFeedback(context, geometry, row, attempt);
  }

  private drawPeg(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
  ): void {
    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.22);
    context.lineWidth = 1.2;
    context.stroke();
    context.beginPath();
    context.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.24, 0, Math.PI * 2);
    context.fillStyle = alpha(PALETTE.surface, 0.5);
    context.fill();
    context.restore();
  }

  private drawFeedback(
    context: CanvasRenderingContext2D,
    geometry: MastermindGeometry,
    row: number,
    attempt: Attempt,
  ): void {
    const centerY = this.rowTop(row, geometry) + geometry.rowHeight / 2;
    const radius = Math.max(3, geometry.pegRadius * 0.42);
    const startX = geometry.x + geometry.width * 0.62;
    const step = geometry.width * 0.085;

    for (let index = 0; index < CODE_LENGTH; index += 1) {
      const x = startX + index * step;
      context.save();
      context.beginPath();
      context.arc(x, centerY, radius, 0, Math.PI * 2);
      if (index < attempt.exact) {
        context.fillStyle = PALETTE.surface;
        context.fill();
        context.strokeStyle = PALETTE.inkSoft;
        context.lineWidth = 1.4;
        context.stroke();
      } else if (index < attempt.exact + attempt.partial) {
        context.fillStyle = PALETTE.inkSoft;
        context.fill();
      } else {
        context.strokeStyle = alpha(PALETTE.ink, 0.16);
        context.lineWidth = 1;
        context.stroke();
      }
      context.restore();
    }
  }

  private drawLegend(
    context: CanvasRenderingContext2D,
    view: View,
    geometry: MastermindGeometry,
  ): void {
    const y = geometry.checkButton.y + geometry.checkButton.height + 18;
    if (y > view.height - 58) return;
    context.save();
    context.font = `500 9px ${FONT_MONO}`;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillStyle = alpha(PALETTE.ink, 0.5);
    context.fillText('EXACTO', view.width / 2 - 76, y);
    context.beginPath();
    context.arc(view.width / 2 - 30, y, 4.5, 0, Math.PI * 2);
    context.fillStyle = PALETTE.surface;
    context.fill();
    context.strokeStyle = PALETTE.inkSoft;
    context.lineWidth = 1.4;
    context.stroke();
    context.fillStyle = alpha(PALETTE.ink, 0.5);
    context.fillText('OTRA POSICIÓN', view.width / 2 + 2, y);
    context.beginPath();
    context.arc(view.width / 2 + 118, y, 4.5, 0, Math.PI * 2);
    context.fillStyle = PALETTE.inkSoft;
    context.fill();
    context.restore();
  }

  private lastExact(): number {
    const last = this.attempts[this.attempts.length - 1];
    return last ? last.exact : 0;
  }
}

export default {
  mount: (context: GameContext) => new Mastermind(context),
} satisfies GameModule;

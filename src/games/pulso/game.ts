import {
  BaseGame,
  FONT_MONO,
  PALETTE,
  Particles,
  ScreenShake,
  TAU,
  alpha,
  clamp,
  glowCircle,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  PAD_COUNT,
  keyToPad,
  nextPad,
  noteFor,
  padAtPoint,
  progressRatio,
  stepMatches,
} from './logic';

type Phase = 'playback' | 'input' | 'success' | 'fail';

interface Geometry {
  cx: number;
  cy: number;
  radius: number;
  padRadius: number;
  centreRadius: number;
}

const PAD_COLORS = [PALETTE.sage, PALETTE.sky, PALETTE.lilac, PALETTE.apricot];

const PHASE_LABELS: Record<Phase, string> = {
  playback: 'MIRA',
  input: 'REPITE',
  success: 'BIEN',
  fail: 'FIN',
};

class Pulso extends BaseGame {
  private sequence: number[] = [];
  private round = 1;
  private completed = 0;
  private phase: Phase = 'playback';
  private playbackIndex = 0;
  private playbackTimer = 0.65;
  private playbackActive = false;
  private inputIndex = 0;
  private successTimer = 0;
  private failTimer = 0;
  private flash = [0, 0, 0, 0];
  private activePad = -1;
  private wrongPad = -1;
  private hoverPad = -1;
  private particles = new Particles();
  private shake = new ScreenShake();

  constructor(context: GameContext) {
    super(context);
    this.input.onPointerMove((point) => this.hover(point.x, point.y));
    this.input.onPointerDown((point) => this.pressAt(point.x, point.y));
    this.input.onKeyDown((code) => {
      const pad = keyToPad(code);
      if (pad !== null) this.pressPad(pad);
    });
  }

  protected reset(): void {
    this.sequence = [nextPad()];
    this.round = 1;
    this.completed = 0;
    this.phase = 'playback';
    this.playbackIndex = 0;
    this.playbackTimer = 0.65;
    this.playbackActive = false;
    this.inputIndex = 0;
    this.successTimer = 0;
    this.failTimer = 0;
    this.flash = [0, 0, 0, 0];
    this.activePad = -1;
    this.wrongPad = -1;
    this.hoverPad = -1;
    this.particles.clear();
    this.shake = new ScreenShake();
    this.setScore('RONDA', 1);
  }

  private geometry(view: View): Geometry {
    const unit = Math.min(view.width, view.height);
    const radius = clamp(unit * 0.33, 110, 250);
    return {
      cx: view.width / 2,
      cy: view.height / 2 + 8,
      radius,
      padRadius: clamp(radius * 0.25, 32, 60),
      centreRadius: radius * 0.44,
    };
  }

  private padPosition(pad: number, geometry: Geometry): { x: number; y: number } {
    const angle = -Math.PI / 2 + (pad * Math.PI) / 2;
    return {
      x: geometry.cx + Math.cos(angle) * geometry.radius,
      y: geometry.cy + Math.sin(angle) * geometry.radius,
    };
  }

  private hover(x: number, y: number): void {
    if (this.state !== 'running') return;
    const geometry = this.geometry(this.runtime.view);
    this.hoverPad = padAtPoint(x, y, geometry.cx, geometry.cy, geometry.radius, geometry.padRadius);
  }

  private pressAt(x: number, y: number): void {
    if (this.phase !== 'input') return;
    const geometry = this.geometry(this.runtime.view);
    const pad = padAtPoint(x, y, geometry.cx, geometry.cy, geometry.radius, geometry.padRadius);
    if (pad >= 0) this.pressPad(pad);
  }

  private pressPad(pad: number): void {
    if (this.state !== 'running' || this.phase !== 'input') return;
    if (pad < 0 || pad >= PAD_COUNT) return;

    this.flash[pad] = 1;
    const expected = stepMatches(this.sequence, this.inputIndex, pad);

    if (!expected) {
      this.fail(pad);
      return;
    }

    this.inputIndex += 1;
    this.audio.tone(noteFor(pad), 0.14, { type: 'triangle', gain: 0.09 });

    const geometry = this.geometry(this.runtime.view);
    const point = this.padPosition(pad, geometry);
    this.particles.burst(point.x, point.y, PAD_COLORS[pad]!, {
      count: this.reducedMotion ? 4 : 9,
      speed: 100,
      size: 2,
      life: 0.4,
    });

    if (this.inputIndex >= this.sequence.length) {
      this.completed = this.round;
      this.phase = 'success';
      this.successTimer = 0.75;
      this.activePad = -1;
      this.audio.chord([392, 523.25, 659.25, 783.99], 0.5, { type: 'sine', gain: 0.11 });
      this.particles.burst(geometry.cx, geometry.cy, PALETTE.lime, {
        count: this.reducedMotion ? 10 : 24,
        speed: 190,
        size: 2.6,
        life: 0.7,
      });
      this.setStatus(`Ronda ${this.round} completada.`);
    }
  }

  private fail(pad: number): void {
    this.phase = 'fail';
    this.failTimer = 1.15;
    this.wrongPad = pad;
    this.flash[pad] = 1;
    this.audio.tone(220, 0.24, { type: 'sine', gain: 0.06, slideTo: 165 });
    this.audio.tone(196, 0.32, { type: 'sine', gain: 0.05, slideTo: 147 });
    if (!this.reducedMotion) this.shake.add(4, 0.28);

    const geometry = this.geometry(this.runtime.view);
    const point = this.padPosition(pad, geometry);
    this.particles.burst(point.x, point.y, PALETTE.coral, {
      count: this.reducedMotion ? 8 : 20,
      speed: 210,
      size: 2.6,
      life: 0.7,
      shape: 'spark',
    });
    this.setStatus('La secuencia no era esa. Fin de la ronda.');
  }

  private finishGame(): void {
    this.finish({
      title: 'Fin de la ronda',
      message: 'El pulso se rompió. La próxima ronda, un paso más lejos.',
      detail: `${this.completed} ronda${this.completed === 1 ? '' : 's'} completada${this.completed === 1 ? '' : 's'} · fallo en la ronda ${this.round}`,
      score: this.completed,
      scoreLabel: 'RONDAS',
      ctaLabel: 'Otra ronda',
      tone: 'lose',
    });
  }

  private nextRound(): void {
    this.round += 1;
    this.sequence.push(nextPad());
    this.phase = 'playback';
    this.playbackIndex = 0;
    this.playbackActive = false;
    this.playbackTimer = 0.5;
    this.inputIndex = 0;
    this.activePad = -1;
    this.setScore('RONDA', this.round);
    this.setStatus(`Ronda ${this.round}. Mira la secuencia.`);
  }

  private updatePlayback(dt: number): void {
    this.playbackTimer -= dt;
    if (this.playbackTimer > 0) return;

    if (this.playbackActive) {
      this.playbackActive = false;
      this.activePad = -1;
      this.playbackTimer = 0.1;
      return;
    }

    if (this.playbackIndex < this.sequence.length) {
      const pad = this.sequence[this.playbackIndex]!;
      this.playbackIndex += 1;
      this.activePad = pad;
      this.flash[pad] = 1;
      this.playbackActive = true;
      this.playbackTimer = 0.34;
      this.audio.tone(noteFor(pad), 0.3, { type: 'sine', gain: 0.12 });
      return;
    }

    this.phase = 'input';
    this.activePad = -1;
    this.inputIndex = 0;
    this.setStatus(`Ronda ${this.round}. Repite la secuencia.`);
  }

  protected update(dt: number): void {
    for (let pad = 0; pad < this.flash.length; pad += 1) {
      this.flash[pad] = Math.max(0, this.flash[pad]! - dt * 3.2);
    }
    this.particles.update(dt);
    this.shake.update(dt);

    if (this.phase === 'playback') {
      this.updatePlayback(dt);
      return;
    }
    if (this.phase === 'success') {
      this.successTimer -= dt;
      if (this.successTimer <= 0) this.nextRound();
      return;
    }
    if (this.phase === 'fail') {
      this.failTimer -= dt;
      if (this.failTimer <= 0) this.finishGame();
    }
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const geometry = this.geometry(view);
    const background = context.createRadialGradient(
      geometry.cx,
      geometry.cy,
      0,
      geometry.cx,
      geometry.cy,
      Math.max(view.width, view.height) * 0.76,
    );
    background.addColorStop(0, '#ece3f1');
    background.addColorStop(0.55, '#fbf6ec');
    background.addColorStop(1, PALETTE.bg);
    context.fillStyle = background;
    context.fillRect(0, 0, view.width, view.height);

    context.save();
    if (!this.reducedMotion) this.shake.apply(context);
    this.drawAmbient(context, geometry);
    this.drawPads(context, geometry);
    this.drawCentre(context, geometry);
    this.particles.draw(context);
    context.restore();

    this.drawFooter(context, view);
  }

  private drawAmbient(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cx, cy, radius } = geometry;
    glowCircle(context, cx, cy, radius * 1.32, PALETTE.lilac, 0.12);

    context.save();
    context.setLineDash([2, 10]);
    context.strokeStyle = alpha(PALETTE.ink, 0.09);
    context.lineWidth = 1;
    context.beginPath();
    context.arc(cx, cy, radius, 0, TAU);
    context.stroke();

    context.setLineDash([]);
    context.strokeStyle = alpha(PALETTE.ink, 0.045);
    for (let tick = 0; tick < 48; tick += 1) {
      const angle = (tick / 48) * TAU;
      const inner = radius * 1.035;
      const outer = inner + (tick % 4 === 0 ? radius * 0.035 : radius * 0.018);
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      context.stroke();
    }

    context.strokeStyle = alpha(PALETTE.ink, 0.035);
    context.beginPath();
    context.arc(cx, cy, radius * 0.66, 0, TAU);
    context.stroke();
    context.restore();
  }

  private drawPads(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { padRadius } = geometry;
    const interactive = this.phase === 'input' && this.state === 'running';

    for (let pad = 0; pad < PAD_COUNT; pad += 1) {
      const point = this.padPosition(pad, geometry);
      const color =
        this.phase === 'fail' && this.wrongPad === pad ? PALETTE.coral : PAD_COLORS[pad]!;
      const glow = Math.max(this.flash[pad]!, this.activePad === pad ? 0.75 : 0);
      const hover = interactive && this.hoverPad === pad;

      if (glow > 0.02) {
        glowCircle(context, point.x, point.y, padRadius * 2.6, color, 0.18 + glow * 0.25);
      }

      context.save();
      context.beginPath();
      context.arc(point.x, point.y, padRadius, 0, TAU);
      context.fillStyle = alpha(color, 0.3 + glow * 0.62);
      context.fill();
      context.strokeStyle = alpha(color, hover ? 1 : 0.72 + glow * 0.25);
      context.lineWidth = 2 + glow * 2.5 + (hover ? 1 : 0);
      context.stroke();

      context.beginPath();
      context.arc(point.x, point.y, padRadius * 0.71, 0, TAU);
      context.strokeStyle = alpha(color, 0.18 + glow * 0.25);
      context.lineWidth = 1;
      context.stroke();

      context.font = `600 ${Math.max(14, padRadius * 0.58)}px ${FONT_MONO}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = PALETTE.ink;
      context.fillText(String(pad + 1), point.x, point.y + 1);
      context.restore();
    }
  }

  private drawCentre(context: CanvasRenderingContext2D, geometry: Geometry): void {
    const { cx, cy, centreRadius } = geometry;
    const phase = this.phase;
    const status = this.state === 'idle' ? 'PREPÁRATE' : PHASE_LABELS[phase];
    const accent =
      phase === 'fail' ? PALETTE.coral : phase === 'success' ? PALETTE.lime : PALETTE.violet;
    const progress =
      phase === 'playback'
        ? progressRatio(this.playbackIndex, this.sequence.length)
        : phase === 'success'
          ? 1
          : progressRatio(this.inputIndex, this.sequence.length);

    context.save();
    context.beginPath();
    context.arc(cx, cy, centreRadius, 0, TAU);
    context.fillStyle = 'rgba(255, 253, 248, 0.92)';
    context.fill();
    context.strokeStyle = alpha(PALETTE.ink, 0.1);
    context.lineWidth = 1;
    context.stroke();

    context.beginPath();
    context.arc(cx, cy, centreRadius + 9, 0, TAU);
    context.strokeStyle = alpha(PALETTE.ink, 0.16);
    context.lineWidth = 4;
    context.stroke();

    if (progress > 0) {
      context.beginPath();
      context.arc(cx, cy, centreRadius + 9, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
      context.strokeStyle = alpha(accent, 0.9);
      context.lineWidth = 3;
      context.lineCap = 'round';
      context.stroke();
    }

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 9px ${FONT_MONO}`;
    context.fillStyle = PALETTE.muted;
    context.fillText('RONDA', cx, cy - centreRadius * 0.52);

    context.font = `600 ${Math.max(26, centreRadius * 0.62)}px ${FONT_MONO}`;
    context.fillStyle = PALETTE.ink;
    context.fillText(String(this.round).padStart(2, '0'), cx, cy - centreRadius * 0.02);

    context.font = `500 ${Math.max(11, centreRadius * 0.19)}px ${FONT_MONO}`;
    context.fillStyle =
      phase === 'success'
        ? PALETTE.lime
        : phase === 'fail'
          ? PALETTE.coral
          : alpha(PALETTE.ink, 0.72);
    context.fillText(status, cx, cy + centreRadius * 0.6);
    context.restore();
  }

  private drawFooter(context: CanvasRenderingContext2D, view: View): void {
    context.save();
    context.font = `500 10px ${FONT_MONO}`;
    context.textBaseline = 'middle';
    context.fillStyle = alpha(PALETTE.inkSoft, 0.55);
    context.textAlign = 'center';
    context.fillText('1–4 / FLECHAS · TAMBIÉN CLIC O TOQUE', view.width / 2, view.height - 22);

    context.textAlign = 'left';
    context.fillStyle = PALETTE.muted;
    context.fillText('PULSO · 4 PADS', 22, view.height - 22);

    context.textAlign = 'right';
    context.fillText(
      `RONDAS ${String(this.completed).padStart(2, '0')}`,
      view.width - 22,
      view.height - 22,
    );
    context.restore();
  }
}

const gameModule: GameModule = {
  mount: (context) => new Pulso(context),
};

export default gameModule;

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
  mod,
  mulberry32,
  randomRange,
  type GameContext,
  type GameModule,
  type View,
} from '../engine';
import {
  difficultyAt,
  cycleLane,
  hazardHits,
  isLaneBlocked,
  orbCollects,
  type Hazard,
  type Orb,
} from './logic';

interface LiveHazard extends Hazard {
  life: number;
  maxLife: number;
}

interface LiveOrb extends Orb {
  life: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
}

interface TrailPoint {
  x: number;
  y: number;
}

const TOTAL_LIVES = 3;
const MAX_HAZARDS = 9;

class Orbita extends BaseGame {
  private angle = -Math.PI / 2;
  private playerRadius = 0;
  private radiusReady = false;
  private lane = 0;
  private score = 0;
  private displayedScore = -1;
  private combo = 0;
  private comboPulse = 0;
  private lives = TOTAL_LIVES;
  private invulnerable = 0;
  private elapsed = 0;
  private secondTimer = 0;
  private hazardTimer = 2.6;
  private orbTimer = 0.6;
  private cores = 0;
  private hazards: LiveHazard[] = [];
  private orbs: LiveOrb[] = [];
  private stars: Star[] = [];
  private trail: TrailPoint[] = [];
  private particles = new Particles();
  private shake = new ScreenShake();

  constructor(context: GameContext) {
    super(context);
    this.input.onAction(() => this.cycle());
    this.input.onKeyDown((code) => {
      if (code === 'ArrowDown' || code === 'KeyS') this.cycle();
    });
  }

  protected reset(): void {
    this.angle = -Math.PI / 2;
    this.playerRadius = 0;
    this.radiusReady = false;
    this.lane = 0;
    this.score = 0;
    this.displayedScore = -1;
    this.combo = 0;
    this.comboPulse = 0;
    this.lives = TOTAL_LIVES;
    this.invulnerable = 0;
    this.elapsed = 0;
    this.secondTimer = 0;
    this.hazardTimer = 2.8;
    this.orbTimer = 0.8;
    this.cores = 0;
    this.hazards = [];
    this.orbs = [];
    this.trail = [];
    this.particles.clear();
    this.shake = new ScreenShake();
    this.stars = this.createStars();
    this.setScore('PUNTOS', 0);
    this.pushScore();
  }

  private createStars(): Star[] {
    const random = mulberry32(0x0b17a);
    const count = this.reducedMotion ? 34 : 86;
    return Array.from({ length: count }, () => ({
      x: random(),
      y: random(),
      radius: randomRange(0.4, 1.5, random),
      phase: randomRange(0, TAU, random),
      speed: randomRange(0.15, 0.7, random),
    }));
  }

  private cycle(): void {
    if (this.state !== 'running') return;
    this.lane = cycleLane(this.lane);
    this.audio.tone(260 + this.lane * 95, 0.07, { type: 'triangle', gain: 0.05 });
    const geometry = this.geometry(this.runtime.view);
    const radius = geometry.radii[this.lane]!;
    this.particles.burst(
      geometry.cx + Math.cos(this.angle) * radius,
      geometry.cy + Math.sin(this.angle) * radius,
      PALETTE.cyan,
      { count: 6, speed: 70, size: 2, life: 0.35, spread: Math.PI },
    );
  }

  private geometry(view: View): {
    cx: number;
    cy: number;
    radii: number[];
    gap: number;
    maxRadius: number;
    unit: number;
  } {
    const unit = Math.min(view.width, view.height);
    const centerX = view.width / 2;
    const centerY = view.height / 2;
    const gap = unit * 0.098;
    const base = unit * 0.152;
    return {
      cx: centerX,
      cy: centerY,
      radii: [base, base + gap, base + gap * 2],
      gap,
      maxRadius: base + gap * 2,
      unit,
    };
  }

  protected update(dt: number): void {
    this.elapsed += dt;
    const view = this.runtime.view;
    const geometry = this.geometry(view);
    const difficulty = difficultyAt(this.elapsed);

    if (!this.radiusReady) {
      this.playerRadius = geometry.radii[this.lane]!;
      this.radiusReady = true;
    }

    this.angle = mod(this.angle + difficulty.angularSpeed * dt, TAU);
    this.playerRadius = damp(this.playerRadius, geometry.radii[this.lane]!, 13, dt);

    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.comboPulse = Math.max(0, this.comboPulse - dt * 2.6);
    this.secondTimer += dt;
    while (this.secondTimer >= 1) {
      this.secondTimer -= 1;
      this.score += 1;
      this.pushScore();
    }

    this.hazardTimer -= dt;
    if (this.hazardTimer <= 0) {
      this.spawnHazard(difficulty.hazardSpeed);
      this.hazardTimer = difficulty.spawnEvery * randomRange(0.82, 1.18);
    }

    this.orbTimer -= dt;
    if (this.orbTimer <= 0) {
      this.spawnOrb();
      this.orbTimer = randomRange(1.05, 1.6);
    }

    for (const hazard of this.hazards) {
      hazard.angle = mod(hazard.angle + hazard.speed * dt, TAU);
      hazard.life -= dt;
    }
    this.hazards = this.hazards.filter((hazard) => hazard.life > 0);

    for (const orb of this.orbs) {
      orb.angle = mod(orb.angle + orb.drift * dt, TAU);
      orb.phase += dt * 2.4;
      orb.life -= dt;
    }

    const collected: LiveOrb[] = [];
    for (const orb of this.orbs) {
      if (orb.life <= 0) continue;
      if (orbCollects(this.angle, this.playerRadius, orb, geometry.radii, geometry.gap)) {
        collected.push(orb);
      }
    }
    for (const orb of collected) {
      this.collectOrb(orb, geometry);
    }
    this.orbs = this.orbs.filter((orb) => orb.life > 0 && !collected.includes(orb));

    if (this.invulnerable <= 0) {
      const crashed = this.hazards.find((hazard) =>
        hazardHits(this.angle, this.playerRadius, hazard, geometry.radii, geometry.gap),
      );
      if (crashed) this.hit(crashed, geometry);
    }

    this.trail.unshift({
      x: geometry.cx + Math.cos(this.angle) * this.playerRadius,
      y: geometry.cy + Math.sin(this.angle) * this.playerRadius,
    });
    if (this.trail.length > 18) this.trail.pop();

    this.particles.update(dt);
    this.shake.update(dt);
  }

  private spawnHazard(baseSpeed: number): void {
    if (this.hazards.length >= MAX_HAZARDS) return;

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const lane = Math.floor(Math.random() * 3);
      const angle = mod(this.angle + randomRange(1.25, TAU - 0.7), TAU);
      if (isLaneBlocked(this.hazards, lane, angle, 0.42)) continue;

      const span = randomRange(0.24, 0.46);
      this.hazards.push({
        lane,
        angle,
        span,
        speed: (Math.random() < 0.34 ? -1 : 1) * randomRange(baseSpeed * 0.55, baseSpeed),
        seed: Math.random(),
        life: randomRange(11, 16),
        maxLife: 16,
      });
      return;
    }
  }

  private spawnOrb(): void {
    if (this.orbs.length >= 5) return;
    this.orbs.push({
      lane: Math.floor(Math.random() * 3),
      angle: mod(this.angle + randomRange(1.35, TAU - 1), TAU),
      drift: randomRange(-0.075, 0.075),
      phase: randomRange(0, TAU),
      life: 15,
    });
  }

  private collectOrb(orb: LiveOrb, geometry: ReturnType<Orbita['geometry']>): void {
    this.cores += 1;
    this.combo = Math.min(9, this.combo + 1);
    this.comboPulse = 1;
    this.score += 10 * this.combo;
    this.pushScore();

    const x = geometry.cx + Math.cos(orb.angle) * geometry.radii[orb.lane]!;
    const y = geometry.cy + Math.sin(orb.angle) * geometry.radii[orb.lane]!;
    this.particles.burst(x, y, PALETTE.lime, {
      count: this.reducedMotion ? 8 : 18,
      speed: 190,
      size: 2.6,
      life: 0.65,
      shape: 'spark',
    });
    this.particles.burst(x, y, PALETTE.ink, { count: 4, speed: 80, size: 1.6, life: 0.4 });

    const pitch = 420 + this.combo * 65;
    this.audio.tone(pitch, 0.16, {
      type: 'triangle',
      gain: 0.11,
      slideTo: pitch * 1.7,
    });
    if (this.combo === 9) {
      this.audio.chord([880, 1320, 1760], 0.3, { type: 'sine', gain: 0.1 });
      this.toast('Combo máximo ×9');
    }
  }

  private hit(hazard: LiveHazard, geometry: ReturnType<Orbita['geometry']>): void {
    this.lives -= 1;
    this.combo = 0;
    this.comboPulse = 0;
    this.invulnerable = 1.8;

    const x = geometry.cx + Math.cos(this.angle) * this.playerRadius;
    const y = geometry.cy + Math.sin(this.angle) * this.playerRadius;
    this.particles.burst(x, y, PALETTE.coral, {
      count: this.reducedMotion ? 10 : 26,
      speed: 260,
      size: 3.2,
      life: 0.8,
      shape: 'spark',
    });
    this.audio.noise(0.28, { gain: 0.18, filter: 'bandpass', frequency: 380 });
    this.audio.tone(150, 0.3, { type: 'sawtooth', gain: 0.12, slideTo: 55 });
    if (!this.reducedMotion) this.shake.add(12, 0.35);

    // El obstáculo golpeado desaparece para dar aire al jugador.
    this.hazards = this.hazards.filter((item) => item !== hazard);

    if (this.lives <= 0) {
      this.finish({
        title: 'Órbita interrumpida',
        message: 'Los escombros te alcanzaron. La próxima vuelta, más lejos.',
        detail: `${this.cores} núcleos · ${Math.floor(this.elapsed)} s`,
        score: this.score,
        ctaLabel: 'Otra órbita',
        tone: 'lose',
      });
      this.audio.chord([392, 311, 233], 0.8, { type: 'sine', gain: 0.1 });
    } else {
      this.setStatus(`Impacto. Te quedan ${this.lives} vidas.`);
      this.toast(`−1 vida · ${this.lives} restantes`);
    }
  }

  private pushScore(): void {
    if (this.score === this.displayedScore) return;
    this.displayedScore = this.score;
    this.setScore('PUNTOS', this.score);
  }

  protected draw(context: CanvasRenderingContext2D, view: View): void {
    const geometry = this.geometry(view);
    const { cx, cy, radii, gap, maxRadius, unit } = geometry;

    const background = context.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      Math.max(view.width, view.height) * 0.75,
    );
    background.addColorStop(0, '#0b100e');
    background.addColorStop(0.55, '#080a0b');
    background.addColorStop(1, PALETTE.bg);
    context.fillStyle = background;
    context.fillRect(0, 0, view.width, view.height);

    this.drawStars(context, view);

    context.save();
    if (!this.reducedMotion) this.shake.apply(context);

    // Pista orbital
    for (let index = 0; index < radii.length; index += 1) {
      context.beginPath();
      context.strokeStyle = alpha(
        index === this.lane ? PALETTE.lime : '#ffffff',
        index === this.lane ? 0.16 : 0.07,
      );
      context.lineWidth = 1;
      context.setLineDash(index === 2 ? [2, 9] : []);
      context.arc(cx, cy, radii[index]!, 0, TAU);
      context.stroke();
    }
    context.setLineDash([]);

    context.strokeStyle = alpha(PALETTE.ink, 0.1);
    context.lineWidth = 1;
    for (let mark = 0; mark < 48; mark += 1) {
      const angle = (mark / 48) * TAU;
      const inner = maxRadius + unit * 0.018;
      const outer = inner + (mark % 4 === 0 ? unit * 0.018 : unit * 0.008);
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      context.stroke();
    }

    this.drawSun(context, cx, cy, unit);
    for (const hazard of this.hazards) this.drawHazard(context, hazard, cx, cy, radii, gap);
    for (const orb of this.orbs) this.drawOrb(context, orb, cx, cy, radii, unit);
    this.drawPlayer(context, cx, cy, unit);
    this.particles.draw(context);

    context.restore();

    this.drawLives(context, cx, cy, maxRadius, view);
    this.drawCombo(context, cx, cy);
    this.drawHint(context, view);
  }

  private drawStars(context: CanvasRenderingContext2D, view: View): void {
    for (const star of this.stars) {
      const twinkle = this.reducedMotion
        ? 0.5
        : 0.35 + Math.sin(star.phase + this.elapsed * star.speed) * 0.3;
      context.fillStyle = alpha(PALETTE.ink, twinkle * 0.5);
      context.beginPath();
      context.arc(star.x * view.width, star.y * view.height, star.radius, 0, TAU);
      context.fill();
    }
  }

  private drawSun(context: CanvasRenderingContext2D, cx: number, cy: number, unit: number): void {
    const pulse = 1 + Math.sin(this.elapsed * 2.2) * 0.035;
    glowCircle(context, cx, cy, unit * 0.4, PALETTE.lime, 0.1);
    glowCircle(context, cx, cy, unit * 0.17, '#ffffff', 0.07);

    const sun = context.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.065 * pulse);
    sun.addColorStop(0, '#ffffff');
    sun.addColorStop(0.35, PALETTE.lime);
    sun.addColorStop(1, alpha(PALETTE.lime, 0.12));
    context.fillStyle = sun;
    context.beginPath();
    context.arc(cx, cy, unit * 0.065 * pulse, 0, TAU);
    context.fill();

    context.strokeStyle = alpha(PALETTE.lime, 0.4);
    context.lineWidth = 1;
    context.beginPath();
    context.arc(cx, cy, unit * 0.088 * pulse, 0, TAU);
    context.stroke();
  }

  private drawHazard(
    context: CanvasRenderingContext2D,
    hazard: LiveHazard,
    cx: number,
    cy: number,
    radii: number[],
    gap: number,
  ): void {
    const radius = radii[hazard.lane]!;
    const fade = clamp(hazard.life / 1.2, 0, 1);
    const start = hazard.angle - hazard.span / 2;

    context.save();
    context.strokeStyle = alpha(PALETTE.coral, 0.2 * fade);
    context.lineWidth = gap * 0.34;
    context.lineCap = 'round';
    context.beginPath();
    context.arc(cx, cy, radius, start, start + hazard.span);
    context.stroke();

    context.strokeStyle = alpha(PALETTE.coral, 0.95 * fade);
    context.lineWidth = gap * 0.13;
    context.beginPath();
    context.arc(cx, cy, radius, start, start + hazard.span);
    context.stroke();

    context.fillStyle = alpha('#ffd9d2', 0.9 * fade);
    for (const edge of [start, start + hazard.span]) {
      const x = cx + Math.cos(edge) * radius;
      const y = cy + Math.sin(edge) * radius;
      context.beginPath();
      context.arc(x, y, gap * 0.055, 0, TAU);
      context.fill();
    }
    context.restore();
  }

  private drawOrb(
    context: CanvasRenderingContext2D,
    orb: LiveOrb,
    cx: number,
    cy: number,
    radii: number[],
    unit: number,
  ): void {
    const radius = radii[orb.lane]!;
    const x = cx + Math.cos(orb.angle) * radius;
    const y = cy + Math.sin(orb.angle) * radius;
    const pulse = 0.82 + Math.sin(orb.phase) * 0.18;
    const size = unit * 0.014 * pulse;

    glowCircle(context, x, y, size * 4.5, PALETTE.lime, 0.34);
    context.fillStyle = PALETTE.ink;
    context.beginPath();
    context.arc(x, y, size, 0, TAU);
    context.fill();
    context.strokeStyle = PALETTE.lime;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, size * 1.9, 0, TAU);
    context.stroke();
  }

  private drawPlayer(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    unit: number,
  ): void {
    for (let index = this.trail.length - 1; index >= 0; index -= 1) {
      const point = this.trail[index]!;
      const fade = (1 - index / this.trail.length) * 0.3;
      context.fillStyle = alpha(PALETTE.lime, fade);
      context.beginPath();
      context.arc(point.x, point.y, unit * 0.006 * (1 - index / this.trail.length / 1.4), 0, TAU);
      context.fill();
    }

    const x = cx + Math.cos(this.angle) * this.playerRadius;
    const y = cy + Math.sin(this.angle) * this.playerRadius;
    const direction = this.angle + Math.PI / 2;
    const size = clamp(unit * 0.019, 8, 15);

    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0) return;

    glowCircle(context, x, y, size * 3.6, PALETTE.lime, 0.4);
    context.save();
    context.translate(x, y);
    context.rotate(direction);
    context.fillStyle = PALETTE.ink;
    context.beginPath();
    context.moveTo(size, 0);
    context.lineTo(-size * 0.72, -size * 0.68);
    context.lineTo(-size * 0.34, 0);
    context.lineTo(-size * 0.72, size * 0.68);
    context.closePath();
    context.fill();

    context.strokeStyle = PALETTE.lime;
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }

  private drawLives(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    maxRadius: number,
    view: View,
  ): void {
    const x = clamp(cx - maxRadius, 22, view.width - 150);
    const y = clamp(cy + maxRadius + 26, 0, view.height - 22);
    context.save();
    context.font = `500 10px ${FONT_MONO}`;
    context.fillStyle = PALETTE.muted;
    context.textBaseline = 'middle';
    context.fillText('VIDAS', x, y);
    for (let index = 0; index < TOTAL_LIVES; index += 1) {
      const heartX = x + 48 + index * 16;
      const alive = index < this.lives;
      context.fillStyle = alive ? PALETTE.lime : alpha(PALETTE.ink, 0.16);
      this.heartPath(context, heartX, y, 5);
      context.fill();
    }
    context.restore();
  }

  private heartPath(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    context.beginPath();
    context.moveTo(x, y + size * 0.5);
    context.bezierCurveTo(
      x - size * 1.3,
      y - size * 0.4,
      x - size * 0.5,
      y - size * 1.2,
      x,
      y - size * 0.4,
    );
    context.bezierCurveTo(
      x + size * 0.5,
      y - size * 1.2,
      x + size * 1.3,
      y - size * 0.4,
      x,
      y + size * 0.5,
    );
    context.closePath();
  }

  private drawCombo(context: CanvasRenderingContext2D, cx: number, cy: number): void {
    if (this.combo === 0) return;
    const x = cx + Math.cos(this.angle) * this.playerRadius;
    const y = cy + Math.sin(this.angle) * this.playerRadius;
    const lift = 18 + (1 - this.comboPulse) * 26;
    context.save();
    context.globalAlpha = 0.45 + this.comboPulse * 0.55;
    context.font = `600 ${12 + this.comboPulse * 4}px ${FONT_MONO}`;
    context.fillStyle = this.combo > 6 ? PALETTE.coral : PALETTE.lime;
    context.textAlign = 'center';
    context.fillText(`×${this.combo}`, x, y - lift);
    context.restore();
  }

  private drawHint(context: CanvasRenderingContext2D, view: View): void {
    if (this.elapsed > 5 || this.state !== 'running') return;
    const fade = clamp(1 - this.elapsed / 5, 0, 1);
    context.save();
    context.globalAlpha = fade * 0.55;
    context.font = `500 11px ${FONT_MONO}`;
    context.fillStyle = PALETTE.inkSoft;
    context.textAlign = 'center';
    context.fillText('ESPACIO / TOQUE PARA CAMBIAR DE ÓRBITA', view.width / 2, view.height - 18);
    context.restore();
  }
}

const gameModule: GameModule = {
  mount: (context) => new Orbita(context),
};

export default gameModule;

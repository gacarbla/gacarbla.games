import { clamp, randomRange } from './math';
import { alpha } from './theme';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  shape: 'dot' | 'spark';
}

export interface BurstOptions {
  count?: number;
  speed?: number;
  spread?: number;
  angle?: number;
  gravity?: number;
  size?: number;
  life?: number;
  drag?: number;
  shape?: 'dot' | 'spark';
}

const MAX_PARTICLES = 420;

export class Particles {
  private readonly items: Particle[] = [];

  get count(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  burst(x: number, y: number, color: string, options: BurstOptions = {}): void {
    const {
      count = 14,
      speed = 180,
      spread = Math.PI * 2,
      angle = 0,
      gravity = 0,
      size = 3,
      life = 0.6,
      drag = 1.6,
      shape = 'dot',
    } = options;

    for (let index = 0; index < count; index += 1) {
      if (this.items.length >= MAX_PARTICLES) break;
      const direction = angle + randomRange(-spread / 2, spread / 2);
      const velocity = speed * randomRange(0.35, 1);
      const maxLife = life * randomRange(0.65, 1.15);
      this.items.push({
        x,
        y,
        vx: Math.cos(direction) * velocity,
        vy: Math.sin(direction) * velocity,
        life: maxLife,
        maxLife,
        size: size * randomRange(0.6, 1.25),
        color,
        gravity,
        drag,
        shape,
      });
    }
  }

  update(dt: number): void {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const particle = this.items[index]!;
      particle.life -= dt;
      if (particle.life <= 0) {
        this.items.splice(index, 1);
        continue;
      }
      const damping = Math.exp(-particle.drag * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this.items.length === 0) return;
    context.save();
    context.globalCompositeOperation = 'source-over';
    for (const particle of this.items) {
      const progress = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle = alpha(particle.color, progress);
      if (particle.shape === 'spark') {
        const length = Math.hypot(particle.vx, particle.vy) * 0.03;
        const angle = Math.atan2(particle.vy, particle.vx);
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(angle);
        context.fillRect(
          -particle.size * 2,
          -particle.size * 0.35,
          length + particle.size * 2,
          particle.size * 0.7,
        );
        context.restore();
      } else {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * progress, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
  }
}

export class ScreenShake {
  private elapsed = 0;
  private duration = 0;
  private strength = 0;

  add(strength: number, duration = 0.25): void {
    this.strength = Math.max(this.strength, strength);
    this.duration = Math.max(this.duration, duration);
    this.elapsed = 0;
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.strength = 0;
      this.duration = 0;
    }
  }

  get active(): boolean {
    return this.elapsed < this.duration;
  }

  get offset(): { x: number; y: number } {
    if (!this.active) return { x: 0, y: 0 };
    const falloff = 1 - this.elapsed / this.duration;
    return {
      x: (Math.random() * 2 - 1) * this.strength * falloff,
      y: (Math.random() * 2 - 1) * this.strength * falloff,
    };
  }

  apply(context: CanvasRenderingContext2D): void {
    const { x, y } = this.offset;
    if (x !== 0 || y !== 0) context.translate(x, y);
  }
}

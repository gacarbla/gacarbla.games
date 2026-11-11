import type { View } from './types';

export interface RuntimeCallbacks {
  update(dt: number, elapsed: number): void;
  draw(context: CanvasRenderingContext2D, view: View): void;
  onResize?(view: View): void;
}

const MAX_DELTA = 1 / 20;

export class Runtime {
  readonly view: View = { width: 1, height: 1, dpr: 1 };

  private readonly context: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private animationFrame = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: RuntimeCallbacks,
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D no está disponible en este navegador.');

    this.context = context;
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);

    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
  }

  /** Dibuja un único frame con el estado actual, sin arrancar el bucle. */
  renderOnce(): void {
    this.context.save();
    this.callbacks.draw(this.context, this.view);
    this.context.restore();
  }

  destroy(): void {
    this.pause();
    this.observer.disconnect();
    window.removeEventListener('orientationchange', this.resize);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.view.width = width;
    this.view.height = height;
    this.view.dpr = dpr;

    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }

    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;
    this.callbacks.onResize?.(this.view);
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, MAX_DELTA);
    this.lastTime = now;
    const elapsed = now / 1000;

    this.callbacks.update(dt, elapsed);
    if (!this.running) return;

    this.context.save();
    this.callbacks.draw(this.context, this.view);
    this.context.restore();

    this.animationFrame = requestAnimationFrame(this.tick);
  };
}

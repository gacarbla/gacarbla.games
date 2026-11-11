import type { AudioKit } from './audio';
import { Input } from './input';
import { Runtime, type RuntimeCallbacks } from './runtime';
import type { FinishResult, GameContext, GameHud, GameInstance, GameState, View } from './types';

/**
 * Base común de todos los juegos: bucle, input, audio, HUD y ciclo de vida.
 * Cada juego solo implementa reset(), update() y draw().
 */
export abstract class BaseGame implements GameInstance {
  protected readonly runtime: Runtime;
  protected readonly input: Input;
  protected readonly hud: GameHud;
  protected readonly audio: AudioKit;
  protected readonly slug: string;
  protected readonly reducedMotion: boolean;
  protected best: number;

  private currentState: GameState = 'idle';

  constructor(context: GameContext) {
    this.slug = context.slug;
    this.hud = context.hud;
    this.audio = context.audio;
    this.best = context.best;
    this.reducedMotion = context.reducedMotion;

    const callbacks: RuntimeCallbacks = {
      update: (dt, elapsed) => this.update(dt, elapsed),
      draw: (canvasContext, view) => this.draw(canvasContext, view),
    };

    this.runtime = new Runtime(context.canvas, callbacks);
    this.input = new Input(context.canvas);
    this.input.enabled = false;

    // Vista previa estática detrás de la pantalla de inicio. Se ejecuta tras el
    // constructor para que las propiedades de la subclase ya estén inicializadas.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.currentState !== 'idle') return;
        this.reset();
        this.runtime.resize();
        this.runtime.renderOnce();
      });
    });
  }

  get state(): GameState {
    return this.currentState;
  }

  start(): void {
    if (this.currentState === 'running') return;
    if (this.currentState === 'finished') {
      this.restart();
      return;
    }
    if (this.currentState === 'idle') this.reset();

    this.currentState = 'running';
    this.input.enabled = true;
    this.runtime.start();
  }

  pause(): void {
    if (this.currentState !== 'running') return;
    this.currentState = 'paused';
    this.input.enabled = false;
    this.input.reset();
    this.runtime.pause();
  }

  resume(): void {
    if (this.currentState !== 'paused') return;
    this.currentState = 'running';
    this.input.enabled = true;
    this.runtime.start();
  }

  restart(): void {
    this.runtime.pause();
    this.input.reset();
    this.input.enabled = true;
    this.reset();
    this.currentState = 'running';
    this.runtime.start();
  }

  destroy(): void {
    this.runtime.destroy();
    this.input.destroy();
    this.currentState = 'idle';
  }

  protected finish(result: FinishResult): void {
    if (this.currentState === 'finished') return;
    this.currentState = 'finished';
    this.input.enabled = false;
    this.input.reset();
    this.runtime.pause();
    this.hud.finish(result);
  }

  protected setScore(label: string, value: string | number): void {
    this.hud.setScore(label, value);
  }

  protected setStatus(message: string): void {
    this.hud.setStatus(message);
  }

  protected toast(message: string, duration?: number): void {
    this.hud.toast(message, duration);
  }

  protected abstract reset(): void;
  protected abstract update(dt: number, elapsed: number): void;
  protected abstract draw(context: CanvasRenderingContext2D, view: View): void;
}

import type { AudioKit } from './audio';

export type GameCategory = 'accion' | 'puzzle' | 'reflejos';

export type GameState = 'idle' | 'running' | 'paused' | 'finished';

export interface View {
  width: number;
  height: number;
  dpr: number;
}

export interface FinishResult {
  /** Titular del resultado: "Récord", "Nivel completado"... */
  title: string;
  /** Explicación breve bajo el titular. */
  message?: string;
  /** Dato secundario, por ejemplo "12 movimientos". */
  detail?: string;
  /** Puntuación que se compara con el récord local. */
  score: number;
  /** Etiqueta de la puntuación, por defecto "PUNTOS". */
  scoreLabel?: string;
  /** Texto del botón principal. */
  ctaLabel?: string;
  /** Tono visual del resultado. */
  tone?: 'win' | 'lose';
}

export interface GameHud {
  /** Actualiza el marcador flotante del juego. */
  setScore(label: string, value: string | number): void;
  /** Anuncia un mensaje breve para lectores de pantalla. */
  setStatus(message: string): void;
  /** Muestra la capa de fin de partida. */
  finish(result: FinishResult): void;
  /** Aviso efímero dentro del escenario. */
  toast(message: string, duration?: number): void;
}

export interface GameContext {
  slug: string;
  canvas: HTMLCanvasElement;
  hud: GameHud;
  audio: AudioKit;
  best: number;
  reducedMotion: boolean;
}

export interface GameInstance {
  readonly state: GameState;
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
}

export interface GameModule {
  mount(context: GameContext): GameInstance;
}

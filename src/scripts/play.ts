import { AudioKit, getBest, saveBest, trackPlay } from '../games/engine';
import type {
  FinishResult,
  GameContext,
  GameHud,
  GameInstance,
  GameModule,
} from '../games/engine/types';

const root = document.querySelector<HTMLElement>('[data-game-root]');

if (root) {
  init(root);
}

function init(element: HTMLElement): void {
  const slug = element.dataset.game ?? '';
  const scoreLabelDefault = element.dataset.scoreLabel ?? 'PUNTOS';
  const bestSuffix = element.dataset.bestSuffix ?? 'pts';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const numberFormat = new Intl.NumberFormat('es-ES');

  const canvas = query<HTMLCanvasElement>(element, '[data-game-canvas]');
  const stage = query<HTMLElement>(element, '[data-stage]');
  const overlayStart = query<HTMLElement>(element, '[data-overlay="start"]');
  const overlayPause = query<HTMLElement>(element, '[data-overlay="pause"]');
  const overlayFinish = query<HTMLElement>(element, '[data-overlay="finish"]');
  const overlays: Record<string, HTMLElement> = {
    start: overlayStart,
    pause: overlayPause,
    finish: overlayFinish,
  };

  const playButton = query<HTMLButtonElement>(element, '[data-play]');
  const sidePlayButton = query<HTMLButtonElement>(element, '[data-side-play]');
  const pauseButton = query<HTMLButtonElement>(element, '[data-pause]');
  const resumeButton = query<HTMLButtonElement>(element, '[data-resume]');
  const restartButton = query<HTMLButtonElement>(element, '[data-restart]');
  const replayButton = query<HTMLButtonElement>(element, '[data-replay]');
  const audioButton = query<HTMLButtonElement>(element, '[data-audio]');
  const fullscreenButton = query<HTMLButtonElement>(element, '[data-fullscreen]');
  const scoreLabelElement = query<HTMLElement>(element, '[data-score-label]');
  const scoreValueElement = query<HTMLElement>(element, '[data-score-value]');
  const liveRegion = query<HTMLElement>(element, '[data-live]');
  const toastElement = query<HTMLElement>(element, '[data-toast]');
  const finishEyebrow = query<HTMLElement>(element, '[data-finish-eyebrow]');
  const finishTitle = query<HTMLElement>(element, '[data-finish-title]');
  const finishMessage = query<HTMLElement>(element, '[data-finish-message]');
  const finishDetail = query<HTMLElement>(element, '[data-finish-detail]');
  const finishScore = query<HTMLElement>(element, '[data-finish-score]');
  const finishScoreLabel = query<HTMLElement>(element, '[data-finish-score-label]');
  const finishRecord = query<HTMLElement>(element, '[data-finish-record]');

  const audio = new AudioKit();
  let game: GameInstance | null = null;
  let best = getBest(slug);
  let startedOnce = false;
  let toastTimer = 0;
  let scoreTimer = 0;

  const format = (value: number | string): string =>
    typeof value === 'number' ? numberFormat.format(value) : value;

  function refreshBest(): void {
    best = getBest(slug);
    element.querySelectorAll<HTMLElement>('[data-best-value]').forEach((node) => {
      node.textContent = best > 0 ? format(best) : '—';
    });
    element.querySelectorAll<HTMLElement>('[data-best-inline]').forEach((node) => {
      node.textContent = best > 0 ? `${format(best)} ${bestSuffix}` : 'Sin marca todavía';
    });
  }

  function showOverlay(name: 'start' | 'pause' | 'finish' | null): void {
    for (const [key, overlay] of Object.entries(overlays)) {
      overlay.hidden = key !== name;
    }
    element.classList.toggle('is-playing', name === null);
  }

  function announce(message: string): void {
    liveRegion.textContent = '';
    window.setTimeout(() => {
      liveRegion.textContent = message;
    }, 30);
  }

  function toast(message: string, duration = 1800): void {
    window.clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      toastElement.classList.remove('is-visible');
    }, duration);
  }

  const hud: GameHud = {
    setScore(label, value) {
      scoreLabelElement.textContent = label;
      scoreValueElement.textContent = format(value);
      window.clearTimeout(scoreTimer);
      scoreValueElement.classList.add('is-bumped');
      scoreTimer = window.setTimeout(() => scoreValueElement.classList.remove('is-bumped'), 180);
    },
    setStatus(message) {
      announce(message);
    },
    finish(result: FinishResult) {
      const isRecord = saveBest(slug, result.score);
      refreshBest();

      finishEyebrow.textContent = isRecord
        ? 'Nuevo récord'
        : result.tone === 'win'
          ? 'Completado'
          : 'Partida terminada';
      finishTitle.textContent = result.title;
      finishMessage.textContent = result.message ?? '';
      finishDetail.textContent = result.detail ?? '';
      finishScore.textContent = format(result.score);
      finishScoreLabel.textContent = result.scoreLabel ?? scoreLabelDefault;
      finishRecord.hidden = !isRecord;
      replayButton.textContent = result.ctaLabel ?? 'Jugar otra vez';

      showOverlay('finish');
      announce(
        `${result.title}. ${format(result.score)} ${result.scoreLabel ?? scoreLabelDefault}.`,
      );
      replayButton.focus({ preventScroll: true });
    },
    toast,
  };

  const gameModules = import.meta.glob<{ default: GameModule }>('../games/*/game.ts');
  const loader = gameModules[`../games/${slug}/game.ts`];

  if (!loader) {
    console.error(`[play] No existe el módulo del juego "${slug}".`);
    playButton.disabled = true;
    playButton.textContent = 'Juego no disponible';
    return;
  }

  playButton.disabled = true;
  playButton.setAttribute('aria-busy', 'true');

  void loader()
    .then((module) => {
      const factory = module.default;
      if (!factory || typeof factory.mount !== 'function') {
        throw new Error(`El módulo "${slug}" no exporta mount().`);
      }

      const context: GameContext = {
        slug,
        canvas,
        hud,
        audio,
        best,
        reducedMotion,
      };

      game = factory.mount(context);
      playButton.disabled = false;
      playButton.removeAttribute('aria-busy');
      refreshBest();
    })
    .catch((error: unknown) => {
      console.error('[play] No se pudo cargar el juego.', error);
      playButton.disabled = true;
      playButton.textContent = 'Juego no disponible';
      toast('No se pudo cargar el juego. Recarga la página.');
    });

  async function startGame(): Promise<void> {
    if (!game) {
      toast('Cargando el juego…');
      return;
    }

    await audio.unlock();
    if (!startedOnce) {
      trackPlay(slug);
      startedOnce = true;
    }

    if (game.state === 'finished' || game.state === 'idle') {
      game.start();
    } else if (game.state === 'paused') {
      game.resume();
    }

    showOverlay(null);
    pauseButton.disabled = false;
    pauseButton.setAttribute('aria-label', 'Pausar partida');
    canvas.focus({ preventScroll: true });
    announce('Partida iniciada.');
  }

  function pauseGame(): void {
    if (!game || game.state !== 'running') return;
    game.pause();
    showOverlay('pause');
    pauseButton.setAttribute('aria-label', 'Continuar partida');
    announce('Partida en pausa.');
    resumeButton.focus({ preventScroll: true });
  }

  async function resumeGame(): Promise<void> {
    if (!game || game.state !== 'paused') return;
    await audio.unlock();
    game.resume();
    showOverlay(null);
    pauseButton.setAttribute('aria-label', 'Pausar partida');
    canvas.focus({ preventScroll: true });
    announce('Partida reanudada.');
  }

  async function restartGame(): Promise<void> {
    if (!game) return;
    await audio.unlock();
    game.restart();
    showOverlay(null);
    pauseButton.disabled = false;
    pauseButton.setAttribute('aria-label', 'Pausar partida');
    canvas.focus({ preventScroll: true });
    announce('Partida reiniciada.');
  }

  function syncAudioButton(): void {
    audioButton.classList.toggle('is-muted', audio.muted);
    audioButton.setAttribute('aria-pressed', String(audio.muted));
    audioButton.setAttribute('aria-label', audio.muted ? 'Activar sonido' : 'Silenciar sonido');
  }

  function syncFullscreenButton(): void {
    const active = document.fullscreenElement === stage;
    element.classList.toggle('is-fullscreen', active);
    fullscreenButton.setAttribute('aria-pressed', String(active));
    fullscreenButton.setAttribute(
      'aria-label',
      active ? 'Salir de pantalla completa' : 'Pantalla completa',
    );
  }

  playButton.addEventListener('click', () => void startGame());
  sidePlayButton.addEventListener('click', () => void startGame());
  resumeButton.addEventListener('click', () => void resumeGame());
  restartButton.addEventListener('click', () => void restartGame());
  replayButton.addEventListener('click', () => void startGame());

  pauseButton.addEventListener('click', () => {
    if (game?.state === 'paused') void resumeGame();
    else pauseGame();
  });

  audioButton.addEventListener('click', () => {
    audio.toggleMuted();
    if (!audio.muted) void audio.unlock();
    syncAudioButton();
  });

  fullscreenButton.addEventListener('click', () => {
    const fullscreen = document.fullscreenElement === stage;
    if (fullscreen) {
      void document.exitFullscreen();
      return;
    }
    if (typeof stage.requestFullscreen !== 'function') {
      toast('Tu navegador no permite pantalla completa.');
      return;
    }
    void stage.requestFullscreen().catch(() => {
      toast('No se pudo activar la pantalla completa.');
    });
  });

  document.addEventListener('fullscreenchange', syncFullscreenButton);

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape' && event.code !== 'KeyP') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'Escape' && document.fullscreenElement) return;
    if (game?.state === 'running') {
      event.preventDefault();
      pauseGame();
    } else if (game?.state === 'paused') {
      event.preventDefault();
      void resumeGame();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game?.state === 'running') pauseGame();
  });

  syncAudioButton();
  syncFullscreenButton();
  refreshBest();
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`[play] Falta el elemento ${selector}.`);
  return element;
}

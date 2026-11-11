export interface Point {
  x: number;
  y: number;
}

export interface PointerState extends Point {
  down: boolean;
}

type ActionHandler = () => void;
type PointerHandler = (point: Point, event: PointerEvent) => void;
type KeyHandler = (code: string, event: KeyboardEvent) => void;

const ACTION_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const BLOCKED_KEYS = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
]);

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'button' ||
    tag === 'a' ||
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    target.isContentEditable
  );
}

export class Input {
  enabled = false;
  readonly pointer: PointerState = { x: 0, y: 0, down: false };

  private readonly keys = new Set<string>();
  private readonly actionHandlers = new Set<ActionHandler>();
  private readonly pointerDownHandlers = new Set<PointerHandler>();
  private readonly pointerMoveHandlers = new Set<PointerHandler>();
  private readonly keyDownHandlers = new Set<KeyHandler>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.reset);
    canvas.style.touchAction = 'none';
  }

  get actionDown(): boolean {
    for (const code of this.keys) {
      if (ACTION_KEYS.has(code)) return true;
    }
    return false;
  }

  onAction(handler: ActionHandler): () => void {
    this.actionHandlers.add(handler);
    return () => this.actionHandlers.delete(handler);
  }

  onPointerDown(handler: PointerHandler): () => void {
    this.pointerDownHandlers.add(handler);
    return () => this.pointerDownHandlers.delete(handler);
  }

  onPointerMove(handler: PointerHandler): () => void {
    this.pointerMoveHandlers.add(handler);
    return () => this.pointerMoveHandlers.delete(handler);
  }

  onKeyDown(handler: KeyHandler): () => void {
    this.keyDownHandlers.add(handler);
    return () => this.keyDownHandlers.delete(handler);
  }

  reset = (): void => {
    this.keys.clear();
    this.pointer.down = false;
  };

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.reset);
    this.actionHandlers.clear();
    this.pointerDownHandlers.clear();
    this.pointerMoveHandlers.clear();
    this.keyDownHandlers.clear();
  }

  private updatePointer(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    return { x: this.pointer.x, y: this.pointer.y };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    const point = this.updatePointer(event);
    this.pointer.down = true;
    for (const handler of this.pointerDownHandlers) handler(point, event);
    for (const handler of this.actionHandlers) handler();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    const point = this.updatePointer(event);
    for (const handler of this.pointerMoveHandlers) handler(point, event);
  };

  private handlePointerUp = (): void => {
    this.pointer.down = false;
  };

  private handlePointerLeave = (): void => {
    this.pointer.down = false;
  };

  private handleContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isInteractiveTarget(event.target)) return;

    if (BLOCKED_KEYS.has(event.code)) event.preventDefault();
    this.keys.add(event.code);

    for (const handler of this.keyDownHandlers) handler(event.code, event);

    if (!event.repeat && ACTION_KEYS.has(event.code)) {
      for (const handler of this.actionHandlers) handler();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };
}

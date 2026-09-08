export const minimumDeckViewport = {
  width: 1280,
  height: 650,
} as const;

interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

interface ViewportGuardOptions {
  readonly root: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly warning: HTMLElement;
  readonly current: HTMLElement;
  readonly window?: Window;
  readonly onBlockedChange?: (blocked: boolean) => void;
}

export interface ViewportGuard {
  readonly blocked: boolean;
  update(): void;
  destroy(): void;
}

export function isDeckViewportSupported(viewport: ViewportSize): boolean {
  return (
    viewport.width >= minimumDeckViewport.width &&
    viewport.height >= minimumDeckViewport.height
  );
}

export function installViewportGuard({
  root,
  toolbar,
  warning,
  current,
  window = globalThis.window,
  onBlockedChange,
}: ViewportGuardOptions): ViewportGuard {
  let blocked = false;
  let previousFocus: HTMLElement | null = null;
  const document = window.document;

  const update = () => {
    const nextBlocked = !isDeckViewportSupported({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    current.textContent = `${window.innerWidth} × ${window.innerHeight}`;
    if (nextBlocked === blocked && warning.hidden === !blocked) return;

    blocked = nextBlocked;
    warning.hidden = !blocked;
    root.inert = blocked;
    toolbar.inert = blocked;
    document.documentElement.toggleAttribute("data-viewport-blocked", blocked);
    if (blocked) {
      previousFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      warning.focus({ preventScroll: true });
    } else if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
    onBlockedChange?.(blocked);
  };

  window.addEventListener("resize", update);
  update();
  return {
    get blocked() {
      return blocked;
    },
    update,
    destroy() {
      window.removeEventListener("resize", update);
    },
  };
}

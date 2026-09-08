export type GalleryEntryDirection = "forward" | "backward";

export interface GalleryState {
  readonly current: number;
  readonly length: number;
  enter(direction: GalleryEntryDirection): void;
  next(): boolean;
  previous(): boolean;
}

export interface GalleryController extends GalleryState {
  render(): void;
}

interface WheelDelta {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;
}

interface WheelPreservation {
  readonly ctrlKey: boolean;
  readonly nativeScroll: boolean;
}

interface DeckNavigation {
  getCurrentSlide(): HTMLElement | undefined;
  next(): void;
  prev(): void;
  on(
    event: "slidechanged",
    listener: (event: {
      readonly currentSlide?: HTMLElement;
      readonly previousSlide?: HTMLElement;
    }) => void,
  ): void;
}

interface PresentationNavigationOptions {
  readonly deck: DeckNavigation;
  readonly gallery: GalleryController;
  readonly isBlocked: () => boolean;
  readonly document?: Document;
  readonly now?: () => number;
}

const wheelStepInterval = 650;
const minimumWheelDelta = 24;
const nativeWheelSelector = [
  ".code-pane",
  ".pipeline-output",
  ".pipeline-render",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
].join(",");

export function createGalleryState(length: number): GalleryState {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError("Gallery length must be a positive integer.");
  }
  let current = 0;
  return {
    get current() {
      return current;
    },
    length,
    enter(direction) {
      current = direction === "forward" ? 0 : length - 1;
    },
    next() {
      if (current >= length - 1) return false;
      current += 1;
      return true;
    },
    previous() {
      if (current <= 0) return false;
      current -= 1;
      return true;
    },
  };
}

export function normalizeWheelDelta(event: WheelDelta): number {
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return 0;
  const multiplier =
    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 900 : 1;
  return event.deltaY * multiplier;
}

export function shouldPreserveWheel(input: WheelPreservation): boolean {
  return input.ctrlKey || input.nativeScroll;
}

function isNativeWheelTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(nativeWheelSelector) !== null &&
    target.closest(".mcp-gallery") === null
  );
}

function slideIndex(document: Document, slide?: HTMLElement): number {
  if (slide === undefined) return -1;
  return Array.from(
    document.querySelectorAll<HTMLElement>(".slides > section"),
  ).indexOf(slide);
}

export function installPresentationNavigation({
  deck,
  gallery,
  isBlocked,
  document = window.document,
  now = Date.now,
}: PresentationNavigationOptions): () => void {
  let lastStep = Number.NEGATIVE_INFINITY;
  const onWheel = (event: WheelEvent) => {
    if (
      isBlocked() ||
      shouldPreserveWheel({
        ctrlKey: event.ctrlKey,
        nativeScroll: isNativeWheelTarget(event.target),
      })
    ) {
      return;
    }
    const delta = normalizeWheelDelta(event);
    if (
      Math.abs(delta) < minimumWheelDelta ||
      now() - lastStep < wheelStepInterval
    )
      return;

    lastStep = now();
    event.preventDefault();
    const currentSlide = deck.getCurrentSlide();
    if (currentSlide?.id === "mcp") {
      const changed = delta > 0 ? gallery.next() : gallery.previous();
      if (changed) {
        gallery.render();
        return;
      }
    }
    if (delta > 0) deck.next();
    else deck.prev();
  };

  deck.on("slidechanged", ({ currentSlide, previousSlide }) => {
    if (currentSlide?.id !== "mcp") return;
    gallery.enter(
      slideIndex(document, previousSlide) < slideIndex(document, currentSlide)
        ? "forward"
        : "backward",
    );
    gallery.render();
  });
  document.addEventListener("wheel", onWheel, { passive: false });
  return () => document.removeEventListener("wheel", onWheel);
}

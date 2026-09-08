import { describe, expect, it } from "vitest";

import {
  createGalleryState,
  normalizeWheelDelta,
  shouldPreserveWheel,
} from "./presentation-navigation.js";

describe("presentation navigation", () => {
  it("moves through a finite gallery without wrapping", () => {
    const gallery = createGalleryState(3);

    expect(gallery.current).toBe(0);
    expect(gallery.previous()).toBe(false);
    expect(gallery.next()).toBe(true);
    expect(gallery.current).toBe(1);
    expect(gallery.next()).toBe(true);
    expect(gallery.current).toBe(2);
    expect(gallery.next()).toBe(false);
    expect(gallery.previous()).toBe(true);
    expect(gallery.current).toBe(1);
    gallery.enter("forward");
    expect(gallery.current).toBe(0);
    gallery.enter("backward");
    expect(gallery.current).toBe(2);
  });

  it("normalizes wheel units and ignores horizontal gestures", () => {
    expect(normalizeWheelDelta({ deltaX: 0, deltaY: 80, deltaMode: 0 })).toBe(
      80,
    );
    expect(normalizeWheelDelta({ deltaX: 0, deltaY: -3, deltaMode: 1 })).toBe(
      -48,
    );
    expect(normalizeWheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 })).toBe(
      900,
    );
    expect(normalizeWheelDelta({ deltaX: 90, deltaY: 20, deltaMode: 0 })).toBe(
      0,
    );
  });

  it("preserves zoom gestures and native interactive scrolling", () => {
    expect(shouldPreserveWheel({ ctrlKey: true, nativeScroll: false })).toBe(
      true,
    );
    expect(shouldPreserveWheel({ ctrlKey: false, nativeScroll: true })).toBe(
      true,
    );
    expect(shouldPreserveWheel({ ctrlKey: false, nativeScroll: false })).toBe(
      false,
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  normalizeWheelDelta,
  shouldPreserveWheel,
} from "./presentation-navigation.js";

describe("presentation navigation", () => {
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

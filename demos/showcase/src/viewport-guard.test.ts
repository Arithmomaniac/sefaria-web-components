import { describe, expect, it } from "vitest";

import {
  isDeckViewportSupported,
  minimumDeckViewport,
} from "./viewport-guard.js";

describe("viewport guard", () => {
  it("requires both minimum dimensions", () => {
    expect(isDeckViewportSupported(minimumDeckViewport)).toBe(true);
    expect(
      isDeckViewportSupported({
        width: minimumDeckViewport.width - 1,
        height: minimumDeckViewport.height,
      }),
    ).toBe(false);
    expect(
      isDeckViewportSupported({
        width: minimumDeckViewport.width,
        height: minimumDeckViewport.height - 1,
      }),
    ).toBe(false);
  });
});

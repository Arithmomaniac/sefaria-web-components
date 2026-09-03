import { expect, test, vi } from "vitest";

vi.mock("@sefaria/client", () => {
  throw new Error("The browser root must not load @sefaria/client.");
});
vi.mock("@sefaria/text-transform", () => {
  throw new Error("The browser root must not load @sefaria/text-transform.");
});

test("imports the browser root without factory runtime dependencies", async () => {
  vi.resetModules();

  await expect(import("./index.js")).resolves.toMatchObject({
    SefariaTextSegment: expect.any(Function),
  });
});

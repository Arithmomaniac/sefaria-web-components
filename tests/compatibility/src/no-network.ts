import { afterAll, beforeAll, vi } from "vitest";

beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request) =>
      Promise.reject(
        new Error(
          `Network access is disabled in compatibility tests: ${input}`,
        ),
      ),
    ),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

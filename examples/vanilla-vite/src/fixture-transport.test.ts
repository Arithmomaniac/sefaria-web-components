import { describe, expect, it } from "vitest";

import { createMicahFixtureFetch } from "./fixture-transport.js";

describe("vanilla deterministic transport", () => {
  it("accepts only the expected Micah 6:8 request shape", async () => {
    const fetch = createMicahFixtureFetch({ ref: "Micah 6:8" });
    const response = await fetch(
      "https://example.invalid/api/v3/texts/Micah%206%3A8?version=primary&version=translation&return_format=default",
    );

    await expect(response.json()).resolves.toEqual({ ref: "Micah 6:8" });
  });

  it("rejects an unexpected request instead of returning a success default", async () => {
    const fetch = createMicahFixtureFetch({ ref: "Micah 6:8" });

    await expect(
      fetch(
        "https://example.invalid/api/v3/texts/Micah%206%3A8?version=primary&return_format=default",
      ),
    ).rejects.toThrow("Unexpected deterministic request");
  });
});

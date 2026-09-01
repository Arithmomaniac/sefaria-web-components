import { expect, it } from "vitest";

import "./no-network.js";

it("rejects network access for the compatibility suite", async () => {
  await expect(
    fetch("https://www.sefaria.org/api/v3/texts/Genesis%201:1"),
  ).rejects.toThrow("Network access is disabled in compatibility tests");
});

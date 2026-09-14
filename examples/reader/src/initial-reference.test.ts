import { describe, expect, it } from "vitest";

import { initialReaderReference } from "./initial-reference.js";

describe("Reader initial deep link", () => {
  it("reads and trims a supplied reference", () => {
    expect(initialReaderReference("?tref=Rashi%20on%20Micah%206%3A8")).toBe(
      "Rashi on Micah 6:8",
    );
  });

  it("uses Micah 6:8 when the parameter is absent or empty", () => {
    expect(initialReaderReference("")).toBe("Micah 6:8");
    expect(initialReaderReference("?tref=%20%20")).toBe("Micah 6:8");
  });
});

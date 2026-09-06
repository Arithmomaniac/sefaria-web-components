import { expect, test } from "vitest";
import { createTextPreview } from "./preview.js";

test("counts decoded graphemes across inline nodes and closes markup", () => {
  expect(createTextPreview("<b>A</b><i>\u0301B&amp;C</i>", 2)).toEqual({
    html: "<b>A</b><i>\u0301B</i>",
    text: "A\u0301B",
    truncated: true,
  });
});

test("removes active content and notes without losing other text", () => {
  const preview = createTextPreview(
    '<script>bad()</script><b onclick="bad()">Good</b><sup class="footnote-marker">1</sup><i class="footnote">Note</i>',
    20,
  );
  expect(preview.text).toBe("Good");
  expect(preview.html).toBe("<b>Good</b>");
  expect(preview.truncated).toBe(false);
});

test("handles exact bounds, breaks, entities and surrogate pairs", () => {
  expect(createTextPreview("😀<br>A&amp;", 3)).toMatchObject({
    text: "😀\nA",
    truncated: true,
  });
  expect(createTextPreview("😀A", 2).truncated).toBe(false);
  expect(createTextPreview("", 2)).toEqual({
    html: "",
    text: "",
    truncated: false,
  });
});

test("rejects invalid bounds and handles deep markup", () => {
  for (const value of [0, -1, 1.5, Infinity])
    expect(() => createTextPreview("X", value)).toThrow(RangeError);
  const input = "<b>".repeat(1500) + "AB" + "</b>".repeat(1500);
  const result = createTextPreview(input, 1);
  expect(result.text).toBe("A");
  expect(result.truncated).toBe(true);
  expect(result.html.match(/<b>/g)?.length).toBe(
    result.html.match(/<\/b>/g)?.length,
  );
});

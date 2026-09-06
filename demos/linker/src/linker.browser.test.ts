import { afterEach, describe, expect, it } from "vitest";

import { removeOwnedLinks, wrapDetectedReferences } from "./dom.js";
import {
  codePointOffsetToUtf16,
  extractArticleSnapshot,
  LINKER_MAX_UTF16_CODE_UNITS,
} from "./extract.js";

describe("linker extraction and DOM projection", () => {
  afterEach(() => {
    document.querySelector("#linker-test-fixture")?.remove();
  });

  it("preserves Unicode code-point offsets before a citation", () => {
    expect(codePointOffsetToUtf16("😀 Genesis 1:1", 2)).toBe(3);
  });

  it("wraps one logical citation split across inline elements", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.innerHTML = `<p>Read <em>Genesis</em> 1:1 today.</p>`;
    document.body.append(fixture);
    const snapshot = extractArticleSnapshot(document, {
      contentSelector: "#linker-test-fixture",
    });
    const start = [...snapshot.body].join("").indexOf("Genesis 1:1");
    const result = wrapDetectedReferences(
      snapshot,
      [
        {
          startChar: start,
          endChar: start + "Genesis 1:1".length,
          text: "Genesis 1:1",
          linkFailed: false,
          refs: ["Genesis 1:1"],
        },
      ],
      {
        "Genesis 1:1": {
          url: "Genesis.1.1",
        },
      },
    );

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.elements).toHaveLength(2);
    expect(document.querySelector("em")?.textContent).toBe("Genesis");
    expect(
      document.querySelectorAll("a[data-sefaria-linker-owned]"),
    ).toHaveLength(2);
    const firstLink = document.querySelector<HTMLAnchorElement>(
      "a[data-sefaria-linker-owned]",
    );
    expect(firstLink?.style.color).toContain("--sefaria-link");
    expect(firstLink?.style.color).toContain("light-dark");
    expect(firstLink?.style.fontWeight).toBe("600");

    removeOwnedLinks();
    expect(
      document.querySelectorAll("a[data-sefaria-linker-owned]"),
    ).toHaveLength(0);
    expect(document.querySelector("article")?.textContent).toContain(
      "Genesis 1:1",
    );
  });

  it("leaves existing links and excluded content out of the snapshot", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.innerHTML = `
        <p>Genesis 1:1</p>
        <p><a href="/existing">Shabbat 2a</a></p>
        <table><tbody><tr><td>Exodus 3:1</td></tr></tbody></table>
    `;
    document.body.append(fixture);

    const snapshot = extractArticleSnapshot(document, {
      contentSelector: "#linker-test-fixture",
    });

    expect(snapshot.body).toContain("Genesis 1:1");
    expect(snapshot.body).not.toContain("Shabbat 2a");
    expect(snapshot.body).not.toContain("Exodus 3:1");
  });

  it("preserves whitespace between adjacent inline elements", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.innerHTML = `<p><span>Genesis</span> <span>1:1</span></p>`;
    document.body.append(fixture);

    const snapshot = extractArticleSnapshot(document, {
      contentSelector: "#linker-test-fixture",
    });

    expect(snapshot.body).toContain("Genesis 1:1");
  });

  it("uses Readability to select article content", () => {
    const fixture = document.createElement("div");
    fixture.id = "linker-test-fixture";
    fixture.innerHTML = `
      <article>
        <h1>Reading across traditions</h1>
        <p>${"Genesis 1:1 appears in the article. ".repeat(12)}</p>
      </article>
      <aside>Shabbat 2a appears only in unrelated sidebar content.</aside>
    `;
    document.body.append(fixture);

    const snapshot = extractArticleSnapshot(document);

    expect(snapshot.body).toContain("Genesis 1:1");
    expect(snapshot.body).not.toContain("Shabbat 2a");
  });

  it("skips unsafe and out-of-range service matches", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.textContent = "Genesis 1:1";
    document.body.append(fixture);
    const snapshot = extractArticleSnapshot(document, {
      contentSelector: "#linker-test-fixture",
    });

    const result = wrapDetectedReferences(
      snapshot,
      [
        {
          startChar: 0,
          endChar: 11,
          text: "Genesis 1:1",
          linkFailed: false,
          refs: ["Genesis 1:1"],
        },
        {
          startChar: 99,
          endChar: 100,
          text: "x",
          linkFailed: false,
          refs: ["Genesis 1:1"],
        },
      ],
      { "Genesis 1:1": { url: "javascript:alert(1)" } },
    );

    expect(result.citations).toHaveLength(0);
    expect(result.skipped).toBe(2);
    expect(document.querySelector("a")).toBeNull();
  });

  it.each([" //evil.example", "\t//evil.example", "\\\\evil.example"])(
    "rejects a citation URL that resolves off the Sefaria origin: %s",
    (url) => {
      const fixture = document.createElement("article");
      fixture.id = "linker-test-fixture";
      fixture.textContent = "Genesis 1:1";
      document.body.append(fixture);
      const snapshot = extractArticleSnapshot(document, {
        contentSelector: "#linker-test-fixture",
      });

      const result = wrapDetectedReferences(
        snapshot,
        [
          {
            startChar: 0,
            endChar: 11,
            text: "Genesis 1:1",
            linkFailed: false,
            refs: ["Genesis 1:1"],
          },
        ],
        { "Genesis 1:1": { url } },
      );

      expect(result.citations).toHaveLength(0);
      expect(result.skipped).toBe(1);
      expect(document.querySelector("a")).toBeNull();
    },
  );

  it("skips prototype-key references without aborting the scan", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.textContent = "constructor";
    document.body.append(fixture);
    const snapshot = extractArticleSnapshot(document, {
      contentSelector: "#linker-test-fixture",
    });

    const result = wrapDetectedReferences(
      snapshot,
      [
        {
          startChar: 0,
          endChar: 11,
          text: "constructor",
          linkFailed: false,
          refs: ["constructor"],
        },
      ],
      {},
    );

    expect(result.citations).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("rejects stale snapshots after host text mutation", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.textContent = "Genesis 1:1";
    document.body.append(fixture);
    const snapshot = extractArticleSnapshot(document, {
      contentSelector: "#linker-test-fixture",
    });
    fixture.firstChild?.replaceWith("Exodus 1:1");

    const result = wrapDetectedReferences(
      snapshot,
      [
        {
          startChar: 0,
          endChar: 11,
          text: "Genesis 1:1",
          linkFailed: false,
          refs: ["Genesis 1:1"],
        },
      ],
      { "Genesis 1:1": { url: "Genesis.1.1" } },
    );

    expect(result.citations).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("rejects article text above the explicit scan bound", () => {
    const fixture = document.createElement("article");
    fixture.id = "linker-test-fixture";
    fixture.textContent = "x".repeat(LINKER_MAX_UTF16_CODE_UNITS + 1);
    document.body.append(fixture);

    expect(() =>
      extractArticleSnapshot(document, {
        contentSelector: "#linker-test-fixture",
      }),
    ).toThrow("UTF-16 code-unit scan limit");
  });
});

import { describe, expect, it } from "vitest";

import { sanitize } from "../src/index.js";
import fixtureManifest from "./fixtures/manifest.json" with { type: "json" };

function fixture(name: string): string {
  const entry = fixtureManifest.fixtures.find(
    (candidate) => candidate.name === name,
  );
  if (!entry) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return entry.input;
}

describe("sanitize", () => {
  it("preserves every ordinary inline text tag without attributes", () => {
    const input =
      "<b>b</b><strong>s</strong><i>i</i><em>e</em><u>u</u><big>g</big><small>m</small><sup>p</sup><sub>q</sub><br>";

    expect(sanitize(input)).toBe(input);
  });

  it("preserves reviewed commentary and structural iTags inertly", () => {
    expect(sanitize(fixture("shulchan-commentary-itag"))).toBe(
      'דין <i data-commentator="Magen Avraham" data-label="ג" data-order="3"></i> השכמת',
    );
    expect(sanitize(fixture("jerusalem-overlay"))).toBe(
      'א<i data-overlay="Venice Pages" data-value="2a"></i>ב',
    );
  });

  it("removes inline annotations when disabled", () => {
    expect(
      sanitize(
        `${fixture("shulchan-commentary-itag")}<sup class="itag">3</sup><sup class="endFootnote">*</sup>${fixture("jerusalem-overlay")}`,
        { allowInlineAnnotations: false },
      ),
    ).toBe("דין  השכמתאב");
  });

  it("preserves reviewed MAM classes, nesting, and line breaks", () => {
    expect(sanitize(fixture("mam-structure"))).toBe(
      '<span class="mam-spi-pe">פ</span><br><span class="mam-kq"><span class="mam-kq-k">כתיב</span><span class="mam-kq-q">קרי</span></span><span class="mam-kq-trivial">שְׁעָרָ֗ו</span>',
    );
  });

  it("preserves only approved direction values", () => {
    expect(
      sanitize(
        '<span dir="rtl" class="unknown">א</span><i dir="auto">x</i><span dir="sideways">y</span>',
      ),
    ).toBe('<span dir="rtl">א</span><i dir="auto">x</i>y');
  });

  it("preserves approved reference and named-entity links", () => {
    expect(sanitize(fixture("genesis-wrapped-entities"))).toBe(
      '<a class="refLink" data-range="0-7" data-ref="Genesis 10:1" href="https://www.sefaria.org/Genesis.10.1">Genesis</a> <a class="namedEntityLink" data-range="8-12" data-slug="noah" href="https://www.sefaria.org/topics/noah">Noah</a>',
    );
  });

  it("allows both Sefaria production domains but not arbitrary subdomains", () => {
    expect(
      sanitize(
        '<a data-ref="A" href="https://sefaria.org/A">a</a><a data-ref="B" href="https://www.sefaria.org/B">b</a><a data-ref="C" href="https://sefaria.org.il/C">c</a><a data-ref="D" href="https://www.sefaria.org.il/D">d</a><a data-ref="E" href="https://staging.sefaria.org/E">e</a>',
      ),
    ).toBe(
      '<a data-ref="A" href="https://sefaria.org/A">a</a><a data-ref="B" href="https://www.sefaria.org/B">b</a><a data-ref="C" href="https://sefaria.org.il/C">c</a><a data-ref="D" href="https://www.sefaria.org.il/D">d</a>e',
    );
  });

  it("unwraps disabled, incomplete, category, and generic links", () => {
    expect(
      sanitize(
        '<a class="refLink" data-ref="A" href="/A">ref</a><a class="namedEntityLink" data-slug="n" href="/topics/n">entity</a><a class="categoryLink" data-category-path="Tanakh" href="/texts/Tanakh">category</a><a href="https://example.com">generic</a>',
        { allowNamedEntities: false, allowRefLinks: false },
      ),
    ).toBe("refentitycategorygeneric");
  });

  it.each([
    "//evil.test/X",
    "https://user@www.sefaria.org/X",
    "https://evilsefaria.org/X",
    "https:/www.evil.com/X",
    "https:evil.test/X",
    "jav&#x61;script:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,unsafe",
    "/\\evil.test/X",
    "java&#9;script:alert(1)",
  ])("unwraps an enabled reference link with unsafe href %s", (href) => {
    expect(sanitize(`<a data-ref="X" href="${href}">unsafe</a>`)).toBe(
      "unsafe",
    );
  });

  it("unwraps an enabled named-entity link with an unsafe href", () => {
    expect(
      sanitize(
        '<a class="namedEntityLink" data-slug="n" href="//evil.test/n">unsafe</a>',
      ),
    ).toBe("unsafe");
  });

  it("canonicalizes relative links against the Sefaria production origin", () => {
    expect(
      sanitize(
        '<a data-ref="A" href="/A">root</a><a data-ref="B" href="B">path</a><a class="namedEntityLink" data-slug="n" href="/topics/n">entity</a>',
      ),
    ).toBe(
      '<a data-ref="A" href="https://www.sefaria.org/A">root</a><a data-ref="B" href="https://www.sefaria.org/B">path</a><a class="namedEntityLink" data-slug="n" href="https://www.sefaria.org/topics/n">entity</a>',
    );
  });

  it("decodes and rejects active URLs and removes hostile attributes", () => {
    expect(sanitize(fixture("hostile-synthetic"))).toBe("unsafesafe text");
  });

  it("removes active subtrees instead of unwrapping them", () => {
    expect(
      sanitize(
        "a<script><b>script text</b></script><style>style text</style><template>template text</template><svg><text>svg text</text></svg>b",
      ),
    ).toBe("ab");
  });

  it("replaces images with escaped alt text", () => {
    expect(
      sanitize('<img src="https://evil.test/x" onerror="x" alt="&lt;map&gt;">'),
    ).toBe("&lt;map&gt;");
    expect(sanitize('<img src="/x">')).toBe("");
  });

  it("unwraps unsupported inline and block markup without concatenating blocks", () => {
    expect(
      sanitize(
        "<section><p>one</p><p>two <mark>marked</mark></p></section><div>three</div><center>four</center><center>five</center>",
      ),
    ).toBe("one two marked three four five");
  });

  it("preserves footnotes by default and removes both halves when disabled", () => {
    const input = fixture("genesis-footnote");

    expect(sanitize(input)).toBe(input);
    expect(sanitize(input, { allowFootnotes: false })).toBe(
      "When God began to create heaven",
    );
  });

  it("uses standards-parser recovery without inventing malformed attributes", () => {
    const result = sanitize(
      '<i data-commentator=Mishnah Berurah" data-label="א"></i>',
    );

    expect(result).not.toContain('data-commentator="Mishnah Berurah"');
    expect(result).not.toContain("Berurah");
  });

  it("uses browser-style recovery for self-closing non-void elements", () => {
    expect(sanitize('<a data-ref="A" href="/A"/>text')).toBe(
      '<a data-ref="A" href="https://www.sefaria.org/A">text</a>',
    );
    expect(sanitize('<i data-commentator="Rashi"/>text')).toBe("<i>text</i>");
  });

  it("serializes deterministically", () => {
    const input =
      '<a href="/A" data-vhe="he" class="refLink extra" data-ref="A" data-ven="en" onclick="x">A</a>';

    expect(sanitize(input)).toBe(
      '<a class="refLink" data-ref="A" data-ven="en" data-vhe="he" href="https://www.sefaria.org/A">A</a>',
    );
    expect(sanitize(sanitize(input))).toBe(sanitize(input));
  });

  it("handles deep nesting without recursive traversal failure", () => {
    const input = `${"<span>".repeat(5_000)}text${"</span>".repeat(5_000)}`;

    expect(sanitize(input)).toBe("text");
  });
});

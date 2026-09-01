export const v3SourceBackedFixtureMetadata = {
  responseShapeSource:
    "https://www.sefaria.org/api/v3/texts/Genesis%201%3A31-2%3A2",
  responseShapeCapturedAt: "2026-08-29",
  textSources: [
    {
      source:
        "https://www.sefaria.org/api/v3/texts/Obadiah%201?version=hebrew%7CMiqra%20according%20to%20the%20Masorah&return_format=default",
      capturedAt: "2026-08-30",
      retained: "MAM span and pointed Hebrew text",
    },
    {
      source:
        "https://www.sefaria.org/api/v3/texts/Genesis%201%3A1?version=english%7CThe%20Contemporary%20Torah%2C%20Jewish%20Publication%20Society%2C%202006&return_format=default",
      capturedAt: "2026-08-30",
      retained: "footnote marker, body, and nested bold text",
    },
  ],
} as const;

export const v3SourceBackedPayload: unknown = {
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  sections: ["1", "1"],
  toSections: ["1", "1"],
  sectionRef: "Genesis 1",
  heSectionRef: "בראשית א׳",
  firstAvailableSectionRef: "Genesis 1:1",
  isSpanning: false,
  next: "Genesis 1:2",
  prev: null,
  title: "Genesis 1",
  book: "Genesis",
  heTitle: "בראשית",
  primary_category: "Tanakh",
  type: "Tanakh",
  indexTitle: "Genesis",
  categories: ["Tanakh", "Torah"],
  heIndexTitle: "בראשית",
  isComplex: false,
  isDependant: false,
  order: [1, 1],
  collectiveTitle: "",
  heCollectiveTitle: "",
  textDepth: 2,
  sectionNames: ["Chapter", "Verse"],
  addressTypes: ["Perek", "Pasuk"],
  titleVariants: ["Bereshit", "Genesis"],
  heTitleVariants: ["בְּרֵאשִׁית", "בראשית"],
  alts: [],
  available_versions: [],
  versions: [
    {
      versionTitle: "Explicit source-backed compatibility composition",
      versionSource: null,
      language: "he",
      actualLanguage: "he",
      languageFamilyName: "hebrew",
      isSource: true,
      isPrimary: true,
      direction: "rtl",
      text:
        '<span class="mam-kq-trivial">שְׁעָרָ֗ו</span> — When God began to create' +
        '<sup class="footnote-marker">*</sup>' +
        '<i class="footnote"><b>When God began to create </b>Others.</i> heaven',
    },
  ],
  warnings: [],
};

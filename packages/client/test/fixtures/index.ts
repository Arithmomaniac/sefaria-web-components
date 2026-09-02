import genesisBilingual from "./v3-text-genesis-bilingual-2026-09-02.json" with { type: "json" };
import genesisMissingEnglish from "./v3-text-genesis-missing-english-2026-09-02.json" with { type: "json" };
import genesisMissingOnly from "./v3-text-genesis-missing-only-2026-09-02.json" with { type: "json" };
import genesisSpanningBilingual from "./v3-text-genesis-spanning-bilingual-2026-09-02.json" with { type: "json" };
import invalidRef from "./ref-invalid-2026-09-02.json" with { type: "json" };
import sheetRef from "./ref-sheet-2026-08-30.json" with { type: "json" };
import invalidTextFormat from "./v3-text-invalid-format-2026-09-02.json" with { type: "json" };
import invalidTextRef from "./v3-text-invalid-ref-2026-09-02.json" with { type: "json" };
import shulchanArukhLong from "./v3-text-shulchan-arukh-long-2026-09-02.json" with { type: "json" };

/** Client-owned corrected API payloads for component fixture tests. */
export const componentPayloadFixtures = {
  genesisBilingual: {
    fileName: "v3-text-genesis-bilingual-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 200,
    payload: genesisBilingual,
  },
  genesisMissingEnglish: {
    fileName: "v3-text-genesis-missing-english-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 200,
    payload: genesisMissingEnglish,
  },
  genesisMissingOnly: {
    fileName: "v3-text-genesis-missing-only-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 200,
    payload: genesisMissingOnly,
  },
  genesisSpanningBilingual: {
    fileName: "v3-text-genesis-spanning-bilingual-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 200,
    payload: genesisSpanningBilingual,
  },
  shulchanArukhLong: {
    fileName: "v3-text-shulchan-arukh-long-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 200,
    payload: shulchanArukhLong,
  },
  invalidTextFormat: {
    fileName: "v3-text-invalid-format-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 400,
    payload: invalidTextFormat,
  },
  invalidTextRef: {
    fileName: "v3-text-invalid-ref-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 404,
    payload: invalidTextRef,
  },
  invalidRef: {
    fileName: "ref-invalid-2026-09-02.json",
    capturedAt: "2026-09-02",
    status: 200,
    payload: invalidRef,
  },
  sheetRef: {
    fileName: "ref-sheet-2026-08-30.json",
    capturedAt: "2026-08-30",
    status: 200,
    payload: sheetRef,
  },
} as const;

/** Generated response examples that are not deployed-response evidence. */
export const componentContractExamples = {
  refNotFound: {
    key: "ref-not-found-contract-example",
    status: 404,
    schemaPath:
      "/paths/~1api~1ref~1{tref}/get/responses/404/content/application~1json/schema",
    payload: {
      error: "unexpected reference parsing failure",
    },
  },
} as const;

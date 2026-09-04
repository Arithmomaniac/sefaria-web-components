import "@sefaria/components";
import type {
  BilingualSegmentDataViewModel,
  SefariaBilingualSegment,
  SefariaSourceCard,
  SourceCardDataViewModel,
  TextSegmentDataViewModel,
} from "@sefaria/components";

const primary: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "he",
  actualLanguage: "he",
  direction: "rtl",
  body: [
    {
      kind: "html",
      html: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃",
    },
  ],
  notes: [],
  attribution: {
    versionTitle: "Miqra according to the Masorah",
    versionSource: null,
  },
};

const translation: TextSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  language: "en",
  actualLanguage: "en",
  direction: "ltr",
  body: [
    {
      kind: "html",
      html: "When God began to create heaven and earth—",
    },
  ],
  notes: [],
  attribution: {
    versionTitle: "The Contemporary Torah",
    versionSource: "Jewish Publication Society, 2006",
  },
};

const bilingualViewModel: BilingualSegmentDataViewModel = {
  state: "data",
  ref: "Genesis 1:1",
  heRef: "בראשית א׳:א׳",
  primary,
  translation,
};

const sourceCardViewModel: SourceCardDataViewModel = {
  state: "data",
  header: {
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    indexTitle: "Genesis",
    heIndexTitle: "בראשית",
    primaryCategory: "Tanakh",
    categories: ["Tanakh", "Torah"],
  },
  items: [
    {
      position: [],
      pair: {
        state: "data",
        primary,
        translation,
      },
    },
  ],
};

const current = requireElement<SefariaBilingualSegment>("#current-bilingual");
const proposed = requireElement<SefariaSourceCard>("#proposed-source-card");
const controls = requireElement<HTMLFormElement>("#display-controls");

current.viewModel = bilingualViewModel;
proposed.viewModel = sourceCardViewModel;

controls.addEventListener("change", applyPresentation);
applyPresentation();

function applyPresentation(): void {
  const values = new FormData(controls);
  const layout = readLayout(values.get("layout"));
  const sideOrder = readSideOrder(values.get("sideOrder"));
  current.layout = layout;
  current.sideOrder = sideOrder;
  proposed.layout = layout;
  proposed.sideOrder = sideOrder;
}

function readLayout(
  value: FormDataEntryValue | null,
): SefariaBilingualSegment["layout"] {
  return value === "stacked" || value === "side-by-side" ? value : "auto";
}

function readSideOrder(
  value: FormDataEntryValue | null,
): SefariaBilingualSegment["sideOrder"] {
  return value === "translation-first" ? value : "primary-first";
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The comparison demo requires ${selector}.`);
  }
  return element;
}

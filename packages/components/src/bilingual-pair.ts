import { css, html, nothing, type CSSResult, type TemplateResult } from "lit";

import "./text-segment-element.js";
import type { TextSegmentDataViewModel } from "./text-segment.js";

/** Payload role rendered on one bilingual side. */
export type BilingualPairSide = "primary" | "translation";

/** One side that has no renderable text in a bilingual pair. */
export interface BilingualPairAbsentSide {
  /** Role that has no renderable text. */
  readonly side: BilingualPairSide;
  /** Attributed server warning, selected-version message, or fallback. */
  readonly message: string;
}

/** One side that has renderable text in a bilingual pair. */
export interface BilingualPairPresentSide {
  /** Role that produced the child view model. */
  readonly side: BilingualPairSide;
  /** Render-ready child text-segment data. */
  readonly view: TextSegmentDataViewModel;
}

/** Both sides of one ref-free bilingual pair. */
export interface BilingualPairDataViewModel {
  /** State discriminator. */
  readonly state: "data";
  /** Render-ready primary-side data. */
  readonly primary: TextSegmentDataViewModel;
  /** Render-ready translation-side data. */
  readonly translation: TextSegmentDataViewModel;
}

/** Exactly one side of one ref-free bilingual pair. */
export interface BilingualPairPartialViewModel {
  /** State discriminator. */
  readonly state: "partial";
  /** The side that produced renderable text. */
  readonly present: BilingualPairPresentSide;
  /** The side that produced none. */
  readonly absent: BilingualPairAbsentSide;
}

/** Neither side of one ref-free bilingual pair. */
export interface BilingualPairEmptyViewModel {
  /** State discriminator. */
  readonly state: "empty";
  /** Both sides, in primary-then-translation order. */
  readonly absent: readonly [BilingualPairAbsentSide, BilingualPairAbsentSide];
}

/** Renderable states for one bilingual pair without a reference claim. */
export type BilingualPairViewModel =
  | BilingualPairDataViewModel
  | BilingualPairPartialViewModel
  | BilingualPairEmptyViewModel;

/** Sides rendered for one `contentLanguage` value. */
export type BilingualPairContentLanguage = BilingualPairSide | "both";

/** Arrangement of the two sides. */
export type BilingualPairLayout = "auto" | "stacked" | "side-by-side";

/** Which role occupies the first side-by-side track. */
export type BilingualPairSideOrder = "primary-first" | "translation-first";

/** Presentation inputs for the shared bilingual pair renderer. */
export interface BilingualPairPresentation {
  /** Sides the host wants displayed. */
  readonly contentLanguage: BilingualPairContentLanguage;
  /** Requested arrangement of the two sides. */
  readonly layout: BilingualPairLayout;
  /** Requested role order for a side-by-side arrangement. */
  readonly sideOrder: BilingualPairSideOrder;
  /** Whether absent-side messages are announced as live status updates. */
  readonly announceAbsent?: boolean;
}

const SIDES: readonly BilingualPairSide[] = ["primary", "translation"];

/** Shared styles for a bilingual pair rendered inside a component shadow root. */
export const bilingualPairStyles: CSSResult = css`
  .pair {
    display: grid;
    gap: 0.75rem 1.5rem;
    align-items: start;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    max-width: 100%;
  }

  [data-side] {
    min-width: 0;
    max-width: 100%;
  }

  @container (min-width: 500px) {
    .pair[data-content="both"][data-layout="auto"] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pair[data-content="both"][data-layout="auto"][data-order="primary-first"]
      [data-side="primary"],
    .pair[data-content="both"][data-layout="auto"][data-order="translation-first"]
      [data-side="translation"] {
      order: -1;
    }
  }

  .pair[data-content="both"][data-layout="side-by-side"] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pair[data-content="both"][data-layout="side-by-side"][data-order="primary-first"]
    [data-side="primary"],
  .pair[data-content="both"][data-layout="side-by-side"][data-order="translation-first"]
    [data-side="translation"] {
    order: -1;
  }

  .absent {
    margin: 0;
    color: var(--_sefaria-fg-muted);
    font-size: 0.875em;
  }
`;

/** Renders one bilingual pair for either public host element. */
export function renderBilingualPair(
  viewModel: BilingualPairViewModel,
  presentation: BilingualPairPresentation,
): TemplateResult {
  const parts =
    viewModel.state === "data"
      ? [
          renderSide("primary", viewModel.primary, presentation),
          renderSide("translation", viewModel.translation, presentation),
        ]
      : viewModel.state === "partial"
        ? SIDES.map((side) =>
            side === viewModel.present.side
              ? renderSide(side, viewModel.present.view, presentation)
              : renderAbsent(side, viewModel.absent.message, presentation),
          )
        : viewModel.absent.map((absent) =>
            renderAbsent(absent.side, absent.message, presentation),
          );

  return html`<div
    class="pair"
    data-content=${presentation.contentLanguage}
    data-layout=${presentation.layout}
    data-order=${presentation.sideOrder}
  >
    ${parts}
  </div>`;
}

function renderSide(
  side: BilingualPairSide,
  view: TextSegmentDataViewModel,
  presentation: BilingualPairPresentation,
) {
  if (!shows(side, presentation)) {
    return nothing;
  }
  return html`<sefaria-text-segment
    data-side=${side}
    .viewModel=${view}
  ></sefaria-text-segment>`;
}

function renderAbsent(
  side: BilingualPairSide,
  message: string,
  presentation: BilingualPairPresentation,
) {
  if (!shows(side, presentation)) {
    return nothing;
  }
  return html`<p
    class="absent"
    data-side=${side}
    role=${presentation.announceAbsent === false ? nothing : "status"}
    aria-live=${presentation.announceAbsent === false ? nothing : "polite"}
  >
    ${message}
  </p>`;
}

function shows(
  side: BilingualPairSide,
  presentation: BilingualPairPresentation,
): boolean {
  return (
    presentation.contentLanguage === "both" ||
    presentation.contentLanguage === side
  );
}

import { css, html, nothing } from "lit";

import { SefariaElement } from "./sefaria-element.js";
import "./text-segment-element.js";
import type {
  BilingualSegmentSide,
  BilingualSegmentViewModel,
} from "./bilingual-segment.js";
import type { TextSegmentDataViewModel } from "./text-segment.js";

/** Sides an element renders for one `contentLanguage` value. */
export type BilingualSegmentContentLanguage = BilingualSegmentSide | "both";

/** Arrangement of the two sides. */
export type BilingualSegmentLayout = "auto" | "stacked" | "side-by-side";

/** Which role occupies the first side-by-side track. */
export type BilingualSegmentSideOrder = "primary-first" | "translation-first";

const SIDES: readonly BilingualSegmentSide[] = ["primary", "translation"];

/** Request-free custom element that renders one bilingual-segment view model. */
export class SefariaBilingualSegment extends SefariaElement {
  /** Lit property metadata for the view model and presentation properties. */
  static override properties = {
    viewModel: { attribute: false },
    contentLanguage: { type: String, attribute: "content-language" },
    layout: { type: String },
    sideOrder: { type: String, attribute: "side-order" },
  };

  /** Bilingual pairing, container-driven layout, and absent-side styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        container-type: inline-size;
        max-width: 100%;
        min-width: 0;
      }

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

      /*
       * Upstream Sefaria forces a stacked layout below 500 pixels. The same
       * threshold selects the paired layout here, without any measurement.
       */
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
    `,
  ];

  /** Render-ready state supplied by the host. */
  declare viewModel: BilingualSegmentViewModel;

  /** Sides the host wants displayed. */
  declare contentLanguage: BilingualSegmentContentLanguage;

  /** Requested arrangement of the two sides. */
  declare layout: BilingualSegmentLayout;

  /** Requested role order for a side-by-side arrangement. */
  declare sideOrder: BilingualSegmentSideOrder;

  constructor() {
    super();
    this.contentLanguage = "both";
    this.layout = "auto";
    this.sideOrder = "primary-first";
  }

  protected override render() {
    const viewModel = this.viewModel;
    if (!viewModel) {
      return nothing;
    }

    switch (viewModel.state) {
      case "loading":
        return html`<p role="status" aria-live="polite">
          ${viewModel.message}
        </p>`;
      case "error":
        return html`<p role="alert">${viewModel.message}</p>`;
      case "empty":
        return this.#renderPair(
          viewModel.absent.map((absent) =>
            this.#renderAbsent(absent.side, absent.message),
          ),
        );
      case "partial":
        return this.#renderPair(
          SIDES.map((side) =>
            side === viewModel.present.side
              ? this.#renderSide(side, viewModel.present.view)
              : this.#renderAbsent(side, viewModel.absent.message),
          ),
        );
      case "data":
        return this.#renderPair([
          this.#renderSide("primary", viewModel.primary),
          this.#renderSide("translation", viewModel.translation),
        ]);
    }
  }

  #renderPair(parts: readonly unknown[]) {
    return html`<div
      class="pair"
      data-content=${this.contentLanguage}
      data-layout=${this.layout}
      data-order=${this.sideOrder}
    >
      ${parts}
    </div>`;
  }

  #renderSide(side: BilingualSegmentSide, view: TextSegmentDataViewModel) {
    if (!this.#shows(side)) {
      return nothing;
    }
    return html`<sefaria-text-segment
      data-side=${side}
      .viewModel=${view}
    ></sefaria-text-segment>`;
  }

  #renderAbsent(side: BilingualSegmentSide, message: string) {
    if (!this.#shows(side)) {
      return nothing;
    }
    return html`<p
      class="absent"
      data-side=${side}
      role="status"
      aria-live="polite"
    >
      ${message}
    </p>`;
  }

  #shows(side: BilingualSegmentSide): boolean {
    return this.contentLanguage === "both" || this.contentLanguage === side;
  }
}

if (!customElements.get("sefaria-bilingual-segment")) {
  customElements.define("sefaria-bilingual-segment", SefariaBilingualSegment);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-bilingual-segment": SefariaBilingualSegment;
  }
}

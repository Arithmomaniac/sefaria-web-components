import { css, html, nothing } from "lit";

import {
  bilingualPairStyles,
  renderBilingualPair,
  type BilingualPairContentLanguage,
  type BilingualPairLayout,
  type BilingualPairSideOrder,
} from "./bilingual-pair.js";
import { SefariaElement } from "./sefaria-element.js";
import type { BilingualSegmentViewModel } from "./bilingual-segment.js";

/** Sides an element renders for one `contentLanguage` value. */
export type BilingualSegmentContentLanguage = BilingualPairContentLanguage;

/** Arrangement of the two sides. */
export type BilingualSegmentLayout = BilingualPairLayout;

/** Which role occupies the first side-by-side track. */
export type BilingualSegmentSideOrder = BilingualPairSideOrder;

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
    `,
    bilingualPairStyles,
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
      default:
        return renderBilingualPair(viewModel, {
          contentLanguage: this.contentLanguage,
          layout: this.layout,
          sideOrder: this.sideOrder,
        });
    }
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

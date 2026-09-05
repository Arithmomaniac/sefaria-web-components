import { css, html, nothing, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";

import {
  bilingualPairStyles,
  renderBilingualPair,
  type BilingualPairContentLanguage,
  type BilingualPairLayout,
  type BilingualPairSideOrder,
} from "./bilingual-pair.js";
import "./ref-label-element.js";
import { SefariaElement } from "./sefaria-element.js";
import type { RefLabelViewModel } from "./ref-label.js";
import type {
  SourceCardAttributionViewModel,
  SourceCardHeaderViewModel,
  SourceCardViewModel,
} from "./source-card.js";

/** Request-free custom element that renders one source-card view model. */
export class SefariaSourceCard extends SefariaElement {
  /** Lit property metadata for host-supplied data and presentation. */
  static override properties = {
    viewModel: { attribute: false },
    referenceLabel: { attribute: false },
    contentLanguage: { type: String, attribute: "content-language" },
    layout: { type: String },
    sideOrder: { type: String, attribute: "side-order" },
  };

  /** Card structure, heading, collection, and shared pair styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        container-type: inline-size;
        max-width: 100%;
        min-width: 0;
        border: 1px solid var(--_sefaria-border);
        border-radius: 0.5rem;
        padding: 1rem;
      }

      header {
        margin-block-end: 1rem;
      }

      .payload-label {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 0.75rem;
        font-weight: 600;
      }

      .english {
        font-family: var(--_sefaria-font-english);
      }

      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }

      .items {
        display: grid;
        gap: 1rem;
      }

      .item {
        min-width: 0;
        max-width: 100%;
      }

      .item + .item {
        border-block-start: 1px solid var(--_sefaria-border);
        padding-block-start: 1rem;
      }

      .attributions {
        display: grid;
        gap: 0.35rem;
        margin-block-start: 1rem;
        padding-block-start: 1rem;
        border-block-start: 1px solid var(--_sefaria-border);
        color: var(--_sefaria-fg-muted);
        font-size: 0.8em;
      }

      .attribution {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35em;
        margin: 0;
        min-width: 0;
      }

      .attribution > * {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .attribution-label {
        font-weight: 600;
      }

      .version-source::before {
        content: "— ";
      }
    `,
    bilingualPairStyles,
  ];

  /** Render-ready state supplied by the host. */
  declare viewModel: SourceCardViewModel;

  /** Optional richer label supplied by a host that already owns it. */
  declare referenceLabel: RefLabelViewModel | undefined;

  /** Sides the host wants displayed for every pair. */
  declare contentLanguage: BilingualPairContentLanguage;

  /** Requested arrangement for every pair. */
  declare layout: BilingualPairLayout;

  /** Requested role order for every pair. */
  declare sideOrder: BilingualPairSideOrder;

  constructor() {
    super();
    this.referenceLabel = undefined;
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
        return html`
          ${this.#renderHeader(viewModel.header)}
          <p role="status" aria-live="polite">
            ${viewModel.absent.map((side) => side.message).join(" ")}
          </p>
          ${this.#renderAttributions(viewModel.attributions)}
        `;
      case "data":
        return html`
          ${this.#renderHeader(viewModel.header)}
          <section class="items" aria-label="Source text">
            ${repeat(
              viewModel.items,
              (item) => positionKey(item.position),
              (item) =>
                html`<div
                  class="item"
                  data-position=${positionKey(item.position)}
                >
                  ${renderBilingualPair(item.pair, {
                    contentLanguage: this.contentLanguage,
                    layout: this.layout,
                    sideOrder: this.sideOrder,
                    announceAbsent: false,
                  })}
                </div>`,
            )}
          </section>
          ${this.#renderAttributions(viewModel.attributions)}
        `;
    }
  }

  #renderHeader(header: SourceCardHeaderViewModel): TemplateResult {
    if (this.referenceLabel !== undefined) {
      return html`<header>
        <sefaria-ref-label
          .viewModel=${this.referenceLabel}
          label-language="both"
          linked
        ></sefaria-ref-label>
      </header>`;
    }

    return html`<header>
      <div class="payload-label">
        <span class="english" lang="en" dir="ltr">${header.ref}</span>
        <span class="hebrew" lang="he" dir="rtl">${header.heRef}</span>
      </div>
    </header>`;
  }

  #renderAttributions(
    attributions: readonly SourceCardAttributionViewModel[],
  ): TemplateResult | typeof nothing {
    const visible = attributions.filter(
      (attribution) =>
        this.contentLanguage === "both" ||
        this.contentLanguage === attribution.side,
    );
    if (visible.length === 0) {
      return nothing;
    }

    return html`<section class="attributions" aria-label="Text editions">
      ${visible.map((attribution) => this.#renderAttribution(attribution))}
    </section>`;
  }

  #renderAttribution(
    attribution: SourceCardAttributionViewModel,
  ): TemplateResult {
    const label =
      attribution.side === "primary" ? "Primary text:" : "Translation:";
    const source =
      attribution.versionSource === null
        ? nothing
        : html`<span class="version-source"
            >${attribution.versionSource}</span
          >`;

    return html`<p class="attribution" data-side=${attribution.side}>
      <span class="attribution-label">${label}</span>
      <span class="version-title">${attribution.versionTitle}</span>
      ${source}
    </p>`;
  }
}

function positionKey(position: readonly number[]): string {
  return position.length === 0 ? "root" : position.join(".");
}

if (!customElements.get("sefaria-source-card")) {
  customElements.define("sefaria-source-card", SefariaSourceCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-source-card": SefariaSourceCard;
  }
}

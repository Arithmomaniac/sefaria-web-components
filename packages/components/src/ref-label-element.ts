import { css, html, nothing, type TemplateResult } from "lit";

import { SefariaElement } from "./sefaria-element.js";
import type { RefLabelDataViewModel, RefLabelViewModel } from "./ref-label.js";

/** Label language rendered by `<sefaria-ref-label>`. */
export type RefLabelLanguage = "english" | "hebrew" | "both";

/** Request-free custom element that renders one reference-label view model. */
export class SefariaRefLabel extends SefariaElement {
  /** Lit property metadata for host-supplied data and presentation. */
  static override properties = {
    viewModel: { attribute: false },
    labelLanguage: { attribute: "label-language" },
    linked: { type: Boolean },
  };

  /** Reference-label typography, link, focus, and containment styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        min-width: 0;
        max-width: 100%;
      }

      .label,
      a {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      a {
        color: var(--_sefaria-link);
      }

      a:focus-visible {
        outline: 2px solid var(--_sefaria-accent);
        outline-offset: 0.2em;
      }

      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }

      .english {
        font-family: var(--_sefaria-font-english);
      }

      .both {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.35em;
      }
    `,
  ];

  /** Render-ready state supplied by the host. */
  declare viewModel: RefLabelViewModel;

  /** Label language selected by the host. */
  declare labelLanguage: RefLabelLanguage;

  /** Whether data-state labels render as canonical links. */
  declare linked: boolean;

  constructor() {
    super();
    this.labelLanguage = "english";
    this.linked = false;
  }

  protected override render() {
    const viewModel = this.viewModel;
    if (!viewModel) {
      return nothing;
    }

    switch (viewModel.state) {
      case "loading":
      case "empty":
        return html`<span role="status" aria-live="polite">
          ${viewModel.message}
        </span>`;
      case "error":
        return html`<span role="alert">${viewModel.message}</span>`;
      case "data":
        return this.#renderData(viewModel);
    }
  }

  #renderData(viewModel: RefLabelDataViewModel): TemplateResult {
    const label = this.#renderLabel(viewModel);
    return this.linked
      ? html`<a href=${viewModel.url}>${label}</a>`
      : html`<span class="label">${label}</span>`;
  }

  #renderLabel(viewModel: RefLabelDataViewModel): TemplateResult {
    const english = html`<span class="english" lang="en" dir="ltr"
      >${viewModel.normalized}</span
    >`;
    const hebrew = html`<span class="hebrew" lang="he" dir="rtl"
      >${viewModel.hebrew}</span
    >`;

    switch (this.labelLanguage) {
      case "hebrew":
        return hebrew;
      case "both":
        return html`<span class="both">${english}${hebrew}</span>`;
      case "english":
      default:
        return english;
    }
  }
}

if (!customElements.get("sefaria-ref-label")) {
  customElements.define("sefaria-ref-label", SefariaRefLabel);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-ref-label": SefariaRefLabel;
  }
}

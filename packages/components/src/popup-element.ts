import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";

import { SefariaElement } from "./sefaria-element.js";
import "./source-card-element.js";
import type { PopupViewModel } from "./popup.js";

/** Request-free anchored dialog that renders one popup view model. */
export class SefariaPopup extends SefariaElement {
  /** Lit property metadata for host-supplied data and interaction state. */
  static override properties = {
    viewModel: { attribute: false },
    anchor: { attribute: false },
    open: { type: Boolean, reflect: true },
  };

  /** Popup layout, viewport placement, and isolated dialog styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        position: fixed;
        inset: auto;
        z-index: 2147483647;
        display: none;
        width: min(38rem, calc(100vw - 1rem));
        max-height: min(42rem, calc(100vh - 1rem));
      }

      :host([open]) {
        display: block;
      }

      .dialog {
        position: relative;
        max-height: inherit;
        overflow: auto;
        border: 1px solid var(--_sefaria-border);
        border-radius: 0.65rem;
        background: var(--_sefaria-bg);
        box-shadow: 0 1rem 3rem rgb(0 0 0 / 28%);
      }

      .close-button {
        position: sticky;
        z-index: 1;
        inset-block-start: 0.5rem;
        float: inline-end;
        margin: 0.5rem;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        background: var(--_sefaria-bg);
        color: var(--_sefaria-fg);
        font: inherit;
        line-height: 1;
        padding: 0.4rem 0.55rem;
        cursor: pointer;
      }

      .close-button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      sefaria-source-card {
        display: block;
        border: 0;
        padding-block-start: 0;
      }

      .notice {
        margin: 0;
        padding: 0 1rem 1rem;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875rem;
      }

      .state {
        margin: 0;
        padding: 2.5rem 1rem 1rem;
      }
    `,
  ];

  /** Render-ready popup state supplied by the integration. */
  declare viewModel: PopupViewModel | undefined;

  /** Host element used for placement and focus restoration. */
  declare anchor: HTMLElement | null;

  /** Whether the dialog is visible. */
  declare open: boolean;

  constructor() {
    super();
    this.viewModel = undefined;
    this.anchor = null;
    this.open = false;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has("open")) {
      if (this.open) {
        this.#place();
        this.renderRoot
          .querySelector<HTMLButtonElement>(".close-button")
          ?.focus();
      } else if (changed.get("open") === true) {
        this.anchor?.focus();
      }
    }
    if (this.open && changed.has("anchor")) {
      this.#place();
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.open) {
      return nothing;
    }

    return html`
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Sefaria source preview"
        @keydown=${this.#handleKeydown}
      >
        <button
          class="close-button"
          type="button"
          aria-label="Close source preview"
          @click=${this.#close}
        >
          ×
        </button>
        ${this.#renderContent()}
      </section>
    `;
  }

  #renderContent(): TemplateResult {
    const viewModel = this.viewModel;
    if (viewModel === undefined) {
      return html`<p class="state" role="status">Loading source.</p>`;
    }
    if (viewModel.state === "loading") {
      return html`<p class="state" role="status" aria-live="polite">
        ${viewModel.message}
      </p>`;
    }
    if (viewModel.state === "error") {
      return html`<p class="state" role="alert">${viewModel.message}</p>`;
    }
    return html`
      <sefaria-source-card
        .viewModel=${viewModel.card}
        hide-attributions
      ></sefaria-source-card>
      ${
        viewModel.truncated
          ? html`<p class="notice" role="status">
              Showing the first 20 source positions.
            </p>`
          : nothing
      }
    `;
  }

  #close = (): void => {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent("sefaria-popup-close", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  #handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.#close();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusable = collectFocusable(this.renderRoot);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (
      first === undefined ||
      last === undefined ||
      (event.shiftKey && deepestActiveElement(this.shadowRoot) === first) ||
      (!event.shiftKey && deepestActiveElement(this.shadowRoot) === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  };

  #place(): void {
    const anchor = this.anchor;
    if (anchor === null) {
      this.style.left = "0.5rem";
      this.style.top = "0.5rem";
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(608, window.innerWidth - margin * 2);
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - width - margin),
    );
    const below = rect.bottom + margin;
    const top =
      below + Math.min(672, window.innerHeight - margin * 2) <=
      window.innerHeight
        ? below
        : Math.max(
            margin,
            rect.top - Math.min(672, rect.top - margin) - margin,
          );
    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
  }
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function collectFocusable(root: ParentNode): HTMLElement[] {
  const focusable: HTMLElement[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.matches(FOCUSABLE_SELECTOR)) {
      focusable.push(element);
    }
    if (element.shadowRoot !== null) {
      focusable.push(...collectFocusable(element.shadowRoot));
    }
  }
  return focusable;
}

function deepestActiveElement(root: ShadowRoot | null): Element | null {
  let active = root?.activeElement ?? null;
  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

if (!customElements.get("sefaria-popup")) {
  customElements.define("sefaria-popup", SefariaPopup);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-popup": SefariaPopup;
  }
}

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
        border-block-start: 0.3rem solid var(--_sefaria-accent);
        border-radius: 0.75rem;
        background: var(--_sefaria-surface);
        box-shadow: var(--_sefaria-shadow);
        scrollbar-color: var(--_sefaria-border-strong) transparent;
      }

      .chrome {
        position: sticky;
        z-index: 2;
        inset-block-start: 0;
        display: flex;
        min-height: 3.5rem;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.55rem 0.75rem 0.55rem 1rem;
        border-block-end: 1px solid var(--_sefaria-border);
        background: color-mix(
          in srgb,
          var(--_sefaria-surface) 94%,
          transparent
        );
        backdrop-filter: blur(12px);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--_sefaria-fg-muted);
        font-family: system-ui, sans-serif;
        font-size: 0.8125rem;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .brand-mark {
        display: inline-block;
        width: 1.1rem;
        height: 1.1rem;
        border: 0.2rem solid var(--_sefaria-accent);
        border-radius: 50%;
      }

      .close-button {
        display: inline-grid;
        min-width: 2.75rem;
        min-height: 2.75rem;
        place-items: center;
        margin: 0;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        background: var(--_sefaria-surface);
        color: var(--_sefaria-fg);
        font: inherit;
        font-size: 1.25rem;
        line-height: 1;
        padding: 0;
        cursor: pointer;
      }

      .close-button:hover {
        border-color: var(--_sefaria-accent);
        background: var(--_sefaria-accent-soft);
      }

      .close-button:focus-visible {
        outline: 3px solid var(--_sefaria-accent);
        outline-offset: 2px;
        border-color: var(--_sefaria-accent);
      }

      sefaria-source-card {
        display: block;
        border: 0;
        border-radius: 0;
        padding-block-start: 0;
      }

      .notice {
        margin: 0;
        padding: 0 1.25rem 1.25rem;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875rem;
      }

      .state {
        margin: 0;
        padding: 2rem 1.25rem;
        line-height: 1.5;
      }

      .state[role="alert"] {
        color: var(--_sefaria-danger);
      }

      .footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.45rem;
        min-height: 2.75rem;
        padding: 0.65rem 1.25rem;
        border-block-start: 1px solid var(--_sefaria-border);
        background: var(--_sefaria-surface-muted);
        color: var(--_sefaria-fg-muted);
        font-family: system-ui, sans-serif;
        font-size: 0.75rem;
      }

      .footer strong {
        color: var(--_sefaria-fg);
        font-weight: 600;
      }

      @media (max-width: 30rem) {
        :host {
          width: calc(100vw - 1rem);
        }

        .chrome {
          min-height: 3.25rem;
        }

        sefaria-source-card {
          --sefaria-font-scale: 0.95;
        }
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

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.#handleViewportChange);
    window.addEventListener("scroll", this.#handleViewportChange, true);
  }

  override disconnectedCallback(): void {
    window.removeEventListener("resize", this.#handleViewportChange);
    window.removeEventListener("scroll", this.#handleViewportChange, true);
    super.disconnectedCallback();
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
        <header class="chrome">
          <span class="brand" aria-hidden="true">
            <span class="brand-mark"></span>
            Sefaria source
          </span>
          <button
            class="close-button"
            type="button"
            aria-label="Close source preview"
            @click=${this.#close}
          >
            ×
          </button>
        </header>
        ${this.#renderContent()}
        <footer class="footer">
          <span>Powered by</span>
          <strong>Sefaria</strong>
        </footer>
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
      <sefaria-source-card .viewModel=${viewModel.card}></sefaria-source-card>
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

  #handleViewportChange = (): void => {
    if (this.open) {
      this.#place();
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
    const height = Math.min(
      this.getBoundingClientRect().height || 672,
      window.innerHeight - margin * 2,
    );
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - width - margin),
    );
    const below = rect.bottom + margin;
    const preferredTop =
      below + height <= window.innerHeight ? below : rect.top - height - margin;
    const top = Math.max(
      margin,
      Math.min(preferredTop, window.innerHeight - height - margin),
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

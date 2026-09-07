import { css, html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { SefariaElement } from "./sefaria-element.js";
import type {
  ConnectionEntry,
  ConnectionsViewModel,
} from "./connections-panel.js";

/** Request-free category summaries and bounded connected-text details. */
export class SefariaConnectionsPanel extends SefariaElement {
  /** Data and presentation are properties; transport inputs are never accepted. */
  static override properties = {
    viewModel: { attribute: false },
    showPreviews: { type: Boolean, attribute: "show-previews" },
  };
  /** Responsive styles confined to the panel's shadow root. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border-radius: var(--_sefaria-panel-radius);
      }
      nav {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-block: 0.5rem 1rem;
      }
      button {
        font: inherit;
        color: inherit;
        background: transparent;
        border: 1px solid var(--_sefaria-border);
        border-radius: var(--_sefaria-control-radius);
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        max-width: 100%;
        overflow-wrap: anywhere;
      }
      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      button[aria-pressed="true"] {
        font-weight: bold;
        border-width: 2px;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      article {
        border-block-start: 1px solid var(--_sefaria-border);
        padding-block: 1rem;
        overflow-wrap: anywhere;
      }
      .open {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        text-align: start;
      }
      .english {
        font-family: var(--_sefaria-font-english);
      }
      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }
      .preview {
        margin-block: 0.7rem;
      }
      .metadata {
        font-size: 0.8em;
        color: var(--_sefaria-fg-muted);
      }
      h3 {
        font-size: 1em;
        overflow-wrap: anywhere;
      }
    `,
  ];
  /** Host-supplied rendering state. */
  declare viewModel: ConnectionsViewModel | undefined;
  /** Hides or reveals captured preview data without requesting it. */
  declare showPreviews: boolean;

  constructor() {
    super();
    this.showPreviews = true;
  }

  protected override render() {
    const vm = this.viewModel;
    if (!vm) return nothing;
    if (vm.state === "error") return html`<p role="alert">${vm.message}</p>`;
    if (vm.state !== "data")
      return html`<p role="status" aria-live="polite">${vm.message}</p>`;
    return html`
      <h2>Connections for ${vm.reference}</h2>
      <nav aria-label="Connection categories">
        <button
          type="button"
          aria-pressed=${vm.category === null}
          @click=${() => this.#emit("sefaria-connections-category-change", { category: null })}
        >
          Overview
        </button>
        ${vm.categories.map(
          (category) =>
            html`<button
              type="button"
              aria-pressed=${vm.category === category.id}
              @click=${() => this.#emit("sefaria-connections-category-change", { category: category.id })}
            >
              ${category.id} (${category.count})
            </button>`,
        )}
      </nav>
      ${
        this.showPreviews && !vm.previewsIncluded
          ? html`<p>Preview text was not requested.</p>
              <button
                type="button"
                @click=${() => this.#emit("sefaria-connections-preview-request", {})}
              >
                Load previews
              </button>`
          : nothing
      }
      ${
        vm.category === null
          ? html`<p>${vm.total} text connections. Select a category.</p>`
          : html` <p role="status">
                Page ${vm.page + 1}: ${vm.entries.length} of ${vm.total}
                ${vm.category} connections
              </p>
              ${vm.entries.length === 0 ? html`<p>No entries on this page.</p>` : nothing}
              ${repeat(
                vm.entries,
                (entry) => entry.id,
                (entry) => this.#entry(entry),
              )}
              <nav aria-label="Connection pages">
                <button
                  type="button"
                  ?disabled=${vm.page === 0}
                  @click=${() => this.#emit("sefaria-connections-page-change", { page: 0 })}
                >
                  First page
                </button>
                <button
                  type="button"
                  ?disabled=${vm.page === 0}
                  @click=${() => this.#emit("sefaria-connections-page-change", { page: vm.page - 1 })}
                >
                  Previous
                </button>
                <button
                  type="button"
                  ?disabled=${(vm.page + 1) * vm.pageSize >= vm.total}
                  @click=${() => this.#emit("sefaria-connections-page-change", { page: vm.page + 1 })}
                >
                  More
                </button>
              </nav>`
      }
    `;
  }

  #entry(entry: ConnectionEntry) {
    const preview = entry.preview;
    return html`<article>
      <h3>${entry.book}</h3>
      <button
        class="open"
        type="button"
        aria-label=${`Open ${entry.targetRef} in context`}
        @click=${() => this.#emit("sefaria-connection-select", { id: entry.id, targetRef: entry.targetRef })}
      >
        <span lang="en" dir="ltr">${entry.targetRef}</span
        ><span lang="he" dir="rtl">${entry.hebrewRef}</span>
      </button>
      ${
        !this.showPreviews
          ? nothing
          : preview.state === "available"
            ? html`
                ${preview.english ? html`<div class="preview english" lang="en" dir="ltr">${unsafeHTML(preview.english.html)}</div>` : html`<p>No English-channel text.</p>`}
                ${preview.hebrew ? html`<div class="preview hebrew" lang="he" dir="rtl">${unsafeHTML(preview.hebrew.html)}</div>` : html`<p>No Hebrew-channel text.</p>`}
                ${preview.english?.truncated || preview.hebrew?.truncated ? html`<p>Preview shortened. Open the connection to read more.</p>` : nothing}
                ${entry.editions.length ? html`<p class="metadata">Editions reported for this connection: ${entry.editions.join("; ")}</p>` : nothing}
                ${entry.licenses.length ? html`<p class="metadata">Licenses reported: ${entry.licenses.join("; ")}</p>` : nothing}
              `
            : html`<p>
                ${preview.state === "absent" ? "No preview text is available." : "Preview text was not requested."}
              </p>`
      }
    </article>`;
  }

  #emit(name: string, detail: object): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }
}

if (!customElements.get("sefaria-connections-panel")) {
  customElements.define("sefaria-connections-panel", SefariaConnectionsPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-connections-panel": SefariaConnectionsPanel;
  }
}

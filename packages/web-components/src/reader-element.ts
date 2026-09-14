import {
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";

import "./connections-panel-element.js";
import "./source-card-element.js";
import { SefariaElement } from "./sefaria-element.js";
import type { ReaderPane, ReaderViewModel } from "./reader.js";

interface SourceSelectDetail {
  readonly position: readonly number[];
  readonly ref: string;
}

interface ConnectionsCategoryDetail {
  readonly category: string | null;
}

interface ConnectionsPageDetail {
  readonly page: number;
}

interface ConnectionSelectDetail {
  readonly id: string;
  readonly targetRef: string;
}

/** Request-free controlled reader surface for one semantic reader entry. */
export class SefariaReader extends SefariaElement {
  /** Lit property metadata for host-supplied rendering and interaction state. */
  static override properties = {
    viewModel: { attribute: false },
    activePane: { type: String, attribute: "active-pane" },
    chatExport: { type: Boolean, attribute: "chat-export" },
  };

  /** Responsive reader composition and accessible navigation styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        container-type: inline-size;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border: 1px solid var(--_sefaria-border);
        border-radius: var(--_sefaria-panel-radius);
        box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 8%);
      }

      button {
        max-width: 100%;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        padding: 0.5rem 0.8rem;
        color: inherit;
        background: var(--_sefaria-surface);
        font-family: var(--_sefaria-font-label-english);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }

      button:hover:not(:disabled) {
        border-color: var(--_sefaria-accent);
        color: var(--_sefaria-accent);
      }

      button:focus-visible,
      [data-current-heading="true"]:focus-visible {
        outline: 2px solid var(--_sefaria-accent);
        outline-offset: 2px;
      }

      button:disabled {
        cursor: default;
        opacity: 0.5;
      }

      .reader-header {
        display: grid;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-block-end: 1px solid var(--_sefaria-border);
        background: var(--_sefaria-surface-muted);
      }

      .history-row,
      .actions,
      .pane-switch {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }

      .history-row ol {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .history-row li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
      }

      .history-row li:not(:last-child)::after {
        content: "›";
        color: var(--_sefaria-fg-muted);
      }

      .back {
        color: var(--_sefaria-accent);
      }

      .crumb {
        border: 0;
        padding-inline: 0.25rem;
        color: var(--_sefaria-link);
        background: transparent;
        font-family: var(--_sefaria-font-english);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .crumb:hover:not(:disabled) {
        text-decoration: underline;
      }

      .current-crumb {
        color: var(--_sefaria-fg);
        font-family: var(--_sefaria-font-english);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
      }

      [data-current-heading="true"] {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.3;
      }

      .history-boundary {
        margin: 0;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875rem;
      }

      .actions {
        justify-content: space-between;
      }

      .chat-export {
        border-color: var(--_sefaria-accent);
        color: var(--_sefaria-surface);
        background: var(--_sefaria-accent);
      }

      .chat-export:hover:not(:disabled) {
        color: var(--_sefaria-surface);
        filter: brightness(0.92);
      }

      .pane-switch {
        display: none;
        width: fit-content;
        padding: 0.2rem;
        border: 1px solid var(--_sefaria-border);
        border-radius: 999px;
        background: var(--_sefaria-surface);
      }

      .pane-switch button {
        border: 0;
        background: transparent;
      }

      .pane-switch button[aria-pressed="true"] {
        color: var(--_sefaria-surface);
        background: var(--_sefaria-accent);
      }

      .panes {
        display: grid;
        grid-template-columns: minmax(0, 68fr) minmax(13rem, 32fr);
        align-items: stretch;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        padding: 0;
        background: var(--_sefaria-surface);
      }

      .pane {
        min-width: 0;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        padding: 1rem;
      }

      .pane[data-pane="connections"] {
        border-inline-start: 1px solid var(--_sefaria-border);
        background: var(--_sefaria-surface-muted);
      }

      sefaria-source-card {
        --_sefaria-source-card-header-display: none;

        display: block;
        padding: 0;
        border: 0;
        border-radius: 0;
      }

      .unavailable {
        min-height: 8rem;
        margin: 0;
        padding: 1rem;
        border: 1px dashed var(--_sefaria-border);
        border-radius: 0.75rem;
        color: var(--_sefaria-fg-muted);
      }

      @container (max-width: 40rem) {
        .actions {
          align-items: stretch;
        }

        .pane-switch {
          display: flex;
        }

        .panes {
          display: block;
          overflow-y: auto;
        }

        .pane[data-pane="connections"] {
          border-inline-start: 0;
        }

        .pane {
          overflow-y: visible;
        }

        .pane[data-active="false"] {
          display: none;
        }
      }
    `,
  ];

  /** Host-supplied reader rendering state. */
  declare viewModel: ReaderViewModel | undefined;
  /** Host-controlled pane selected in compact presentation. */
  declare activePane: ReaderPane;
  /** Shows an explicit host-mediated chat export action when a target exists. */
  declare chatExport: boolean;

  constructor() {
    super();
    this.activePane = "source";
    this.chatExport = false;
  }

  protected override render(): TemplateResult | typeof nothing {
    const viewModel = this.viewModel;
    if (viewModel === undefined) return nothing;
    const activePane = this.#effectivePane(viewModel);
    const ancestors = viewModel.breadcrumbs.filter(
      (breadcrumb) => !breadcrumb.current,
    );
    return html`
      <header class="reader-header">
        <div class="history-row">
          <button
            class="back"
            data-action="back"
            type="button"
            ?disabled=${!viewModel.canGoBack}
            @click=${this.#back}
          >
            Back
          </button>
          <nav aria-label="Reader history" ?hidden=${ancestors.length === 0}>
            <ol>
              ${ancestors.map(
                (breadcrumb) =>
                  html`<li>
                    <button
                      class="crumb"
                      type="button"
                      @click=${() => this.#activate(breadcrumb.entryId)}
                    >
                      ${breadcrumb.label}
                    </button>
                  </li>`,
              )}
            </ol>
          </nav>
        </div>
        ${
          viewModel.historyTruncated
            ? html`<p class="history-boundary" role="status">
                Earlier reader history is no longer retained.
              </p>`
            : nothing
        }
        <h2 data-current-heading="true" tabindex="-1" aria-current="page">
          ${viewModel.label}
        </h2>
        <div class="actions">
          <div class="pane-switch" role="group" aria-label="Reader panes">
            <button
              type="button"
              aria-pressed=${activePane === "source"}
              ?disabled=${viewModel.source === undefined}
              @click=${() => this.#pane("source")}
            >
              Text
            </button>
            <button
              type="button"
              aria-pressed=${activePane === "connections"}
              ?disabled=${viewModel.connections === undefined}
              @click=${() => this.#pane("connections")}
            >
              Connections
            </button>
          </div>
          ${
            this.chatExport && viewModel.selectedTarget !== undefined
              ? html`<button
                  class="chat-export"
                  type="button"
                  @click=${() => this.#chatExport(viewModel.selectedTarget!.ref)}
                >
                  Send ${viewModel.selectedTarget.ref} to chat
                </button>`
              : nothing
          }
        </div>
      </header>
      <div class="panes">
        <section
          class="pane"
          data-pane="source"
          data-active=${activePane === "source"}
          aria-label="Source text"
        >
          ${this.#source(viewModel)}
        </section>
        <section
          class="pane"
          data-pane="connections"
          data-active=${activePane === "connections"}
          aria-label="Connections"
        >
          ${this.#connections(viewModel)}
        </section>
      </div>
    `;
  }

  protected override updated(changed: PropertyValues<this>): void {
    const previous = changed.get("viewModel");
    if (
      previous !== undefined &&
      this.viewModel !== undefined &&
      previous.currentEntryId !== this.viewModel.currentEntryId
    ) {
      requestAnimationFrame(() => {
        const heading = this.shadowRoot?.querySelector<HTMLElement>(
          '[data-current-heading="true"]',
        );
        heading?.focus();
        heading?.scrollIntoView({ block: "nearest" });
      });
    }
  }

  #source(viewModel: ReaderViewModel): TemplateResult {
    const source = viewModel.source;
    if (source === undefined) {
      return html`<p class="unavailable" role="status">
        Source text is not available for this entry.
      </p>`;
    }
    return html`<sefaria-source-card
      .viewModel=${source.viewModel}
      .selectedPosition=${source.selectedPosition}
      .contentLanguage=${source.contentLanguage}
      .layout=${source.layout}
      .sideOrder=${source.sideOrder}
      .showAddressLabels=${true}
      ?selectable=${source.viewModel.state === "data"}
      @sefaria-source-select=${this.#sourceSelect}
    ></sefaria-source-card>`;
  }

  #connections(viewModel: ReaderViewModel): TemplateResult {
    const connections = viewModel.connections;
    if (connections === undefined) {
      return html`<p class="unavailable" role="status">
        Connections are not available for this entry.
      </p>`;
    }
    if (connections.state === "unavailable") {
      return html`<p
        class="unavailable"
        role=${connections.reason === "failed" ? "alert" : "status"}
      >
        ${connections.message}
      </p>`;
    }
    return html`<sefaria-connections-panel
      .viewModel=${connections.viewModel}
      .showPreviews=${connections.showPreviews}
      @sefaria-connections-category-change=${this.#category}
      @sefaria-connections-page-change=${this.#page}
      @sefaria-connection-select=${this.#connection}
      @sefaria-connections-preview-request=${this.#previews}
    ></sefaria-connections-panel>`;
  }

  #effectivePane(viewModel: ReaderViewModel): ReaderPane {
    if (viewModel.source === undefined && viewModel.connections !== undefined) {
      return "connections";
    }
    if (viewModel.connections === undefined && viewModel.source !== undefined) {
      return "source";
    }
    return this.activePane === "connections" ? "connections" : "source";
  }

  #back(): void {
    this.#emit("sefaria-reader-back", {});
  }

  #activate(entryId: string): void {
    this.#emit("sefaria-reader-history-activate", { entryId });
  }

  #pane(pane: ReaderPane): void {
    this.#emit("sefaria-reader-pane-change", { pane });
  }

  #chatExport(targetRef: string): void {
    this.#emit("sefaria-reader-chat-export", { targetRef });
  }

  #sourceSelect(event: CustomEvent<SourceSelectDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-source-select", event.detail);
  }

  #category(event: CustomEvent<ConnectionsCategoryDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connections-category-change", event.detail);
  }

  #page(event: CustomEvent<ConnectionsPageDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connections-page-change", event.detail);
  }

  #connection(event: CustomEvent<ConnectionSelectDetail>): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connection-select", event.detail);
  }

  #previews(event: CustomEvent): void {
    event.stopPropagation();
    this.#emit("sefaria-reader-connections-preview-request", {});
  }

  #emit(name: string, detail: object): void {
    const originEntryId = this.viewModel?.currentEntryId;
    if (originEntryId === undefined) return;
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { originEntryId, ...detail },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (!customElements.get("sefaria-reader")) {
  customElements.define("sefaria-reader", SefariaReader);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-reader": SefariaReader;
  }
}

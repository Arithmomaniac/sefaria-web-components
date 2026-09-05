import { css, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { SefariaElement } from "./sefaria-element.js";
import type {
  TextSegmentDataViewModel,
  TextSegmentViewModel,
} from "./text-segment.js";

/** Request-free custom element that renders one text-segment view model. */
export class SefariaTextSegment extends SefariaElement {
  /** Lit property metadata for the host-supplied view model. */
  static override properties = {
    viewModel: { attribute: false },
  };

  /** Text-segment layout, typography, footnotes, and containment styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        max-width: 100%;
        min-width: 0;
      }

      article,
      .body,
      .body-part {
        max-width: 100%;
        min-width: 0;
      }

      .body,
      .body-part,
      .footnotes {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .body {
        line-height: 1.55;
      }

      article[lang|="he"],
      article[lang|="arc"] {
        font-family: var(--_sefaria-font-hebrew);
      }

      article:not([lang|="he"]):not([lang|="arc"]) {
        font-family: var(--_sefaria-font-english);
      }

      .footnote-marker {
        margin-inline: 0.1em;
      }

      .footnotes {
        margin-block: 1rem 0;
        padding-inline-start: 1.5rem;
        color: var(--_sefaria-fg-muted);
        font-size: 0.875em;
        list-style: none;
      }

      .footnote-label {
        margin-inline-end: 0.35em;
      }
    `,
  ];

  /** Render-ready state supplied by the host. */
  declare viewModel: TextSegmentViewModel;

  protected override render() {
    const viewModel = this.viewModel;
    if (!viewModel) {
      return nothing;
    }

    switch (viewModel.state) {
      case "loading":
      case "empty":
        return html`<p role="status" aria-live="polite">
          ${viewModel.message}
        </p>`;
      case "error":
        return html`<p role="alert">${viewModel.message}</p>`;
      case "data":
        return this.#renderData(viewModel);
    }
  }

  #renderData(viewModel: TextSegmentDataViewModel) {
    const hasFootnoteBodies = viewModel.notes.some(
      (note) => note.content !== null,
    );

    return html`
      <article lang=${viewModel.actualLanguage} dir=${viewModel.direction}>
        <div class="body">
          ${viewModel.body.map((part) =>
            part.kind === "html"
              ? html`<span class="body-part">${unsafeHTML(part.html)}</span>`
              : html`<sup
                  class="footnote-marker"
                  data-note-index=${part.noteIndex}
                  >${part.markerText}</sup
                >`,
          )}
        </div>
        ${
          hasFootnoteBodies
            ? html`<ol class="footnotes">
                ${viewModel.notes.map((note) =>
                  note.content === null
                    ? nothing
                    : html`<li data-note-index=${note.index}>
                        <span class="footnote-label">${note.markerText}</span>
                        ${unsafeHTML(note.content)}
                      </li>`,
                )}
              </ol>`
            : nothing
        }
      </article>
    `;
  }
}

if (!customElements.get("sefaria-text-segment")) {
  customElements.define("sefaria-text-segment", SefariaTextSegment);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-text-segment": SefariaTextSegment;
  }
}

import type { SourceCardData, SourceCardTextBlock } from "@sefaria/model";
import { css, html } from "lit";
import { SefariaElement } from "./sefaria-element.js";

function attribution(block: SourceCardTextBlock): string {
  return block.shortVersionTitle ?? block.versionTitle;
}

function textBlock(block: SourceCardTextBlock) {
  return html`
    <p lang=${block.language} dir=${block.direction}>
      <span class="content">${block.content}</span>
    </p>
  `;
}

export class SefariaSourceCard extends SefariaElement {
  static override properties = {
    data: { attribute: false },
  };

  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        padding: 1rem;
        border: 1px solid var(--_sefaria-border);
        border-radius: 0.75rem;
      }

      article,
      section {
        display: grid;
        gap: 0.75rem;
      }

      header,
      footer {
        color: var(--_sefaria-fg-muted);
      }

      .text {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 1rem;
      }

      p {
        margin: 0;
      }

      .content {
        white-space: pre-wrap;
      }

      [dir="rtl"] {
        font-family: var(--_sefaria-font-hebrew);
        font-size: 1.35em;
      }

      [dir="ltr"] {
        font-family: var(--_sefaria-font-english);
      }
    `,
  ];

  declare data?: SourceCardData;

  protected override render() {
    if (!this.data) {
      return html`<p role="status">No source loaded</p>`;
    }

    return html`
      <article>
        <header>${this.data.ref}</header>
        ${this.data.segments.map(
          (segment) => html`
            <section aria-label=${segment.ref}>
              <div class="text">
                ${segment.source ? textBlock(segment.source) : null}
                ${segment.translations.map(textBlock)}
              </div>
              <footer>
                ${[
                  ...(segment.source ? [segment.source] : []),
                  ...segment.translations,
                ]
                  .map(attribution)
                  .join(" | ")}
              </footer>
            </section>
          `,
        )}
      </article>
    `;
  }
}

if (!customElements.get("sefaria-source-card")) {
  customElements.define("sefaria-source-card", SefariaSourceCard);
}

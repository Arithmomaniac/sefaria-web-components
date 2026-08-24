import { SefariaElement } from "@sefaria/components";
import { css, html } from "lit";

class SefariaDevelopmentStatus extends SefariaElement {
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        max-width: 48rem;
        margin: 4rem auto;
        padding: 2rem;
        border: 1px solid var(--sefaria-border);
        border-radius: 0.75rem;
      }

      h1 {
        margin-top: 0;
        font-family: var(--sefaria-font-english);
      }

      code {
        color: var(--sefaria-link);
      }
    `,
  ];

  protected override render() {
    return html`
      <h1>Sefaria Web Components</h1>
      <p>The Lit workspace, token contract, and browser toolchain are ready.</p>
      <p>
        Begin the first red-green slice in <code>packages/text-transform</code>.
      </p>
    `;
  }
}

customElements.define("sefaria-development-status", SefariaDevelopmentStatus);

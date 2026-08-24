import { SefariaElement } from "@sefaria/components";
import { css, html } from "lit";

class SefariaLinkerDevelopmentShell extends SefariaElement {
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 2147483647;
        max-width: 20rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--sefaria-border);
        border-radius: 0.5rem;
        box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 20%);
        font-family: system-ui, sans-serif;
      }

      p {
        margin: 0;
      }

      button {
        margin-top: 0.5rem;
      }
    `,
  ];

  protected override render() {
    return html`
      <p>Sefaria Linker development shell loaded.</p>
      <button type="button" @click=${() => this.remove()}>Dismiss</button>
    `;
  }
}

customElements.define(
  "sefaria-linker-development-shell",
  SefariaLinkerDevelopmentShell,
);
document.body.append(
  document.createElement("sefaria-linker-development-shell"),
);

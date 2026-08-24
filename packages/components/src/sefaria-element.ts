import { css, LitElement } from "lit";
import { sefariaTokenDefaults } from "./tokens.js";

export abstract class SefariaElement extends LitElement {
  static override styles = [
    sefariaTokenDefaults,
    css`
      :host {
        box-sizing: border-box;
        display: block;
        background: var(--_sefaria-surface);
        color: var(--_sefaria-fg);
        font-size: calc(1rem * var(--_sefaria-font-scale));
      }

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }
    `,
  ];
}

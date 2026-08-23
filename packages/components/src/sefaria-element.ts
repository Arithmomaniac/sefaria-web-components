import { css, LitElement } from "lit";
import { sefariaTokenDefaults } from "./tokens.js";

export abstract class SefariaElement extends LitElement {
  static override styles = [
    sefariaTokenDefaults,
    css`
      :host {
        box-sizing: border-box;
        display: block;
        background: var(--sefaria-surface);
        color: var(--sefaria-fg);
        font-size: calc(1em * var(--sefaria-font-scale));
      }

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }
    `,
  ];
}

import { css, LitElement } from "lit";
import { sefariaTokenDefaults } from "./tokens.js";

/** Base class providing shared Sefaria element tokens and host box behavior. */
export abstract class SefariaElement extends LitElement {
  /** Shared component styles inherited by every Sefaria custom element. */
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

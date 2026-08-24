import { css } from "lit";

export const sefariaTokenDefaults = css`
  :host {
    --_sefaria-surface: var(--sefaria-surface, light-dark(#f9f9f7, #2d2d2b));
    --_sefaria-fg: var(--sefaria-fg, light-dark(#000, #fff));
    --_sefaria-fg-muted: var(--sefaria-fg-muted, light-dark(#999, #ddd));
    --_sefaria-border: var(--sefaria-border, light-dark(#d5d5d4, #444));
    --_sefaria-accent: var(--sefaria-accent, #18345d);
    --_sefaria-link: var(--sefaria-link, #0b71e7);
    --_sefaria-font-scale: var(--sefaria-font-scale, 1);
    --_sefaria-font-hebrew: var(
      --sefaria-font-hebrew,
      "Noto Serif Hebrew",
      serif
    );
    --_sefaria-font-english: var(--sefaria-font-english, serif);
  }
`;

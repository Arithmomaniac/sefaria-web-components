import { css } from "lit";

export const sefariaTokenDefaults = css`
  :host {
    --sefaria-surface: light-dark(#f9f9f7, #2d2d2b);
    --sefaria-fg: light-dark(#000, #fff);
    --sefaria-fg-muted: light-dark(#999, #ddd);
    --sefaria-border: light-dark(#d5d5d4, #444);
    --sefaria-accent: #18345d;
    --sefaria-link: #0b71e7;
    --sefaria-font-scale: 1;
    --sefaria-font-hebrew: "Noto Serif Hebrew", serif;
    --sefaria-font-english: serif;
  }
`;

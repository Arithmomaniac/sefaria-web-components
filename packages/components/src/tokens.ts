import { css } from "lit";

/** Default internal token values backed by host-overridable `--sefaria-*` properties. */
export const sefariaTokenDefaults = css`
  :host {
    --_sefaria-surface: var(--sefaria-surface, light-dark(#fffdf8, #2b2e2a));
    --_sefaria-surface-muted: var(
      --sefaria-surface-muted,
      light-dark(#f5f1e8, #222521)
    );
    --_sefaria-fg: var(--sefaria-fg, light-dark(#25231f, #f1eee7));
    --_sefaria-fg-muted: var(--sefaria-fg-muted, light-dark(#6d675d, #bdb7ac));
    --_sefaria-border: var(--sefaria-border, light-dark(#d7cfc1, #555b53));
    --_sefaria-border-strong: var(
      --sefaria-border-strong,
      light-dark(#aaa094, #73796f)
    );
    --_sefaria-accent: var(--sefaria-accent, light-dark(#8e2449, #ff93b4));
    --_sefaria-accent-soft: var(
      --sefaria-accent-soft,
      light-dark(rgb(142 36 73 / 10%), rgb(255 147 180 / 14%))
    );
    --_sefaria-danger: var(--sefaria-danger, light-dark(#9c1c1c, #ffaaa4));
    --_sefaria-link: var(--sefaria-link, light-dark(#8e2449, #ff93b4));
    --_sefaria-shadow: var(--sefaria-shadow, 0 1rem 3rem rgb(0 0 0 / 28%));
    --_sefaria-font-scale: var(--sefaria-font-scale, 1);
    --_sefaria-font-hebrew: var(
      --sefaria-font-hebrew,
      "Noto Serif Hebrew",
      "SBL Hebrew",
      "Times New Roman",
      serif
    );
    --_sefaria-font-english: var(
      --sefaria-font-english,
      Georgia,
      "Times New Roman",
      serif
    );
  }
`;

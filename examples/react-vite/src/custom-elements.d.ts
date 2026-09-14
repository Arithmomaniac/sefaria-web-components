import type { SefariaSourceCard } from "@sefaria/web-components";
import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sefaria-source-card": DetailedHTMLProps<
        HTMLAttributes<SefariaSourceCard>,
        SefariaSourceCard
      > & { ref?: Ref<SefariaSourceCard> };
    }
  }
}

export {};

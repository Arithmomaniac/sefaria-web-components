import type {
  SefariaConnectionsPanel,
  SefariaReader,
  SefariaSourceCard,
  SefariaTextSegment,
} from "@sefaria/components";
import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sefaria-text-segment": DetailedHTMLProps<
        HTMLAttributes<SefariaTextSegment>,
        SefariaTextSegment
      > & { ref?: Ref<SefariaTextSegment> };
      "sefaria-source-card": DetailedHTMLProps<
        HTMLAttributes<SefariaSourceCard>,
        SefariaSourceCard
      > & { ref?: Ref<SefariaSourceCard> };
      "sefaria-connections-panel": DetailedHTMLProps<
        HTMLAttributes<SefariaConnectionsPanel>,
        SefariaConnectionsPanel
      > & { ref?: Ref<SefariaConnectionsPanel> };
      "sefaria-reader": DetailedHTMLProps<
        HTMLAttributes<SefariaReader>,
        SefariaReader
      > & { ref?: Ref<SefariaReader> };
    }
  }
}

export {};

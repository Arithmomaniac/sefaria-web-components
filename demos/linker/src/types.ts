import type { SefariaClient } from "@sefaria/client";

export interface LinkerOptions {
  readonly client?: SefariaClient;
  readonly baseUrl?: string;
  readonly contentSelector?: string;
  readonly includeSelectors?: readonly string[];
  readonly excludeSelectors?: readonly string[];
  readonly signal?: AbortSignal;
}

export interface LinkerResult {
  readonly state: "complete";
  readonly linked: number;
  readonly skipped: number;
}

export interface SefariaLinkerApi {
  readonly version: string;
  link(options?: LinkerOptions): Promise<LinkerResult>;
  destroy(): void;
}

export interface CitationTarget {
  readonly tref: string;
  readonly url: string;
}

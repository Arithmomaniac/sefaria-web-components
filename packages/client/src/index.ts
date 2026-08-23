import type { TextResponse } from "@sefaria/model";

export interface CacheAdapter {
  get(key: string): TextResponse | undefined;
  set(key: string, value: TextResponse): void;
}

export interface SefariaClientOptions {
  host?: string;
  cache?: CacheAdapter;
  fetch?: typeof fetch;
}

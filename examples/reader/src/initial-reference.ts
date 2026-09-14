/** Reads a deep-linked initial Reader reference with a bounded fallback. */
export function initialReaderReference(search: string): string {
  return new URLSearchParams(search).get("tref")?.trim() || "Micah 6:8";
}

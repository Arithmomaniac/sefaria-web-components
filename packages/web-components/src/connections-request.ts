import type { GetLinksData } from "@sefaria/client";

import type { ConnectionsRequest } from "./connections-panel.js";

/** Serializes links query defaults for every connections request path. */
export function createConnectionsQuery(
  request: ConnectionsRequest,
): NonNullable<GetLinksData["query"]> {
  return {
    with_text: request.withText === false ? "0" : "1",
    with_sheet_links: "0",
  };
}

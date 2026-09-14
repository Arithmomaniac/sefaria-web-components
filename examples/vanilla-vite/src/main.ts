import { createSefariaClient } from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import { loadSourceCardViewModel } from "@sefaria/web-components/source-card";

import payload from "./micah-6-8.json";
import "./style.css";

const status = document.querySelector<HTMLElement>("#status");
const card = document.querySelector<SefariaSourceCard>("sefaria-source-card");
if (!status || !card) {
  throw new Error("The vanilla example host is incomplete.");
}

let requestCount = 0;
const client = createSefariaClient({
  baseUrl: "https://example.invalid",
  cache: false,
  fetch: async () => {
    requestCount += 1;
    return Response.json(payload);
  },
});

card.viewModel = await loadSourceCardViewModel({ tref: "Micah 6:8" }, client);
status.textContent =
  "Rendered Micah 6:8 from a deterministic validated response.";
status.dataset.requestCount = String(requestCount);

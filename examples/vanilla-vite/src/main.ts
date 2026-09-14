import {
  createSefariaClient,
  type CoreV3TextsResponse,
  zCoreV3TextsResponse,
} from "@sefaria/client";
import "@sefaria/web-components";
import type { SefariaSourceCard } from "@sefaria/web-components";
import {
  createSourceCardViewModel,
  loadSourceCardViewModel,
} from "@sefaria/web-components/source-card";

import payload from "./micah-6-8.json";
import { createMicahFixtureFetch } from "./fixture-transport.js";
import "./style.css";

const status = requireElement<HTMLElement>("#status");
const loadButton = requireElement<HTMLButtonElement>("#load-fixture");
const card = requireElement<SefariaSourceCard>("sefaria-source-card");

const validatedPayload = zCoreV3TextsResponse.parse(
  payload,
) as CoreV3TextsResponse;
let requestCount = 0;
const client = createSefariaClient({
  baseUrl: "https://example.invalid",
  cache: false,
  fetch: async (input, init) => {
    requestCount += 1;
    return createMicahFixtureFetch(payload)(input, init);
  },
});

card.viewModel = createSourceCardViewModel(validatedPayload, {
  tref: "Micah 6:8",
});
card.selectable = true;
updateStatus("Rendered supplied Micah 6:8 data with zero requests.");

loadButton.addEventListener("click", () => {
  void loadThroughClient();
});

async function loadThroughClient(): Promise<void> {
  const previousViewModel = card.viewModel;
  loadButton.disabled = true;
  card.viewModel = {
    state: "loading",
    message: "Loading Micah 6:8 through the public client.",
  };
  updateStatus("Loading the deterministic response through the public client.");
  try {
    card.viewModel = await loadSourceCardViewModel(
      { tref: "Micah 6:8" },
      client,
    );
    updateStatus("Loaded Micah 6:8 through the public client.");
  } catch (error) {
    card.viewModel = previousViewModel;
    updateStatus(error instanceof Error ? error.message : String(error));
  } finally {
    loadButton.disabled = false;
  }
}

function updateStatus(message: string): void {
  status.textContent = message;
  status.dataset.requestCount = String(requestCount);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The vanilla example requires ${selector}.`);
  }
  return element;
}

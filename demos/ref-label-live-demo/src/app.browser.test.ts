import type {
  RefLabelDataViewModel,
  SefariaRefLabel,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import { startRefLabelLiveDemo, type RefLabelLoader } from "./app.js";

const FIRST_RESULT = createDataViewModel("Genesis 1:1");

beforeEach(() => {
  document.body.innerHTML = `
    <form id="ref-request-form">
      <input name="tref" value="Genesis 1:1">
      <select name="labelLanguage">
        <option value="english">English</option>
        <option value="hebrew">Hebrew</option>
        <option value="both" selected>Both</option>
      </select>
      <input name="linked" type="checkbox" checked>
      <button type="submit">Load reference</button>
    </form>
    <button type="button" data-demo-request data-tref="Genesis 1:2">Preset</button>
    <button type="button" data-demo-request data-tref="Genesis 1:3">Second</button>
    <p id="request-state"></p>
    <p id="host-error" hidden></p>
    <sefaria-ref-label id="ref-result"></sefaria-ref-label>
  `;
});

test("loads a preset and supplies presentation plus view-model state", async () => {
  const loader = vi.fn<RefLabelLoader>(async () => FIRST_RESULT);
  startRefLabelLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

  expect(loader.mock.calls[0]?.[0]).toEqual({ tref: "Genesis 1:2" });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(resultElement().labelLanguage).toBe("both");
  expect(resultElement().linked).toBe(true);
  expect(requestState().dataset.state).toBe("data");
});

test("binds rejected operations to the host error element", async () => {
  const loader = vi.fn<RefLabelLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startRefLabelLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toBe("Network unavailable");
});

function resultElement(): SefariaRefLabel {
  const element = document.querySelector<SefariaRefLabel>("#ref-result");
  if (!element) {
    throw new Error("The reference result element is missing.");
  }
  return element;
}

function requestState(): HTMLElement {
  const element = document.querySelector<HTMLElement>("#request-state");
  if (!element) {
    throw new Error("The request state element is missing.");
  }
  return element;
}

function createDataViewModel(normalized: string): RefLabelDataViewModel {
  return {
    state: "data",
    normalized,
    hebrew: "בראשית א׳:א׳",
    urlRef: "Genesis.1.1",
    url: "https://www.sefaria.org/Genesis.1.1",
    indexTitle: "Genesis",
    nodeType: "JaggedArrayNode",
  };
}

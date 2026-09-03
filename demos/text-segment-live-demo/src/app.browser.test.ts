import type {
  SefariaTextSegment,
  TextSegmentDataViewModel,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import { startTextSegmentLiveDemo, type TextSegmentLoader } from "./app.js";

const FIRST_RESULT = createDataViewModel("First result");

beforeEach(() => {
  document.body.innerHTML = '<div id="live-demo-root"></div>';
});

test("loads a preset through the host and supplies its view model to the element", async () => {
  const loader = vi.fn<TextSegmentLoader>(async () => FIRST_RESULT);
  startTextSegmentLiveDemo(document, loader);

  document
    .querySelector<HTMLButtonElement>('[data-demo-id="english-footnote"]')
    ?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

  expect(loader.mock.calls[0]?.[0]).toEqual({
    tref: "Genesis 1:1",
    version: {
      language: "english",
      versionTitle: "The Contemporary Torah, Jewish Publication Society, 2006",
    },
  });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(requestState().dataset.state).toBe("data");
});

test("renders the text-segment controls and presets from its configuration", () => {
  startTextSegmentLiveDemo(document, async () => FIRST_RESULT);

  expect(document.querySelector("h1")?.textContent).toBe(
    "Live text-segment demo",
  );
  expect(document.querySelectorAll("[data-demo-request]")).toHaveLength(5);
  expect(
    document.querySelector<HTMLInputElement>('[name="language"]')?.value,
  ).toBe("hebrew");
  expect(resultElement().localName).toBe("sefaria-text-segment");
});

test("binds rejected operations to the host error element", async () => {
  const loader = vi.fn<TextSegmentLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startTextSegmentLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>('[data-demo-id="hebrew"]')?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toBe("Network unavailable");
});

function resultElement(): SefariaTextSegment {
  const element = document.querySelector<SefariaTextSegment>(
    "sefaria-text-segment",
  );
  if (!element) {
    throw new Error("The text result element is missing.");
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

function createDataViewModel(versionTitle: string): TextSegmentDataViewModel {
  return {
    state: "data",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    language: "en",
    actualLanguage: "en",
    direction: "ltr",
    body: [{ kind: "html", html: versionTitle }],
    notes: [],
    attribution: {
      versionTitle,
      versionSource: null,
    },
  };
}

import type {
  SefariaTextSegment,
  TextSegmentDataViewModel,
  TextSegmentViewModel,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import { startTextSegmentLiveDemo, type TextSegmentLoader } from "./app.js";

const FIRST_RESULT = createDataViewModel("First result");
const SECOND_RESULT = createDataViewModel("Second result");

beforeEach(() => {
  document.body.innerHTML = `
    <form id="text-request-form">
      <input name="tref" value="Genesis 1:1">
      <input name="language" value="hebrew">
      <input name="versionTitle" value="">
      <button type="submit">Load text</button>
    </form>
    <button
      type="button"
      data-demo-request
      data-tref="Genesis 1:1"
      data-language="english"
      data-version-title="The Contemporary Torah, Jewish Publication Society, 2006"
    >English footnote</button>
    <button
      type="button"
      data-demo-request
      data-tref="Genesis 1"
      data-language="hebrew"
    >Wrong granularity</button>
    <p id="request-state"></p>
    <p id="host-error" hidden></p>
    <sefaria-text-segment id="text-result"></sefaria-text-segment>
  `;
});

test("loads a preset through the host and supplies its view model to the element", async () => {
  const loader = vi.fn<TextSegmentLoader>(async () => FIRST_RESULT);
  startTextSegmentLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
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

test("aborts the old operation and ignores its stale result", async () => {
  let resolveFirst!: (value: TextSegmentViewModel) => void;
  let resolveSecond!: (value: TextSegmentViewModel) => void;
  const first = new Promise<TextSegmentViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<TextSegmentViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const loader = vi.fn<TextSegmentLoader>(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  startTextSegmentLiveDemo(document, loader);

  const presets = document.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  );
  presets[0]?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  presets[1]?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond(SECOND_RESULT);
  await vi.waitFor(() =>
    expect(resultElement().viewModel).toEqual(SECOND_RESULT),
  );
  resolveFirst(FIRST_RESULT);
  await Promise.resolve();
  expect(resultElement().viewModel).toEqual(SECOND_RESULT);
});

test("shows a network failure outside the component view model", async () => {
  const loader = vi.fn<TextSegmentLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startTextSegmentLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toContain("Network unavailable");
  expect(resultElement().viewModel.state).toBe("loading");
});

function resultElement(): SefariaTextSegment {
  const element = document.querySelector<SefariaTextSegment>("#text-result");
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

import type {
  BilingualSegmentDataViewModel,
  BilingualSegmentViewModel,
  SefariaBilingualSegment,
  TextSegmentDataViewModel,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import {
  startBilingualSegmentLiveDemo,
  type BilingualSegmentLoader,
} from "./app.js";

const FIRST_RESULT = createDataViewModel("First result");
const SECOND_RESULT = createDataViewModel("Second result");

beforeEach(() => {
  document.body.innerHTML = `
    <form id="bilingual-request-form">
      <input name="tref" value="Genesis 1:1">
      <input name="primaryVersionTitle" value="">
      <input name="translationVersionTitle" value="">
      <button type="submit">Load pair</button>
    </form>
    <button
      type="button"
      data-demo-request
      data-tref="Genesis 1:1"
      data-primary-version-title="Miqra according to the Masorah"
      data-translation-version-title="The Contemporary Torah, Jewish Publication Society, 2006"
    >Exact editions</button>
    <button
      type="button"
      data-demo-request
      data-tref="Genesis 1"
    >Wrong granularity</button>
    <form id="display-form">
      <select name="contentLanguage">
        <option value="both" selected>Both</option>
        <option value="primary">Primary</option>
      </select>
      <select name="layout">
        <option value="auto" selected>Auto</option>
        <option value="stacked">Stacked</option>
      </select>
      <select name="sideOrder">
        <option value="primary-first" selected>Primary first</option>
        <option value="translation-first">Translation first</option>
      </select>
    </form>
    <p id="request-state"></p>
    <p id="host-error" hidden></p>
    <sefaria-bilingual-segment id="bilingual-result"></sefaria-bilingual-segment>
  `;
});

test("loads a preset through the host and supplies its view model to the element", async () => {
  const loader = vi.fn<BilingualSegmentLoader>(async () => FIRST_RESULT);
  startBilingualSegmentLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

  expect(loader.mock.calls[0]?.[0]).toEqual({
    tref: "Genesis 1:1",
    primary: { versionTitle: "Miqra according to the Masorah" },
    translation: {
      versionTitle: "The Contemporary Torah, Jewish Publication Society, 2006",
    },
  });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(requestState().dataset.state).toBe("data");
});

test("omits an unfilled edition instead of requesting a blank version title", async () => {
  const loader = vi.fn<BilingualSegmentLoader>(async () => FIRST_RESULT);
  startBilingualSegmentLiveDemo(document, loader);

  const presets = document.querySelectorAll<HTMLButtonElement>(
    "[data-demo-request]",
  );
  presets[1]?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

  expect(loader.mock.calls[0]?.[0]).toEqual({ tref: "Genesis 1" });
});

test("applies the display settings to the element without a request", async () => {
  const loader = vi.fn<BilingualSegmentLoader>(async () => FIRST_RESULT);
  startBilingualSegmentLiveDemo(document, loader);

  expect(resultElement().contentLanguage).toBe("both");
  expect(resultElement().layout).toBe("auto");
  expect(resultElement().sideOrder).toBe("primary-first");

  const displayForm = document.querySelector<HTMLFormElement>("#display-form");
  selectValue(displayForm, "contentLanguage", "primary");
  selectValue(displayForm, "layout", "stacked");
  selectValue(displayForm, "sideOrder", "translation-first");
  displayForm?.dispatchEvent(new Event("change", { bubbles: true }));

  expect(resultElement().contentLanguage).toBe("primary");
  expect(resultElement().layout).toBe("stacked");
  expect(resultElement().sideOrder).toBe("translation-first");
  expect(loader).not.toHaveBeenCalled();
});

test("aborts the old operation and ignores its stale result", async () => {
  let resolveFirst!: (value: BilingualSegmentViewModel) => void;
  let resolveSecond!: (value: BilingualSegmentViewModel) => void;
  const first = new Promise<BilingualSegmentViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<BilingualSegmentViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const loader = vi.fn<BilingualSegmentLoader>(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  startBilingualSegmentLiveDemo(document, loader);

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
  const loader = vi.fn<BilingualSegmentLoader>(async () => {
    throw new Error("Network unavailable");
  });
  startBilingualSegmentLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(requestState().dataset.state).toBe("error"));

  const hostError = document.querySelector<HTMLElement>("#host-error");
  expect(hostError?.hidden).toBe(false);
  expect(hostError?.textContent).toContain("Network unavailable");
  expect(resultElement().viewModel.state).toBe("loading");
});

function selectValue(
  form: HTMLFormElement | null,
  name: string,
  value: string,
): void {
  const select = form?.elements.namedItem(name);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`The ${name} select is missing.`);
  }
  select.value = value;
}

function resultElement(): SefariaBilingualSegment {
  const element =
    document.querySelector<SefariaBilingualSegment>("#bilingual-result");
  if (!element) {
    throw new Error("The bilingual result element is missing.");
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

function createDataViewModel(label: string): BilingualSegmentDataViewModel {
  const side = (
    language: "he" | "en",
    direction: "rtl" | "ltr",
  ): TextSegmentDataViewModel => ({
    state: "data",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    language,
    actualLanguage: language,
    direction,
    body: [{ kind: "html", html: `${label} (${language})` }],
    notes: [],
    attribution: { versionTitle: label, versionSource: null },
  });

  return {
    state: "data",
    ref: "Genesis 1:1",
    heRef: "בראשית א׳:א׳",
    primary: side("he", "rtl"),
    translation: side("en", "ltr"),
  };
}

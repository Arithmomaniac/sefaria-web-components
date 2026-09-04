import type {
  SefariaSourceCard,
  SourceCardDataViewModel,
  SourceCardViewModel,
} from "@sefaria/components";
import { beforeEach, expect, test, vi } from "vitest";

import { startSourceCardLiveDemo, type SourceCardLoader } from "./app.js";

const FIRST_RESULT = createDataViewModel("First");
const SECOND_RESULT = createDataViewModel("Second");

beforeEach(() => {
  document.body.innerHTML = `
    <form id="source-card-form">
      <input name="tref" value="Genesis 1:1-3">
      <input name="primaryVersionTitle" value="">
      <input name="translationVersionTitle" value="">
      <button type="submit">Load</button>
    </form>
    <button type="button" data-demo-request data-tref="Likutei Moharan 1">Preset</button>
    <form id="display-form">
      <select name="contentLanguage"><option value="both">Both</option><option value="primary">Primary</option></select>
      <select name="layout"><option value="auto">Auto</option><option value="stacked">Stacked</option></select>
      <select name="sideOrder"><option value="primary-first">Primary</option><option value="translation-first">Translation</option></select>
    </form>
    <p id="request-state"></p>
    <p id="host-error" hidden></p>
    <sefaria-source-card id="source-card-result"></sefaria-source-card>
  `;
});

test("loads a preset and supplies the result to the request-free element", async () => {
  const loader = vi.fn<SourceCardLoader>(async () => FIRST_RESULT);
  startSourceCardLiveDemo(document, loader);

  document.querySelector<HTMLButtonElement>("[data-demo-request]")?.click();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

  expect(loader.mock.calls[0]?.[0]).toEqual({ tref: "Likutei Moharan 1" });
  expect(resultElement().viewModel).toEqual(FIRST_RESULT);
  expect(requestState().textContent).toContain("1 items from one request");
});

test("applies display settings without requesting", () => {
  const loader = vi.fn<SourceCardLoader>(async () => FIRST_RESULT);
  startSourceCardLiveDemo(document, loader);
  const form = document.querySelector<HTMLFormElement>("#display-form");

  selectValue(form, "contentLanguage", "primary");
  selectValue(form, "layout", "stacked");
  selectValue(form, "sideOrder", "translation-first");
  form?.dispatchEvent(new Event("change", { bubbles: true }));

  expect(resultElement().contentLanguage).toBe("primary");
  expect(resultElement().layout).toBe("stacked");
  expect(resultElement().sideOrder).toBe("translation-first");
  expect(loader).not.toHaveBeenCalled();
});

test("aborts the old operation and ignores its stale result", async () => {
  let resolveFirst!: (value: SourceCardViewModel) => void;
  let resolveSecond!: (value: SourceCardViewModel) => void;
  const first = new Promise<SourceCardViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<SourceCardViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const loader = vi.fn<SourceCardLoader>(async (_request, signal) => {
    signals.push(signal);
    return signals.length === 1 ? await first : await second;
  });
  const demo = startSourceCardLiveDemo(document, loader);

  const firstLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  const secondLoad = demo.loadCurrentRequest();
  await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond(SECOND_RESULT);
  await secondLoad;
  resolveFirst(FIRST_RESULT);
  await firstLoad;
  expect(resultElement().viewModel).toEqual(SECOND_RESULT);
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

function resultElement(): SefariaSourceCard {
  const element = document.querySelector<SefariaSourceCard>(
    "#source-card-result",
  );
  if (!element) {
    throw new Error("The source-card result element is missing.");
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

function createDataViewModel(label: string): SourceCardDataViewModel {
  return {
    state: "data",
    header: {
      ref: "Genesis 1:1",
      heRef: "בראשית א׳:א׳",
      indexTitle: "Genesis",
      heIndexTitle: "בראשית",
      primaryCategory: "Tanakh",
      categories: ["Tanakh", "Torah"],
    },
    items: [
      {
        position: [],
        pair: {
          state: "partial",
          present: {
            side: "primary",
            view: {
              state: "data",
              ref: "Genesis 1:1",
              heRef: "בראשית א׳:א׳",
              language: "he",
              actualLanguage: "he",
              direction: "rtl",
              body: [{ kind: "html", html: label }],
              notes: [],
              attribution: { versionTitle: label, versionSource: null },
            },
          },
          absent: { side: "translation", message: "No translation." },
        },
      },
    ],
  };
}

import { createSefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  SefariaTextSegment,
  TextSegmentRequest,
  TextSegmentViewModel,
} from "@sefaria/components";
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { useElementProperty } from "./element-property.js";
import { useFactoryViewModel } from "./factory-binding.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const loading: TextSegmentViewModel = {
  state: "loading",
  message: "Loading.",
};
const first: TextSegmentViewModel = {
  state: "empty",
  ref: "Micah 6:8",
  heRef: "מיכה ו׳:ח׳",
  message: "First",
  warnings: [],
};
const second: TextSegmentViewModel = {
  state: "empty",
  ref: "Obadiah 1:1",
  heRef: "עובדיה א׳:א׳",
  message: "Second",
  warnings: [],
};

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("assigns new factory results to one persistent Web Component", async () => {
  const factory = vi
    .fn<
      (
        request: TextSegmentRequest,
        client: ReturnType<typeof createSefariaClient>,
        signal: AbortSignal,
      ) => Promise<TextSegmentViewModel>
    >()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second);
  const client = createSefariaClient({ cache: false });

  function Harness({ tref }: { readonly tref: string }) {
    const request: TextSegmentRequest = {
      tref,
      version: { language: "english" },
    };
    const result = useFactoryViewModel(request, loading, factory, client);
    const ref = useRef<SefariaTextSegment>(null);
    useElementProperty(ref, "viewModel", result.viewModel);
    return <sefaria-text-segment ref={ref} />;
  }

  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness tref="Micah 6:8" />));
  await vi.waitFor(() =>
    expect(
      container.querySelector<SefariaTextSegment>("sefaria-text-segment")
        ?.viewModel,
    ).toEqual(first),
  );
  const element = container.querySelector("sefaria-text-segment");

  await act(async () => root?.render(<Harness tref="Obadiah 1:1" />));
  await vi.waitFor(() =>
    expect(
      container.querySelector<SefariaTextSegment>("sefaria-text-segment")
        ?.viewModel,
    ).toEqual(second),
  );

  expect(container.querySelector("sefaria-text-segment")).toBe(element);
  expect(factory).toHaveBeenCalledTimes(2);
});

test("assigns a stable view model when the element mounts on a later render", async () => {
  function Harness({ show }: { readonly show: boolean }) {
    const ref = useRef<SefariaTextSegment>(null);
    useElementProperty(ref, "viewModel", first);
    return show ? <sefaria-text-segment ref={ref} /> : null;
  }

  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness show={false} />));
  await act(async () => root?.render(<Harness show />));

  expect(
    container.querySelector<SefariaTextSegment>("sefaria-text-segment")
      ?.viewModel,
  ).toEqual(first);
});

test("aborts the superseded request and ignores its late result", async () => {
  let resolveFirst!: (value: TextSegmentViewModel) => void;
  let resolveSecond!: (value: TextSegmentViewModel) => void;
  const firstPromise = new Promise<TextSegmentViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const secondPromise = new Promise<TextSegmentViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const factory = vi.fn(
    async (
      _request: TextSegmentRequest,
      _client: ReturnType<typeof createSefariaClient>,
      signal: AbortSignal,
    ) => {
      signals.push(signal);
      return signals.length === 1 ? await firstPromise : await secondPromise;
    },
  );
  const client = createSefariaClient({ cache: false });

  function Harness({ tref }: { readonly tref: string }) {
    const result = useFactoryViewModel(
      { tref, version: { language: "english" } },
      loading,
      factory,
      client,
    );
    const ref = useRef<SefariaTextSegment>(null);
    useElementProperty(ref, "viewModel", result.viewModel);
    return <sefaria-text-segment ref={ref} />;
  }

  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness tref="Micah 6:8" />));
  await vi.waitFor(() => expect(factory).toHaveBeenCalledOnce());
  await act(async () => root?.render(<Harness tref="Obadiah 1:1" />));
  await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
  expect(signals[0]?.aborted).toBe(true);

  await act(async () => resolveSecond(second));
  await vi.waitFor(() =>
    expect(
      container.querySelector<SefariaTextSegment>("sefaria-text-segment")
        ?.viewModel,
    ).toEqual(second),
  );
  await act(async () => resolveFirst(first));

  expect(
    container.querySelector<SefariaTextSegment>("sefaria-text-segment")
      ?.viewModel,
  ).toEqual(second);
});

test("reloads an unchanged submitted request", async () => {
  const factory = vi
    .fn<
      (
        request: TextSegmentRequest,
        client: ReturnType<typeof createSefariaClient>,
        signal: AbortSignal,
      ) => Promise<TextSegmentViewModel>
    >()
    .mockResolvedValue(first);
  const client = createSefariaClient({ cache: false });

  function Harness() {
    const result = useFactoryViewModel(
      { tref: "Micah 6:8", version: { language: "english" } },
      loading,
      factory,
      client,
    );
    return (
      <button type="button" onClick={result.reload}>
        Reload
      </button>
    );
  }

  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
  await vi.waitFor(() => expect(factory).toHaveBeenCalledOnce());

  await act(async () => {
    container.querySelector("button")?.click();
  });

  await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
});

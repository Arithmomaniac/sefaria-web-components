import { expect, test, vi } from "vitest";

import { createLiveDemoRunner } from "./live-demo-core.js";

interface TestViewModel {
  readonly state: "loading" | "data";
  readonly value: string;
}

test("owns the shared loading, success, and failure presentation", async () => {
  const requestState = document.createElement("p");
  const hostError = document.createElement("p");
  const submitButton = document.createElement("button");
  const viewModels: TestViewModel[] = [];
  const loader = vi
    .fn<(request: string, signal: AbortSignal) => Promise<TestViewModel>>()
    .mockResolvedValueOnce({ state: "data", value: "loaded" })
    .mockRejectedValueOnce(new Error("Network unavailable"));
  const runner = createLiveDemoRunner<string, TestViewModel>({
    loader,
    createLoadingViewModel: (request) => ({
      state: "loading",
      value: request,
    }),
    setViewModel: (viewModel) => viewModels.push(viewModel),
    formatRequest: (request) => `Request ${request}`,
    requestState,
    hostError,
    submitButton,
  });

  await runner.run("first");

  expect(viewModels).toEqual([
    { state: "loading", value: "first" },
    { state: "data", value: "loaded" },
  ]);
  expect(requestState.dataset.state).toBe("data");
  expect(requestState.textContent).toBe("Request first produced data.");
  expect(hostError.hidden).toBe(true);
  expect(submitButton.disabled).toBe(false);

  await runner.run("second");

  expect(viewModels.at(-1)).toEqual({
    state: "loading",
    value: "second",
  });
  expect(requestState.dataset.state).toBe("error");
  expect(requestState.textContent).toBe("Request second could not complete.");
  expect(hostError.hidden).toBe(false);
  expect(hostError.textContent).toBe("Network unavailable");
  expect(submitButton.disabled).toBe(false);
});

test("aborts the old operation and ignores its stale result", async () => {
  let resolveFirst!: (value: TestViewModel) => void;
  let resolveSecond!: (value: TestViewModel) => void;
  const first = new Promise<TestViewModel>((resolve) => {
    resolveFirst = resolve;
  });
  const second = new Promise<TestViewModel>((resolve) => {
    resolveSecond = resolve;
  });
  const signals: AbortSignal[] = [];
  const viewModels: TestViewModel[] = [];
  const runner = createLiveDemoRunner<string, TestViewModel>({
    loader: async (_request: string, signal: AbortSignal) => {
      signals.push(signal);
      return signals.length === 1 ? await first : await second;
    },
    createLoadingViewModel: (request) => ({
      state: "loading",
      value: request,
    }),
    setViewModel: (viewModel) => viewModels.push(viewModel),
    formatRequest: (request) => request,
    requestState: document.createElement("p"),
    hostError: document.createElement("p"),
    submitButton: document.createElement("button"),
  });

  const firstRun = runner.run("first");
  const secondRun = runner.run("second");
  expect(signals[0]?.aborted).toBe(true);

  resolveSecond({ state: "data", value: "second" });
  await secondRun;
  resolveFirst({ state: "data", value: "first" });
  await firstRun;

  expect(viewModels).toEqual([
    { state: "loading", value: "first" },
    { state: "loading", value: "second" },
    { state: "data", value: "second" },
  ]);
});

test("ignores an abort rejection from a superseded operation", async () => {
  const requestState = document.createElement("p");
  const hostError = document.createElement("p");
  const viewModels: TestViewModel[] = [];
  let callCount = 0;
  const runner = createLiveDemoRunner<string, TestViewModel>({
    loader: async (_request: string, signal: AbortSignal) => {
      callCount += 1;
      if (callCount === 2) {
        return { state: "data", value: "second" };
      }
      return await new Promise<TestViewModel>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Obsolete request", "AbortError")),
          { once: true },
        );
      });
    },
    createLoadingViewModel: (request) => ({
      state: "loading",
      value: request,
    }),
    setViewModel: (viewModel) => viewModels.push(viewModel),
    formatRequest: (request) => request,
    requestState,
    hostError,
    submitButton: document.createElement("button"),
  });

  const firstRun = runner.run("first");
  const secondRun = runner.run("second");
  await Promise.all([firstRun, secondRun]);

  expect(viewModels).toEqual([
    { state: "loading", value: "first" },
    { state: "loading", value: "second" },
    { state: "data", value: "second" },
  ]);
  expect(requestState.dataset.state).toBe("data");
  expect(hostError.hidden).toBe(true);
  expect(hostError.textContent).toBe("");
});

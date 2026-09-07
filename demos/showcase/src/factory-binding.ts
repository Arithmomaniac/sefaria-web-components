import type { SefariaClient } from "@sefaria/client";
import { useEffect, useMemo, useRef, useState } from "react";

export interface FactoryBinding<TViewModel> {
  readonly viewModel: TViewModel;
  readonly error?: string;
  readonly reload: () => void;
}

export function useFactoryViewModel<TRequest, TViewModel>(
  request: TRequest,
  loading: TViewModel,
  factory: (
    request: TRequest,
    client: SefariaClient,
    signal: AbortSignal,
  ) => Promise<TViewModel>,
  client: SefariaClient,
): FactoryBinding<TViewModel> {
  const requestKey = JSON.stringify(request);
  const effectiveRequest = useMemo(
    () => JSON.parse(requestKey) as TRequest,
    [requestKey],
  );
  const [revision, setRevision] = useState(0);
  const [viewModel, setViewModel] = useState(loading);
  const [error, setError] = useState<string>();
  const operation = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);
  const pending = useRef(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin) return;
      const message = event.data as {
        readonly type?: string;
        readonly active?: boolean;
      };
      if (
        message.type !== "sefaria-showcase-active" ||
        message.active !== false ||
        !pending.current
      ) {
        return;
      }
      operation.current += 1;
      pending.current = false;
      controller.current?.abort();
      setError(
        "Request interrupted when the preview left the active slide. Select Load to try again.",
      );
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      { type: "sefaria-showcase-ready" },
      location.origin,
    );
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const currentController = new AbortController();
    controller.current = currentController;
    const expectedOperation = ++operation.current;
    pending.current = true;
    setViewModel(loading);
    setError(undefined);
    void factory(effectiveRequest, client, currentController.signal).then(
      (next) => {
        if (
          !currentController.signal.aborted &&
          expectedOperation === operation.current
        ) {
          pending.current = false;
          setViewModel(next);
        }
      },
      (reason: unknown) => {
        if (
          !currentController.signal.aborted &&
          expectedOperation === operation.current
        ) {
          pending.current = false;
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      },
    );
    return () => {
      pending.current = false;
      currentController.abort();
    };
  }, [client, effectiveRequest, factory, loading, revision]);

  return {
    viewModel,
    ...(error === undefined ? {} : { error }),
    reload: () => setRevision((value) => value + 1),
  };
}

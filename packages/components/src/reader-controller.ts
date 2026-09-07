import { getLinks, getV3Texts, type SefariaClient } from "@sefaria/client";

import { createConnectionsQuery } from "./connections-request.js";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
} from "./connections-panel.js";
import { createReaderViewModel, type ReaderViewModel } from "./reader.js";
import {
  createReaderConnectionsContent,
  createReaderSession,
  createReaderSourceContent,
  type ReaderConnectionsContent,
  type ReaderEntrySeed,
  type ReaderPresentationPatch,
  type ReaderSession,
  type ReaderSessionOptions,
  type ReaderSourceContent,
  type ReaderTransition,
  type ReaderTransitionRejection,
} from "./reader-session.js";
import { serializeSourceCardSelectors } from "./source-card-request.js";
import type {
  SourceCardDataViewModel,
  SourceCardNavigation,
  SourceCardRequest,
} from "./source-card.js";

/** Executes corrected source and connections operations for one reader controller. */
export interface ReaderControllerDataSource {
  /** Loads admitted source content for the exact effective request. */
  loadSource(
    request: SourceCardRequest,
    signal: AbortSignal,
  ): Promise<ReaderSourceContent>;
  /** Loads admitted connections content for the exact request and projection. */
  loadConnections(
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    signal: AbortSignal,
  ): Promise<ReaderConnectionsContent>;
}

/** Machine-readable controller failure kind. */
export type ReaderControllerErrorCode =
  | "disposed"
  | "reentrant-action"
  | "request-mismatch"
  | "source-http"
  | "source-transport"
  | "source-unavailable"
  | "stale-action"
  | ReaderTransitionRejection;

/** Public error for initialization and programmer-invalid controller use. */
export class ReaderControllerError extends Error {
  /** Machine-readable failure kind. */
  readonly code: ReaderControllerErrorCode;
  /** Documented HTTP status, when the source endpoint supplied one. */
  readonly status?: 400 | 404;

  constructor(
    code: ReaderControllerErrorCode,
    message: string,
    status?: 400 | 404,
  ) {
    super(message);
    this.name = "ReaderControllerError";
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

/** Controller execution state outside component-owned connections outcomes. */
export type ReaderControllerTask =
  | { readonly state: "idle" }
  | {
      readonly state: "loading-source";
      readonly originEntryId: string;
      readonly targetRef: string;
    }
  | {
      readonly state: "loading-connections";
      readonly originEntryId: string;
      readonly request: ConnectionsRequest;
    }
  | {
      readonly state: "error";
      readonly code: ReaderControllerErrorCode;
      readonly message: string;
    };

/** Immutable public projection of one stateful reader controller. */
export interface ReaderControllerSnapshot {
  /** Rendering-only model for `<sefaria-reader>`. */
  readonly reader: ReaderViewModel;
  /** Current controller-owned execution state. */
  readonly task: ReaderControllerTask;
}

/** Initial browser-reader connections behavior. */
export interface ReaderControllerInitialConnections {
  /** Whether connected text should be included. Defaults to true. */
  readonly withText?: boolean;
  /** Initial local connections projection. */
  readonly projection?: ConnectionsProjection;
}

/** Browser async-factory options. */
export interface ReaderControllerLoadOptions extends ReaderSessionOptions {
  /** Aborts initialization and rejects the async factory. */
  readonly signal?: AbortSignal;
  /** Initial display-state overrides. */
  readonly presentation?: ReaderPresentationPatch;
  /** Initial connections request and projection options. */
  readonly connections?: ReaderControllerInitialConnections;
}

/** Identified source-selection action emitted by the reader surface. */
export interface ReaderControllerSourceSelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Selected source-card position. */
  readonly position: readonly number[];
  /** Exact selected source reference. */
  readonly ref: string;
}

/** Identified connection-selection action emitted by the reader surface. */
export interface ReaderControllerConnectionSelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Exact connected source reference. */
  readonly targetRef: string;
}

/** Identified connections category action. */
export interface ReaderControllerCategorySelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Selected category, or null for the overview. */
  readonly category: string | null;
}

/** Identified connections page action. */
export interface ReaderControllerPageSelection {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
  /** Zero-based requested page. */
  readonly page: number;
}

/** Identified reader-entry action. */
export interface ReaderControllerEntryAction {
  /** Entry that emitted the action. */
  readonly originEntryId: string;
}

/** Identified breadcrumb activation action. */
export interface ReaderControllerHistoryAction extends ReaderControllerEntryAction {
  /** Retained entry to activate. */
  readonly entryId: string;
}

/** Identified presentation update. */
export interface ReaderControllerPresentationAction extends ReaderControllerEntryAction {
  /** Presentation values to replace on the current entry. */
  readonly patch: ReaderPresentationPatch;
}

/** Stateful DOM-free reader coordination contract. */
export interface ReaderController {
  /** Current immutable render and task projection. */
  readonly snapshot: ReaderControllerSnapshot;
  /** Subscribes immediately and after every committed snapshot replacement. */
  subscribe(listener: (snapshot: ReaderControllerSnapshot) => void): () => void;
  /** Selects a source row and replaces its connections. */
  selectSource(action: ReaderControllerSourceSelection): Promise<void>;
  /** Opens a connected source as a new reader-history entry. */
  openConnection(action: ReaderControllerConnectionSelection): Promise<void>;
  /** Reprojects the current captured connections category without I/O. */
  setConnectionsCategory(action: ReaderControllerCategorySelection): void;
  /** Reprojects the current captured connections page without I/O. */
  setConnectionsPage(action: ReaderControllerPageSelection): void;
  /** Loads preview text only when the retained capture lacks it. */
  requestConnectionPreviews(action: ReaderControllerEntryAction): Promise<void>;
  /** Applies entry-specific display settings. */
  setPresentation(action: ReaderControllerPresentationAction): void;
  /** Restores the retained predecessor without I/O. */
  back(action: ReaderControllerEntryAction): void;
  /** Activates a retained breadcrumb and discards later history. */
  activateHistory(action: ReaderControllerHistoryAction): void;
  /** Aborts active work and permanently closes the controller. */
  dispose(): void;
}

interface SourceDestination {
  readonly content: ReaderSourceContent;
  readonly selectedPosition: readonly number[];
  readonly selectedRef: string;
}

interface ActiveOperation {
  readonly generation: number;
  readonly controller: AbortController;
}

type Listener = (snapshot: ReaderControllerSnapshot) => void;

/** Creates a client-backed reader data source with component request defaults. */
export function createSefariaReaderDataSource(
  client: SefariaClient,
): ReaderControllerDataSource {
  return {
    loadSource: async (request, signal) => {
      const result = await getV3Texts({
        client,
        path: { tref: request.tref },
        query: {
          version: serializeSourceCardSelectors(request),
          return_format: "default",
        },
        signal,
      });
      if (result.data !== undefined) {
        return createReaderSourceContent(result.data, request);
      }
      const status = result.response?.status;
      if (result.error !== undefined && (status === 400 || status === 404)) {
        throw new ReaderControllerError(
          "source-http",
          result.error.error,
          status,
        );
      }
      throw new Error("The source request returned no documented response.");
    },
    loadConnections: async (request, projection, signal) => {
      const result = await getLinks({
        client,
        path: { tref: request.tref },
        query: createConnectionsQuery(request),
        signal,
      });
      if (result.data !== undefined) {
        return createReaderConnectionsContent(result.data, request, projection);
      }
      if (result.error !== undefined && result.response.status === 400) {
        return createReaderConnectionsContent(
          result.error,
          request,
          projection,
          400,
        );
      }
      throw new Error("The links request returned no documented response.");
    },
  };
}

/** Loads an initial reader position and returns its continuing controller. */
export async function loadReaderController(
  request: SourceCardRequest,
  client: SefariaClient,
  options: ReaderControllerLoadOptions = {},
): Promise<ReaderController> {
  const dataSource = createSefariaReaderDataSource(client);
  const normalized = normalizeSourceRequest(request);
  const signal = options.signal ?? new AbortController().signal;
  throwIfAborted(signal);
  let destination: SourceDestination;
  try {
    destination = await resolveDestination(normalized, dataSource, signal);
  } catch (error) {
    throwIfAborted(signal);
    if (error instanceof ReaderControllerError) throw error;
    throw new ReaderControllerError("source-transport", errorMessage(error));
  }
  throwIfAborted(signal);
  const controller = new ReaderControllerImpl(
    {
      source: destination.content,
      selectedPosition: destination.selectedPosition,
      ...(options.presentation === undefined
        ? {}
        : { presentation: options.presentation }),
    },
    dataSource,
    options,
  );
  try {
    await controller.loadInitialConnections(
      {
        tref: destination.selectedRef,
        withText: options.connections?.withText !== false,
      },
      options.connections?.projection ?? {},
      signal,
    );
    throwIfAborted(signal);
    return controller;
  } catch (error) {
    controller.dispose();
    throw error;
  }
}

/** Creates a zero-request controller from already admitted reader content. */
export function createReaderController(
  seed: ReaderEntrySeed,
  dataSource: ReaderControllerDataSource,
  options: ReaderSessionOptions = {},
): ReaderController {
  requireNavigableSeed(seed);
  return new ReaderControllerImpl(seed, dataSource, options);
}

class ReaderControllerImpl implements ReaderController {
  #session: ReaderSession;
  readonly #dataSource: ReaderControllerDataSource;
  #task: ReaderControllerTask = { state: "idle" };
  #snapshot: ReaderControllerSnapshot;
  #listeners = new Set<Listener>();
  #controller: AbortController | undefined;
  #operationId: string | undefined;
  #generation = 0;
  #disposed = false;
  #notifying = false;

  constructor(
    seed: ReaderEntrySeed,
    dataSource: ReaderControllerDataSource,
    options: ReaderSessionOptions,
  ) {
    requireNavigableSeed(seed);
    this.#session = createReaderSession(seed, options);
    this.#dataSource = dataSource;
    this.#snapshot = this.createSnapshot();
  }

  get snapshot(): ReaderControllerSnapshot {
    return this.#snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.assertUsable();
    this.#listeners.add(listener);
    this.notify(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async selectSource(action: ReaderControllerSourceSelection): Promise<void> {
    this.requireCurrent(action.originEntryId);
    const active = this.startPhysicalOperation();
    const selected = this.apply(
      this.#session.selectSourcePosition(action.originEntryId, action.position),
    );
    if (!selected) {
      this.finishPhysicalOperation(active);
      return;
    }
    await this.loadConnections(
      action.originEntryId,
      normalizeConnectionsRequest({ tref: action.ref, withText: true }),
      {},
      active,
    );
  }

  async openConnection(
    action: ReaderControllerConnectionSelection,
  ): Promise<void> {
    this.requireCurrent(action.originEntryId);
    const targetRequest = normalizeSourceRequest({
      tref: action.targetRef,
    });
    const active = this.startPhysicalOperation();
    this.replaceTask({
      state: "loading-source",
      originEntryId: action.originEntryId,
      targetRef: targetRequest.tref,
    });
    let sourceOperationId: string | undefined;
    try {
      const destination = await resolveDestination(
        targetRequest,
        this.#dataSource,
        active.controller.signal,
        (effectiveRequest) => {
          if (!this.isActive(active)) return;
          const begun = this.requireApplied(
            this.#session.beginSourceNavigation(
              action.originEntryId,
              effectiveRequest,
            ),
          );
          this.#session = begun.session;
          sourceOperationId = begun.value.operationId;
          this.#operationId = sourceOperationId;
        },
      );
      if (!this.isActive(active)) return;
      if (!sourceOperationId) {
        this.failTask(
          "source-unavailable",
          "Source navigation did not establish an effective request.",
        );
        return;
      }
      const completed = this.#session.completeSourceNavigation(
        sourceOperationId,
        {
          source: destination.content,
          selectedPosition: destination.selectedPosition,
        },
      );
      this.#session = completed.session;
      if (completed.state === "rejected") {
        this.cancelSessionOperation();
        this.failTask(completed.reason, completed.message);
        return;
      }
      this.#operationId = undefined;
      this.#task = { state: "idle" };
      this.publish();
      await this.loadConnections(
        this.#session.view.currentEntryId,
        normalizeConnectionsRequest({
          tref: destination.selectedRef,
          withText: true,
        }),
        {},
        active,
      );
    } catch (error) {
      if (!this.isActive(active)) return;
      this.cancelSessionOperation();
      this.failTask(classifySourceError(error), errorMessage(error));
    } finally {
      this.finishPhysicalOperation(active);
    }
  }

  setConnectionsCategory(action: ReaderControllerCategorySelection): void {
    this.requireCurrent(action.originEntryId);
    this.apply(
      this.#session.projectConnections(
        action.originEntryId,
        action.category === null ? {} : { category: action.category },
      ),
    );
  }

  setConnectionsPage(action: ReaderControllerPageSelection): void {
    this.requireCurrent(action.originEntryId);
    const current = this.#session.view.current.connections;
    const category =
      current?.state === "view" ? current.projection.category : undefined;
    this.apply(
      this.#session.projectConnections(action.originEntryId, {
        ...(category === undefined ? {} : { category }),
        page: action.page,
      }),
    );
  }

  async requestConnectionPreviews(
    action: ReaderControllerEntryAction,
  ): Promise<void> {
    this.requireCurrent(action.originEntryId);
    const current = this.#session.view.current.connections;
    if (current?.state !== "view") {
      this.failTask(
        "unavailable-capture",
        "Current connections have no completed capture to replace.",
      );
      return;
    }
    if (current.request.withText !== false) return;
    const active = this.startPhysicalOperation();
    await this.loadConnections(
      action.originEntryId,
      normalizeConnectionsRequest({ ...current.request, withText: true }),
      current.projection,
      active,
    );
  }

  setPresentation(action: ReaderControllerPresentationAction): void {
    this.requireCurrent(action.originEntryId);
    this.apply(
      this.#session.setPresentation(action.originEntryId, action.patch),
    );
  }

  back(action: ReaderControllerEntryAction): void {
    this.requireCurrent(action.originEntryId);
    this.cancelActive(false);
    this.apply(this.#session.back());
  }

  activateHistory(action: ReaderControllerHistoryAction): void {
    this.requireCurrent(action.originEntryId);
    this.cancelActive(false);
    this.apply(this.#session.activate(action.entryId));
  }

  dispose(): void {
    if (this.#disposed) return;
    this.cancelActive(false);
    this.#disposed = true;
    this.#listeners.clear();
  }

  async loadInitialConnections(
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    signal: AbortSignal,
  ): Promise<void> {
    const active: ActiveOperation = {
      generation: this.#generation,
      controller: new AbortController(),
    };
    const abort = () => active.controller.abort(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    try {
      await this.loadConnections(
        this.#session.view.currentEntryId,
        normalizeConnectionsRequest(request),
        projection,
        active,
      );
      throwIfAborted(signal);
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }

  private async loadConnections(
    entryId: string,
    request: ConnectionsRequest,
    projection: ConnectionsProjection,
    active: ActiveOperation,
  ): Promise<void> {
    if (!this.isActive(active)) return;
    const normalizedProjection = normalizeProjection(projection);
    const begun = this.requireApplied(
      this.#session.beginConnections(
        entryId,
        request,
        normalizedProjection,
        `Loading connections for ${request.tref}.`,
      ),
    );
    this.#session = begun.session;
    this.#operationId = begun.value.operationId;
    this.replaceTask({
      state: "loading-connections",
      originEntryId: entryId,
      request,
    });
    try {
      const content = await this.#dataSource.loadConnections(
        request,
        normalizedProjection,
        active.controller.signal,
      );
      if (!this.isActive(active)) return;
      const completed = this.#session.completeConnections(
        begun.value.operationId,
        content,
      );
      this.#session = completed.session;
      if (completed.state === "rejected") {
        this.cancelSessionOperation();
        this.failTask(completed.reason, completed.message);
        return;
      }
      this.#operationId = undefined;
      this.#task = { state: "idle" };
      this.publish();
    } catch (error) {
      if (!this.isActive(active)) return;
      const failed = this.#session.failConnections(
        begun.value.operationId,
        errorMessage(error),
      );
      this.#operationId = undefined;
      this.#session = failed.session;
      if (failed.state === "rejected") {
        this.failTask(failed.reason, failed.message);
      } else {
        this.#task = { state: "idle" };
        this.publish();
      }
    } finally {
      this.finishPhysicalOperation(active);
    }
  }

  private startPhysicalOperation(): ActiveOperation {
    this.assertUsable();
    this.cancelActive(false);
    const controller = new AbortController();
    this.#controller = controller;
    return { generation: this.#generation, controller };
  }

  private cancelActive(publish: boolean): void {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#generation += 1;
    this.cancelSessionOperation();
    this.#task = { state: "idle" };
    if (publish) this.publish();
  }

  private cancelSessionOperation(): void {
    if (!this.#operationId) return;
    const cancelled = this.#session.cancelOperation(this.#operationId);
    this.#session = cancelled.session;
    this.#operationId = undefined;
  }

  private finishPhysicalOperation(active: ActiveOperation): void {
    if (this.#controller === active.controller) {
      this.#controller = undefined;
    }
  }

  private isActive(active: ActiveOperation): boolean {
    return (
      !active.controller.signal.aborted &&
      active.generation === this.#generation &&
      !this.#disposed
    );
  }

  private requireCurrent(originEntryId: string): void {
    this.assertUsable();
    if (originEntryId === this.#session.view.currentEntryId) return;
    throw new ReaderControllerError(
      "stale-action",
      `Reader action originated from stale entry ${originEntryId}.`,
    );
  }

  private apply(transition: ReaderTransition): boolean {
    this.#session = transition.session;
    if (transition.state === "rejected") {
      this.failTask(transition.reason, transition.message);
      return false;
    }
    this.#task = { state: "idle" };
    this.publish();
    return true;
  }

  private requireApplied<T>(
    transition: ReaderTransition<T>,
  ): Extract<ReaderTransition<T>, { readonly state: "applied" }> {
    this.#session = transition.session;
    if (transition.state === "rejected") {
      throw new ReaderControllerError(transition.reason, transition.message);
    }
    return transition;
  }

  private failTask(code: ReaderControllerErrorCode, message: string): void {
    this.#task = { state: "error", code, message };
    this.publish();
  }

  private replaceTask(task: ReaderControllerTask): void {
    this.#task = task;
    this.publish();
  }

  private publish(): void {
    this.#snapshot = this.createSnapshot();
    for (const listener of [...this.#listeners]) {
      this.notify(listener);
    }
  }

  private createSnapshot(): ReaderControllerSnapshot {
    return deepFreeze({
      reader: createReaderViewModel(this.#session.view),
      task: { ...this.#task },
    });
  }

  private notify(listener: Listener): void {
    this.#notifying = true;
    try {
      listener(this.#snapshot);
    } catch (error) {
      reportSubscriberError(error);
    } finally {
      this.#notifying = false;
    }
  }

  private assertUsable(): void {
    if (this.#disposed) {
      throw new ReaderControllerError(
        "disposed",
        "Reader controller has been disposed.",
      );
    }
    if (this.#notifying) {
      throw new ReaderControllerError(
        "reentrant-action",
        "Reader actions cannot run during subscriber notification.",
      );
    }
  }
}

async function resolveDestination(
  request: SourceCardRequest,
  dataSource: ReaderControllerDataSource,
  signal: AbortSignal,
  onEffectiveRequest?: (request: SourceCardRequest) => void,
): Promise<SourceDestination> {
  const target = await dataSource.loadSource(request, signal);
  requireMatchingRequest(target.request, request);
  const targetData = requireNavigable(target, request.tref);
  let selectedRef = targetData.viewModel.items.find(
    (item) => item.ref === request.tref,
  )?.ref;
  let content = target;
  let navigation = targetData.navigation;
  if (navigation.state === "context-required") {
    const effective = withTref(request, navigation.contextRef);
    onEffectiveRequest?.(effective);
    content = await dataSource.loadSource(effective, signal);
    requireMatchingRequest(content.request, effective);
    navigation = requireAvailable(
      requireNavigable(content, effective.tref).navigation,
      effective.tref,
    );
  } else if (targetData.viewModel.header.ref !== navigation.sectionRef) {
    const effective = withTref(request, navigation.sectionRef);
    onEffectiveRequest?.(effective);
    content = await dataSource.loadSource(effective, signal);
    requireMatchingRequest(content.request, effective);
    navigation = requireAvailable(
      requireNavigable(content, effective.tref).navigation,
      effective.tref,
    );
  } else {
    onEffectiveRequest?.(target.request);
  }
  const available = requireAvailable(navigation, request.tref);
  const viewModel = requireNavigable(content, request.tref).viewModel;
  selectedRef ??= available.firstRef;
  const selected = viewModel.items.find((item) => item.ref === selectedRef);
  if (!selected) {
    throw new ReaderControllerError(
      "source-unavailable",
      `${selectedRef} is not selectable in ${viewModel.header.ref}.`,
    );
  }
  return {
    content,
    selectedPosition: selected.position,
    selectedRef,
  };
}

function requireNavigable(
  content: ReaderSourceContent,
  label: string,
): {
  readonly viewModel: SourceCardDataViewModel;
  readonly navigation: Exclude<
    SourceCardNavigation,
    { readonly state: "unavailable" }
  >;
} {
  const viewModel = content.viewModel;
  if (viewModel.state !== "data" || !viewModel.navigation) {
    throw new ReaderControllerError(
      "source-unavailable",
      `${label} did not produce selectable source data.`,
    );
  }
  if (viewModel.navigation.state === "unavailable") {
    throw new ReaderControllerError(
      "source-unavailable",
      viewModel.navigation.message,
    );
  }
  return { viewModel, navigation: viewModel.navigation };
}

function requireAvailable(
  navigation: Exclude<SourceCardNavigation, { readonly state: "unavailable" }>,
  label: string,
): Extract<SourceCardNavigation, { readonly state: "available" }> {
  if (navigation.state !== "available") {
    throw new ReaderControllerError(
      "source-unavailable",
      `${label} requires another contextual source request.`,
    );
  }
  return navigation;
}

function requireNavigableSeed(seed: ReaderEntrySeed): void {
  if (!seed.source) return;
  requireNavigable(seed.source, seed.source.request.tref);
}

function requireMatchingRequest(
  actual: SourceCardRequest,
  expected: SourceCardRequest,
): void {
  if (!sameJson(actual, expected)) {
    throw new ReaderControllerError(
      "request-mismatch",
      "Reader data source returned content for a different effective request.",
    );
  }
}

function normalizeSourceRequest(request: SourceCardRequest): SourceCardRequest {
  return deepFreeze({
    ...request,
    tref: request.tref.trim(),
    ...(request.primary === undefined
      ? {}
      : { primary: { ...request.primary } }),
    ...(request.translation === undefined
      ? {}
      : { translation: { ...request.translation } }),
  });
}

function normalizeConnectionsRequest(
  request: ConnectionsRequest,
): ConnectionsRequest {
  return Object.freeze({ ...request, tref: request.tref.trim() });
}

function normalizeProjection(
  projection: ConnectionsProjection,
): ConnectionsProjection {
  return Object.freeze({ ...projection });
}

function withTref(request: SourceCardRequest, tref: string): SourceCardRequest {
  return deepFreeze({ ...request, tref });
}

function classifySourceError(error: unknown): ReaderControllerErrorCode {
  if (error instanceof ReaderControllerError) return error.code;
  return "source-transport";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason !== undefined) throw signal.reason;
  throw new DOMException("The operation was aborted.", "AbortError");
}

function reportSubscriberError(error: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
    return;
  }
  console.error(error);
}

function deepFreeze<Value>(value: Value): Value {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sameJson(left: unknown, right: unknown): boolean {
  const pairs: [unknown, unknown][] = [[left, right]];
  while (pairs.length > 0) {
    const pair = pairs.pop();
    if (!pair) break;
    const [first, second] = pair;
    if (first === second) continue;
    if (
      typeof first !== "object" ||
      first === null ||
      typeof second !== "object" ||
      second === null ||
      Array.isArray(first) !== Array.isArray(second)
    ) {
      return false;
    }
    const entries = Object.entries(first);
    const other = new Map(Object.entries(second));
    if (entries.length !== other.size) return false;
    for (const [key, value] of entries) {
      if (!other.has(key)) return false;
      pairs.push([value, other.get(key)]);
    }
  }
  return true;
}

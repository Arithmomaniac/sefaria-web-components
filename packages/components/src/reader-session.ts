import type { CoreLinkResponse, CoreV3TextsResponse } from "@sefaria/client";

import type {
  BilingualPairContentLanguage,
  BilingualPairLayout,
  BilingualPairSideOrder,
} from "./bilingual-pair.js";
import {
  CONNECTIONS_PAGE_SIZE,
  createConnectionsViewModel,
  type ConnectionsProjection,
  type ConnectionsRequest,
  type ConnectionsViewModel,
} from "./connections-panel.js";
import {
  createSourceCardViewModel,
  type SourceCardRequest,
  type SourceCardViewModel,
} from "./source-card.js";

const DEFAULT_MAX_ENTRIES = 20;
const DEFAULT_MAX_CAPTURE_BYTES = 20 * 1024 * 1024;
const encoder = new TextEncoder();

interface CaptureRecord {
  readonly payload: CoreV3TextsResponse | CoreLinkResponse;
  readonly method: "GET";
  readonly path: string;
  readonly status: 200 | 400;
  readonly effectiveRequest: SourceCardRequest | ConnectionsRequest;
  readonly coverage:
    | { readonly kind: "source"; readonly tref: string }
    | {
        readonly kind: "connections";
        readonly tref: string;
        readonly withText: boolean;
      };
}

const captureRecords = new WeakMap<ReaderCapture, CaptureRecord>();
const sourceContents = new WeakSet<ReaderSourceContent>();
const connectionsContents = new WeakSet<ReaderConnectionsContent>();

/** Opaque immutable corrected-payload capture retained by a reader session. */
export interface ReaderCapture {
  /** Endpoint-backed capture kind. */
  readonly kind: "source" | "connections";
  /** UTF-8 JSON byte size charged once for this capture identity. */
  readonly byteSize: number;
}

/** Source-card content admitted into a reader entry. */
export interface ReaderSourceContent {
  /** Effective source-card request used for projection. */
  readonly request: SourceCardRequest;
  /** Render-ready source-card state. */
  readonly viewModel: SourceCardViewModel;
  /** Opaque successful v3 text capture used to establish the content. */
  readonly capture: ReaderCapture;
}

/** Completed connections-panel content admitted into a reader entry. */
export interface ReaderConnectionsContent {
  /** Effective connections request used for projection. */
  readonly request: ConnectionsRequest;
  /** Current local projection over the captured response. */
  readonly projection: ConnectionsProjection;
  /** Render-ready connections-panel state. */
  readonly viewModel: ConnectionsViewModel;
  /** Opaque links capture retained for covered local reprojection. */
  readonly capture: ReaderCapture;
}

/** Reader-specific connections state when no completed capture is available. */
export interface ReaderConnectionsUnavailable {
  /** Reader slot discriminator. */
  readonly state: "unavailable";
  /** Why the slot cannot currently render endpoint-backed content. */
  readonly reason: "interrupted" | "failed";
  /** Effective request that did not commit. */
  readonly request: ConnectionsRequest;
  /** Requested projection at interruption or failure time. */
  readonly projection: ConnectionsProjection;
  /** Host-supplied terminal message. */
  readonly message: string;
}

/** Reader display state retained with one semantic history entry. */
export interface ReaderPresentation {
  /** Source-card content language selection. */
  readonly contentLanguage: BilingualPairContentLanguage;
  /** Source-card bilingual arrangement. */
  readonly layout: BilingualPairLayout;
  /** First role in a side-by-side source-card layout. */
  readonly sideOrder: BilingualPairSideOrder;
  /** Whether captured connection previews should be displayed. */
  readonly showConnectionPreviews: boolean;
}

/** Optional reader display values overridden while creating or updating an entry. */
export interface ReaderPresentationPatch {
  /** Source-card content language selection. */
  readonly contentLanguage?: BilingualPairContentLanguage;
  /** Source-card bilingual arrangement. */
  readonly layout?: BilingualPairLayout;
  /** First role in a side-by-side source-card layout. */
  readonly sideOrder?: BilingualPairSideOrder;
  /** Whether captured connection previews should be displayed. */
  readonly showConnectionPreviews?: boolean;
}

/** Initial content and local state for one reader history entry. */
export interface ReaderEntrySeed {
  /** Completed source-card content, when present. */
  readonly source?: ReaderSourceContent;
  /** Completed connections-panel content, when present. */
  readonly connections?: ReaderConnectionsContent;
  /** Selected source-card item position. */
  readonly selectedPosition?: readonly number[];
  /** Initial display-state overrides. */
  readonly presentation?: ReaderPresentationPatch;
}

/** Configurable bounded-retention limits for a reader session. */
export interface ReaderSessionOptions {
  /** Maximum retained semantic entries, including current. */
  readonly maxEntries?: number;
  /** Maximum aggregate UTF-8 JSON bytes across unique retained captures. */
  readonly maxCaptureBytes?: number;
}

/** Source-card state exposed to a renderer without its corrected payload. */
export interface ReaderSourceView {
  /** Effective source-card request. */
  readonly request: SourceCardRequest;
  /** Render-ready source-card view model. */
  readonly viewModel: SourceCardViewModel;
}

/** Completed connections state exposed to a renderer without its capture. */
export interface ReaderConnectionsView {
  /** Reader slot discriminator. */
  readonly state: "view";
  /** Effective connections request. */
  readonly request: ConnectionsRequest;
  /** Current local projection. */
  readonly projection: ConnectionsProjection;
  /** Render-ready connections-panel view model. */
  readonly viewModel: ConnectionsViewModel;
}

/** Loading connections state owned by an identified host operation. */
export interface ReaderConnectionsLoading {
  /** Reader slot discriminator. */
  readonly state: "loading";
  /** Effective connections request. */
  readonly request: ConnectionsRequest;
  /** Requested local projection. */
  readonly projection: ConnectionsProjection;
  /** Render-ready loading view model. */
  readonly viewModel: ConnectionsViewModel;
  /** Stable operation identity eligible to complete this slot. */
  readonly operationId: string;
}

/** Connections state exposed by a reader entry. */
export type ReaderConnectionsEntryView =
  | ReaderConnectionsView
  | ReaderConnectionsLoading
  | ReaderConnectionsUnavailable;

/** One retained semantic reader entry. */
export interface ReaderEntryView {
  /** Stable identity scoped to this reader session. */
  readonly id: string;
  /** Display label derived from admitted component state. */
  readonly label: string;
  /** Source-card state, when present. */
  readonly source?: ReaderSourceView;
  /** Connections-panel or reader-specific terminal state, when present. */
  readonly connections?: ReaderConnectionsEntryView;
  /** Selected source-card item position, when present. */
  readonly selectedPosition?: readonly number[];
  /** Entry-specific display state. */
  readonly presentation: ReaderPresentation;
  /** Number of explicit live-consumer pins retaining this entry. */
  readonly pinCount: number;
}

/** One breadcrumb in retained semantic history. */
export interface ReaderBreadcrumb {
  /** Stable reader entry identity. */
  readonly entryId: string;
  /** Display label derived from admitted component state. */
  readonly label: string;
  /** Whether this breadcrumb is the current entry. */
  readonly current: boolean;
}

/** Immutable render and diagnostic projection of a reader session. */
export interface ReaderSessionView {
  /** Retained entries from oldest to current. */
  readonly entries: readonly ReaderEntryView[];
  /** Current entry identity. */
  readonly currentEntryId: string;
  /** Current retained entry. */
  readonly current: ReaderEntryView;
  /** Breadcrumbs from oldest retained entry to current. */
  readonly breadcrumbs: readonly ReaderBreadcrumb[];
  /** Whether older history was evicted by bounded admission. */
  readonly historyTruncated: boolean;
  /** Aggregate bytes across unique captures referenced by retained entries. */
  readonly retainedCaptureBytes: number;
  /** Configured maximum retained entry count. */
  readonly maxEntries: number;
  /** Configured maximum retained capture bytes. */
  readonly maxCaptureBytes: number;
}

/** Stable operation identity returned when host-owned work begins. */
export interface ReaderOperationHandle {
  /** Operation identity scoped to this session. */
  readonly operationId: string;
}

/** Stable pin identity returned when a live consumer retains an entry. */
export interface ReaderPinHandle {
  /** Pin identity scoped to this session. */
  readonly pinId: string;
}

/** Explicit reason a reader transition could not be applied. */
export type ReaderTransitionRejection =
  | "budget-exceeded"
  | "entry-not-current"
  | "entry-not-found"
  | "entry-pinned"
  | "invalid-completion"
  | "invalid-projection"
  | "invalid-selection"
  | "operation-not-found"
  | "operation-pending"
  | "pin-not-found"
  | "unavailable-capture";

/** Result of one immutable reader-session transition. */
export type ReaderTransition<T = undefined> =
  | {
      /** Successful transition discriminator. */
      readonly state: "applied";
      /** New immutable session. */
      readonly session: ReaderSession;
      /** Transition-specific identity or value. */
      readonly value: T;
    }
  | {
      /** Rejected transition discriminator. */
      readonly state: "rejected";
      /** Session after terminal cleanup, with committed entries preserved. */
      readonly session: ReaderSession;
      /** Machine-readable rejection reason. */
      readonly reason: ReaderTransitionRejection;
      /** Human-readable rejection detail. */
      readonly message: string;
    };

/** Immutable DOM-free reader history and capture-retention contract. */
export interface ReaderSession {
  /** Current render and diagnostic projection. */
  readonly view: ReaderSessionView;
  /** Begins host-owned contextual source navigation from a retained entry. */
  beginSourceNavigation(
    originEntryId: string,
    request: SourceCardRequest,
  ): ReaderTransition<ReaderOperationHandle>;
  /** Commits contextual source content for an eligible operation. */
  completeSourceNavigation(
    operationId: string,
    seed: ReaderEntrySeed,
  ): ReaderTransition;
  /** Begins host-owned connections work for an identified entry. */
  beginConnections(
    entryId: string,
    request: ConnectionsRequest,
    projection?: ConnectionsProjection,
    message?: string,
  ): ReaderTransition<ReaderOperationHandle>;
  /** Commits captured connections content for an eligible operation. */
  completeConnections(
    operationId: string,
    content: ReaderConnectionsContent,
  ): ReaderTransition;
  /** Finishes connections work without a captured payload. */
  failConnections(operationId: string, message: string): ReaderTransition;
  /** Cancels an operation and interrupts its loading slot when applicable. */
  cancelOperation(operationId: string, message?: string): ReaderTransition;
  /** Reprojects current connections from their retained authoritative capture. */
  projectConnections(
    entryId: string,
    projection: ConnectionsProjection,
  ): ReaderTransition;
  /** Updates the selected source-card position on the current entry. */
  selectSourcePosition(
    entryId: string,
    position: readonly number[],
  ): ReaderTransition;
  /** Updates display state on the current entry. */
  setPresentation(
    entryId: string,
    patch: ReaderPresentationPatch,
  ): ReaderTransition;
  /** Removes the current entry and restores its retained predecessor. */
  back(): ReaderTransition;
  /** Activates an earlier retained breadcrumb and discards later entries. */
  activate(entryId: string): ReaderTransition;
  /** Pins a retained entry for a live consumer. */
  pin(entryId: string): ReaderTransition<ReaderPinHandle>;
  /** Releases a previously issued live-consumer pin. */
  release(pinId: string): ReaderTransition;
}

type InternalConnections =
  | (ReaderConnectionsView & { readonly capture: ReaderCapture })
  | ReaderConnectionsLoading
  | ReaderConnectionsUnavailable;

interface InternalEntry {
  readonly id: string;
  readonly label: string;
  readonly source?: ReaderSourceContent;
  readonly connections?: InternalConnections;
  readonly selectedPosition?: readonly number[];
  readonly presentation: ReaderPresentation;
}

type InternalOperation =
  | {
      readonly id: string;
      readonly kind: "source";
      readonly originEntryId: string;
      readonly request: SourceCardRequest;
    }
  | {
      readonly id: string;
      readonly kind: "connections";
      readonly originEntryId: string;
      readonly request: ConnectionsRequest;
      readonly projection: ConnectionsProjection;
    };

interface SessionState {
  readonly entries: readonly InternalEntry[];
  readonly operations: ReadonlyMap<string, InternalOperation>;
  readonly pins: ReadonlyMap<string, string>;
  readonly nextEntry: number;
  readonly nextOperation: number;
  readonly nextPin: number;
  readonly historyTruncated: boolean;
  readonly maxEntries: number;
  readonly maxCaptureBytes: number;
}

/** Creates immutable source content and its opaque corrected-payload capture. */
export function createReaderSourceContent(
  payload: CoreV3TextsResponse,
  request: SourceCardRequest,
): ReaderSourceContent {
  const immutablePayload = immutableJson(payload);
  const immutableRequest = immutableJson(request);
  const capture = createCapture("source", immutablePayload, {
    payload: immutablePayload,
    method: "GET",
    path: `/api/v3/texts/${encodeURIComponent(request.tref)}`,
    status: 200,
    effectiveRequest: immutableRequest,
    coverage: { kind: "source", tref: request.tref },
  });
  const content = deepFreeze({
    request: immutableRequest,
    viewModel: createSourceCardViewModel(immutablePayload, immutableRequest),
    capture,
  });
  sourceContents.add(content);
  return content;
}

/** Creates immutable connections content and its opaque links capture. */
export function createReaderConnectionsContent(
  payload: CoreLinkResponse,
  request: ConnectionsRequest,
  projection: ConnectionsProjection = {},
  status: 200 | 400 = 200,
): ReaderConnectionsContent {
  const immutablePayload = immutableJson(payload);
  const immutableRequest = immutableJson(request);
  const immutableProjection = immutableJson(projection);
  const capture = createCapture("connections", immutablePayload, {
    payload: immutablePayload,
    method: "GET",
    path: `/api/links/${encodeURIComponent(request.tref)}`,
    status,
    effectiveRequest: immutableRequest,
    coverage: {
      kind: "connections",
      tref: request.tref,
      withText: request.withText !== false,
    },
  });
  const content = deepFreeze({
    request: immutableRequest,
    projection: immutableProjection,
    viewModel: createConnectionsViewModel(
      immutablePayload,
      immutableRequest,
      immutableProjection,
      status,
    ),
    capture,
  });
  connectionsContents.add(content);
  return content;
}

/** Creates one immutable bounded reader session from admitted component state. */
export function createReaderSession(
  seed: ReaderEntrySeed,
  options: ReaderSessionOptions = {},
): ReaderSession {
  const maxEntries = positiveInteger(
    options.maxEntries ?? DEFAULT_MAX_ENTRIES,
    "Reader maxEntries",
  );
  const maxCaptureBytes = positiveInteger(
    options.maxCaptureBytes ?? DEFAULT_MAX_CAPTURE_BYTES,
    "Reader maxCaptureBytes",
  );
  const entry = createEntry("entry-1", seed);
  const state: SessionState = {
    entries: [entry],
    operations: new Map(),
    pins: new Map(),
    nextEntry: 2,
    nextOperation: 1,
    nextPin: 1,
    historyTruncated: false,
    maxEntries,
    maxCaptureBytes,
  };
  if (captureBytes(state.entries) > maxCaptureBytes) {
    throw new RangeError("Initial reader entry exceeds maxCaptureBytes.");
  }
  return new ReaderSessionImpl(state);
}

class ReaderSessionImpl implements ReaderSession {
  readonly #state: SessionState;

  constructor(state: SessionState) {
    this.#state = state;
  }

  get view(): ReaderSessionView {
    const current = this.#state.entries.at(-1);
    if (!current) throw new Error("Reader session has no current entry.");
    const entries = this.#state.entries.map((entry) =>
      publicEntry(entry, this.#state.pins),
    );
    const currentView = entries.at(-1);
    if (!currentView) throw new Error("Reader session has no current view.");
    return deepFreeze({
      entries,
      currentEntryId: current.id,
      current: currentView,
      breadcrumbs: entries.map((entry, index) => ({
        entryId: entry.id,
        label: entry.label,
        current: index === entries.length - 1,
      })),
      historyTruncated: this.#state.historyTruncated,
      retainedCaptureBytes: captureBytes(this.#state.entries),
      maxEntries: this.#state.maxEntries,
      maxCaptureBytes: this.#state.maxCaptureBytes,
    });
  }

  beginSourceNavigation(
    originEntryId: string,
    request: SourceCardRequest,
  ): ReaderTransition<ReaderOperationHandle> {
    const entry = findEntry(this.#state, originEntryId);
    if (!entry)
      return rejected(
        this,
        "entry-not-found",
        "Origin entry was not retained.",
      );
    const existing = [...this.#state.operations.values()].find(
      (operation) =>
        operation.kind === "source" &&
        operation.originEntryId === originEntryId,
    );
    if (existing) {
      return rejected(
        this,
        "operation-pending",
        "A source navigation operation is already pending for this entry.",
      );
    }
    validateSourceRequest(request);
    const id = `operation-${this.#state.nextOperation}`;
    const operations = new Map(this.#state.operations);
    operations.set(id, {
      id,
      kind: "source",
      originEntryId,
      request: immutableJson(request),
    });
    return applied(
      this.with({
        operations,
        nextOperation: this.#state.nextOperation + 1,
      }),
      { operationId: id },
    );
  }

  completeSourceNavigation(
    operationId: string,
    seed: ReaderEntrySeed,
  ): ReaderTransition {
    const operation = this.#state.operations.get(operationId);
    if (!operation || operation.kind !== "source") {
      return rejected(
        this,
        "operation-not-found",
        "Source operation is not eligible to complete.",
      );
    }
    if (!findEntry(this.#state, operation.originEntryId)) {
      return rejected(
        this.withoutOperation(operationId),
        "entry-not-found",
        "Source operation origin is no longer retained.",
      );
    }
    if (!seed.source) {
      return rejected(
        this,
        "invalid-completion",
        "Source navigation completion requires committed source content.",
      );
    }
    if (seed.source.viewModel.state !== "data") {
      return rejected(
        this,
        "invalid-completion",
        "Source navigation completion requires renderable contextual text.",
      );
    }
    if (!sameJson(seed.source.request, operation.request)) {
      return rejected(
        this,
        "invalid-completion",
        "Source completion does not match its effective request.",
      );
    }

    const originIndex = this.#state.entries.findIndex(
      (candidate) => candidate.id === operation.originEntryId,
    );
    const removed = this.#state.entries.slice(originIndex + 1);
    if (removed.some((candidate) => isPinned(candidate.id, this.#state.pins))) {
      return rejected(
        this.withoutOperation(operationId),
        "entry-pinned",
        "A later entry is pinned by a live consumer.",
      );
    }
    const entry = createEntry(`entry-${this.#state.nextEntry}`, seed);
    const operations = new Map(this.#state.operations);
    operations.delete(operationId);
    let entries = this.#state.entries
      .slice(0, originIndex + 1)
      .map((candidate) => {
        if (candidate.id !== operation.originEntryId) return candidate;
        const pending = candidate.connections;
        if (pending?.state !== "loading") return candidate;
        operations.delete(pending.operationId);
        return {
          ...candidate,
          connections: interruptedConnections(
            pending.request,
            pending.projection,
            "Connections loading was interrupted by source navigation.",
          ),
        };
      });
    entries = [...entries, entry];
    const retained = fitEntries(entries, this.#state.pins, this.#state);
    if (!retained) {
      return rejected(
        this.withoutOperation(operationId),
        "budget-exceeded",
        "Reader entry cannot fit without evicting current or pinned data.",
      );
    }
    const retainedIds = new Set(retained.entries.map((item) => item.id));
    for (const [id, pending] of operations) {
      if (!retainedIds.has(pending.originEntryId)) operations.delete(id);
    }
    return applied(
      this.with({
        entries: retained.entries,
        operations,
        nextEntry: this.#state.nextEntry + 1,
        historyTruncated: this.#state.historyTruncated || retained.evicted,
      }),
      undefined,
    );
  }

  beginConnections(
    entryId: string,
    request: ConnectionsRequest,
    projection: ConnectionsProjection = {},
    message = "Loading connections.",
  ): ReaderTransition<ReaderOperationHandle> {
    const entry = findEntry(this.#state, entryId);
    if (!entry)
      return rejected(this, "entry-not-found", "Entry was not retained.");
    const existing = [...this.#state.operations.values()].find(
      (operation) =>
        operation.kind === "connections" && operation.originEntryId === entryId,
    );
    if (existing) {
      return rejected(
        this,
        "operation-pending",
        "A connections operation is already pending for this entry.",
      );
    }
    validateConnectionsInput(request, projection);
    if (message.trim().length === 0) {
      throw new TypeError("Connections loading message must not be blank.");
    }
    const id = `operation-${this.#state.nextOperation}`;
    const immutableRequest = immutableJson(request);
    const immutableProjection = immutableJson(projection);
    const operations = new Map(this.#state.operations);
    operations.set(id, {
      id,
      kind: "connections",
      originEntryId: entryId,
      request: immutableRequest,
      projection: immutableProjection,
    });
    const entries = replaceEntry(this.#state.entries, entryId, {
      ...entry,
      connections: deepFreeze({
        state: "loading",
        request: immutableRequest,
        projection: immutableProjection,
        viewModel: { state: "loading", message },
        operationId: id,
      }),
    });
    return applied(
      this.with({
        entries,
        operations,
        nextOperation: this.#state.nextOperation + 1,
      }),
      { operationId: id },
    );
  }

  completeConnections(
    operationId: string,
    content: ReaderConnectionsContent,
  ): ReaderTransition {
    const operation = this.#state.operations.get(operationId);
    if (!operation || operation.kind !== "connections") {
      return rejected(
        this,
        "operation-not-found",
        "Connections operation is not eligible to complete.",
      );
    }
    const entry = findEntry(this.#state, operation.originEntryId);
    if (!entry || entry.connections?.state !== "loading") {
      return rejected(
        this.withoutOperation(operationId),
        "operation-not-found",
        "Connections operation origin is no longer loading.",
      );
    }
    if (
      !sameJson(content.request, operation.request) ||
      !sameJson(content.projection, operation.projection)
    ) {
      return rejected(
        this,
        "invalid-completion",
        "Connections completion does not match its effective request and projection.",
      );
    }
    requireConnectionsContent(content);
    const entries = replaceEntry(this.#state.entries, entry.id, {
      ...entry,
      connections: {
        state: "view",
        request: content.request,
        projection: content.projection,
        viewModel: content.viewModel,
        capture: content.capture,
      },
    });
    const protectedPins = new Map(this.#state.pins);
    protectedPins.set("__reader-completion__", entry.id);
    const retained = fitEntries(entries, protectedPins, this.#state);
    if (!retained) {
      const terminalEntries = replaceEntry(this.#state.entries, entry.id, {
        ...entry,
        connections: deepFreeze({
          state: "unavailable",
          reason: "failed",
          request: operation.request,
          projection: operation.projection,
          message: "Connections capture exceeds the reader retention budget.",
        }),
      });
      return rejected(
        this.with({
          entries: terminalEntries,
          operations: removeMapKey(this.#state.operations, operationId),
        }),
        "budget-exceeded",
        "Connections capture cannot fit while its entry remains retained.",
      );
    }
    const retainedIds = new Set(
      retained.entries.map((candidate) => candidate.id),
    );
    const operations = new Map(this.#state.operations);
    operations.delete(operationId);
    for (const [id, pending] of operations) {
      if (!retainedIds.has(pending.originEntryId)) operations.delete(id);
    }
    return applied(
      this.with({
        entries: retained.entries,
        operations,
        historyTruncated: this.#state.historyTruncated || retained.evicted,
      }),
      undefined,
    );
  }

  failConnections(operationId: string, message: string): ReaderTransition {
    return this.finishConnectionsWithoutCapture(operationId, "failed", message);
  }

  cancelOperation(
    operationId: string,
    message = "The operation was interrupted.",
  ): ReaderTransition {
    const operation = this.#state.operations.get(operationId);
    if (!operation) {
      return rejected(
        this,
        "operation-not-found",
        "Operation is not eligible to cancel.",
      );
    }
    if (operation.kind === "connections") {
      return this.finishConnectionsWithoutCapture(
        operationId,
        "interrupted",
        message,
      );
    }
    return applied(this.withoutOperation(operationId), undefined);
  }

  projectConnections(
    entryId: string,
    projection: ConnectionsProjection,
  ): ReaderTransition {
    const current = this.#state.entries.at(-1);
    if (!current || current.id !== entryId) {
      return rejected(
        this,
        "entry-not-current",
        "Only the current entry can change semantic connections projection.",
      );
    }
    const connections = current.connections;
    if (!connections || connections.state !== "view") {
      return rejected(
        this,
        "unavailable-capture",
        "Current connections have no completed capture to reproject.",
      );
    }
    try {
      validateConnectionsInput(connections.request, projection);
      const record = requireCapture(connections.capture, "connections");
      if (
        record.coverage.kind !== "connections" ||
        record.coverage.tref !== connections.request.tref ||
        record.coverage.withText !== (connections.request.withText !== false)
      ) {
        return rejected(
          this,
          "unavailable-capture",
          "Retained capture does not cover the current connections request.",
        );
      }
      const immutableProjection = immutableJson(projection);
      const viewModel = createConnectionsViewModel(
        record.payload as CoreLinkResponse,
        connections.request,
        immutableProjection,
        record.status,
      );
      const entries = replaceEntry(this.#state.entries, current.id, {
        ...current,
        connections: {
          ...connections,
          projection: immutableProjection,
          viewModel: deepFreeze(viewModel),
        },
      });
      return applied(this.with({ entries }), undefined);
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof RangeError))
        throw error;
      return rejected(this, "invalid-projection", error.message);
    }
  }

  selectSourcePosition(
    entryId: string,
    position: readonly number[],
  ): ReaderTransition {
    const current = this.#state.entries.at(-1);
    if (!current || current.id !== entryId) {
      return rejected(
        this,
        "entry-not-current",
        "Only the current entry can change semantic source selection.",
      );
    }
    if (
      !validPosition(position) ||
      current.source?.viewModel.state !== "data" ||
      !current.source.viewModel.items.some((item) =>
        samePosition(item.position, position),
      )
    ) {
      return rejected(
        this,
        "invalid-selection",
        "Selected position is not present in the current source card.",
      );
    }
    const entries = replaceEntry(this.#state.entries, current.id, {
      ...current,
      selectedPosition: immutableJson(position),
    });
    return applied(this.with({ entries }), undefined);
  }

  setPresentation(
    entryId: string,
    patch: ReaderPresentationPatch,
  ): ReaderTransition {
    const current = this.#state.entries.at(-1);
    if (!current || current.id !== entryId) {
      return rejected(
        this,
        "entry-not-current",
        "Only the current entry can change semantic presentation state.",
      );
    }
    const presentation = presentationFrom(patch, current.presentation);
    const entries = replaceEntry(this.#state.entries, current.id, {
      ...current,
      presentation,
    });
    return applied(this.with({ entries }), undefined);
  }

  back(): ReaderTransition {
    if (this.#state.entries.length === 1) {
      return rejected(
        this,
        "entry-not-found",
        "No retained predecessor is available.",
      );
    }
    const current = this.#state.entries.at(-1);
    if (!current) throw new Error("Reader session has no current entry.");
    if (isPinned(current.id, this.#state.pins)) {
      return rejected(
        this,
        "entry-pinned",
        "Current entry is pinned by a live consumer.",
      );
    }
    return applied(
      this.withPrunedEntries(this.#state.entries.slice(0, -1)),
      undefined,
    );
  }

  activate(entryId: string): ReaderTransition {
    const index = this.#state.entries.findIndex(
      (entry) => entry.id === entryId,
    );
    if (index < 0) {
      return rejected(
        this,
        "entry-not-found",
        "Breadcrumb entry was not retained.",
      );
    }
    if (index === this.#state.entries.length - 1) {
      return applied(this, undefined);
    }
    const removed = this.#state.entries.slice(index + 1);
    if (removed.some((entry) => isPinned(entry.id, this.#state.pins))) {
      return rejected(
        this,
        "entry-pinned",
        "A later entry is pinned by a live consumer.",
      );
    }
    return applied(
      this.withPrunedEntries(this.#state.entries.slice(0, index + 1)),
      undefined,
    );
  }

  pin(entryId: string): ReaderTransition<ReaderPinHandle> {
    if (!findEntry(this.#state, entryId)) {
      return rejected(this, "entry-not-found", "Entry was not retained.");
    }
    const id = `pin-${this.#state.nextPin}`;
    const pins = new Map(this.#state.pins);
    pins.set(id, entryId);
    return applied(this.with({ pins, nextPin: this.#state.nextPin + 1 }), {
      pinId: id,
    });
  }

  release(pinId: string): ReaderTransition {
    if (!this.#state.pins.has(pinId)) {
      return rejected(this, "pin-not-found", "Pin was not active.");
    }
    return applied(
      this.with({ pins: removeMapKey(this.#state.pins, pinId) }),
      undefined,
    );
  }

  private finishConnectionsWithoutCapture(
    operationId: string,
    reason: "interrupted" | "failed",
    message: string,
  ): ReaderTransition {
    if (message.trim().length === 0) {
      throw new TypeError("Connections terminal message must not be blank.");
    }
    const operation = this.#state.operations.get(operationId);
    if (!operation || operation.kind !== "connections") {
      return rejected(
        this,
        "operation-not-found",
        "Connections operation is not eligible to finish.",
      );
    }
    const entry = findEntry(this.#state, operation.originEntryId);
    if (!entry || entry.connections?.state !== "loading") {
      return rejected(
        this.withoutOperation(operationId),
        "operation-not-found",
        "Connections operation origin is no longer loading.",
      );
    }
    const entries = replaceEntry(this.#state.entries, entry.id, {
      ...entry,
      connections: deepFreeze({
        state: "unavailable",
        reason,
        request: operation.request,
        projection: operation.projection,
        message,
      }),
    });
    return applied(
      this.with({
        entries,
        operations: removeMapKey(this.#state.operations, operationId),
      }),
      undefined,
    );
  }

  private with(changes: Partial<SessionState>): ReaderSessionImpl {
    return new ReaderSessionImpl({ ...this.#state, ...changes });
  }

  private withoutOperation(operationId: string): ReaderSessionImpl {
    return this.with({
      operations: removeMapKey(this.#state.operations, operationId),
    });
  }

  private withPrunedEntries(
    entries: readonly InternalEntry[],
  ): ReaderSessionImpl {
    const retained = new Set(entries.map((entry) => entry.id));
    const operations = new Map(
      [...this.#state.operations].filter(([, operation]) =>
        retained.has(operation.originEntryId),
      ),
    );
    const pins = new Map(
      [...this.#state.pins].filter(([, entryId]) => retained.has(entryId)),
    );
    return this.with({ entries, operations, pins });
  }
}

function createEntry(id: string, seed: ReaderEntrySeed): InternalEntry {
  if (!seed.source && !seed.connections) {
    throw new TypeError("Reader entry requires source or connections content.");
  }
  if (seed.source) requireSourceContent(seed.source);
  if (seed.connections) requireConnectionsContent(seed.connections);
  if (
    seed.selectedPosition !== undefined &&
    (!seed.source ||
      seed.source.viewModel.state !== "data" ||
      !validPosition(seed.selectedPosition) ||
      !seed.source.viewModel.items.some((item) =>
        samePosition(item.position, seed.selectedPosition!),
      ))
  ) {
    throw new RangeError(
      "Reader selectedPosition must identify a source item.",
    );
  }
  const source = seed.source;
  const connections = seed.connections;
  return deepFreeze({
    id,
    label: entryLabel(source, connections),
    ...(source === undefined ? {} : { source }),
    ...(connections === undefined
      ? {}
      : {
          connections: {
            state: "view" as const,
            request: connections.request,
            projection: connections.projection,
            viewModel: connections.viewModel,
            capture: connections.capture,
          },
        }),
    ...(seed.selectedPosition === undefined
      ? {}
      : { selectedPosition: immutableJson(seed.selectedPosition) }),
    presentation: presentationFrom(seed.presentation ?? {}),
  });
}

function createCapture(
  kind: ReaderCapture["kind"],
  payload: CoreV3TextsResponse | CoreLinkResponse,
  record: CaptureRecord,
): ReaderCapture {
  const serialized = JSON.stringify(payload);
  const capture = Object.freeze({
    kind,
    byteSize: encoder.encode(serialized).byteLength,
  });
  captureRecords.set(capture, record);
  return capture;
}

function requireCapture(
  capture: ReaderCapture,
  kind: ReaderCapture["kind"],
): CaptureRecord {
  const record = captureRecords.get(capture);
  if (!record || capture.kind !== kind) {
    throw new TypeError(
      `Expected a reader ${kind} capture created by this module.`,
    );
  }
  return record;
}

function requireSourceContent(content: ReaderSourceContent): void {
  if (!sourceContents.has(content)) {
    throw new TypeError(
      "Expected reader source content created by this module.",
    );
  }
  requireCapture(content.capture, "source");
}

function requireConnectionsContent(content: ReaderConnectionsContent): void {
  if (!connectionsContents.has(content)) {
    throw new TypeError(
      "Expected reader connections content created by this module.",
    );
  }
  requireCapture(content.capture, "connections");
}

function publicEntry(
  entry: InternalEntry,
  pins: ReadonlyMap<string, string>,
): ReaderEntryView {
  const source =
    entry.source === undefined
      ? undefined
      : {
          request: entry.source.request,
          viewModel: entry.source.viewModel,
        };
  const connections =
    entry.connections === undefined
      ? undefined
      : entry.connections.state === "view"
        ? {
            state: "view" as const,
            request: entry.connections.request,
            projection: entry.connections.projection,
            viewModel: entry.connections.viewModel,
          }
        : entry.connections;
  return deepFreeze({
    id: entry.id,
    label: entry.label,
    ...(source === undefined ? {} : { source }),
    ...(connections === undefined ? {} : { connections }),
    ...(entry.selectedPosition === undefined
      ? {}
      : { selectedPosition: entry.selectedPosition }),
    presentation: entry.presentation,
    pinCount: [...pins.values()].filter((entryId) => entryId === entry.id)
      .length,
  });
}

function entryLabel(
  source: ReaderSourceContent | undefined,
  connections: ReaderConnectionsContent | undefined,
): string {
  const sourceView = source?.viewModel;
  if (sourceView?.state === "data" || sourceView?.state === "empty") {
    return sourceView.header.ref;
  }
  if (connections?.viewModel.state === "data") {
    return connections.viewModel.reference;
  }
  return source?.request.tref ?? connections?.request.tref ?? "Reader entry";
}

function presentationFrom(
  patch: ReaderPresentationPatch,
  base: ReaderPresentation = {
    contentLanguage: "both",
    layout: "auto",
    sideOrder: "primary-first",
    showConnectionPreviews: true,
  },
): ReaderPresentation {
  const result = {
    contentLanguage: patch.contentLanguage ?? base.contentLanguage,
    layout: patch.layout ?? base.layout,
    sideOrder: patch.sideOrder ?? base.sideOrder,
    showConnectionPreviews:
      patch.showConnectionPreviews ?? base.showConnectionPreviews,
  };
  if (
    !["primary", "translation", "both"].includes(result.contentLanguage) ||
    !["auto", "stacked", "side-by-side"].includes(result.layout) ||
    !["primary-first", "translation-first"].includes(result.sideOrder)
  ) {
    throw new TypeError("Reader presentation contains an unsupported value.");
  }
  return deepFreeze(result);
}

function validateSourceRequest(request: SourceCardRequest): void {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Source reference must not be blank.");
  }
  for (const selection of [request.primary, request.translation]) {
    if (selection !== undefined && selection.versionTitle.trim().length === 0) {
      throw new TypeError("Source version title must not be blank.");
    }
  }
}

function validateConnectionsInput(
  request: ConnectionsRequest,
  projection: ConnectionsProjection,
): void {
  if (request.tref.trim().length === 0) {
    throw new TypeError("Connections reference must not be blank.");
  }
  const page = projection.page ?? 0;
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page >= Number.MAX_SAFE_INTEGER / CONNECTIONS_PAGE_SIZE
  ) {
    throw new RangeError(
      "Connections page must be a nonnegative bounded integer.",
    );
  }
  if (
    projection.category !== undefined &&
    projection.category.trim().length === 0
  ) {
    throw new TypeError("Connections category must not be blank.");
  }
}

function interruptedConnections(
  request: ConnectionsRequest,
  projection: ConnectionsProjection,
  message: string,
): ReaderConnectionsUnavailable {
  return deepFreeze({
    state: "unavailable",
    reason: "interrupted",
    request,
    projection,
    message,
  });
}

function fitEntries(
  input: readonly InternalEntry[],
  pins: ReadonlyMap<string, string>,
  state: Pick<SessionState, "maxEntries" | "maxCaptureBytes">,
): {
  readonly entries: readonly InternalEntry[];
  readonly evicted: boolean;
} | null {
  const entries = [...input];
  let evicted = false;
  while (
    entries.length > state.maxEntries ||
    captureBytes(entries) > state.maxCaptureBytes
  ) {
    const candidate = entries.findIndex(
      (entry, index) => index < entries.length - 1 && !isPinned(entry.id, pins),
    );
    if (candidate < 0) return null;
    entries.splice(candidate, 1);
    evicted = true;
  }
  return { entries, evicted };
}

function captureBytes(entries: readonly InternalEntry[]): number {
  const captures = new Set<ReaderCapture>();
  for (const entry of entries) {
    if (entry.source) captures.add(entry.source.capture);
    if (entry.connections?.state === "view") {
      captures.add(entry.connections.capture);
    }
  }
  let total = 0;
  for (const capture of captures) total += capture.byteSize;
  return total;
}

function findEntry(state: SessionState, id: string): InternalEntry | undefined {
  return state.entries.find((entry) => entry.id === id);
}

function replaceEntry(
  entries: readonly InternalEntry[],
  id: string,
  replacement: InternalEntry,
): readonly InternalEntry[] {
  return entries.map((entry) => (entry.id === id ? replacement : entry));
}

function isPinned(id: string, pins: ReadonlyMap<string, string>): boolean {
  return [...pins.values()].includes(id);
}

function validPosition(position: readonly number[]): boolean {
  return position.every((value) => Number.isSafeInteger(value) && value >= 0);
}

function samePosition(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length && left.every((value, i) => value === right[i])
  );
}

function sameJson(left: unknown, right: unknown): boolean {
  const pairs: [unknown, unknown][] = [[left, right]];
  while (pairs.length > 0) {
    const pair = pairs.pop();
    if (!pair) break;
    const [a, b] = pair;
    if (a === b) continue;
    if (
      typeof a !== "object" ||
      a === null ||
      typeof b !== "object" ||
      b === null ||
      Array.isArray(a) !== Array.isArray(b)
    ) {
      return false;
    }
    const entries = Object.entries(a);
    const other = new Map(Object.entries(b));
    if (entries.length !== other.size) return false;
    for (const [key, value] of entries) {
      if (!other.has(key)) return false;
      pairs.push([value, other.get(key)]);
    }
  }
  return true;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
  return value;
}

function immutableJson<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function removeMapKey<K, V>(
  input: ReadonlyMap<K, V>,
  key: K,
): ReadonlyMap<K, V> {
  const result = new Map(input);
  result.delete(key);
  return result;
}

function applied<T>(session: ReaderSession, value: T): ReaderTransition<T> {
  return { state: "applied", session, value };
}

function rejected<T>(
  session: ReaderSession,
  reason: ReaderTransitionRejection,
  message: string,
): ReaderTransition<T> {
  return { state: "rejected", session, reason, message };
}

import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/components";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
  SefariaConnectionsPanel,
  SefariaSourceCard,
  SourceCardDataViewModel,
  SourceCardNavigation,
  SourceCardRequest,
} from "@sefaria/components";
import {
  createSefariaReaderDataSource,
  type ReaderControllerDataSource,
} from "@sefaria/components/reader-controller";
import {
  createReaderSession,
  type ReaderConnectionsContent,
  type ReaderEntryView,
  type ReaderSession,
  type ReaderSourceContent,
  type ReaderTransition,
} from "@sefaria/components/reader-session";

import {
  addConnectionsPane,
  addSourcePane,
  createWorkspaceState,
  pruneAfterPane,
  pruneFromPane,
  selectWorkspacePane,
  type WorkspacePane,
  type WorkspaceState,
} from "./workspace-state.js";

/** Read-only state exposed for browser qualification and demonstration. */
export interface ReaderWorkspaceView {
  /** Ordered visible panes and compact active pane. */
  readonly panes: readonly WorkspacePane[];
  /** Current semantic reader entry, when initialized. */
  readonly currentEntryId?: string;
}

/** Browser workspace controls used by the page and automated qualification. */
export interface ReaderWorkspace {
  /** Current spatial and semantic projection. */
  readonly view: ReaderWorkspaceView;
  /** Opens a new root reference and replaces the current workspace. */
  readonly navigate: (
    targetRef: string,
    revealSelection?: boolean,
  ) => Promise<void>;
  /** Selects a retained pane and cancels obsolete work. */
  readonly activatePane: (paneId: string) => void;
  /** Closes a non-root pane and its spatial descendants. */
  readonly closePane: (paneId: string) => void;
  /** Removes listeners and aborts active work. */
  readonly dispose: () => void;
}

/** Demo-owned workspace limits rather than supported reader API policy. */
export interface ReaderWorkspaceOptions {
  /** Maximum simultaneously visible panes. */
  readonly maxPanes?: number;
}

interface SourceDestination {
  readonly content: ReaderSourceContent;
  readonly firstRef: string;
  readonly selectedPosition: readonly number[];
}

interface PaneBinding {
  readonly pinId: string;
}

/** Starts the realistic multi-pane website reader workspace. */
export function startReaderWorkspace(
  root: Document,
  client: SefariaClient = createSefariaClient(),
  options: ReaderWorkspaceOptions = {},
): ReaderWorkspace {
  const form = requireElement<HTMLFormElement>(root, "#reader-form");
  const tref = requireInput(form, "tref");
  const panePath = requireElement<HTMLElement>(root, "#pane-path");
  const status = requireElement<HTMLElement>(root, "#status");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const workspace = requireElement<HTMLElement>(root, "#workspace");
  const dataSource: ReaderControllerDataSource =
    createSefariaReaderDataSource(client);

  let session: ReaderSession | undefined;
  let spatial: WorkspaceState | undefined;
  let bindings = new Map<string, PaneBinding>();
  let controller: AbortController | undefined;
  let generation = 0;
  let pendingOperationId: string | undefined;
  workspace.dataset.surface = "workspace";

  const currentView = (): ReaderWorkspaceView => ({
    panes: spatial?.panes ?? [],
    ...(session === undefined
      ? {}
      : { currentEntryId: session.view.currentEntryId }),
  });

  const clearError = (): void => {
    hostError.hidden = true;
    hostError.textContent = "";
  };

  const showError = (error: unknown): void => {
    hostError.hidden = false;
    hostError.textContent =
      error instanceof Error ? error.message : String(error);
  };

  const cancelActive = (): void => {
    controller?.abort();
    controller = undefined;
    generation += 1;
    if (session && pendingOperationId) {
      session = session.cancelOperation(pendingOperationId).session;
    }
    pendingOperationId = undefined;
  };

  const releasePanes = (panes: readonly WorkspacePane[]): void => {
    if (!session) return;
    for (const pane of panes) {
      const binding = bindings.get(pane.id);
      if (!binding) continue;
      session = session.release(binding.pinId).session;
      bindings.delete(pane.id);
    }
  };

  const pinPane = (pane: WorkspacePane): void => {
    if (!session) throw new Error("Reader session is not initialized.");
    const pinned = requireApplied(session.pin(pane.entryId));
    session = pinned.session;
    bindings.set(pane.id, { pinId: pinned.value.pinId });
  };

  const pruneAfter = (paneId: string): void => {
    if (!spatial) return;
    const pruned = pruneAfterPane(spatial, paneId);
    releasePanes(pruned.removed);
    spatial = pruned.state;
  };

  const activateEntry = (entryId: string): void => {
    if (!session || session.view.currentEntryId === entryId) return;
    session = requireApplied(session.activate(entryId)).session;
  };

  const render = (): void => {
    panePath.replaceChildren();
    if (!session || !spatial) {
      delete workspace.dataset.paneCount;
      workspace.replaceChildren();
      return;
    }
    workspace.dataset.paneCount = String(spatial.panes.length);
    workspace.replaceChildren();
    for (const pane of spatial.panes) {
      const entry = session.view.entries.find(
        (candidate) => candidate.id === pane.entryId,
      );
      if (!entry) continue;
      panePath.append(createPathButton(pane, entry));
      workspace.append(createPane(pane, entry));
    }
    workspace
      .querySelector<HTMLElement>(`[data-pane-id="${spatial.activePaneId}"]`)
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  };

  const createPathButton = (
    pane: WorkspacePane,
    entry: ReaderEntryView,
  ): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent =
      pane.kind === "source" ? entry.label : `${entry.label} connections`;
    button.dataset.paneId = pane.id;
    if (pane.id === spatial?.activePaneId) {
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => activatePane(pane.id));
    return button;
  };

  const createPane = (
    pane: WorkspacePane,
    entry: ReaderEntryView,
  ): HTMLElement => {
    const section = document.createElement("section");
    section.className = "reader-pane";
    section.dataset.paneId = pane.id;
    section.dataset.paneKind = pane.kind;
    section.dataset.active = String(pane.id === spatial?.activePaneId);
    section.setAttribute(
      "aria-label",
      pane.kind === "source"
        ? `Source: ${entry.label}`
        : `Connections: ${entry.label}`,
    );
    if (pane.id !== spatial?.panes[0]?.id) {
      const toolbar = document.createElement("div");
      toolbar.className = "pane-toolbar";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "×";
      close.setAttribute(
        "aria-label",
        `Close ${
          pane.kind === "source" ? entry.label : `${entry.label} connections`
        } and later panes`,
      );
      close.addEventListener("click", () => closePane(pane.id));
      toolbar.append(close);
      section.append(toolbar);
    }
    if (pane.kind === "source") {
      section.append(createSourceElement(pane, entry));
    } else {
      section.append(createConnectionsElement(pane, entry));
    }
    return section;
  };

  const createSourceElement = (
    pane: WorkspacePane,
    entry: ReaderEntryView,
  ): HTMLElement => {
    if (!entry.source) {
      const message = document.createElement("p");
      message.className = "pane-message";
      message.setAttribute("role", "status");
      message.textContent = "Source text is not available for this entry.";
      return message;
    }
    const source = document.createElement(
      "sefaria-source-card",
    ) as SefariaSourceCard;
    source.viewModel = entry.source.viewModel;
    source.selectedPosition = entry.selectedPosition;
    source.contentLanguage = entry.presentation.contentLanguage;
    source.layout = entry.presentation.layout;
    source.sideOrder = entry.presentation.sideOrder;
    source.selectable = entry.source.viewModel.state === "data";
    source.addEventListener("sefaria-source-select", (event) => {
      const detail = (
        event as CustomEvent<{
          readonly position: readonly number[];
          readonly ref: string;
        }>
      ).detail;
      void selectSource(pane, detail.position, detail.ref);
    });
    return source;
  };

  const createConnectionsElement = (
    pane: WorkspacePane,
    entry: ReaderEntryView,
  ): HTMLElement => {
    if (entry.connections?.state === "unavailable") {
      const message = document.createElement("p");
      message.className = "pane-message";
      message.setAttribute(
        "role",
        entry.connections.reason === "failed" ? "alert" : "status",
      );
      message.textContent = entry.connections.message;
      return message;
    }
    const connections = document.createElement(
      "sefaria-connections-panel",
    ) as SefariaConnectionsPanel;
    connections.viewModel = entry.connections?.viewModel;
    connections.showPreviews = entry.presentation.showConnectionPreviews;
    connections.addEventListener(
      "sefaria-connections-category-change",
      (event) => {
        const category = (
          event as CustomEvent<{ readonly category: string | null }>
        ).detail.category;
        projectConnections(pane, category === null ? {} : { category });
      },
    );
    connections.addEventListener("sefaria-connections-page-change", (event) => {
      const page = (event as CustomEvent<{ readonly page: number }>).detail
        .page;
      const category =
        entry.connections?.state === "view"
          ? entry.connections.projection.category
          : undefined;
      projectConnections(pane, {
        ...(category === undefined ? {} : { category }),
        page,
      });
    });
    connections.addEventListener("sefaria-connection-select", (event) => {
      const targetRef = (event as CustomEvent<{ readonly targetRef: string }>)
        .detail.targetRef;
      void openConnectedSource(pane, targetRef).catch((error: unknown) => {
        status.textContent = `${targetRef} could not be opened.`;
        showError(error);
      });
    });
    return connections;
  };

  const addPinnedConnectionsPane = (
    sourcePaneId: string,
    entryId: string,
  ): WorkspacePane => {
    if (!spatial) throw new Error("Workspace is not initialized.");
    spatial = addConnectionsPane(spatial, sourcePaneId, entryId);
    const pane = spatial.panes.find(
      (candidate) => candidate.id === spatial?.activePaneId,
    );
    if (!pane) throw new Error("Connections pane was not created.");
    pinPane(pane);
    return pane;
  };

  const loadConnections = async (
    sourcePaneId: string,
    entryId: string,
    ref: string,
    expectedGeneration: number,
    signal: AbortSignal,
  ): Promise<void> => {
    if (!session) throw new Error("Reader session is not initialized.");
    requirePaneCapacity(1);
    const request: ConnectionsRequest = { tref: ref, withText: true };
    const begun = requireApplied(
      session.beginConnections(
        entryId,
        request,
        {},
        `Loading connections for ${ref}.`,
      ),
    );
    session = begun.session;
    pendingOperationId = begun.value.operationId;
    addPinnedConnectionsPane(sourcePaneId, entryId);
    render();
    let content: ReaderConnectionsContent;
    try {
      content = await dataSource.loadConnections(request, {}, signal);
    } catch (error) {
      if (!signal.aborted && expectedGeneration === generation) {
        const message = error instanceof Error ? error.message : String(error);
        session = session.failConnections(
          begun.value.operationId,
          message,
        ).session;
        pendingOperationId = undefined;
        render();
      }
      throw error;
    }
    if (signal.aborted || expectedGeneration !== generation) return;
    const completed = session.completeConnections(
      begun.value.operationId,
      content,
    );
    session = completed.session;
    pendingOperationId = undefined;
    if (completed.state === "rejected") throw new Error(completed.message);
    status.textContent = `Showing connections for ${ref}.`;
    render();
  };

  const loadSource = async (
    request: SourceCardRequest,
    signal: AbortSignal,
  ): Promise<ReaderSourceContent> => dataSource.loadSource(request, signal);

  const requireNavigable = (
    content: ReaderSourceContent,
    label: string,
  ): {
    readonly viewModel: SourceCardDataViewModel;
    readonly navigation: Exclude<
      SourceCardNavigation,
      { readonly state: "unavailable" }
    >;
  } => {
    const viewModel = content.viewModel;
    if (viewModel.state !== "data" || !viewModel.navigation) {
      throw new Error(`${label} did not produce selectable source data.`);
    }
    if (viewModel.navigation.state === "unavailable") {
      throw new Error(viewModel.navigation.message);
    }
    return { viewModel, navigation: viewModel.navigation };
  };

  const loadDestination = async (
    targetRef: string,
    signal: AbortSignal,
    onEffectiveRequest?: (request: SourceCardRequest) => void,
  ): Promise<SourceDestination> => {
    const target = await loadSource({ tref: targetRef }, signal);
    const targetData = requireNavigable(target, targetRef);
    const selectedRef = targetData.viewModel.items.find(
      (item) => item.ref === targetRef,
    )?.ref;
    let content = target;
    let navigation = targetData.navigation;
    if (navigation.state === "context-required") {
      const contextRef = navigation.contextRef;
      const request = { tref: contextRef };
      onEffectiveRequest?.(request);
      content = await loadSource(request, signal);
      navigation = requireAvailable(
        requireNavigable(content, contextRef).navigation,
        contextRef,
      );
    } else if (targetData.viewModel.header.ref !== navigation.sectionRef) {
      const sectionRef = navigation.sectionRef;
      const request = { tref: sectionRef };
      onEffectiveRequest?.(request);
      content = await loadSource(request, signal);
      navigation = requireAvailable(
        requireNavigable(content, sectionRef).navigation,
        sectionRef,
      );
    } else {
      onEffectiveRequest?.(target.request);
    }
    const available = requireAvailable(navigation, targetRef);
    const sourceData = requireNavigable(content, targetRef).viewModel;
    const exactSelectedRef = selectedRef ?? available.firstRef;
    const selected = sourceData.items.find(
      (item) => item.ref === exactSelectedRef,
    );
    if (!selected) {
      throw new Error(
        `${exactSelectedRef} is not selectable in ${sourceData.header.ref}.`,
      );
    }
    return {
      content,
      firstRef: exactSelectedRef,
      selectedPosition: selected.position,
    };
  };

  const navigate = async (
    targetRef: string,
    revealSelection = true,
  ): Promise<void> => {
    cancelActive();
    const currentGeneration = generation;
    const currentController = new AbortController();
    controller = currentController;
    clearError();
    status.textContent = `Opening ${targetRef}.`;
    try {
      const destination = await loadDestination(
        targetRef.trim(),
        currentController.signal,
      );
      if (
        currentController.signal.aborted ||
        currentGeneration !== generation
      ) {
        return;
      }
      releasePanes(spatial?.panes ?? []);
      session = createReaderSession({
        source: destination.content,
        selectedPosition: destination.selectedPosition,
      });
      spatial = createWorkspaceState(
        session.view.currentEntryId,
        options.maxPanes,
      );
      bindings = new Map();
      pinPane(spatial.panes[0]!);
      tref.value = targetRef.trim();
      render();
      if (revealSelection) {
        await workspace
          .querySelector<SefariaSourceCard>("sefaria-source-card")
          ?.revealSelection();
      }
      await loadConnections(
        spatial.panes[0]!.id,
        session.view.currentEntryId,
        destination.firstRef,
        currentGeneration,
        currentController.signal,
      );
    } catch (error) {
      if (
        !currentController.signal.aborted &&
        currentGeneration === generation
      ) {
        status.textContent = `${targetRef} could not be opened.`;
        showError(error);
      }
    }
  };

  const openConnectedSource = async (
    originPane: WorkspacePane,
    targetRef: string,
  ): Promise<void> => {
    if (!session || !spatial) return;
    cancelActive();
    const currentGeneration = generation;
    const currentController = new AbortController();
    controller = currentController;
    clearError();
    const sourcePane = [...spatial.panes]
      .reverse()
      .find(
        (pane) => pane.kind === "source" && pane.entryId === originPane.entryId,
      );
    if (!sourcePane) throw new Error("Connection origin source was removed.");
    requirePaneCapacity(1);
    activateEntry(originPane.entryId);
    let sourceOperationId: string | undefined;
    try {
      const destination = await loadDestination(
        targetRef,
        currentController.signal,
        (request) => {
          if (
            currentController.signal.aborted ||
            currentGeneration !== generation
          ) {
            return;
          }
          if (!session) throw new Error("Reader session was disposed.");
          const begun = requireApplied(
            session.beginSourceNavigation(originPane.entryId, request),
          );
          session = begun.session;
          sourceOperationId = begun.value.operationId;
          pendingOperationId = sourceOperationId;
          render();
        },
      );
      if (
        currentController.signal.aborted ||
        currentGeneration !== generation
      ) {
        return;
      }
      if (!sourceOperationId) {
        throw new Error("Source navigation did not establish an operation.");
      }
      session = requireApplied(
        session.completeSourceNavigation(sourceOperationId, {
          source: destination.content,
          selectedPosition: destination.selectedPosition,
        }),
      ).session;
      pendingOperationId = undefined;
      pruneAfter(sourcePane.id);
      requirePaneCapacity(2);
      spatial = addSourcePane(
        spatial,
        sourcePane.id,
        session.view.currentEntryId,
      );
      const childPane = spatial.panes.find(
        (pane) => pane.id === spatial?.activePaneId,
      );
      if (!childPane) throw new Error("Child source pane was not created.");
      pinPane(childPane);
      render();
      await loadConnections(
        childPane.id,
        childPane.entryId,
        destination.firstRef,
        currentGeneration,
        currentController.signal,
      );
    } catch (error) {
      if (
        !currentController.signal.aborted &&
        currentGeneration === generation
      ) {
        if (pendingOperationId) {
          session = session.cancelOperation(pendingOperationId).session;
          pendingOperationId = undefined;
        }
        status.textContent = `${targetRef} could not be opened.`;
        showError(error);
        render();
      }
    }
  };

  const selectSource = async (
    pane: WorkspacePane,
    position: readonly number[],
    ref: string,
  ): Promise<void> => {
    if (!session) return;
    cancelActive();
    pruneAfter(pane.id);
    activateEntry(pane.entryId);
    session = requireApplied(
      session.selectSourcePosition(pane.entryId, position),
    ).session;
    const currentGeneration = generation;
    const currentController = new AbortController();
    controller = currentController;
    render();
    try {
      await loadConnections(
        pane.id,
        pane.entryId,
        ref,
        currentGeneration,
        currentController.signal,
      );
    } catch (error) {
      if (
        !currentController.signal.aborted &&
        currentGeneration === generation
      ) {
        showError(error);
      }
    }
  };

  const projectConnections = (
    pane: WorkspacePane,
    projection: ConnectionsProjection,
  ): void => {
    if (!session || !spatial) return;
    cancelActive();
    activateEntry(pane.entryId);
    session = requireApplied(
      session.projectConnections(pane.entryId, projection),
    ).session;
    spatial = selectWorkspacePane(spatial, pane.id);
    render();
  };

  const activatePane = (paneId: string): void => {
    if (!session || !spatial) return;
    cancelActive();
    const pane = spatial.panes.find((candidate) => candidate.id === paneId);
    if (!pane) throw new Error(`Workspace pane ${paneId} was not found.`);
    const lastEntryPane = [...spatial.panes]
      .reverse()
      .find((candidate) => candidate.entryId === pane.entryId);
    if (lastEntryPane) pruneAfter(lastEntryPane.id);
    activateEntry(pane.entryId);
    spatial = selectWorkspacePane(spatial, pane.id);
    render();
  };

  const closePane = (paneId: string): void => {
    if (!session || !spatial) return;
    cancelActive();
    const pruned = pruneFromPane(spatial, paneId);
    releasePanes(pruned.removed);
    spatial = pruned.state;
    const lastSource = [...spatial.panes]
      .reverse()
      .find((pane) => pane.kind === "source");
    if (!lastSource) throw new Error("Workspace must retain a source pane.");
    activateEntry(lastSource.entryId);
    render();
  };

  const requirePaneCapacity = (count: number): void => {
    if (!spatial) return;
    if (spatial.panes.length + count > spatial.maxPanes) {
      throw new RangeError(
        `Close a pane before opening another; this workspace allows ${spatial.maxPanes} visible panes.`,
      );
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void navigate(tref.value);
  };
  form.addEventListener("submit", onSubmit);

  return {
    get view() {
      return currentView();
    },
    navigate,
    activatePane,
    closePane,
    dispose: () => {
      cancelActive();
      releasePanes(spatial?.panes ?? []);
      form.removeEventListener("submit", onSubmit);
      workspace.replaceChildren();
      panePath.replaceChildren();
    },
  };
}

function requireAvailable(
  navigation: Exclude<SourceCardNavigation, { readonly state: "unavailable" }>,
  label: string,
): Extract<SourceCardNavigation, { readonly state: "available" }> {
  if (navigation.state !== "available") {
    throw new Error(`${label} requires another contextual text request.`);
  }
  return navigation;
}

function requireApplied<T>(
  transition: ReaderTransition<T>,
): Extract<ReaderTransition<T>, { readonly state: "applied" }> {
  if (transition.state === "rejected") {
    throw new Error(transition.message);
  }
  return transition;
}

function requireInput(form: HTMLFormElement, name: string): HTMLInputElement {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The ${name} input is missing.`);
  }
  return input;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`The reader workspace requires ${selector}.`);
  return element;
}

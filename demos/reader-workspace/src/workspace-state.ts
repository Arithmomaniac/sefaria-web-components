/** Spatial pane kind owned only by the website workspace demo. */
export type WorkspacePaneKind = "source" | "connections";

/** One visible pane associated with a retained semantic reader entry. */
export interface WorkspacePane {
  /** Stable identity scoped to one workspace instance. */
  readonly id: string;
  /** Rendered component kind. */
  readonly kind: WorkspacePaneKind;
  /** Reader-session entry supplying the pane's view model. */
  readonly entryId: string;
  /** Pane that established this pane's spatial position. */
  readonly parentPaneId?: string;
}

/** Immutable spatial state for the website workspace. */
export interface WorkspaceState {
  /** Ordered visible panes from oldest ancestor to newest descendant. */
  readonly panes: readonly WorkspacePane[];
  /** Pane visible in compact mode and revealed after an action. */
  readonly activePaneId: string;
  /** Maximum number of simultaneously visible panes. */
  readonly maxPanes: number;
  /** Next stable pane identity. */
  readonly nextPane: number;
}

/** Result of pruning every pane spatially after an ancestor. */
export interface WorkspacePruneResult {
  /** Updated workspace state. */
  readonly state: WorkspaceState;
  /** Removed panes in their previous order. */
  readonly removed: readonly WorkspacePane[];
}

/** Creates a workspace containing one root source pane. */
export function createWorkspaceState(
  rootEntryId: string,
  maxPanes = 20,
): WorkspaceState {
  if (!Number.isInteger(maxPanes) || maxPanes < 1) {
    throw new RangeError("Workspace maxPanes must be a positive integer.");
  }
  const root: WorkspacePane = {
    id: "pane-1",
    kind: "source",
    entryId: rootEntryId,
  };
  return {
    panes: [root],
    activePaneId: root.id,
    maxPanes,
    nextPane: 2,
  };
}

/** Inserts one source pane immediately after its spatial parent. */
export function addSourcePane(
  state: WorkspaceState,
  parentPaneId: string,
  entryId: string,
): WorkspaceState {
  return addPane(state, parentPaneId, entryId, "source");
}

/** Inserts one connections pane immediately after its source pane. */
export function addConnectionsPane(
  state: WorkspaceState,
  parentPaneId: string,
  entryId: string,
): WorkspaceState {
  return addPane(state, parentPaneId, entryId, "connections");
}

/** Removes every pane after the identified retained ancestor pane. */
export function pruneAfterPane(
  state: WorkspaceState,
  paneId: string,
): WorkspacePruneResult {
  const index = state.panes.findIndex((pane) => pane.id === paneId);
  if (index < 0) throw new Error(`Workspace pane ${paneId} was not found.`);
  const panes = state.panes.slice(0, index + 1);
  return {
    state: {
      ...state,
      panes,
      activePaneId: paneId,
    },
    removed: state.panes.slice(index + 1),
  };
}

/** Removes an identified pane and every pane spatially descended from it. */
export function pruneFromPane(
  state: WorkspaceState,
  paneId: string,
): WorkspacePruneResult {
  const index = state.panes.findIndex((pane) => pane.id === paneId);
  if (index < 0) throw new Error(`Workspace pane ${paneId} was not found.`);
  if (index === 0) {
    throw new RangeError("The root source pane cannot be closed.");
  }
  const panes = state.panes.slice(0, index);
  const activePane = panes.at(-1);
  if (!activePane) throw new Error("Workspace must retain its root pane.");
  return {
    state: {
      ...state,
      panes,
      activePaneId: activePane.id,
    },
    removed: state.panes.slice(index),
  };
}

/** Selects the pane shown by the compact workspace without reordering it. */
export function selectWorkspacePane(
  state: WorkspaceState,
  paneId: string,
): WorkspaceState {
  if (!state.panes.some((pane) => pane.id === paneId)) {
    throw new Error(`Workspace pane ${paneId} was not found.`);
  }
  return state.activePaneId === paneId
    ? state
    : { ...state, activePaneId: paneId };
}

function addPane(
  state: WorkspaceState,
  parentPaneId: string,
  entryId: string,
  kind: WorkspacePaneKind,
): WorkspaceState {
  if (state.panes.length >= state.maxPanes) {
    throw new RangeError(
      `Close a pane before opening another; this workspace allows ${state.maxPanes} visible panes.`,
    );
  }
  const parentIndex = state.panes.findIndex((pane) => pane.id === parentPaneId);
  if (parentIndex < 0) {
    throw new Error(`Workspace pane ${parentPaneId} was not found.`);
  }
  const pane: WorkspacePane = {
    id: `pane-${state.nextPane}`,
    kind,
    entryId,
    parentPaneId,
  };
  return {
    ...state,
    panes: [
      ...state.panes.slice(0, parentIndex + 1),
      pane,
      ...state.panes.slice(parentIndex + 1),
    ],
    activePaneId: pane.id,
    nextPane: state.nextPane + 1,
  };
}

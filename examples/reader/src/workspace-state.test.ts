import { describe, expect, it } from "vitest";

import {
  addConnectionsPane,
  addSourcePane,
  createWorkspaceState,
  pruneAfterPane,
  pruneFromPane,
  selectWorkspacePane,
} from "./workspace-state.js";

describe("reader workspace spatial state", () => {
  it("keeps an ancestor source beside a child source and its connections", () => {
    let state = createWorkspaceState("entry-a");
    state = addConnectionsPane(state, state.panes[0]!.id, "entry-a");
    state = pruneAfterPane(state, state.panes[0]!.id).state;
    state = addSourcePane(state, state.panes[0]!.id, "entry-b");
    state = addConnectionsPane(state, state.panes[1]!.id, "entry-b");

    expect(state.panes.map((pane) => [pane.kind, pane.entryId])).toEqual([
      ["source", "entry-a"],
      ["source", "entry-b"],
      ["connections", "entry-b"],
    ]);
    expect(state.activePaneId).toBe(state.panes[2]!.id);
  });

  it("prunes descendants without removing the selected ancestor", () => {
    let state = createWorkspaceState("entry-a");
    state = addConnectionsPane(state, state.panes[0]!.id, "entry-a");
    state = addSourcePane(state, state.panes[1]!.id, "entry-b");
    state = addConnectionsPane(state, state.panes[2]!.id, "entry-b");

    const result = pruneAfterPane(state, state.panes[0]!.id);

    expect(result.state.panes).toEqual([state.panes[0]]);
    expect(result.removed).toEqual(state.panes.slice(1));
    expect(result.state.activePaneId).toBe(state.panes[0]!.id);
  });

  it("selects one compact pane without changing pane order", () => {
    let state = createWorkspaceState("entry-a");
    state = addConnectionsPane(state, state.panes[0]!.id, "entry-a");
    const order = state.panes;

    state = selectWorkspacePane(state, state.panes[0]!.id);

    expect(state.panes).toBe(order);
    expect(state.activePaneId).toBe(state.panes[0]!.id);
  });

  it("closes a child pane and every pane descended from it", () => {
    let state = createWorkspaceState("entry-a");
    state = addSourcePane(state, state.panes[0]!.id, "entry-b");
    state = addConnectionsPane(state, state.panes[1]!.id, "entry-b");

    const result = pruneFromPane(state, state.panes[1]!.id);

    expect(result.state.panes).toEqual([state.panes[0]]);
    expect(result.removed).toEqual(state.panes.slice(1));
    expect(result.state.activePaneId).toBe(state.panes[0]!.id);
  });

  it("rejects a twenty-first visible pane", () => {
    let state = createWorkspaceState("entry-1", 20);
    for (let index = 2; index <= 20; index += 1) {
      state = addSourcePane(state, state.panes.at(-1)!.id, `entry-${index}`);
    }

    expect(() =>
      addSourcePane(state, state.panes.at(-1)!.id, "entry-21"),
    ).toThrow("Close a pane before opening another");
  });
});

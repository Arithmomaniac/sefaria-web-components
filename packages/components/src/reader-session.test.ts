import {
  validateGetV3Texts200,
  zCoreLinkResponse,
  type CoreLinkObject,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import linksFixture from "../../client/test/fixtures/links-targum-2026-08-30.json";
import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import {
  createReaderConnectionsContent,
  createReaderSession,
  createReaderSourceContent,
} from "./reader-session.js";

function source(tref: string) {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 text fixture.");
  }
  const payload = structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
  payload.ref = tref;
  payload.heRef = tref;
  return createReaderSourceContent(payload, { tref });
}

function largeSource(tref: string) {
  if (!validateGetV3Texts200(v3SourceBackedPayload)) {
    throw new TypeError("Expected a valid v3 text fixture.");
  }
  const payload = structuredClone(v3SourceBackedPayload) as CoreV3TextsResponse;
  payload.ref = tref;
  payload.heRef = tref;
  const version = payload.versions[0];
  if (!version) throw new TypeError("Expected one v3 text version.");
  version.text = "X".repeat(10_000);
  return createReaderSourceContent(payload, { tref });
}

const parsedLinks = zCoreLinkResponse.parse(linksFixture) as CoreLinkResponse;
if (
  !Array.isArray(parsedLinks) ||
  !parsedLinks[0] ||
  "isSheet" in parsedLinks[0]
) {
  throw new TypeError("Expected a text links fixture.");
}
const baseLink: CoreLinkObject = parsedLinks[0];

function links(count = 45, tref = "Micah 6:8") {
  const payload = Array.from({ length: count }, (_, index) => ({
    ...structuredClone(baseLink),
    _id: `reader-${index}`,
    anchorRef: tref,
    sourceRef: `Commentary on ${tref}:${index + 1}`,
    commentaryNum: index,
    category: "Commentary",
  }));
  return createReaderConnectionsContent(
    payload,
    { tref, withText: true },
    { category: "Commentary" },
  );
}

describe("reader session seeds", () => {
  it("accepts source-only, connections-only, and paired entries", () => {
    const sourceOnly = createReaderSession({ source: source("Micah 6:8") });
    const connectionsOnly = createReaderSession({
      connections: links(1),
    });
    const paired = createReaderSession({
      source: source("Micah 6:8"),
      connections: links(1),
    });

    expect(sourceOnly.view.current.source?.viewModel.state).toBe("data");
    expect(sourceOnly.view.current.connections).toBeUndefined();
    expect(connectionsOnly.view.current.source).toBeUndefined();
    expect(connectionsOnly.view.current.connections?.state).toBe("view");
    expect(paired.view.current).toMatchObject({
      source: { viewModel: { state: "data" } },
      connections: { state: "view", viewModel: { state: "data" } },
    });
  });

  it("rejects an empty seed", () => {
    expect(() => createReaderSession({})).toThrow(TypeError);
  });
});

describe("reader history and completion identity", () => {
  it("pushes committed sources, updates current state, and restores Back", () => {
    let session = createReaderSession({
      source: source("Micah 6:8"),
      connections: links(),
    });
    const rootId = session.view.currentEntryId;
    const projected = session.projectConnections(rootId, {
      category: "Commentary",
      page: 1,
    });
    expect(projected.state).toBe("applied");
    if (projected.state !== "applied") return;
    session = projected.session;
    expect(session.view.current.connections).toMatchObject({
      state: "view",
      projection: { category: "Commentary", page: 1 },
      viewModel: { page: 1 },
    });

    const begun = session.beginSourceNavigation(rootId, {
      tref: "Rashi on Micah 6:8",
    });
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const committed = begun.session.completeSourceNavigation(
      begun.value.operationId,
      { source: source("Rashi on Micah 6:8") },
    );
    expect(committed.state).toBe("applied");
    if (committed.state !== "applied") return;
    session = committed.session;
    const childId = session.view.currentEntryId;
    expect(childId).not.toBe(rootId);
    expect(session.view.breadcrumbs.map((crumb) => crumb.label)).toEqual([
      "Micah 6:8",
      "Rashi on Micah 6:8",
    ]);

    const restored = session.back();
    expect(restored.state).toBe("applied");
    if (restored.state !== "applied") return;
    expect(restored.session.view.currentEntryId).toBe(rootId);
    expect(restored.session.view.current.connections).toMatchObject({
      state: "view",
      projection: { page: 1 },
      viewModel: { page: 1 },
    });
    const fetch = vi.fn(() => {
      throw new Error("Reader local projection must not request data.");
    });
    vi.stubGlobal("fetch", fetch);
    const thirdPage = restored.session.projectConnections(rootId, {
      category: "Commentary",
      page: 2,
    });
    vi.unstubAllGlobals();
    expect(thirdPage.state).toBe("applied");
    if (thirdPage.state !== "applied") return;
    expect(thirdPage.session.view.current.connections).toMatchObject({
      state: "view",
      projection: { page: 2 },
      viewModel: { page: 2 },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("updates source selection and display state without pushing history", () => {
    const session = createReaderSession({ source: source("Micah 6:8") });
    const entryId = session.view.currentEntryId;
    const sourceView = session.view.current.source?.viewModel;
    expect(sourceView?.state).toBe("data");
    if (sourceView?.state !== "data") return;
    const position = sourceView.items[0]?.position;
    if (!position) throw new Error("Expected a source-card item.");
    const selected = session.selectSourcePosition(entryId, position);
    expect(selected.state).toBe("applied");
    if (selected.state !== "applied") return;
    const displayed = selected.session.setPresentation(entryId, {
      contentLanguage: "translation",
      layout: "stacked",
      sideOrder: "translation-first",
      showConnectionPreviews: false,
    });
    expect(displayed.state).toBe("applied");
    if (displayed.state !== "applied") return;
    expect(displayed.session.view.entries).toHaveLength(1);
    expect(displayed.session.view.current).toMatchObject({
      selectedPosition: position,
      presentation: {
        contentLanguage: "translation",
        layout: "stacked",
        sideOrder: "translation-first",
        showConnectionPreviews: false,
      },
    });
  });

  it("assigns distinct IDs to repeated equal references and prunes later crumbs", () => {
    let session = createReaderSession({ source: source("Micah 6:8") });
    const firstId = session.view.currentEntryId;
    for (let index = 0; index < 2; index++) {
      const begun = session.beginSourceNavigation(session.view.currentEntryId, {
        tref: "Micah 6:8",
      });
      expect(begun.state).toBe("applied");
      if (begun.state !== "applied") return;
      const committed = begun.session.completeSourceNavigation(
        begun.value.operationId,
        { source: source("Micah 6:8") },
      );
      expect(committed.state).toBe("applied");
      if (committed.state !== "applied") return;
      session = committed.session;
    }

    expect(new Set(session.view.entries.map((entry) => entry.id)).size).toBe(3);
    const activated = session.activate(firstId);
    expect(activated.state).toBe("applied");
    if (activated.state !== "applied") return;
    expect(activated.session.view.entries).toHaveLength(1);
    expect(activated.session.view.currentEntryId).toBe(firstId);
  });

  it("commits navigation from an ancestor by replacing its later branch", () => {
    let session = createReaderSession({ source: source("Micah 6:8") });
    const rootId = session.view.currentEntryId;
    const first = session.beginSourceNavigation(rootId, {
      tref: "Rashi on Micah 6:8",
    });
    expect(first.state).toBe("applied");
    if (first.state !== "applied") return;
    const firstCommitted = first.session.completeSourceNavigation(
      first.value.operationId,
      { source: source("Rashi on Micah 6:8") },
    );
    expect(firstCommitted.state).toBe("applied");
    if (firstCommitted.state !== "applied") return;
    session = firstCommitted.session;

    const replacement = session.beginSourceNavigation(rootId, {
      tref: "Ibn Ezra on Micah 6:8",
    });
    expect(replacement.state).toBe("applied");
    if (replacement.state !== "applied") return;
    const replaced = replacement.session.completeSourceNavigation(
      replacement.value.operationId,
      { source: source("Ibn Ezra on Micah 6:8") },
    );
    expect(replaced.state).toBe("applied");
    if (replaced.state !== "applied") return;
    expect(replaced.session.view.entries.map((entry) => entry.label)).toEqual([
      "Micah 6:8",
      "Ibn Ezra on Micah 6:8",
    ]);
  });

  it("rejects late and duplicate completions without changing restored state", () => {
    let session = createReaderSession({ source: source("Micah 6:8") });
    const rootId = session.view.currentEntryId;
    const begun = session.beginSourceNavigation(rootId, {
      tref: "Rashi on Micah 6:8",
    });
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const operationId = begun.value.operationId;
    const committed = begun.session.completeSourceNavigation(operationId, {
      source: source("Rashi on Micah 6:8"),
    });
    expect(committed.state).toBe("applied");
    if (committed.state !== "applied") return;
    session = committed.session;

    const restored = session.back();
    expect(restored.state).toBe("applied");
    if (restored.state !== "applied") return;
    const late = restored.session.completeSourceNavigation(operationId, {
      source: source("Rashi on Micah 6:8"),
    });
    expect(late).toMatchObject({
      state: "rejected",
      reason: "operation-not-found",
    });
    expect(late.session.view.currentEntryId).toBe(rootId);
  });

  it("interrupts pending connections when a child source commits", () => {
    let session = createReaderSession({ source: source("Micah 6:8") });
    const rootId = session.view.currentEntryId;
    const linksBegun = session.beginConnections(
      rootId,
      { tref: "Micah 6:8", withText: true },
      {},
      "Loading connections.",
    );
    expect(linksBegun.state).toBe("applied");
    if (linksBegun.state !== "applied") return;
    session = linksBegun.session;
    const linksOperationId = linksBegun.value.operationId;

    const sourceBegun = session.beginSourceNavigation(rootId, {
      tref: "Rashi on Micah 6:8",
    });

    expect(sourceBegun.state).toBe("applied");
    if (sourceBegun.state !== "applied") return;
    const sourceCommitted = sourceBegun.session.completeSourceNavigation(
      sourceBegun.value.operationId,
      { source: source("Rashi on Micah 6:8") },
    );
    expect(sourceCommitted.state).toBe("applied");
    if (sourceCommitted.state !== "applied") return;
    const restored = sourceCommitted.session.back();
    expect(restored.state).toBe("applied");
    if (restored.state !== "applied") return;
    expect(restored.session.view.current.connections).toMatchObject({
      state: "unavailable",
      reason: "interrupted",
    });

    const late = restored.session.completeConnections(
      linksOperationId,
      links(1),
    );
    expect(late).toMatchObject({
      state: "rejected",
      reason: "operation-not-found",
    });
  });

  it("commits or fails identified connections work exactly once", () => {
    const session = createReaderSession({ source: source("Micah 6:8") });
    const entryId = session.view.currentEntryId;
    const begun = session.beginConnections(
      entryId,
      { tref: "Micah 6:8", withText: true },
      { category: "Commentary" },
    );
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const content = links(1);
    const completed = begun.session.completeConnections(
      begun.value.operationId,
      content,
    );
    expect(completed.state).toBe("applied");
    if (completed.state !== "applied") return;
    expect(completed.session.view.current.connections).toMatchObject({
      state: "view",
      viewModel: { state: "data" },
    });
    expect(
      completed.session.completeConnections(begun.value.operationId, content),
    ).toMatchObject({
      state: "rejected",
      reason: "operation-not-found",
    });

    const retried = completed.session.beginConnections(
      entryId,
      { tref: "Micah 6:8", withText: true },
      { category: "Commentary" },
    );
    expect(retried.state).toBe("applied");
    if (retried.state !== "applied") return;
    const failed = retried.session.failConnections(
      retried.value.operationId,
      "Connections service is unavailable.",
    );
    expect(failed.state).toBe("applied");
    if (failed.state !== "applied") return;
    expect(failed.session.view.current.connections).toMatchObject({
      state: "unavailable",
      reason: "failed",
    });
  });

  it("rejects impossible connections pages before creating a loading slot", () => {
    const session = createReaderSession({ source: source("Micah 6:8") });
    expect(() =>
      session.beginConnections(
        session.view.currentEntryId,
        { tref: "Micah 6:8" },
        { page: Math.ceil(Number.MAX_SAFE_INTEGER / 20) },
      ),
    ).toThrow(RangeError);
    expect(session.view.current.connections).toBeUndefined();
  });
});

describe("reader retention", () => {
  it("uses the documented defaults and rejects a one-byte initial overflow", () => {
    const content = source("Micah 6:8");
    const session = createReaderSession({ source: content });
    expect(session.view).toMatchObject({
      maxEntries: 20,
      maxCaptureBytes: 20 * 1024 * 1024,
    });
    expect(() =>
      createReaderSession(
        { source: content },
        { maxCaptureBytes: content.capture.byteSize - 1 },
      ),
    ).toThrow(RangeError);
  });

  it("evicts oldest inactive entries and exposes the truncated boundary", () => {
    let session = createReaderSession(
      { source: source("Micah 6:8") },
      { maxEntries: 2 },
    );
    for (const tref of ["Rashi on Micah 6:8", "Ibn Ezra on Micah 6:8"]) {
      const begun = session.beginSourceNavigation(session.view.currentEntryId, {
        tref,
      });
      expect(begun.state).toBe("applied");
      if (begun.state !== "applied") return;
      const committed = begun.session.completeSourceNavigation(
        begun.value.operationId,
        { source: source(tref) },
      );
      expect(committed.state).toBe("applied");
      if (committed.state !== "applied") return;
      session = committed.session;
    }

    expect(session.view.entries.map((entry) => entry.label)).toEqual([
      "Rashi on Micah 6:8",
      "Ibn Ezra on Micah 6:8",
    ]);
    expect(session.view.historyTruncated).toBe(true);
  });

  it("counts a shared capture once", () => {
    const shared = links(1);
    let session = createReaderSession({
      source: source("Micah 6:8"),
      connections: shared,
    });
    const initialBytes = session.view.retainedCaptureBytes;
    const begun = session.beginSourceNavigation(session.view.currentEntryId, {
      tref: "Rashi on Micah 6:8",
    });
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const committed = begun.session.completeSourceNavigation(
      begun.value.operationId,
      {
        source: source("Rashi on Micah 6:8"),
        connections: shared,
      },
    );
    expect(committed.state).toBe("applied");
    if (committed.state !== "applied") return;
    session = committed.session;
    const childSource = source("Rashi on Micah 6:8");
    expect(session.view.retainedCaptureBytes).toBe(
      initialBytes + childSource.capture.byteSize,
    );
    expect(
      session.view.entries.filter((entry) => entry.connections).length,
    ).toBe(2);
  });

  it("rejects an over-budget admission without evicting committed history", () => {
    const root = source("Micah 6:8");
    const session = createReaderSession(
      { source: root },
      { maxCaptureBytes: root.capture.byteSize + 20 },
    );
    const before = session.view;
    const begun = session.beginSourceNavigation(session.view.currentEntryId, {
      tref: "Rashi on Micah 6:8",
    });
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const rejected = begun.session.completeSourceNavigation(
      begun.value.operationId,
      { source: largeSource("Rashi on Micah 6:8") },
    );
    expect(rejected).toMatchObject({
      state: "rejected",
      reason: "budget-exceeded",
    });
    expect(rejected.session.view.entries).toEqual(before.entries);
    expect(rejected.session.view.historyTruncated).toBe(false);
  });

  it("terminates a loading connections slot after budget rejection", () => {
    const root = source("Micah 6:8");
    const session = createReaderSession(
      { source: root },
      { maxCaptureBytes: root.capture.byteSize + 20 },
    );
    const begun = session.beginConnections(
      session.view.currentEntryId,
      { tref: "Micah 6:8", withText: true },
      { category: "Commentary" },
    );
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const rejected = begun.session.completeConnections(
      begun.value.operationId,
      links(1),
    );
    expect(rejected).toMatchObject({
      state: "rejected",
      reason: "budget-exceeded",
    });
    expect(rejected.session.view.current.connections).toMatchObject({
      state: "unavailable",
      reason: "failed",
    });
    expect(
      rejected.session.cancelOperation(begun.value.operationId),
    ).toMatchObject({
      state: "rejected",
      reason: "operation-not-found",
    });
  });

  it("does not evict pinned entries and requires release before pruning", () => {
    let session = createReaderSession(
      { source: source("Micah 6:8") },
      { maxEntries: 2 },
    );
    const rootId = session.view.currentEntryId;
    const pinned = session.pin(rootId);
    expect(pinned.state).toBe("applied");
    if (pinned.state !== "applied") return;
    session = pinned.session;
    const pinId = pinned.value.pinId;

    const firstBegun = session.beginSourceNavigation(
      session.view.currentEntryId,
      { tref: "Rashi on Micah 6:8" },
    );
    expect(firstBegun.state).toBe("applied");
    if (firstBegun.state !== "applied") return;
    const firstCommitted = firstBegun.session.completeSourceNavigation(
      firstBegun.value.operationId,
      { source: source("Rashi on Micah 6:8") },
    );
    expect(firstCommitted.state).toBe("applied");
    if (firstCommitted.state !== "applied") return;
    session = firstCommitted.session;
    const childId = session.view.currentEntryId;
    const childPinned = session.pin(childId);
    expect(childPinned.state).toBe("applied");
    if (childPinned.state !== "applied") return;
    session = childPinned.session;

    const begun = session.beginSourceNavigation(childId, {
      tref: "Ibn Ezra on Micah 6:8",
    });
    expect(begun.state).toBe("applied");
    if (begun.state !== "applied") return;
    const committed = begun.session.completeSourceNavigation(
      begun.value.operationId,
      { source: source("Ibn Ezra on Micah 6:8") },
    );
    expect(committed).toMatchObject({
      state: "rejected",
      reason: "budget-exceeded",
    });

    expect(session.activate(rootId)).toMatchObject({
      state: "rejected",
      reason: "entry-pinned",
    });
    const childReleased = session.release(childPinned.value.pinId);
    expect(childReleased.state).toBe("applied");
    if (childReleased.state !== "applied") return;
    const activated = childReleased.session.activate(rootId);
    expect(activated.state).toBe("applied");
    if (activated.state !== "applied") return;
    const rootReleased = activated.session.release(pinId);
    expect(rootReleased.state).toBe("applied");
  });
});

import { describe, expect, it } from "vitest";

import type { ReaderSessionView } from "./reader-session.js";
import { createReaderViewModel } from "./reader.js";

const sessionView: ReaderSessionView = {
  entries: [
    {
      id: "entry-1",
      label: "Micah 6:8",
      source: {
        request: { tref: "Micah 6:8" },
        viewModel: {
          state: "data",
          header: {
            ref: "Micah 6:8",
            heRef: "מיכה ו׳:ח׳",
            indexTitle: "Micah",
            heIndexTitle: "מיכה",
            primaryCategory: "Tanakh",
            categories: ["Tanakh", "Prophets"],
          },
          attributions: [],
          items: [
            {
              position: [],
              ref: "Micah 6:8",
              addressLabel: "8",
              pair: {
                state: "empty",
                absent: [
                  { side: "primary", message: "No primary text." },
                  { side: "translation", message: "No translation." },
                ],
              },
            },
          ],
        },
      },
      connections: {
        state: "loading",
        request: { tref: "Micah 6:8", withText: true },
        projection: { category: "Commentary", page: 0 },
        viewModel: { state: "loading", message: "Loading connections." },
        operationId: "operation-8",
      },
      selectedPosition: [],
      presentation: {
        contentLanguage: "both",
        layout: "auto",
        sideOrder: "primary-first",
        showConnectionPreviews: false,
      },
      pinCount: 0,
    },
  ],
  currentEntryId: "entry-1",
  current: {
    id: "entry-1",
    label: "Micah 6:8",
    source: {
      request: { tref: "Micah 6:8" },
      viewModel: {
        state: "data",
        header: {
          ref: "Micah 6:8",
          heRef: "מיכה ו׳:ח׳",
          indexTitle: "Micah",
          heIndexTitle: "מיכה",
          primaryCategory: "Tanakh",
          categories: ["Tanakh", "Prophets"],
        },
        attributions: [],
        items: [
          {
            position: [],
            ref: "Micah 6:8",
            addressLabel: "8",
            pair: {
              state: "empty",
              absent: [
                { side: "primary", message: "No primary text." },
                { side: "translation", message: "No translation." },
              ],
            },
          },
        ],
      },
    },
    connections: {
      state: "loading",
      request: { tref: "Micah 6:8", withText: true },
      projection: { category: "Commentary", page: 0 },
      viewModel: { state: "loading", message: "Loading connections." },
      operationId: "operation-8",
    },
    selectedPosition: [],
    presentation: {
      contentLanguage: "both",
      layout: "auto",
      sideOrder: "primary-first",
      showConnectionPreviews: false,
    },
    pinCount: 0,
  },
  breadcrumbs: [{ entryId: "entry-1", label: "Micah 6:8", current: true }],
  historyTruncated: true,
  retainedCaptureBytes: 123,
  maxEntries: 20,
  maxCaptureBytes: 20 * 1024 * 1024,
};

describe("createReaderViewModel", () => {
  it("projects render state without requests, captures, pins, or operation IDs", () => {
    const result = createReaderViewModel(sessionView);

    expect(result).toEqual({
      currentEntryId: "entry-1",
      label: "Micah 6:8",
      breadcrumbs: [{ entryId: "entry-1", label: "Micah 6:8", current: true }],
      canGoBack: false,
      historyTruncated: true,
      source: {
        viewModel: sessionView.current.source?.viewModel,
        selectedPosition: [],
        contentLanguage: "both",
        layout: "auto",
        sideOrder: "primary-first",
      },
      connections: {
        state: "component",
        viewModel: { state: "loading", message: "Loading connections." },
        showPreviews: false,
      },
      selectedTarget: { ref: "Micah 6:8" },
    });
    expect(JSON.stringify(result)).not.toContain("operation-8");
    expect(JSON.stringify(result)).not.toContain('"request"');
    expect(JSON.stringify(result)).not.toContain("retainedCaptureBytes");
  });

  it("preserves an explicit unavailable connections state", () => {
    const unavailable: ReaderSessionView = {
      ...sessionView,
      current: {
        ...sessionView.current,
        connections: {
          state: "unavailable",
          reason: "interrupted",
          request: { tref: "Micah 6:8" },
          projection: {},
          message: "Connections loading was interrupted.",
        },
      },
    };

    expect(createReaderViewModel(unavailable).connections).toEqual({
      state: "unavailable",
      reason: "interrupted",
      message: "Connections loading was interrupted.",
    });
  });
});

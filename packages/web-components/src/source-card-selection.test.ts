import {
  zCoreV3TextsResponse,
  type CoreV3TextsResponse,
} from "@sefaria/client";
import { expect, test } from "vitest";
import { v3SourceBackedPayload } from "../../../tests/compatibility/src/v3-source-backed.fixture.js";
import { createSourceCardViewModel } from "./source-card.js";

function payload(): CoreV3TextsResponse {
  const base = zCoreV3TextsResponse.parse(
    v3SourceBackedPayload,
  ) as CoreV3TextsResponse;
  return {
    ...structuredClone(base),
    ref: "Genesis 1:2-4",
    sectionRef: "Genesis 1",
    sections: ["1", "2"],
    toSections: ["1", "4"],
    textDepth: 2,
    addressTypes: ["Integer", "Integer"],
    isSpanning: false,
    index_offsets_by_depth: {},
    versions: base.versions.map((version) => ({
      ...version,
      text: ["Two", null, "Four"],
    })),
  };
}

test("range starts and omitted rows preserve canonical target identity", () => {
  const result = createSourceCardViewModel(payload(), {
    tref: "Genesis 1:2-4",
  });
  expect(result.state).toBe("data");
  if (result.state !== "data") return;
  expect(result.navigation).toEqual({
    state: "available",
    sectionRef: "Genesis 1",
    firstRef: "Genesis 1:2",
  });
  expect(
    result.items.map((item) => [item.position, item.ref, item.addressLabel]),
  ).toEqual([
    [[0], "Genesis 1:2", "2"],
    [[2], "Genesis 1:4", "4"],
  ]);
});

test("sections use offset numbering and preserve a Talmud prefix", () => {
  const input = payload();
  Object.assign(input, {
    ref: "Berakhot 2a",
    sectionRef: "Berakhot 2a",
    sections: ["2a"],
    toSections: ["2a"],
    addressTypes: ["Talmud", "Integer"],
    index_offsets_by_depth: { "2": [6] },
  });
  const result = createSourceCardViewModel(input, { tref: input.ref });
  expect(
    result.state === "data" &&
      result.items.map((item) => [item.ref, item.addressLabel]),
  ).toEqual([
    ["Berakhot 2a:7", "7"],
    ["Berakhot 2a:9", "9"],
  ]);
});

test("a scalar target is already canonical and depth-one sections use spaces", () => {
  const input = payload();
  Object.assign(input, {
    ref: "Sefer HaBahir",
    sectionRef: "Sefer HaBahir",
    textDepth: 1,
    sections: [],
    toSections: [],
    addressTypes: ["Integer"],
  });
  let result = createSourceCardViewModel(input, { tref: input.ref });
  expect(
    result.state === "data" && [
      result.items[0]?.ref,
      result.items[0]?.addressLabel,
    ],
  ).toEqual(["Sefer HaBahir 1", "1"]);
  Object.assign(input, {
    ref: "Sefer HaBahir 5",
    sections: ["5"],
    toSections: ["5"],
  });
  input.versions = input.versions.map((version) => ({
    ...version,
    text: "Five",
  }));
  result = createSourceCardViewModel(input, { tref: input.ref });
  expect(
    result.state === "data" && [
      result.items[0]?.ref,
      result.items[0]?.addressLabel,
    ],
  ).toEqual(["Sefer HaBahir 5", "5"]);
});

test("a missing first row does not select the next visible row", () => {
  const input = payload();
  input.versions = input.versions.map((version) => ({
    ...version,
    text: [null, "Three"],
  }));
  const result = createSourceCardViewModel(input, { tref: input.ref });
  expect(result.state === "data" && result.navigation).toMatchObject({
    firstRef: "Genesis 1:2",
  });
  expect(result.state === "data" && result.items[0]?.ref).toBe("Genesis 1:3");
});

test("a spanning target exposes only its first server-provided context", () => {
  const input = payload();
  input.isSpanning = true;
  input.spanningRefs = ["Genesis 1:2-31", "Genesis 2:1-4"];
  input.versions = input.versions.map((version) => ({
    ...version,
    text: [["Nested"]],
  }));
  const result = createSourceCardViewModel(input, { tref: input.ref });
  expect(result.state).toBe("data");
  if (result.state !== "data") return;
  expect(result.navigation).toEqual({
    state: "context-required",
    contextRef: "Genesis 1:2-31",
  });
  expect(result.items[0]?.ref).toBeUndefined();
  expect(result.items[0]?.addressLabel).toBeUndefined();
});

test("unsupported nested non-spanning content still renders without targets", () => {
  const input = payload();
  input.versions = input.versions.map((version) => ({
    ...version,
    text: [["Nested"]],
  }));
  const result = createSourceCardViewModel(input, { tref: input.ref });
  expect(result.state).toBe("data");
  if (result.state !== "data") return;
  expect(result.navigation?.state).toBe("unavailable");
  expect(result.items[0]?.ref).toBeUndefined();
  expect(result.items[0]?.addressLabel).toBeUndefined();
});

test("invalid consumed offsets preserve text and expose their JSON path", () => {
  const input = payload();
  Object.assign(input, {
    ref: "Genesis 1",
    sections: ["1"],
    toSections: ["1"],
    index_offsets_by_depth: { "2": "bad" },
  });
  const result = createSourceCardViewModel(input, { tref: input.ref });
  expect(result.state).toBe("data");
  if (result.state !== "data") return;
  expect(result.items).toHaveLength(2);
  expect(result.items.every((item) => item.ref === undefined)).toBe(true);
  expect(result.navigation).toEqual({
    state: "unavailable",
    message: "Invalid segment offset at index_offsets_by_depth.2.",
    paths: [["index_offsets_by_depth", "2"]],
  });
});

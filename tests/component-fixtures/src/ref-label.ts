import {
  componentContractExamples,
  componentPayloadFixtures,
} from "@sefaria/client/test-fixtures";

import type { ComponentFixture, RefComponentRequest } from "./contracts.js";

export type RefLabelViewModelFixture =
  | {
      readonly state: "loading";
      readonly message: string;
    }
  | {
      readonly state: "data";
      readonly normalized: string;
      readonly labels: readonly [
        {
          readonly language: "en";
          readonly direction: "ltr";
          readonly text: string;
        },
        {
          readonly language: "he";
          readonly direction: "rtl";
          readonly text: string;
        },
      ];
      readonly href: string;
      readonly indexTitle: string;
      readonly nodeType: string;
    }
  | {
      readonly state: "empty";
      readonly input: string;
      readonly message: string;
    }
  | {
      readonly state: "error";
      readonly status: 404;
      readonly message: string;
    };

export type RefLabelElementPropertiesFixture = {
  readonly form: "human" | "url";
  readonly language: "en" | "he";
  readonly link: boolean;
};

export const sheetRefLabel = {
  state: "data",
  normalized: "Sheet 643492",
  labels: [
    {
      language: "en",
      direction: "ltr",
      text: "Sheet 643492",
    },
    {
      language: "he",
      direction: "rtl",
      text: "דף תרמג׳תצ״ב",
    },
  ],
  href: "https://www.sefaria.org/Sheet.643492",
  indexTitle: "Sheet",
  nodeType: "SheetNode",
} as const satisfies RefLabelViewModelFixture;

export const refLabelFixtures = [
  {
    kind: "render",
    id: "ref-label-loading",
    ownerIssue: 17,
    viewModel: {
      state: "loading",
      message: "Loading reference.",
    },
  },
  {
    kind: "projection",
    id: "ref-label-sheet-data",
    ownerIssue: 17,
    request: {
      path: { tref: "Sheet 643492" },
    },
    payloadKey: "sheetRef",
    payload: componentPayloadFixtures.sheetRef.payload,
    expected: sheetRefLabel,
  },
  {
    kind: "projection",
    id: "ref-label-invalid-empty",
    ownerIssue: 17,
    request: {
      path: { tref: "__missing_component_fixture__" },
    },
    payloadKey: "invalidRef",
    payload: componentPayloadFixtures.invalidRef.payload,
    expected: {
      state: "empty",
      input: "__missing_component_fixture__",
      message: "The reference is not available.",
    },
  },
  {
    kind: "http-error",
    id: "ref-label-contract-error",
    ownerIssue: 17,
    request: {
      path: { tref: "__unexpected_reference_failure__" },
    },
    status: 404,
    payloadKey: componentContractExamples.refNotFound.key,
    payload: componentContractExamples.refNotFound.payload,
    expected: {
      state: "error",
      status: 404,
      message: "unexpected reference parsing failure",
    },
  },
  {
    kind: "rejection",
    id: "ref-label-network-rejection",
    ownerIssue: 17,
    request: {
      path: { tref: "Sheet 643492" },
    },
    rejection: "network",
  },
] as const satisfies readonly ComponentFixture<
  RefComponentRequest,
  RefLabelViewModelFixture
>[];

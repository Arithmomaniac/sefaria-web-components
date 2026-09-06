import {
  type ContractIssue,
  type CoreErrorResponse,
  type CoreV3TextsResponse,
  validateExternalResponse,
} from "@sefaria/client";
import {
  SefariaSourceCard,
  type SourceCardViewModel,
} from "@sefaria/components";
import { createSourceCardViewModel } from "@sefaria/components/source-card";

const SOURCE_CARD_META_KEY = "sefaria/source-card";
const V3_TEXTS_PATH = "/api/v3/texts/{tref}";
const DOCUMENTED_STATUSES = new Set([200, 400, 404]);

interface ToolResultLike {
  readonly content?: readonly unknown[] | undefined;
  readonly isError?: boolean | undefined;
  readonly structuredContent?: unknown;
  readonly _meta?: Record<string, unknown> | undefined;
}

interface SourceCardMetadata {
  readonly operation: "getV3Texts";
  readonly method: "GET";
  readonly path: typeof V3_TEXTS_PATH;
  readonly status: 200 | 400 | 404;
  readonly request: {
    readonly tref: string;
  };
}

type MetadataResult =
  | { readonly valid: true; readonly data: SourceCardMetadata }
  | { readonly valid: false; readonly issues: readonly ContractIssue[] };

/** Validates and renders one MCP tool result into the App root. */
export function renderToolResult(
  root: HTMLElement,
  result: ToolResultLike,
): void {
  if (result.isError === true) {
    renderToolError(root, result.content);
    return;
  }

  const metadata = validateMetadata(result._meta);
  if (!metadata.valid) {
    renderIntegrationError(root, metadata.issues);
    return;
  }

  const validation = validateExternalResponse(
    {
      method: metadata.data.method,
      path: metadata.data.path,
      status: metadata.data.status,
    },
    result.structuredContent,
  );
  if (!validation.valid) {
    renderIntegrationError(root, validation.issues);
    return;
  }

  const viewModel =
    metadata.data.status === 200
      ? createSourceCardViewModel(
          result.structuredContent as CoreV3TextsResponse,
          metadata.data.request,
        )
      : createHttpErrorViewModel(
          metadata.data.status,
          result.structuredContent as CoreErrorResponse,
        );
  renderSourceCard(root, viewModel);
}

/** Renders an integration-owned status message outside the source-card element. */
export function renderStatus(root: HTMLElement, message: string): void {
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = message;
  root.replaceChildren(status);
}

function validateMetadata(
  meta: Record<string, unknown> | undefined,
): MetadataResult {
  const issues: ContractIssue[] = [];
  const value = meta?.[SOURCE_CARD_META_KEY];
  if (!isRecord(value)) {
    return invalidMetadata(
      `/_meta/${pointerSegment(SOURCE_CARD_META_KEY)}`,
      "Expected source-card metadata.",
    );
  }

  if (value.operation !== "getV3Texts") {
    issues.push(metadataIssue("/operation", "Expected getV3Texts."));
  }
  if (value.method !== "GET") {
    issues.push(metadataIssue("/method", "Expected GET."));
  }
  if (value.path !== V3_TEXTS_PATH) {
    issues.push(metadataIssue("/path", `Expected ${V3_TEXTS_PATH}.`));
  }
  if (
    typeof value.status !== "number" ||
    !DOCUMENTED_STATUSES.has(value.status)
  ) {
    issues.push(metadataIssue("/status", "Expected status 200, 400, or 404."));
  }
  if (
    !isRecord(value.request) ||
    typeof value.request.tref !== "string" ||
    value.request.tref.trim().length === 0
  ) {
    issues.push(
      metadataIssue("/request/tref", "Expected a non-blank reference."),
    );
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  if (
    !isDocumentedStatus(value.status) ||
    !isRecord(value.request) ||
    typeof value.request.tref !== "string"
  ) {
    throw new Error("Validated source-card metadata lost its type invariants.");
  }

  return {
    valid: true,
    data: {
      operation: "getV3Texts",
      method: "GET",
      path: V3_TEXTS_PATH,
      status: value.status,
      request: { tref: value.request.tref },
    },
  };
}

function invalidMetadata(path: string, message: string): MetadataResult {
  return {
    valid: false,
    issues: [
      {
        instancePath: path,
        schemaPath: "/_meta/sefaria~1source-card",
        keyword: "invalid-metadata",
        message,
      },
    ],
  };
}

function metadataIssue(path: string, message: string): ContractIssue {
  return {
    instancePath: `/_meta/${pointerSegment(SOURCE_CARD_META_KEY)}${path}`,
    schemaPath: "/_meta/sefaria~1source-card",
    keyword: "invalid-metadata",
    message,
  };
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDocumentedStatus(value: unknown): value is 200 | 400 | 404 {
  return typeof value === "number" && DOCUMENTED_STATUSES.has(value);
}

function createHttpErrorViewModel(
  status: 400 | 404,
  payload: CoreErrorResponse,
): SourceCardViewModel {
  return {
    state: "error",
    errorKind: "http",
    status,
    message: payload.error,
  };
}

function renderSourceCard(
  root: HTMLElement,
  viewModel: SourceCardViewModel,
): void {
  const card = new SefariaSourceCard();
  card.viewModel = viewModel;
  root.replaceChildren(card);
}

function renderIntegrationError(
  root: HTMLElement,
  issues: readonly ContractIssue[],
): void {
  const section = document.createElement("section");
  section.setAttribute("role", "alert");

  const heading = document.createElement("strong");
  heading.textContent = "Sefaria MCP App could not render this result.";
  section.append(heading);

  const list = document.createElement("ul");
  for (const issue of issues) {
    const item = document.createElement("li");
    item.textContent = `${issue.instancePath || "/"}: ${issue.message}`;
    list.append(item);
  }
  section.append(list);
  root.replaceChildren(section);
}

function renderToolError(
  root: HTMLElement,
  content: readonly unknown[] | undefined,
): void {
  const message = content?.find(
    (item): item is { readonly type: "text"; readonly text: string } =>
      isRecord(item) && item.type === "text" && typeof item.text === "string",
  )?.text;
  const alert = document.createElement("p");
  alert.setAttribute("role", "alert");
  alert.textContent =
    message ?? "The Sefaria MCP tool failed without a text message.";
  root.replaceChildren(alert);
}

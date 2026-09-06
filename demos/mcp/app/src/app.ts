import {
  type ContractIssue,
  type CoreErrorResponse,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
  validateExternalResponse,
} from "@sefaria/client";
import {
  SefariaConnectionsPanel,
  SefariaSourceCard,
  type SourceCardViewModel,
} from "@sefaria/components";
import {
  CONNECTIONS_PAGE_SIZE,
  createConnectionsViewModel,
  type ConnectionsProjection,
  type ConnectionsRequest,
} from "@sefaria/components/connections-panel";
import { createSourceCardViewModel } from "@sefaria/components/source-card";

const SOURCE_CARD_META_KEY = "sefaria/source-card";
const CONNECTIONS_META_KEY = "sefaria/connections";
const V3_TEXTS_PATH = "/api/v3/texts/{tref}";
const LINKS_PATH = "/api/links/{tref}";
const SOURCE_CARD_STATUSES = new Set([200, 400, 404]);
const CONNECTIONS_STATUSES = new Set([200, 400]);
const MAX_LINKS = 10_000;
const MAX_LINKS_PAYLOAD_BYTES = 5 * 1024 * 1024;

interface ToolResultLike {
  readonly content?: readonly unknown[] | undefined;
  readonly isError?: boolean | undefined;
  readonly structuredContent?: unknown;
  readonly _meta?: Record<string, unknown> | undefined;
}

interface SourceCardMetadata {
  readonly kind: "source-card";
  readonly operation: "getV3Texts";
  readonly method: "GET";
  readonly path: typeof V3_TEXTS_PATH;
  readonly status: 200 | 400 | 404;
  readonly request: {
    readonly tref: string;
  };
}

interface ConnectionsMetadata {
  readonly kind: "connections";
  readonly operation: "getLinks";
  readonly method: "GET";
  readonly path: typeof LINKS_PATH;
  readonly status: 200 | 400;
  readonly request: ConnectionsRequest;
}

type ResultMetadata = SourceCardMetadata | ConnectionsMetadata;
type MetadataResult =
  | { readonly valid: true; readonly data: ResultMetadata }
  | { readonly valid: false; readonly issues: readonly ContractIssue[] };

/** Host interaction used only after explicit user activation. */
export interface ConnectionsInteraction {
  sendMessage(
    text: string,
  ): Promise<{ readonly isError?: boolean | undefined }>;
}

interface MessageHost {
  sendMessage(params: {
    role: "user";
    content: Array<{ type: "text"; text: string }>;
  }): Promise<{ readonly isError?: boolean | undefined }>;
}

/** Adapts the MCP Apps message API to the connections interaction boundary. */
export function createConnectionsInteraction(
  host: MessageHost,
): ConnectionsInteraction {
  return {
    sendMessage: async (text) =>
      host.sendMessage({
        role: "user",
        content: [{ type: "text", text }],
      }),
  };
}

/** Validates and renders one MCP tool result into the App root. */
export function renderToolResult(
  root: HTMLElement,
  result: ToolResultLike,
  interaction?: ConnectionsInteraction,
): () => void {
  if (result.isError === true) {
    renderToolError(root, result.content);
    return noCleanup;
  }

  const metadata = validateMetadata(result._meta);
  if (!metadata.valid) {
    renderIntegrationError(root, metadata.issues);
    return noCleanup;
  }

  if (metadata.data.kind === "source-card") {
    renderSourceCardResult(root, result, metadata.data);
    return noCleanup;
  }
  return renderConnectionsResult(root, result, metadata.data, interaction);
}

/** Renders an integration-owned status message outside component elements. */
export function renderStatus(root: HTMLElement, message: string): void {
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = message;
  root.replaceChildren(status);
}

function renderSourceCardResult(
  root: HTMLElement,
  result: ToolResultLike,
  metadata: SourceCardMetadata,
): void {
  const validation = validateExternalResponse(
    {
      method: metadata.method,
      path: metadata.path,
      status: metadata.status,
    },
    result.structuredContent,
  );
  if (!validation.valid) {
    renderIntegrationError(root, validation.issues);
    return;
  }

  const viewModel =
    metadata.status === 200
      ? createSourceCardViewModel(
          result.structuredContent as CoreV3TextsResponse,
          metadata.request,
        )
      : createSourceCardHttpErrorViewModel(
          metadata.status,
          result.structuredContent as CoreErrorResponse,
        );
  const card = new SefariaSourceCard();
  card.viewModel = viewModel;
  root.replaceChildren(card);
}

function renderConnectionsResult(
  root: HTMLElement,
  result: ToolResultLike,
  metadata: ConnectionsMetadata,
  interaction: ConnectionsInteraction | undefined,
): () => void {
  const envelope = validateConnectionsEnvelope(result.structuredContent);
  if (!envelope.valid) {
    renderIntegrationError(root, envelope.issues);
    return noCleanup;
  }
  const payloadIssue = validateConnectionsPayloadLimit(envelope.payload);
  if (payloadIssue) {
    renderIntegrationError(root, [payloadIssue]);
    return noCleanup;
  }
  const validation = validateExternalResponse(
    {
      method: metadata.method,
      path: metadata.path,
      status: metadata.status,
    },
    envelope.payload,
  );
  if (!validation.valid) {
    renderIntegrationError(
      root,
      validation.issues.map((issue) => ({
        ...issue,
        instancePath: `/structuredContent/payload${issue.instancePath}`,
      })),
    );
    return noCleanup;
  }

  const payload = envelope.payload as CoreLinkResponse;
  let projection = initialConnectionsProjection(payload, metadata);
  let viewModel = createConnectionsViewModel(
    payload,
    metadata.request,
    projection,
    metadata.status,
  );
  const section = document.createElement("section");
  const panel = new SefariaConnectionsPanel();
  panel.viewModel = viewModel;
  const status = document.createElement("p");
  status.hidden = true;
  const fallback = document.createElement("textarea");
  fallback.readOnly = true;
  fallback.hidden = true;
  fallback.setAttribute("aria-label", "Follow-up request");
  section.append(panel, status, fallback);
  root.replaceChildren(section);

  let disposed = false;
  let pending = false;

  const setStatus = (
    message: string,
    role: "status" | "alert" = "status",
    followUp?: string,
  ): void => {
    status.hidden = false;
    status.setAttribute("role", role);
    status.textContent = message;
    fallback.hidden = followUp === undefined;
    fallback.value = followUp ?? "";
  };

  const updateProjection = (next: ConnectionsProjection): void => {
    projection = next;
    viewModel = createConnectionsViewModel(
      payload,
      metadata.request,
      projection,
      metadata.status,
    );
    panel.viewModel = viewModel;
  };

  const sendFollowUp = async (message: string): Promise<void> => {
    if (pending || disposed) return;
    if (!interaction) {
      setStatus(
        "The App is not connected to a message host. Use the request below.",
        "alert",
        message,
      );
      return;
    }

    pending = true;
    setStatus("Sending follow-up request.");
    try {
      const response = await interaction.sendMessage(message);
      if (disposed) return;
      if (response.isError === true) {
        setStatus(
          "The host rejected the follow-up. Use the request below.",
          "alert",
          message,
        );
      } else {
        setStatus("Follow-up request delivered to the host.");
      }
    } catch {
      if (!disposed) {
        setStatus(
          "The follow-up could not be confirmed. It may already have been sent; use the request below if needed.",
          "alert",
          message,
        );
      }
    } finally {
      pending = false;
    }
  };

  const onCategoryChange = (event: Event): void => {
    const detail = customDetail(event);
    const category = detail?.category;
    if (
      category !== null &&
      (typeof category !== "string" ||
        viewModel.state !== "data" ||
        !viewModel.categories.some((candidate) => candidate.id === category))
    ) {
      setStatus("Ignored an invalid connections category.", "alert");
      return;
    }
    updateProjection(category === null ? {} : { category, page: 0 });
  };

  const onPageChange = (event: Event): void => {
    const page = customDetail(event)?.page;
    if (
      viewModel.state !== "data" ||
      viewModel.category === null ||
      typeof page !== "number" ||
      !Number.isSafeInteger(page) ||
      page < 0 ||
      page * CONNECTIONS_PAGE_SIZE >= viewModel.total
    ) {
      setStatus("Ignored an invalid connections page.", "alert");
      return;
    }
    updateProjection({ category: viewModel.category, page });
  };

  const onConnectionSelect = (event: Event): void => {
    const detail = customDetail(event);
    if (
      viewModel.state !== "data" ||
      typeof detail?.id !== "string" ||
      typeof detail.targetRef !== "string"
    ) {
      setStatus("Ignored an invalid connection selection.", "alert");
      return;
    }
    const entry = viewModel.entries.find(
      (candidate) =>
        candidate.id === detail.id && candidate.targetRef === detail.targetRef,
    );
    if (!entry) {
      setStatus("Ignored a stale connection selection.", "alert");
      return;
    }
    void sendFollowUp(sourceFollowUp(entry.targetRef));
  };

  const onPreviewRequest = (): void => {
    if (viewModel.state !== "data" || viewModel.previewsIncluded) {
      setStatus("Ignored an invalid preview request.", "alert");
      return;
    }
    void sendFollowUp(previewsFollowUp(metadata.request.tref));
  };

  panel.addEventListener(
    "sefaria-connections-category-change",
    onCategoryChange,
  );
  panel.addEventListener("sefaria-connections-page-change", onPageChange);
  panel.addEventListener("sefaria-connection-select", onConnectionSelect);
  panel.addEventListener(
    "sefaria-connections-preview-request",
    onPreviewRequest,
  );

  return () => {
    disposed = true;
    panel.removeEventListener(
      "sefaria-connections-category-change",
      onCategoryChange,
    );
    panel.removeEventListener("sefaria-connections-page-change", onPageChange);
    panel.removeEventListener("sefaria-connection-select", onConnectionSelect);
    panel.removeEventListener(
      "sefaria-connections-preview-request",
      onPreviewRequest,
    );
  };
}

function initialConnectionsProjection(
  payload: CoreLinkResponse,
  metadata: ConnectionsMetadata,
): ConnectionsProjection {
  const summary = createConnectionsViewModel(
    payload,
    metadata.request,
    {},
    metadata.status,
  );
  if (summary.state !== "data" || summary.categories.length === 0) return {};
  const category =
    summary.categories.find((candidate) => candidate.id === "Commentary") ??
    summary.categories[0];
  return category ? { category: category.id, page: 0 } : {};
}

function validateMetadata(
  meta: Record<string, unknown> | undefined,
): MetadataResult {
  const presentKeys = [SOURCE_CARD_META_KEY, CONNECTIONS_META_KEY].filter(
    (key) => meta?.[key] !== undefined,
  );
  if (presentKeys.length !== 1) {
    return invalidMetadata(
      "/_meta",
      "Expected exactly one supported Sefaria result metadata object.",
    );
  }
  return presentKeys[0] === SOURCE_CARD_META_KEY
    ? validateSourceCardMetadata(meta?.[SOURCE_CARD_META_KEY])
    : validateConnectionsMetadata(meta?.[CONNECTIONS_META_KEY]);
}

function validateSourceCardMetadata(value: unknown): MetadataResult {
  const issues: ContractIssue[] = [];
  if (!isRecord(value)) {
    return invalidMetadata(
      `/_meta/${pointerSegment(SOURCE_CARD_META_KEY)}`,
      "Expected source-card metadata.",
    );
  }
  if (value.operation !== "getV3Texts")
    issues.push(sourceMetadataIssue("/operation", "Expected getV3Texts."));
  if (value.method !== "GET")
    issues.push(sourceMetadataIssue("/method", "Expected GET."));
  if (value.path !== V3_TEXTS_PATH)
    issues.push(sourceMetadataIssue("/path", `Expected ${V3_TEXTS_PATH}.`));
  if (
    typeof value.status !== "number" ||
    !SOURCE_CARD_STATUSES.has(value.status)
  ) {
    issues.push(
      sourceMetadataIssue("/status", "Expected status 200, 400, or 404."),
    );
  }
  if (
    !isRecord(value.request) ||
    typeof value.request.tref !== "string" ||
    value.request.tref.trim().length === 0
  ) {
    issues.push(
      sourceMetadataIssue("/request/tref", "Expected a non-blank reference."),
    );
  }
  if (issues.length > 0) return { valid: false, issues };
  if (
    !isSourceCardStatus(value.status) ||
    !isRecord(value.request) ||
    typeof value.request.tref !== "string"
  ) {
    throw new Error("Validated source-card metadata lost its type invariants.");
  }
  return {
    valid: true,
    data: {
      kind: "source-card",
      operation: "getV3Texts",
      method: "GET",
      path: V3_TEXTS_PATH,
      status: value.status,
      request: { tref: value.request.tref },
    },
  };
}

function validateConnectionsMetadata(value: unknown): MetadataResult {
  const issues: ContractIssue[] = [];
  if (!isRecord(value)) {
    return invalidMetadata(
      `/_meta/${pointerSegment(CONNECTIONS_META_KEY)}`,
      "Expected connections metadata.",
    );
  }
  if (value.operation !== "getLinks")
    issues.push(connectionsMetadataIssue("/operation", "Expected getLinks."));
  if (value.method !== "GET")
    issues.push(connectionsMetadataIssue("/method", "Expected GET."));
  if (value.path !== LINKS_PATH)
    issues.push(connectionsMetadataIssue("/path", `Expected ${LINKS_PATH}.`));
  if (
    typeof value.status !== "number" ||
    !CONNECTIONS_STATUSES.has(value.status)
  ) {
    issues.push(
      connectionsMetadataIssue("/status", "Expected status 200 or 400."),
    );
  }
  if (!isRecord(value.request)) {
    issues.push(
      connectionsMetadataIssue("/request", "Expected connections request."),
    );
  } else {
    if (
      typeof value.request.tref !== "string" ||
      value.request.tref.trim().length === 0
    ) {
      issues.push(
        connectionsMetadataIssue(
          "/request/tref",
          "Expected a non-blank reference.",
        ),
      );
    }
    if (typeof value.request.withText !== "boolean") {
      issues.push(
        connectionsMetadataIssue(
          "/request/withText",
          "Expected resolved preview inclusion.",
        ),
      );
    }
  }
  if (issues.length > 0) return { valid: false, issues };
  if (
    !isConnectionsStatus(value.status) ||
    !isRecord(value.request) ||
    typeof value.request.tref !== "string" ||
    typeof value.request.withText !== "boolean"
  ) {
    throw new Error("Validated connections metadata lost its type invariants.");
  }
  return {
    valid: true,
    data: {
      kind: "connections",
      operation: "getLinks",
      method: "GET",
      path: LINKS_PATH,
      status: value.status,
      request: {
        tref: value.request.tref,
        withText: value.request.withText,
      },
    },
  };
}

function validateConnectionsEnvelope(
  value: unknown,
):
  | { readonly valid: true; readonly payload: unknown }
  | { readonly valid: false; readonly issues: readonly ContractIssue[] } {
  if (
    !isRecord(value) ||
    !Object.hasOwn(value, "payload") ||
    Object.keys(value).length !== 1
  ) {
    return {
      valid: false,
      issues: [
        integrationIssue(
          "/structuredContent",
          "Expected exactly one payload property.",
          "invalid-envelope",
        ),
      ],
    };
  }
  return { valid: true, payload: value.payload };
}

function validateConnectionsPayloadLimit(
  payload: unknown,
): ContractIssue | undefined {
  if (Array.isArray(payload) && payload.length > MAX_LINKS) {
    return integrationIssue(
      "/structuredContent/payload",
      `Expected no more than ${MAX_LINKS} connections.`,
      "maximum",
    );
  }
  const byteLength = new TextEncoder().encode(JSON.stringify(payload)).length;
  return byteLength > MAX_LINKS_PAYLOAD_BYTES
    ? integrationIssue(
        "/structuredContent/payload",
        `Expected no more than ${MAX_LINKS_PAYLOAD_BYTES} UTF-8 bytes.`,
        "maximum",
      )
    : undefined;
}

function invalidMetadata(path: string, message: string): MetadataResult {
  return {
    valid: false,
    issues: [integrationIssue(path, message, "invalid-metadata")],
  };
}

function sourceMetadataIssue(path: string, message: string): ContractIssue {
  return integrationIssue(
    `/_meta/${pointerSegment(SOURCE_CARD_META_KEY)}${path}`,
    message,
    "invalid-metadata",
  );
}

function connectionsMetadataIssue(
  path: string,
  message: string,
): ContractIssue {
  return integrationIssue(
    `/_meta/${pointerSegment(CONNECTIONS_META_KEY)}${path}`,
    message,
    "invalid-metadata",
  );
}

function integrationIssue(
  instancePath: string,
  message: string,
  keyword: string,
): ContractIssue {
  return {
    instancePath,
    schemaPath: "/_meta/sefaria",
    keyword,
    message,
  };
}

function pointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function customDetail(event: Event): Record<string, unknown> | undefined {
  return event instanceof CustomEvent && isRecord(event.detail)
    ? event.detail
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceCardStatus(value: unknown): value is 200 | 400 | 404 {
  return typeof value === "number" && SOURCE_CARD_STATUSES.has(value);
}

function isConnectionsStatus(value: unknown): value is 200 | 400 {
  return typeof value === "number" && CONNECTIONS_STATUSES.has(value);
}

function createSourceCardHttpErrorViewModel(
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

function sourceFollowUp(targetRef: string): string {
  return `Use get_text with reference ${JSON.stringify(targetRef)} and version_language "both" to show the selected source.`;
}

function previewsFollowUp(reference: string): string {
  return `Use get_links_between_texts with reference ${JSON.stringify(reference)} and with_text "1" to show connection previews.`;
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

function noCleanup(): void {}

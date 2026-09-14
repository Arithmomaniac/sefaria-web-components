import {
  type ContractIssue,
  type CoreLinkResponse,
  type CoreV3TextsResponse,
  validateExternalResponse,
} from "@sefaria/client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const RESOURCE_URI = "ui://sefaria/source-card.html";
export const SEFARIA_BASE_URL = "https://www.sefaria.org";
export const MAX_TEXT_LEAVES = 400;
export const MAX_LINKS = 10_000;
export const MAX_LINKS_RESPONSE_BYTES = 5 * 1024 * 1024;
export const MAX_LINKS_TEXT_ENTRIES = 20;
export const MAX_LINKS_TEXT_LENGTH = 8_000;

export type VersionLanguage = "source" | "english" | "both";
export type LinksWithText = "0" | "1";
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface ToolLogicOptions {
  readonly fetch?: FetchLike;
  readonly baseUrl?: string;
}

export type ToolResult = CallToolResult;

export function createToolLogic(options: ToolLogicOptions = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? SEFARIA_BASE_URL;

  return {
    getText: async (
      reference: string,
      versionLanguage: VersionLanguage,
      signal?: AbortSignal,
    ): Promise<ToolResult> => {
      requireReference(reference);
      const url = new URL(
        `/api/v3/texts/${encodeURIComponent(reference)}`,
        baseUrl,
      );
      for (const [key, value] of versionParams(versionLanguage)) {
        url.searchParams.append(key, value);
      }
      const response = await fetchImpl(url, {
        headers: { "user-agent": "sefaria-web-components-mcp/0.0.0" },
        ...(signal ? { signal } : {}),
      });
      if (![200, 400, 404].includes(response.status)) {
        throw new Error(
          `Sefaria text request failed with undocumented HTTP ${response.status}.`,
        );
      }
      const payload: unknown = await response.json();
      validatePayload(
        {
          method: "GET",
          path: "/api/v3/texts/{tref}",
          status: response.status,
        },
        payload,
      );
      if (response.status === 200) {
        enforceTextLeafLimit(payload as CoreV3TextsResponse);
      }
      return {
        content: [
          {
            type: "text",
            text: textContent(payload as Record<string, unknown>, reference),
          },
        ],
        structuredContent: payload as Record<string, unknown>,
        _meta: {
          "sefaria/source-card": {
            operation: "getV3Texts",
            method: "GET",
            path: "/api/v3/texts/{tref}",
            status: response.status,
            request: { tref: reference },
          },
        },
      };
    },
    getLinks: async (
      reference: string,
      withText: LinksWithText,
      signal?: AbortSignal,
    ): Promise<ToolResult> => {
      requireReference(reference);
      const url = new URL(
        `/api/links/${encodeURIComponent(reference)}`,
        baseUrl,
      );
      url.searchParams.set("with_text", withText);
      url.searchParams.set("with_sheet_links", "0");
      const response = await fetchImpl(url, {
        headers: { "user-agent": "sefaria-web-components-mcp/0.0.0" },
        ...(signal ? { signal } : {}),
      });
      if (![200, 400].includes(response.status)) {
        throw new Error(
          `Sefaria links request failed with undocumented HTTP ${response.status}.`,
        );
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > MAX_LINKS_RESPONSE_BYTES) {
        throw new Error(
          `The connections response is larger than ${MAX_LINKS_RESPONSE_BYTES} decoded bytes. Request a narrower reference.`,
        );
      }
      const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (
        response.status === 200 &&
        Array.isArray(payload) &&
        payload.length > MAX_LINKS
      ) {
        throw new Error(
          `The connections response returned too many links (${payload.length}; maximum ${MAX_LINKS}). Request a narrower reference.`,
        );
      }
      validatePayload(
        { method: "GET", path: "/api/links/{tref}", status: response.status },
        payload,
      );
      return {
        content: [
          {
            type: "text",
            text: linksContent(
              payload as CoreLinkResponse,
              reference,
              withText,
            ),
          },
        ],
        structuredContent: { payload },
        _meta: {
          "sefaria/connections": {
            operation: "getLinks",
            method: "GET",
            path: "/api/links/{tref}",
            status: response.status,
            request: { tref: reference, withText: withText === "1" },
          },
        },
      };
    },
  };
}

export function versionParams(
  versionLanguage: VersionLanguage,
): ReadonlyArray<readonly [string, string]> {
  const versions = {
    source: ["primary"],
    english: ["translation"],
    both: ["primary", "translation"],
  }[versionLanguage];
  return [
    ...versions.map((version) => ["version", version] as const),
    ["return_format", "default"] as const,
  ];
}

function requireReference(reference: string): void {
  if (reference.trim().length === 0) {
    throw new Error("Reference must not be blank.");
  }
}

function validatePayload(
  selector: {
    readonly method: "GET";
    readonly path: string;
    readonly status: number;
  },
  payload: unknown,
): void {
  const result = validateExternalResponse(selector, payload);
  if (result.valid) return;
  throw new Error(formatIssues(result.issues));
}

function formatIssues(issues: readonly ContractIssue[]): string {
  return issues
    .map((issue) => `${issue.instancePath || "/"}: ${issue.message}`)
    .join("\n");
}

function enforceTextLeafLimit(payload: CoreV3TextsResponse): void {
  let count = 0;
  const pending: unknown[] = payload.versions.map((version) => version.text);
  while (pending.length > 0 && count <= MAX_TEXT_LEAVES) {
    const value = pending.pop();
    if (typeof value === "string") count += 1;
    else if (Array.isArray(value)) pending.push(...value);
  }
  if (count > MAX_TEXT_LEAVES) {
    throw new Error(
      `The requested text is too large for the source-card App (${count} text leaves; maximum ${MAX_TEXT_LEAVES}).`,
    );
  }
}

function textContent(
  payload: Record<string, unknown>,
  requestedReference: string,
): string {
  const heading =
    typeof payload.ref === "string" ? payload.ref : requestedReference;
  if (!Array.isArray(payload.versions)) {
    return typeof payload.error === "string"
      ? `${heading}: ${payload.error}`
      : heading;
  }
  const excerpts = payload.versions.slice(0, 2).flatMap((version) => {
    if (!isRecord(version)) return [];
    const text = plainText(version.text, 1_200);
    if (!text) return [];
    const label =
      typeof version.versionTitle === "string"
        ? version.versionTitle
        : "Sefaria text";
    return [`${label}: ${text}`];
  });
  return [heading, ...excerpts].join("\n\n");
}

function linksContent(
  payload: CoreLinkResponse,
  reference: string,
  withText: LinksWithText,
): string {
  if (!Array.isArray(payload)) {
    return typeof payload.error === "string"
      ? `${reference}: ${payload.error}`
      : reference;
  }
  const lines = [`Connections for ${reference}: ${payload.length} returned.`];
  for (const item of payload.slice(0, MAX_LINKS_TEXT_ENTRIES)) {
    if (!isRecord(item) || typeof item.sourceRef !== "string") continue;
    const record: Record<string, unknown> = item;
    let line = `- ${record.sourceRef as string}`;
    if (withText === "1") {
      const excerpt = plainText([record.text, record.he], 300);
      if (excerpt) line += `: ${excerpt}`;
    }
    lines.push(line);
  }
  if (payload.length > MAX_LINKS_TEXT_ENTRIES) {
    lines.push(
      `Text summary shortened to ${MAX_LINKS_TEXT_ENTRIES} targets; the structured result contains the complete accepted response.`,
    );
  }
  const text = lines.join("\n");
  if (text.length <= MAX_LINKS_TEXT_LENGTH) return text;
  const suffix =
    "\nText summary shortened; the structured result contains the complete response.";
  return `${text.slice(0, MAX_LINKS_TEXT_LENGTH - suffix.length)}${suffix}`;
}

function plainText(value: unknown, limit: number): string {
  const parts: string[] = [];
  const pending = [value];
  let length = 0;
  while (pending.length > 0 && length < limit) {
    const item = pending.pop();
    if (typeof item === "string") {
      const text = item
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        parts.push(text);
        length += text.length + 1;
      }
    } else if (Array.isArray(item)) {
      pending.push(...[...item].reverse());
    }
  }
  return parts.join(" ").slice(0, limit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

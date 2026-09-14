import {
  AppBridge,
  getToolUiResourceUri,
  PostMessageTransport,
  RESOURCE_MIME_TYPE,
  type McpUiResourceCsp,
  type McpUiSandboxProxyReadyNotification,
} from "@modelcontextprotocol/ext-apps/app-bridge";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

const UI_EXTENSION_ID = "io.modelcontextprotocol/ui";
const implementation = {
  name: "Sefaria local reference host",
  version: "0.0.0",
};

interface LocalConfig {
  readonly mcpUrl: string;
  readonly sandboxUrl: string;
}

interface HostState {
  calls: Array<{ readonly name: string; readonly arguments: unknown }>;
  messages: string[];
  ready: boolean;
}

declare global {
  interface Window {
    __sefariaMcpHost?: HostState;
  }
}

const state: HostState = { calls: [], messages: [], ready: false };
window.__sefariaMcpHost = state;

const status = requiredElement<HTMLParagraphElement>("status");
const log = requiredElement<HTMLPreElement>("log");
const iframe = requiredElement<HTMLIFrameElement>("sandbox");
const form = requiredElement<HTMLFormElement>("tool-form");
const toolName = requiredElement<HTMLSelectElement>("tool-name");
const reference = requiredElement<HTMLInputElement>("reference");

const config = await fetchJson<LocalConfig>("/api/config");
const client = new Client(implementation, {
  capabilities: {
    extensions: {
      [UI_EXTENSION_ID]: { mimeTypes: [RESOURCE_MIME_TYPE] },
    },
  },
});
const clientTransport = new StreamableHTTPClientTransport(
  new URL(config.mcpUrl),
);
await client.connect(clientTransport as Parameters<typeof client.connect>[0]);
const tools = new Map(
  (await client.listTools()).tools.map((tool) => [tool.name, tool]),
);
state.ready = true;
status.textContent = "Connected. Call a tool to render the packaged App.";
let activeCall:
  { readonly controller: AbortController; readonly id: number } | undefined;
let activeBridge: AppBridge | undefined;
let nextCallId = 0;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void callAndRender(toolName.value, reference.value).catch(
    (error: unknown) => {
      status.setAttribute("role", "alert");
      status.textContent = errorMessage(error);
    },
  );
});

if (new URLSearchParams(window.location.search).get("auto") === "text") {
  await callAndRender("get_text", reference.value);
}

async function callAndRender(name: string, tref: string): Promise<void> {
  const tool = tools.get(name);
  if (!tool) throw new Error(`Unknown tool ${name}.`);
  const args =
    name === "get_text"
      ? { reference: tref, version_language: "both" }
      : { reference: tref };
  state.calls.push({ name, arguments: args });
  writeLog();
  status.setAttribute("role", "status");
  status.textContent = `Calling ${name}.`;
  activeCall?.controller.abort();
  if (activeBridge) {
    await activeBridge.teardownResource({}).catch(() => undefined);
    await activeBridge.close();
    activeBridge = undefined;
  }
  const call = {
    controller: new AbortController(),
    id: nextCallId++,
  };
  activeCall = call;

  const resourceUri = getToolUiResourceUri(tool);
  if (!resourceUri) throw new Error(`${name} has no MCP App resource.`);
  const resultPromise = client.callTool({ name, arguments: args }, undefined, {
    signal: call.controller.signal,
  }) as Promise<CallToolResult>;
  const resource = await client.readResource({ uri: resourceUri });
  if (resource.contents.length !== 1) {
    throw new Error("Expected exactly one MCP App resource content item.");
  }
  const content = resource.contents[0]!;
  if (content.mimeType !== RESOURCE_MIME_TYPE || !("text" in content)) {
    throw new Error("The MCP App resource has an unsupported representation.");
  }
  const ui = (
    content as typeof content & {
      readonly _meta?: { readonly ui?: { readonly csp?: McpUiResourceCsp } };
    }
  )._meta?.ui;
  await renderApp(tool, args, resultPromise, content.text, call, ui?.csp);
  if (activeCall?.id === call.id) {
    status.textContent = `${name} rendered through the MCP App host.`;
  }
}

async function renderApp(
  _tool: Tool,
  input: Record<string, unknown>,
  resultPromise: Promise<CallToolResult>,
  html: string,
  call: { readonly controller: AbortController; readonly id: number },
  csp?: McpUiResourceCsp,
): Promise<void> {
  const sandboxReady: McpUiSandboxProxyReadyNotification["method"] =
    "ui/notifications/sandbox-proxy-ready";
  const ready = new Promise<void>((resolve) => {
    const listener = (event: MessageEvent): void => {
      if (
        event.source === iframe.contentWindow &&
        event.origin === new URL(config.sandboxUrl).origin &&
        event.data?.method === sandboxReady
      ) {
        window.removeEventListener("message", listener);
        resolve();
      }
    };
    window.addEventListener("message", listener);
  });
  const sandboxUrl = new URL(config.sandboxUrl);
  if (csp) sandboxUrl.searchParams.set("csp", JSON.stringify(csp));
  iframe.src = sandboxUrl.href;
  await ready;

  const bridge = new AppBridge(
    client,
    implementation,
    {
      serverTools: {},
      serverResources: {},
    },
    {
      hostContext: {
        platform: "web",
        theme: matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
        containerDimensions: { width: iframe.clientWidth, maxHeight: 2_000 },
      },
    },
  );
  activeBridge = bridge;
  bridge.onmessage = async (message) => {
    state.messages.push(
      message.content
        .filter(
          (item): item is { readonly type: "text"; readonly text: string } =>
            item.type === "text",
        )
        .map((item) => item.text)
        .join("\n"),
    );
    writeLog();
    return {};
  };
  const initialized = new Promise<void>((resolve) => {
    bridge.oninitialized = () => resolve();
  });
  await bridge.connect(
    new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
  );
  await bridge.sendSandboxResourceReady({
    html,
    sandbox: "allow-scripts allow-same-origin allow-forms",
    ...(csp ? { csp } : {}),
  });
  await initialized;
  bridge.sendToolInput({ arguments: input });
  try {
    const result = await resultPromise;
    if (activeCall?.id === call.id) bridge.sendToolResult(result);
  } catch (error) {
    if (activeCall?.id === call.id) {
      bridge.sendToolCancelled({ reason: errorMessage(error) });
    }
  }
}

function writeLog(): void {
  log.textContent = JSON.stringify(state, null, 2);
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}.`);
  return element;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to load ${url}: ${response.status}.`);
  return (await response.json()) as T;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

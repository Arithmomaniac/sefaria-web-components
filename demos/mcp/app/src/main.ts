import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";

import {
  createConnectionsInteraction,
  createMcpReaderDataSource,
  renderReaderToolResult,
  renderStatus,
  waitForMcpConnection,
} from "./app.js";

function findRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("MCP App root is missing");
  }
  return root;
}

function applyHostContext(context: McpUiHostContext): void {
  if (context.theme) {
    applyDocumentTheme(context.theme);
  }
  if (context.styles?.variables) {
    applyHostStyleVariables(context.styles.variables);
  }
  if (context.styles?.css?.fonts) {
    applyHostFonts(context.styles.css.fonts);
  }
}

const root = findRoot();

if (new URLSearchParams(window.location.search).has("standalone")) {
  renderStatus(
    root,
    "Call get_text or get_links_between_texts in an MCP Apps host to render Sefaria content.",
  );
} else {
  const app = new App({ name: "Sefaria MCP App", version: "0.0.0" });
  let disposeResult = (): void => {};
  const dataSource = createMcpReaderDataSource({
    callServerTool: async (params, options) => {
      await waitForMcpConnection(connected, options?.signal);
      if (app.getHostCapabilities()?.serverTools === undefined) {
        throw new Error(
          "This MCP host does not support App-initiated server tool calls.",
        );
      }
      return app.callServerTool(params, options);
    },
  });
  const interaction = createConnectionsInteraction(app);

  app.ontoolresult = (result) => {
    disposeResult();
    disposeResult = renderReaderToolResult(
      root,
      result,
      dataSource,
      interaction,
    );
  };
  app.ontoolcancelled = () => {
    disposeResult();
    disposeResult = (): void => {};
    renderStatus(root, "The Sefaria text request was cancelled.");
  };
  app.onhostcontextchanged = applyHostContext;
  app.onerror = (error) => {
    renderStatus(root, `MCP App error: ${String(error)}`);
  };
  app.onteardown = () => {
    disposeResult();
    disposeResult = (): void => {};
    return {};
  };

  const connected = app.connect();
  void connected
    .then(() => {
      const context = app.getHostContext();
      if (context) {
        applyHostContext(context);
      }
    })
    .catch((error: unknown) => {
      renderStatus(root, `Unable to connect to the MCP host: ${String(error)}`);
    });
}

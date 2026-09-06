import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";

import { renderStatus, renderToolResult } from "./app.js";

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
    "Call get_text in an MCP Apps host to render a Sefaria source card.",
  );
} else {
  const app = new App({ name: "Sefaria MCP App", version: "0.0.0" });

  app.ontoolresult = (result) => {
    renderToolResult(root, result);
  };
  app.ontoolcancelled = () => {
    renderStatus(root, "The Sefaria text request was cancelled.");
  };
  app.onhostcontextchanged = applyHostContext;
  app.onerror = (error) => {
    renderStatus(root, `MCP App error: ${String(error)}`);
  };

  void app
    .connect()
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

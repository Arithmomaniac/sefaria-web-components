import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";

function findRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("MCP App root is missing");
  }

  return root;
}

const root = findRoot();

function showStatus(message: string) {
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = message;
  root.replaceChildren(status);
}

function applyHostContext(context: McpUiHostContext) {
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

if (new URLSearchParams(window.location.search).has("standalone")) {
  showStatus("Sefaria MCP App scaffold");
} else {
  const app = new App({ name: "Sefaria MCP App", version: "0.0.0" });

  app.ontoolresult = (result) => {
    const content = result.content.find((item) => item.type === "text");
    showStatus(
      content?.type === "text" ? content.text : "Tool result received",
    );
  };
  app.onhostcontextchanged = applyHostContext;
  app.onerror = (error) => {
    showStatus(`MCP App error: ${String(error)}`);
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
      showStatus(`Unable to connect to the MCP host: ${String(error)}`);
    });
}

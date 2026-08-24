import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { isSourceCardData, type SourceCardData } from "@sefaria/model";
import { SefariaSourceCard } from "@sefaria/components";
import developmentFixture from "../../contract/source-card.example.json";

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

function showSource(data: SourceCardData) {
  const card = new SefariaSourceCard();
  card.data = data;
  root.replaceChildren(card);
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

if (!isSourceCardData(developmentFixture)) {
  throw new Error("Development source-card fixture is invalid");
}

if (new URLSearchParams(window.location.search).has("standalone")) {
  showSource(developmentFixture);
} else {
  const app = new App({ name: "Sefaria Source Card", version: "0.0.0" });

  app.ontoolresult = (result) => {
    if (isSourceCardData(result.structuredContent)) {
      showSource(result.structuredContent);
      return;
    }

    showStatus("The tool result did not contain a Sefaria source-card payload");
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

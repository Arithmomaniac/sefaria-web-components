import "../../reader-workspace/src/style.css";
import {
  startReaderWorkspace,
  type ReaderWorkspace,
} from "../../reader-workspace/src/app.js";

let workspace: ReaderWorkspace | undefined;

function start(): void {
  workspace ??= startReaderWorkspace(document);
  if (workspace.view.panes.length === 0) {
    void workspace.navigate("Micah 6:8", false);
  }
}

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.origin !== location.origin) return;
  const message = event.data as {
    readonly type?: string;
    readonly active?: boolean;
  };
  if (message.type !== "sefaria-showcase-active") return;
  if (message.active === true) start();
  else if (message.active === false) workspace?.cancelPending();
});

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  workspace?.dispose();
  workspace = undefined;
});
start();
window.parent.postMessage({ type: "sefaria-showcase-ready" }, location.origin);

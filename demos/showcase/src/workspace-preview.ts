import "../../reader-workspace/src/style.css";
import {
  startReaderWorkspace,
  type ReaderWorkspace,
} from "../../reader-workspace/src/app.js";

let workspace: ReaderWorkspace | undefined;

function start(): void {
  if (workspace !== undefined) return;
  workspace = startReaderWorkspace(document);
  void workspace.navigate("Micah 6:8", false);
}

function stop(): void {
  workspace?.dispose();
  workspace = undefined;
}

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.origin !== location.origin) return;
  const message = event.data as {
    readonly type?: string;
    readonly active?: boolean;
  };
  if (message.type !== "sefaria-showcase-active") return;
  if (message.active === true) start();
  else if (message.active === false) stop();
});

start();
window.parent.postMessage({ type: "sefaria-showcase-ready" }, location.origin);

import {
  buildAllowAttribute,
  type McpUiSandboxProxyReadyNotification,
  type McpUiSandboxResourceReadyNotification,
} from "@modelcontextprotocol/ext-apps/app-bridge";

if (window.self === window.top) {
  throw new Error("The MCP Apps sandbox proxy must run inside an iframe.");
}
if (!document.referrer) {
  throw new Error("The MCP Apps sandbox proxy requires a host referrer.");
}

const hostOrigin = new URL(document.referrer).origin;
const ownOrigin = window.location.origin;
const inner = document.createElement("iframe");
inner.style.cssText = "width:100%;height:100%;border:0";
inner.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
document.body.replaceChildren(inner);

const resourceReady: McpUiSandboxResourceReadyNotification["method"] =
  "ui/notifications/sandbox-resource-ready";
const proxyReady: McpUiSandboxProxyReadyNotification["method"] =
  "ui/notifications/sandbox-proxy-ready";

window.addEventListener("message", (event) => {
  if (event.source === window.parent) {
    if (event.origin !== hostOrigin) return;
    if (event.data?.method === resourceReady) {
      const { html, sandbox, permissions } = event.data.params;
      if (typeof sandbox === "string") inner.setAttribute("sandbox", sandbox);
      const allow = buildAllowAttribute(permissions);
      if (allow) inner.setAttribute("allow", allow);
      if (typeof html === "string") {
        const target = inner.contentDocument;
        if (!target) throw new Error("The inner App document is unavailable.");
        target.open();
        target.write(html);
        target.close();
      }
      return;
    }
    inner.contentWindow?.postMessage(event.data, "*");
    return;
  }
  if (event.source === inner.contentWindow && event.origin === ownOrigin) {
    window.parent.postMessage(event.data, hostOrigin);
  }
});

window.parent.postMessage(
  { jsonrpc: "2.0", method: proxyReady, params: {} },
  hostOrigin,
);

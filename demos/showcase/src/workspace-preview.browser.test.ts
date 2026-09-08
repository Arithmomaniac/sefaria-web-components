import { beforeEach, expect, test, vi } from "vitest";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="reader-site">
      <header id="site-header">
        <form id="reader-form">
          <input name="tref" value="Micah 6:8">
          <button>Open</button>
        </form>
        <nav id="pane-path" aria-label="Open reader panes"></nav>
        <p id="status"></p>
        <p id="host-error" hidden></p>
      </header>
      <main id="workspace"></main>
    </div>
  `;
});

test("restarts an initial request cancelled while the slide is inactive", async () => {
  let requestCount = 0;
  let abortCount = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      requestCount += 1;
      return await new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener(
          "abort",
          () => {
            abortCount += 1;
            reject(request.signal.reason);
          },
          { once: true },
        );
      });
    }),
  );

  await import("./workspace-preview.js");
  await vi.waitFor(() => expect(requestCount).toBe(1));

  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      data: { type: "sefaria-showcase-active", active: false },
    }),
  );
  await vi.waitFor(() => expect(abortCount).toBe(1));

  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      data: { type: "sefaria-showcase-active", active: true },
    }),
  );
  await vi.waitFor(() => expect(requestCount).toBe(2));

  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      data: { type: "sefaria-showcase-active", active: false },
    }),
  );
  await vi.waitFor(() => expect(abortCount).toBe(2));
  vi.unstubAllGlobals();
});

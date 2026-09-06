import { createSefariaClient } from "@sefaria/client";
import { describe, expect, it, vi } from "vitest";

import { detectReferences } from "./detection.js";

describe("detectReferences", () => {
  it("submits once, polls once, and validates the known task result", async () => {
    const requests: Request[] = [];
    const fetchMock = vi.fn(
      async (request: RequestInfo | URL, init?: RequestInit) => {
        const normalized = new Request(request, init);
        requests.push(normalized);
        if (normalized.url.includes("/api/find-refs")) {
          return Response.json({ task_id: "task-1" }, { status: 202 });
        }
        return Response.json({
          task_id: "task-1",
          state: "SUCCESS",
          ready: true,
          result: {
            title: { results: [], refData: {} },
            body: {
              results: [
                {
                  startChar: 0,
                  endChar: 11,
                  text: "Genesis 1:1",
                  linkFailed: false,
                  refs: ["Genesis 1:1"],
                },
              ],
              refData: {
                "Genesis 1:1": {
                  heRef: "Genesis 1:1",
                  url: "Genesis.1.1",
                  primaryCategory: "Tanakh",
                },
              },
            },
          },
        });
      },
    );
    const client = createSefariaClient({ fetch: fetchMock });

    const result = await detectReferences(
      { title: "Article", body: "Genesis 1:1" },
      client,
    );

    expect(result.body.results).toHaveLength(1);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain(
      "/api/find-refs?with_text=0&debug=0&max_segments=20",
    );
    expect(await requests[0]?.json()).toEqual({
      text: { title: "Article", body: "Genesis 1:1" },
    });
    expect(requests[1]?.method).toBe("GET");
    expect(requests[1]?.url).toContain("/api/async/task-1");
  });

  it("rejects a successful generic task with an unrelated result", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ task_id: "task-1" }, { status: 202 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          task_id: "task-1",
          state: "SUCCESS",
          ready: true,
          result: { unrelated: true },
        }),
      );

    await expect(
      detectReferences(
        { title: "Article", body: "Genesis 1:1" },
        createSefariaClient({ fetch: fetchMock }),
      ),
    ).rejects.toThrow("/result/title");
  });

  it("stops after sixteen pending polls without resubmitting", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      const normalized = new Request(request);
      return normalized.url.includes("/api/find-refs")
        ? Response.json({ task_id: "task-1" }, { status: 202 })
        : Response.json(
            {
              task_id: "task-1",
              state: "PENDING",
              ready: false,
            },
            { status: 202 },
          );
    });
    const promise = detectReferences(
      { title: "Article", body: "Genesis 1:1" },
      createSefariaClient({ fetch: fetchMock }),
    );
    const rejection = expect(promise).rejects.toThrow(
      "did not finish after 16 polls",
    );

    await vi.runAllTimersAsync();

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(17);
    vi.useRealTimers();
  });
});

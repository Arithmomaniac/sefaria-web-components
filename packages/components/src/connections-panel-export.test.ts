import { expect, test } from "vitest";
import {
  createConnectionsViewModel,
  loadConnectionsViewModel,
} from "@sefaria/components/connections-panel";

test("the non-DOM subpath exposes both factories in Node", () => {
  expect(typeof createConnectionsViewModel).toBe("function");
  expect(typeof loadConnectionsViewModel).toBe("function");
  expect(typeof globalThis.document).toBe("undefined");
});

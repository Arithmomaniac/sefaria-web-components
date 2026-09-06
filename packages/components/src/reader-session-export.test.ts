import {
  createReaderConnectionsContent,
  createReaderSession,
  createReaderSourceContent,
} from "@sefaria/components/reader-session";
import { expect, test } from "vitest";

test("the reader-session subpath is DOM-free", () => {
  expect(createReaderSession).toBeTypeOf("function");
  expect(createReaderSourceContent).toBeTypeOf("function");
  expect(createReaderConnectionsContent).toBeTypeOf("function");
  expect(globalThis.document).toBeUndefined();
});

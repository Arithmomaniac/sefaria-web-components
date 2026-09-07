import * as readerController from "@sefaria/components/reader-controller";
import { expect, test } from "vitest";

test("exports the reader controller without a DOM dependency", () => {
  expect(globalThis.document).toBeUndefined();
  expect(readerController).toMatchObject({
    createReaderController: expect.any(Function),
    createSefariaReaderDataSource: expect.any(Function),
    loadReaderController: expect.any(Function),
    ReaderControllerError: expect.any(Function),
  });
  expect("bindReaderController" in readerController).toBe(false);
});

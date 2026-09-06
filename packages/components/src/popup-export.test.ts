import {
  createPopupViewModel,
  loadPopupViewModel,
} from "@sefaria/components/popup";
import { expect, test } from "vitest";

test("exports popup factories from the popup subpath", () => {
  expect(createPopupViewModel).toBeTypeOf("function");
  expect(loadPopupViewModel).toBeTypeOf("function");
});

import {
  createSourceCardViewModel,
  loadSourceCardViewModel,
} from "@sefaria/web-components/source-card";
import { expect, test } from "vitest";

test("exports source-card factories from the source-card subpath", () => {
  expect(createSourceCardViewModel).toBeTypeOf("function");
  expect(loadSourceCardViewModel).toBeTypeOf("function");
});

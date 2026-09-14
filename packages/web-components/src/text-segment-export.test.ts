import {
  projectTextSegmentValue,
  projectTextSegmentVersion,
} from "@sefaria/web-components/text-segment";
import { expect, test } from "vitest";

test("exports resolved-version projection from the text-segment subpath", () => {
  expect(projectTextSegmentVersion).toBeTypeOf("function");
  expect(projectTextSegmentValue).toBeTypeOf("function");
});

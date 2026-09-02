export { browserFixtures } from "./browser.js";
export { mountBrowserFixture } from "./harness.js";
export type {
  BrowserFixture,
  ComponentFixture,
  ProductionOwnerIssue,
  RefComponentRequest,
  RejectionKind,
  V3ComponentRequest,
} from "./contracts.js";
export type {
  BrowserFixtureMeasurement,
  MountedBrowserFixture,
  MountBrowserFixtureOptions,
} from "./harness.js";

import { bilingualSegmentFixtures } from "./bilingual-segment.js";
import { refLabelFixtures } from "./ref-label.js";
import { textRangeFixtures } from "./text-range.js";
import { textSegmentFixtures } from "./text-segment.js";

export const componentFixtures = [
  ...textSegmentFixtures,
  ...refLabelFixtures,
  ...bilingualSegmentFixtures,
  ...textRangeFixtures,
] as const;

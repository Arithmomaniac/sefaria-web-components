import {
  browserFixtures,
  componentFixtures,
} from "@sefaria-tests/component-fixtures";
import { describe, expect, it } from "vitest";

import { componentFixtureCatalogRows } from "./fixture-catalog.js";

describe("component fixture catalog", () => {
  it("projects the shared fixture package into planned lab rows", () => {
    expect(componentFixtureCatalogRows).toHaveLength(componentFixtures.length);
    expect(componentFixtureCatalogRows.map(({ id }) => id)).toEqual(
      componentFixtures.map(({ id }) => id),
    );
    expect(
      componentFixtureCatalogRows.every(({ status }) => status === "planned"),
    ).toBe(true);
    expect(
      componentFixtureCatalogRows.find(({ id }) => id === "bilingual-loading")
        ?.state,
    ).toBe("loading");
    expect(
      componentFixtureCatalogRows.find(
        ({ id }) => id === "range-network-rejection",
      )?.state,
    ).toBe("rejection");
    expect(
      componentFixtureCatalogRows.find(
        ({ id }) => id === "text-segment-invalid-ref-error",
      )?.state,
    ).toBe("error");
  });

  it("uses browser widths owned by the same production issue", () => {
    for (const row of componentFixtureCatalogRows) {
      expect(row.widths).toEqual(
        browserFixtures
          .filter(({ ownerIssue }) => ownerIssue === row.ownerIssue)
          .map(({ container }) => container.width),
      );
    }
  });
});

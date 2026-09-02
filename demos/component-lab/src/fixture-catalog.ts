import {
  browserFixtures,
  componentFixtures,
} from "@sefaria-tests/component-fixtures";

/** Planned component fixture rows displayed by the component lab. */
export const componentFixtureCatalogRows = componentFixtures.map((fixture) => ({
  id: fixture.id,
  ownerIssue: fixture.ownerIssue,
  state:
    fixture.kind === "render"
      ? fixture.viewModel.state
      : fixture.kind === "rejection"
        ? fixture.kind
        : fixture.expected.state,
  status: "planned" as const,
  widths: browserFixtures
    .filter(({ ownerIssue }) => ownerIssue === fixture.ownerIssue)
    .map(({ container }) => container.width),
}));

import type { BrowserFixture } from "./contracts.js";

export interface BrowserFixtureMeasurement {
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly elementWidth: number;
  readonly elementHeight: number;
}

export interface MountedBrowserFixture<TElement extends HTMLElement> {
  readonly container: HTMLElement;
  readonly element: TElement;
  readonly measurement: BrowserFixtureMeasurement;
}

export interface MountBrowserFixtureOptions<
  TViewModel,
  TElementProperties extends object,
  TElement extends HTMLElement & { viewModel: TViewModel },
> {
  readonly fixture: BrowserFixture<TViewModel, TElementProperties>;
  readonly element: TElement;
  readonly fontReady?: Promise<unknown>;
}

export async function mountBrowserFixture<
  TViewModel,
  TElementProperties extends object,
  TElement extends HTMLElement & { viewModel: TViewModel },
>({
  fixture,
  element,
  fontReady = document.fonts.ready,
}: MountBrowserFixtureOptions<
  TViewModel,
  TElementProperties,
  TElement
>): Promise<MountedBrowserFixture<TElement>> {
  const container = document.createElement("div");
  container.dataset.sefariaBrowserFixture = fixture.id;
  container.style.boxSizing = "border-box";
  container.style.colorScheme = fixture.theme.colorScheme;
  container.style.width = `${fixture.container.width}px`;

  for (const [property, value] of Object.entries(fixture.theme.properties)) {
    container.style.setProperty(property, value);
  }

  element.viewModel = fixture.viewModel;
  Object.assign(element, fixture.elementProperties);
  container.append(element);
  document.body.append(container);

  await fontReady;

  const containerBounds = container.getBoundingClientRect();
  const elementBounds = element.getBoundingClientRect();

  return {
    container,
    element,
    measurement: {
      containerWidth: containerBounds.width,
      containerHeight: containerBounds.height,
      elementWidth: elementBounds.width,
      elementHeight: elementBounds.height,
    },
  };
}

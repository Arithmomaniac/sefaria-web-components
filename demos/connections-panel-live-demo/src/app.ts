import {
  createSefariaClient,
  getLinks,
  type CoreLinkResponse,
  type SefariaClient,
} from "@sefaria/client";
import "@sefaria/components";
import type {
  ConnectionsProjection,
  ConnectionsRequest,
  SefariaConnectionsPanel,
  SefariaSourceCard,
  SourceCardDataViewModel,
  SourceCardNavigation,
} from "@sefaria/components";
import { createConnectionsViewModel } from "@sefaria/components/connections-panel";
import {
  loadSourceCardViewModel,
  type SourceCardViewModel,
} from "@sefaria/components/source-card";

/** Host controls exposed for browser qualification and manual use. */
export interface ConnectionsDemo {
  /** Opens a target in its server-provided context and loads first-segment links. */
  readonly navigate: (
    targetRef: string,
    revealSelection?: boolean,
  ) => Promise<void>;
  /** Removes host listeners and aborts active operations. */
  readonly dispose: () => void;
}

interface LinksCapture {
  readonly payload: CoreLinkResponse;
  readonly request: ConnectionsRequest;
  readonly status: 200 | 400;
}

interface AddressableCard {
  readonly viewModel: SourceCardDataViewModel;
  readonly navigation: Extract<
    SourceCardNavigation,
    { readonly state: "available" }
  >;
}

interface NavigableCard {
  readonly viewModel: SourceCardDataViewModel;
  readonly navigation: Exclude<
    SourceCardNavigation,
    { readonly state: "unavailable" }
  >;
}

/** Starts the standalone reader/connections host with explicit request ownership. */
export function startConnectionsDemo(
  root: Document,
  client: SefariaClient = createSefariaClient(),
): ConnectionsDemo {
  const form = requireElement<HTMLFormElement>(root, "#reader-form");
  const tref = requireInput(form, "tref");
  const reader = requireElement<SefariaSourceCard>(root, "#reader");
  const connections = requireElement<SefariaConnectionsPanel>(
    root,
    "#connections",
  );
  const showPreviews = requireElement<HTMLInputElement>(root, "#show-previews");
  const metadataOnly = requireElement<HTMLInputElement>(root, "#metadata-only");
  const contentLanguage = requireElement<HTMLSelectElement>(
    root,
    "#content-language",
  );
  const showAddressLabels = requireElement<HTMLInputElement>(
    root,
    "#show-address-labels",
  );
  const layout = requireElement<HTMLSelectElement>(root, "#layout");
  const sideOrder = requireElement<HTMLSelectElement>(root, "#side-order");
  const status = requireElement<HTMLElement>(root, "#status");
  const hostError = requireElement<HTMLElement>(root, "#host-error");
  const requestCounts = requireElement<HTMLElement>(root, "#request-counts");

  let controller: AbortController | undefined;
  let operation = 0;
  let capture: LinksCapture | undefined;
  let projection: ConnectionsProjection = {};
  let activeRef: string | undefined;
  let textRequests = 0;
  let linksRequests = 0;

  reader.selectable = true;
  connections.showPreviews = showPreviews.checked;

  const updateCounts = (): void => {
    requestCounts.textContent =
      `${textRequests} text request${textRequests === 1 ? "" : "s"}; ` +
      `${linksRequests} links request${linksRequests === 1 ? "" : "s"}.`;
  };

  const showError = (error: unknown): void => {
    hostError.hidden = false;
    hostError.textContent =
      error instanceof Error ? error.message : String(error);
  };

  const clearError = (): void => {
    hostError.hidden = true;
    hostError.textContent = "";
  };

  const projectCapture = (): void => {
    if (!capture) {
      return;
    }
    connections.viewModel = createConnectionsViewModel(
      capture.payload,
      capture.request,
      projection,
      capture.status,
    );
  };

  const loadLinks = async (
    ref: string,
    withText: boolean,
    expectedOperation: number,
    signal: AbortSignal,
  ): Promise<void> => {
    if (signal.aborted || expectedOperation !== operation) {
      return;
    }
    const sameRef = capture?.request.tref === ref;
    const previousCapture = capture;
    const previousProjection = projection;
    const previousViewModel = connections.viewModel;
    if (!sameRef) {
      capture = undefined;
      projection = {};
      activeRef = ref;
    }
    connections.viewModel = {
      state: "loading",
      message: `Loading connections for ${ref}.`,
    };
    linksRequests += 1;
    updateCounts();
    try {
      const result = await getLinks({
        client,
        path: { tref: ref },
        query: {
          with_text: withText ? "1" : "0",
          with_sheet_links: "0",
        },
        signal,
      });
      if (signal.aborted || expectedOperation !== operation) {
        return;
      }
      const payload = result.data ?? result.error;
      if (payload === undefined) {
        throw new Error("The links request returned no documented response.");
      }
      const nextCapture: LinksCapture = {
        payload,
        request: { tref: ref, withText },
        status: result.response.status === 400 ? 400 : 200,
      };
      const nextProjection = capture?.request.tref === ref ? projection : {};
      const nextViewModel = createConnectionsViewModel(
        nextCapture.payload,
        nextCapture.request,
        nextProjection,
        nextCapture.status,
      );
      capture = nextCapture;
      projection = nextProjection;
      activeRef = ref;
      connections.viewModel = nextViewModel;
    } catch (error) {
      if (!signal.aborted && expectedOperation === operation) {
        if (sameRef) {
          capture = previousCapture;
          projection = previousProjection;
          connections.viewModel = previousViewModel;
        } else {
          capture = undefined;
          projection = {};
          connections.viewModel = undefined;
        }
      }
      throw error;
    }
  };

  const loadSource = async (
    ref: string,
    signal: AbortSignal,
  ): Promise<SourceCardViewModel> => {
    textRequests += 1;
    updateCounts();
    return await loadSourceCardViewModel({ tref: ref }, client, signal);
  };

  const requireAddressableData = (
    viewModel: SourceCardViewModel,
    label: string,
  ): AddressableCard => {
    const navigable = requireNavigableData(viewModel, label);
    if (navigable.navigation.state !== "available") {
      throw new Error(`${label} requires another contextual text request.`);
    }
    return {
      viewModel: navigable.viewModel,
      navigation: navigable.navigation,
    };
  };

  const requireNavigableData = (
    viewModel: SourceCardViewModel,
    label: string,
  ): NavigableCard => {
    if (viewModel.state !== "data") {
      throw new Error(`${label} did not produce selectable source-card data.`);
    }
    if (
      viewModel.navigation === undefined ||
      viewModel.navigation.state === "unavailable"
    ) {
      throw new Error(
        viewModel.navigation?.message ??
          `${label} does not expose supported segment addresses.`,
      );
    }
    return { viewModel, navigation: viewModel.navigation };
  };

  const navigate = async (
    targetRef: string,
    revealSelection = true,
  ): Promise<void> => {
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    const expectedOperation = ++operation;
    const normalizedTarget = targetRef.trim();
    let committedSection: string | undefined;
    let firstRef: string | undefined;
    clearError();
    status.textContent = `Opening ${normalizedTarget} in context.`;
    try {
      const target = requireNavigableData(
        await loadSource(normalizedTarget, currentController.signal),
        normalizedTarget,
      );
      if (expectedOperation !== operation) {
        return;
      }
      let contextualPromise: Promise<AddressableCard>;
      let linksOutcome:
        | Promise<
            | { readonly state: "success" }
            | { readonly state: "error"; readonly error: unknown }
          >
        | undefined;
      const startLinks = (ref: string) =>
        loadLinks(
          ref,
          !metadataOnly.checked,
          expectedOperation,
          currentController.signal,
        ).then(
          () => ({ state: "success" as const }),
          (error: unknown) => ({ state: "error" as const, error }),
        );
      if (target.navigation.state === "context-required") {
        const contextRef = target.navigation.contextRef;
        contextualPromise = loadSource(
          contextRef,
          currentController.signal,
        ).then((viewModel) => requireAddressableData(viewModel, contextRef));
      } else {
        firstRef = target.navigation.firstRef;
        const sectionRef = target.navigation.sectionRef;
        contextualPromise =
          target.viewModel.header.ref === sectionRef
            ? Promise.resolve({
                viewModel: target.viewModel,
                navigation: target.navigation,
              })
            : loadSource(sectionRef, currentController.signal).then(
                (viewModel) => requireAddressableData(viewModel, sectionRef),
              );
        linksOutcome = startLinks(firstRef);
      }
      let contextual: AddressableCard;
      try {
        contextual = await contextualPromise;
      } catch (error) {
        currentController.abort();
        await linksOutcome;
        if (expectedOperation === operation) {
          connections.viewModel = undefined;
          status.textContent = `${normalizedTarget} could not be opened.`;
          showError(error);
        }
        return;
      }
      if (expectedOperation !== operation) {
        return;
      }
      firstRef ??= contextual.navigation.firstRef;
      linksOutcome ??= startLinks(firstRef);
      const selected = contextual.viewModel.items.find(
        (item) => item.ref === firstRef,
      );
      if (!selected) {
        const error = new Error(
          `${firstRef} is not a selectable row in ${contextual.viewModel.header.ref}.`,
        );
        currentController.abort();
        await linksOutcome;
        if (expectedOperation === operation) {
          connections.viewModel = undefined;
          status.textContent = `${normalizedTarget} could not be opened.`;
          showError(error);
        }
        return;
      }

      reader.viewModel = contextual.viewModel;
      reader.selectedPosition = selected.position;
      committedSection = contextual.viewModel.header.ref;
      status.textContent = `Showing ${committedSection}; loading connections for ${firstRef}.`;
      if (revealSelection) {
        await reader.revealSelection();
      }
      if (expectedOperation === operation) {
        const outcome = await linksOutcome;
        if (outcome.state === "error") throw outcome.error;
      }
      if (expectedOperation === operation) {
        tref.value = normalizedTarget;
        status.textContent = `Showing ${committedSection}; selected ${firstRef}.`;
      }
    } catch (error) {
      if (currentController.signal.aborted || expectedOperation !== operation) {
        return;
      }
      status.textContent =
        committedSection === undefined || firstRef === undefined
          ? `${normalizedTarget} could not be opened.`
          : `Showing ${committedSection}; connections for ${firstRef} could not be loaded.`;
      showError(error);
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    void navigate(tref.value);
  };
  const onSourceSelect = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        readonly position: readonly number[];
        readonly ref: string;
      }>
    ).detail;
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    const expectedOperation = ++operation;
    clearError();
    reader.selectedPosition = detail.position;
    status.textContent = `Loading connections for ${detail.ref}.`;
    void loadLinks(
      detail.ref,
      !metadataOnly.checked,
      expectedOperation,
      currentController.signal,
    ).then(
      () => {
        if (expectedOperation === operation) {
          status.textContent = `Selected ${detail.ref}.`;
        }
      },
      (error: unknown) => {
        if (
          !currentController.signal.aborted &&
          expectedOperation === operation
        ) {
          status.textContent = `Connections for ${detail.ref} could not be loaded.`;
          showError(error);
        }
      },
    );
  };
  const onCategoryChange = (event: Event): void => {
    const category = (
      event as CustomEvent<{ readonly category: string | null }>
    ).detail.category;
    projection = category === null ? {} : { category, page: 0 };
    projectCapture();
  };
  const onPageChange = (event: Event): void => {
    const page = (event as CustomEvent<{ readonly page: number }>).detail.page;
    projection = { ...projection, page };
    projectCapture();
  };
  const onPreviewRequest = (): void => {
    if (!activeRef || capture?.request.withText !== false) {
      return;
    }
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    const expectedOperation = ++operation;
    void loadLinks(
      activeRef,
      true,
      expectedOperation,
      currentController.signal,
    ).catch((error: unknown) => {
      if (
        !currentController.signal.aborted &&
        expectedOperation === operation
      ) {
        showError(error);
      }
    });
  };
  const onConnectionSelect = (event: Event): void => {
    const detail = (event as CustomEvent<{ readonly targetRef: string }>)
      .detail;
    void navigate(detail.targetRef);
  };
  const onDisplayChange = (): void => {
    reader.contentLanguage =
      contentLanguage.value === "primary" ||
      contentLanguage.value === "translation"
        ? contentLanguage.value
        : "both";
    reader.layout =
      layout.value === "stacked" || layout.value === "side-by-side"
        ? layout.value
        : "auto";
    reader.sideOrder =
      sideOrder.value === "translation-first"
        ? "translation-first"
        : "primary-first";
    reader.showAddressLabels = showAddressLabels.checked;
    connections.showPreviews = showPreviews.checked;
  };

  form.addEventListener("submit", onSubmit);
  reader.addEventListener("sefaria-source-select", onSourceSelect);
  connections.addEventListener(
    "sefaria-connections-category-change",
    onCategoryChange,
  );
  connections.addEventListener("sefaria-connections-page-change", onPageChange);
  connections.addEventListener("sefaria-connection-select", onConnectionSelect);
  connections.addEventListener(
    "sefaria-connections-preview-request",
    onPreviewRequest,
  );
  const displayControls = [
    showPreviews,
    contentLanguage,
    showAddressLabels,
    layout,
    sideOrder,
  ];
  for (const control of displayControls) {
    control.addEventListener("change", onDisplayChange);
  }
  onDisplayChange();
  updateCounts();

  return {
    navigate,
    dispose: () => {
      controller?.abort();
      form.removeEventListener("submit", onSubmit);
      reader.removeEventListener("sefaria-source-select", onSourceSelect);
      connections.removeEventListener(
        "sefaria-connections-category-change",
        onCategoryChange,
      );
      connections.removeEventListener(
        "sefaria-connections-page-change",
        onPageChange,
      );
      connections.removeEventListener(
        "sefaria-connections-preview-request",
        onPreviewRequest,
      );
      connections.removeEventListener(
        "sefaria-connection-select",
        onConnectionSelect,
      );
      for (const control of displayControls) {
        control.removeEventListener("change", onDisplayChange);
      }
    },
  };
}

function requireInput(form: HTMLFormElement, name: string): HTMLInputElement {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The ${name} input is missing.`);
  }
  return input;
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The demo requires ${selector}.`);
  }
  return element;
}

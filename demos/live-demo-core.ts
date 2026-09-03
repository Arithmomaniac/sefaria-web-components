/** Terminal or loading state rendered by a live-demo component. */
export interface LiveDemoViewModel {
  /** Component state discriminator. */
  readonly state: string;
}

/** Loads one component view model for a live-demo request. */
export type LiveDemoLoader<TRequest, TViewModel extends LiveDemoViewModel> = (
  request: TRequest,
  signal: AbortSignal,
) => Promise<TViewModel>;

/** Host bindings used by the shared live-demo request lifecycle. */
export interface LiveDemoRunnerOptions<
  TRequest,
  TViewModel extends LiveDemoViewModel,
> {
  /** Component-specific async factory adapter. */
  readonly loader: LiveDemoLoader<TRequest, TViewModel>;
  /** Constructs the component-specific loading view model. */
  readonly createLoadingViewModel: (request: TRequest) => TViewModel;
  /** Supplies a loading or terminal view model to the component. */
  readonly setViewModel: (viewModel: TViewModel) => void;
  /** Formats the request for host-owned status text. */
  readonly formatRequest: (request: TRequest) => string;
  /** Host status element. */
  readonly requestState: HTMLElement;
  /** Host error element for rejected operations. */
  readonly hostError: HTMLElement;
  /** Submit button disabled while the latest operation is active. */
  readonly submitButton: HTMLButtonElement;
}

/** Runs requests with cancellation and stale-result suppression. */
export interface LiveDemoRunner<TRequest> {
  /** Starts a request and ignores terminal output from superseded operations. */
  readonly run: (request: TRequest) => Promise<void>;
}

/** Creates the shared request lifecycle used by live component demonstrations. */
export function createLiveDemoRunner<
  TRequest,
  TViewModel extends LiveDemoViewModel,
>(
  options: LiveDemoRunnerOptions<TRequest, TViewModel>,
): LiveDemoRunner<TRequest> {
  let activeController: AbortController | undefined;
  let activeOperation = 0;

  const run = async (request: TRequest): Promise<void> => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const operation = ++activeOperation;
    const requestLabel = options.formatRequest(request);

    options.setViewModel(options.createLoadingViewModel(request));
    options.requestState.dataset.state = "loading";
    options.requestState.textContent = `Loading ${requestLabel} from Sefaria.`;
    options.hostError.hidden = true;
    options.hostError.textContent = "";
    options.submitButton.disabled = true;

    try {
      const viewModel = await options.loader(request, controller.signal);
      if (operation !== activeOperation) {
        return;
      }
      options.setViewModel(viewModel);
      options.requestState.dataset.state = viewModel.state;
      options.requestState.textContent = `${requestLabel} produced ${viewModel.state}.`;
    } catch (error) {
      if (controller.signal.aborted || operation !== activeOperation) {
        return;
      }
      options.requestState.dataset.state = "error";
      options.requestState.textContent = `${requestLabel} could not complete.`;
      options.hostError.hidden = false;
      options.hostError.textContent =
        error instanceof Error ? error.message : String(error);
    } finally {
      if (operation === activeOperation) {
        options.submitButton.disabled = false;
      }
    }
  };

  return { run };
}

/** Returns a required element or reports the missing demo contract. */
export function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The demo requires ${selector}.`);
  }
  return element;
}

/** Returns a required named input from a demo form. */
export function requireNamedInput(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`The ${name} input is missing.`);
  }
  return input;
}

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

/** One text field rendered by the shared live-demo page. */
export interface LiveDemoTextControl {
  readonly kind: "text";
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly required?: boolean;
  readonly placeholder?: string;
}

/** One option in a shared live-demo select field. */
export interface LiveDemoSelectOption {
  readonly value: string;
  readonly label: string;
}

/** One select field rendered by the shared live-demo page. */
export interface LiveDemoSelectControl {
  readonly kind: "select";
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly LiveDemoSelectOption[];
}

/** One checkbox field rendered by the shared live-demo page. */
export interface LiveDemoCheckboxControl {
  readonly kind: "checkbox";
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
}

/** A form field rendered by the shared live-demo page. */
export type LiveDemoControl =
  LiveDemoTextControl | LiveDemoSelectControl | LiveDemoCheckboxControl;

/** One preset that supplies values to named live-demo controls. */
export interface LiveDemoPreset {
  readonly id: string;
  readonly label: string;
  readonly values: Readonly<Record<string, string | boolean>>;
}

/** Declarative page and component bindings for one live demonstration. */
export interface LiveDemoOptions<
  TRequest,
  TViewModel extends LiveDemoViewModel,
  TResult extends HTMLElement,
> {
  readonly title: string;
  readonly description: string;
  readonly requestHeading: string;
  readonly presetsLabel: string;
  readonly controls: readonly LiveDemoControl[];
  readonly presets: readonly LiveDemoPreset[];
  readonly submitLabel: string;
  readonly createResultElement: (document: Document) => TResult;
  readonly loader: LiveDemoLoader<TRequest, TViewModel>;
  readonly createRequest: (form: HTMLFormElement) => TRequest;
  readonly createLoadingViewModel: (request: TRequest) => TViewModel;
  readonly setViewModel: (result: TResult, viewModel: TViewModel) => void;
  readonly formatRequest: (request: TRequest) => string;
  readonly configureResult?: (result: TResult, form: HTMLFormElement) => void;
}

/** Controls one mounted live demonstration. */
export interface LiveDemo {
  readonly loadCurrentRequest: () => Promise<void>;
}

/** Mounts the shared live-demo page and connects its declarative bindings. */
export function startLiveDemo<
  TRequest,
  TViewModel extends LiveDemoViewModel,
  TResult extends HTMLElement,
>(
  root: Document,
  options: LiveDemoOptions<TRequest, TViewModel, TResult>,
): LiveDemo {
  const mount = requireElement<HTMLElement>(root, "#live-demo-root");
  const page = createLiveDemoPage(root, options);
  mount.replaceChildren(page.main);

  const runner = createLiveDemoRunner({
    loader: options.loader,
    createLoadingViewModel: options.createLoadingViewModel,
    setViewModel: (viewModel) => {
      options.setViewModel(page.result, viewModel);
    },
    formatRequest: options.formatRequest,
    requestState: page.requestState,
    hostError: page.hostError,
    submitButton: page.submitButton,
  });

  const configureResult = (): void => {
    options.configureResult?.(page.result, page.form);
  };
  const loadCurrentRequest = async (): Promise<void> => {
    configureResult();
    await runner.run(options.createRequest(page.form));
  };

  page.form.addEventListener("submit", (event) => {
    event.preventDefault();
    void loadCurrentRequest();
  });
  page.form.addEventListener("change", configureResult);

  for (const preset of page.presets) {
    preset.addEventListener("click", () => {
      const definition = options.presets.find(
        (candidate) => candidate.id === preset.dataset.demoId,
      );
      if (!definition) {
        throw new Error(
          `The ${preset.dataset.demoId ?? "unknown"} preset is missing.`,
        );
      }
      applyPreset(page.form, definition);
      page.form.requestSubmit();
    });
  }

  configureResult();
  return { loadCurrentRequest };
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

interface LiveDemoPage<TResult extends HTMLElement> {
  readonly main: HTMLElement;
  readonly form: HTMLFormElement;
  readonly presets: readonly HTMLButtonElement[];
  readonly requestState: HTMLElement;
  readonly hostError: HTMLElement;
  readonly submitButton: HTMLButtonElement;
  readonly result: TResult;
}

function createLiveDemoPage<
  TRequest,
  TViewModel extends LiveDemoViewModel,
  TResult extends HTMLElement,
>(
  document: Document,
  options: LiveDemoOptions<TRequest, TViewModel, TResult>,
): LiveDemoPage<TResult> {
  document.title = options.title;

  const main = document.createElement("main");
  const header = document.createElement("header");
  const title = document.createElement("h1");
  title.textContent = options.title;
  const description = document.createElement("p");
  description.textContent = options.description;
  header.append(title, description);

  const workspace = document.createElement("div");
  workspace.className = "workspace";

  const requestPanel = document.createElement("section");
  requestPanel.className = "panel";
  requestPanel.setAttribute("aria-labelledby", "request-heading");
  const requestHeading = document.createElement("h2");
  requestHeading.id = "request-heading";
  requestHeading.textContent = options.requestHeading;

  const presetContainer = document.createElement("div");
  presetContainer.className = "presets";
  presetContainer.setAttribute("aria-label", options.presetsLabel);
  const presets = options.presets.map((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.demoRequest = "";
    button.dataset.demoId = preset.id;
    button.textContent = preset.label;
    return button;
  });
  presetContainer.append(...presets);

  const form = document.createElement("form");
  form.id = "demo-request-form";
  form.append(
    ...options.controls.map((control) => createControl(document, control)),
  );
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = options.submitLabel;
  form.append(submitButton);
  requestPanel.append(requestHeading, presetContainer, form);

  const resultPanel = document.createElement("section");
  resultPanel.className = "panel";
  resultPanel.setAttribute("aria-labelledby", "result-heading");
  const resultHeading = document.createElement("h2");
  resultHeading.id = "result-heading";
  resultHeading.textContent = "Component result";
  const requestState = document.createElement("p");
  requestState.id = "request-state";
  requestState.dataset.state = "initial";
  requestState.textContent = "Waiting for the first request.";
  const hostError = document.createElement("p");
  hostError.id = "host-error";
  hostError.setAttribute("role", "alert");
  hostError.hidden = true;
  const result = options.createResultElement(document);
  result.id = "demo-result";
  resultPanel.append(resultHeading, requestState, hostError, result);

  workspace.append(requestPanel, resultPanel);
  main.append(header, workspace);

  return {
    main,
    form,
    presets,
    requestState,
    hostError,
    submitButton,
    result,
  };
}

function createControl(
  document: Document,
  control: LiveDemoControl,
): HTMLLabelElement {
  const label = document.createElement("label");
  const labelText = document.createElement("span");
  labelText.textContent = control.label;
  label.append(labelText);

  if (control.kind === "checkbox") {
    const row = document.createElement("span");
    row.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = control.name;
    input.checked = control.checked;
    row.append(input, document.createTextNode(control.description));
    label.append(row);
    return label;
  }

  if (control.kind === "select") {
    const select = document.createElement("select");
    select.name = control.name;
    for (const optionDefinition of control.options) {
      const option = document.createElement("option");
      option.value = optionDefinition.value;
      option.textContent = optionDefinition.label;
      option.selected = optionDefinition.value === control.value;
      select.append(option);
    }
    label.append(select);
    return label;
  }

  const input = document.createElement("input");
  input.name = control.name;
  input.value = control.value;
  input.required = control.required ?? false;
  input.placeholder = control.placeholder ?? "";
  label.append(input);
  return label;
}

function applyPreset(form: HTMLFormElement, preset: LiveDemoPreset): void {
  for (const [name, value] of Object.entries(preset.values)) {
    const control = form.elements.namedItem(name);
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      if (typeof value !== "boolean") {
        throw new TypeError(`The ${name} preset value must be boolean.`);
      }
      control.checked = value;
    } else if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement
    ) {
      control.value = String(value);
    } else {
      throw new Error(`The ${name} control is missing.`);
    }
  }
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

/** Returns a required named select from a demo form. */
export function requireNamedSelect(
  form: HTMLFormElement,
  name: string,
): HTMLSelectElement {
  const select = form.elements.namedItem(name);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`The ${name} select is missing.`);
  }
  return select;
}

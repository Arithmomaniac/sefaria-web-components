import { SefariaElement } from "@sefaria/web-components";
import { css, html, nothing } from "lit";

import { bilingualSegmentScenarios } from "./bilingual-segment.scenarios.js";
import { connectionsPanelScenarios } from "./connections-panel.scenarios.js";
import { refLabelScenarios } from "./ref-label.scenarios.js";
import { readerScenarios } from "./reader.scenarios.js";
import { sourceCardScenarios } from "./source-card.scenarios.js";
import { textSegmentScenarios } from "./text-segment.scenarios.js";

const componentIds = [
  "ref-label",
  "text-segment",
  "bilingual-segment",
  "source-card",
  "connections-panel",
  "reader",
] as const;

type ComponentId = (typeof componentIds)[number];
type Theme = "system" | "light" | "dark";

const componentDetails = {
  "ref-label": {
    label: "Reference label",
    packagePath: "@sefaria/web-components/ref-label",
    source: "src/authored/ref-label.scenarios.ts",
    scenarios: refLabelScenarios,
  },
  "text-segment": {
    label: "Text segment",
    packagePath: "@sefaria/web-components/text-segment",
    source: "src/authored/text-segment.scenarios.ts",
    scenarios: textSegmentScenarios,
  },
  "bilingual-segment": {
    label: "Bilingual segment",
    packagePath: "@sefaria/web-components/bilingual-segment",
    source: "src/authored/bilingual-segment.scenarios.ts",
    scenarios: bilingualSegmentScenarios,
  },
  "source-card": {
    label: "Source card",
    packagePath: "@sefaria/web-components/source-card",
    source: "src/authored/source-card.scenarios.ts",
    scenarios: sourceCardScenarios,
  },
  "connections-panel": {
    label: "Connections panel",
    packagePath: "@sefaria/web-components/connections-panel",
    source: "src/authored/connections-panel.scenarios.ts",
    scenarios: connectionsPanelScenarios,
  },
  reader: {
    label: "Controlled reader",
    packagePath: "@sefaria/web-components/reader",
    source: "src/authored/reader.scenarios.ts",
    scenarios: readerScenarios,
  },
} as const;

class SefariaDevelopmentStatus extends SefariaElement {
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        display: block;
        width: min(100%, var(--authored-preview-width, 64rem));
        max-width: var(--authored-preview-width, 64rem);
        margin: 2rem auto;
        padding: clamp(1rem, 4vw, 2rem);
        border: 1px solid var(--sefaria-border);
        border-radius: 0.75rem;
      }

      h1 {
        margin-top: 0;
        font-family: var(--sefaria-font-english);
      }

      code,
      a {
        color: var(--sefaria-link);
      }

      .workbench {
        display: grid;
        gap: 1rem;
        margin-block: 1.5rem;
        padding: 1rem;
        border: 1px solid var(--sefaria-border);
        border-radius: 0.75rem;
        background: var(--sefaria-surface-muted);
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: end;
      }

      label {
        display: grid;
        gap: 0.3rem;
        min-width: min(12rem, 100%);
      }

      select,
      input {
        min-height: 2.5rem;
        border: 1px solid var(--sefaria-border);
        border-radius: 0.4rem;
        padding: 0.4rem 0.6rem;
        color: var(--sefaria-fg);
        background: var(--sefaria-surface);
        font: inherit;
      }

      select:focus-visible,
      input:focus-visible,
      a:focus-visible,
      summary:focus-visible {
        outline: 2px solid var(--sefaria-accent);
        outline-offset: 2px;
      }

      .selection,
      .warning {
        margin: 0;
      }

      .warning {
        color: var(--sefaria-danger, #a21d24);
      }

      .states {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
        gap: 1rem;
      }

      .reader-states {
        display: grid;
        gap: 1rem;
      }

      .reader-state {
        container-type: inline-size;
      }

      section {
        min-width: 0;
        padding: 1rem;
        border: 1px solid var(--sefaria-border);
        border-radius: 0.5rem;
      }

      h2 {
        margin-block-start: 0;
        font-size: 1rem;
      }

      .scenario-link {
        display: inline-block;
        margin-block-end: 0.75rem;
        font-size: 0.82rem;
      }

      details {
        border-top: 1px solid var(--sefaria-border);
        padding-block-start: 0.75rem;
      }

      summary {
        cursor: pointer;
        font-weight: 700;
      }

      dl {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        gap: 0.35rem 0.75rem;
      }

      dt {
        font-weight: 700;
      }

      dd {
        min-width: 0;
        margin: 0;
        overflow-wrap: anywhere;
      }
    `,
  ];

  #component: ComponentId | "all" = "all";
  #scenario = "all";
  #theme: Theme = "system";
  #width = 1024;
  #diagnostics = false;
  #invalidSelection = false;
  #lastEvent = "No component event received.";

  constructor() {
    super();
    const params = new URLSearchParams(location.search);
    const component = params.get("component");
    const scenario = params.get("scenario")?.trim();
    const theme = params.get("theme");
    const width = Number(params.get("width"));
    this.#diagnostics = params.get("diagnostics") === "1";
    if (component !== null && componentIds.includes(component as ComponentId)) {
      this.#component = component as ComponentId;
    } else if (component !== null) {
      this.#invalidSelection = true;
    }
    if (scenario) this.#scenario = scenario;
    if (theme === "light" || theme === "dark") this.#theme = theme;
    if (Number.isFinite(width) && width > 0) {
      this.#width = Math.max(320, Math.min(1400, width));
    }
    if (!this.#scenarioExists()) {
      this.#invalidSelection = true;
      this.#component = "all";
      this.#scenario = "all";
    }
    this.#applyDisplay();
  }

  protected override render() {
    const selectedDetail =
      this.#component === "all" ? undefined : componentDetails[this.#component];
    return html`
      <h1>Sefaria Web Components authored workbench</h1>
      <p>
        Choose supplied view-model states without making an API request. Live
        requests stay separate in the component and Reader destinations.
      </p>
      <div class="workbench">
        <div class="controls">
          <label>
            Component
            <select id="component-select" @change=${this.#changeComponent}>
              <option value="all" ?selected=${this.#component === "all"}>
                All components
              </option>
              ${componentIds.map(
                (id) =>
                  html`<option value=${id} ?selected=${this.#component === id}>
                    ${componentDetails[id].label}
                  </option>`,
              )}
            </select>
          </label>
          <label>
            Scenario
            <select id="scenario-select" @change=${this.#changeScenario}>
              <option value="all" ?selected=${this.#scenario === "all"}>
                All scenarios
              </option>
              ${this.#scenarioOptions().map(
                ({ id, title }) =>
                  html`<option value=${id} ?selected=${this.#scenario === id}>
                    ${title}
                  </option>`,
              )}
            </select>
          </label>
          <label>
            Theme
            <select
              id="theme-select"
              .value=${this.#theme}
              @change=${this.#changeTheme}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Preview width
            <input
              id="width-control"
              type="range"
              min="320"
              max="1400"
              step="20"
              .value=${String(this.#width)}
              @input=${this.#changeWidth}
              @change=${this.#commitWidth}
            />
            <output>${this.#width}px</output>
          </label>
          <label>
            Diagnostics
            <select
              id="diagnostics-select"
              .value=${this.#diagnostics ? "1" : "0"}
              @change=${this.#changeDiagnostics}
            >
              <option value="0">Hidden</option>
              <option value="1">Visible</option>
            </select>
          </label>
        </div>
        <p class="selection" data-authored-selection>
          ${selectedDetail?.label ?? "All authored components"} /
          ${this.#scenario === "all" ? "all states" : this.#scenario}
        </p>
        ${
          this.#invalidSelection
            ? html`<p class="warning" role="alert">
                The requested deep link was not recognized, so the full authored
                gallery is shown.
              </p>`
            : nothing
        }
        ${
          this.#diagnostics
            ? html`
                <details open>
                  <summary>Scenario diagnostics</summary>
                  <dl>
                    <dt>Data mode</dt>
                    <dd>Authored view model; request count: 0</dd>
                    <dt>Public package</dt>
                    <dd>
                      <code
                        >${
                          selectedDetail?.packagePath ??
                          "@sefaria/web-components"
                        }</code
                      >
                    </dd>
                    <dt>Runnable source</dt>
                    <dd>
                      <a
                        href=${
                          selectedDetail?.source ??
                          "src/authored/development-status.ts"
                        }
                        >${
                          selectedDetail?.source ??
                          "src/authored/development-status.ts"
                        }</a
                      >
                    </dd>
                    <dt>Latest event</dt>
                    <dd id="event-diagnostic">${this.#lastEvent}</dd>
                  </dl>
                </details>
              `
            : nothing
        }
      </div>

      ${
        this.#show("ref-label")
          ? html`
              <div class="states">
                ${this.#filter("ref-label", refLabelScenarios).map(
                  ({ id, title, viewModel }) => html`
                    <section data-component="ref-label" data-scenario=${id}>
                      <h2>${title}</h2>
                      ${this.#scenarioLink("ref-label", id)}
                      <sefaria-ref-label
                        linked
                        label-language="both"
                        .viewModel=${viewModel}
                      ></sefaria-ref-label>
                    </section>
                  `,
                )}
              </div>
            `
          : nothing
      }
      ${
        this.#show("text-segment")
          ? html`
              <div class="states">
                ${this.#filter("text-segment", textSegmentScenarios).map(
                  ({ id, title, viewModel }) => html`
                    <section data-component="text-segment" data-scenario=${id}>
                      <h2>${title}</h2>
                      ${this.#scenarioLink("text-segment", id)}
                      <sefaria-text-segment
                        .viewModel=${viewModel}
                      ></sefaria-text-segment>
                    </section>
                  `,
                )}
              </div>
            `
          : nothing
      }
      ${
        this.#show("bilingual-segment")
          ? html`
              <h2>Bilingual segment</h2>
              <p>
                Each example pairs one source side with one translation side
                from a single authored view model.
              </p>
              <div class="states">
                ${this.#filter(
                  "bilingual-segment",
                  bilingualSegmentScenarios,
                ).map(
                  ({ id, title, viewModel }) => html`
                    <section
                      data-component="bilingual-segment"
                      data-scenario=${id}
                    >
                      <h2>${title}</h2>
                      ${this.#scenarioLink("bilingual-segment", id)}
                      <sefaria-bilingual-segment
                        .viewModel=${viewModel}
                      ></sefaria-bilingual-segment>
                    </section>
                  `,
                )}
              </div>
            `
          : nothing
      }
      ${
        this.#show("source-card")
          ? html`
              <h2>Source card</h2>
              <p>
                A source card owns one payload-derived header and an ordered
                collection of bilingual pairs.
              </p>
              <div class="states">
                ${this.#filter("source-card", sourceCardScenarios).map(
                  ({
                    id,
                    title,
                    viewModel,
                    selectable = false,
                    selectedPosition,
                    showAddressLabels = true,
                  }) => html`
                    <section data-component="source-card" data-scenario=${id}>
                      <h2>${title}</h2>
                      ${this.#scenarioLink("source-card", id)}
                      <sefaria-source-card
                        ?selectable=${selectable}
                        .selectedPosition=${selectedPosition}
                        .showAddressLabels=${showAddressLabels}
                        .viewModel=${viewModel}
                        @sefaria-source-select=${this.#logEvent}
                      ></sefaria-source-card>
                    </section>
                  `,
                )}
              </div>
            `
          : nothing
      }
      ${
        this.#show("connections-panel")
          ? html`
              <h2>Connections panel</h2>
              <p>
                Category summaries and bounded detail pages use authored,
                already projected connection view models.
              </p>
              <div class="states">
                ${this.#filter(
                  "connections-panel",
                  connectionsPanelScenarios,
                ).map(
                  ({ id, title, viewModel }) => html`
                    <section
                      data-component="connections-panel"
                      data-scenario=${id}
                    >
                      <h2>${title}</h2>
                      ${this.#scenarioLink("connections-panel", id)}
                      <sefaria-connections-panel
                        .viewModel=${viewModel}
                        @sefaria-connection-select=${this.#logEvent}
                        @sefaria-connections-category-change=${this.#logEvent}
                        @sefaria-connections-page-change=${this.#logEvent}
                      ></sefaria-connections-panel>
                    </section>
                  `,
                )}
              </div>
            `
          : nothing
      }
      ${
        this.#show("reader")
          ? html`
              <h2>Controlled reader</h2>
              <p>
                Each reader composes authored source and connections models. The
                host remains responsible for transitions, requests, and chat
                delivery.
              </p>
              <div class="reader-states">
                ${this.#filter("reader", readerScenarios).map(
                  ({
                    id,
                    title,
                    viewModel,
                    activePane = "source",
                    chatExport = false,
                  }) => html`
                    <section
                      class="reader-state"
                      data-component="reader"
                      data-scenario=${id}
                    >
                      <h2>${title}</h2>
                      ${this.#scenarioLink("reader", id)}
                      <sefaria-reader
                        .viewModel=${viewModel}
                        .activePane=${activePane}
                        .chatExport=${chatExport}
                        @sefaria-reader-back=${this.#logEvent}
                        @sefaria-reader-connections-open=${this.#logEvent}
                      ></sefaria-reader>
                    </section>
                  `,
                )}
              </div>
            `
          : nothing
      }
    `;
  }

  #show(component: ComponentId): boolean {
    return this.#component === "all" || this.#component === component;
  }

  #filter<T extends { readonly id: string }>(
    component: ComponentId,
    scenarios: readonly T[],
  ): readonly T[] {
    if (!this.#show(component)) return [];
    return this.#scenario === "all"
      ? scenarios
      : scenarios.filter(({ id }) => id === this.#scenario);
  }

  #scenarioOptions(): readonly {
    readonly id: string;
    readonly title: string;
  }[] {
    if (this.#component === "all") return [];
    return componentDetails[this.#component].scenarios;
  }

  #scenarioExists(): boolean {
    if (this.#scenario === "all") return true;
    if (this.#component === "all") return false;
    return componentDetails[this.#component].scenarios.some(
      ({ id }) => id === this.#scenario,
    );
  }

  #scenarioLink(component: ComponentId, scenario: string) {
    const params = new URLSearchParams(location.search);
    params.set("component", component);
    params.set("scenario", scenario);
    return html`<a class="scenario-link" href=${`?${params.toString()}`}
      >Deep link to this state</a
    >`;
  }

  #changeComponent = (event: Event): void => {
    this.#component = (event.currentTarget as HTMLSelectElement).value as
      ComponentId | "all";
    this.#scenario = "all";
    this.#invalidSelection = false;
    this.#updateUrl();
    this.requestUpdate();
  };

  #changeScenario = (event: Event): void => {
    this.#scenario = (event.currentTarget as HTMLSelectElement).value;
    this.#invalidSelection = false;
    this.#updateUrl();
    this.requestUpdate();
  };

  #changeTheme = (event: Event): void => {
    this.#theme = (event.currentTarget as HTMLSelectElement).value as Theme;
    this.#applyDisplay();
    this.#updateUrl();
    this.requestUpdate();
  };

  #changeWidth = (event: Event): void => {
    this.#width = Number((event.currentTarget as HTMLInputElement).value);
    this.#applyDisplay();
    this.requestUpdate();
  };

  #commitWidth = (): void => {
    this.#updateUrl();
    this.requestUpdate();
  };

  #changeDiagnostics = (event: Event): void => {
    this.#diagnostics =
      (event.currentTarget as HTMLSelectElement).value === "1";
    this.#updateUrl();
    this.requestUpdate();
  };

  #logEvent = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail;
    this.#lastEvent = `${event.type}: ${JSON.stringify(detail)}`;
    this.requestUpdate();
  };

  #applyDisplay(): void {
    if (this.#theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = this.#theme;
    }
    this.style.setProperty("--authored-preview-width", `${this.#width}px`);
  }

  #updateUrl(): void {
    this.#invalidSelection = false;
    const params = new URLSearchParams(location.search);
    if (this.#component === "all") params.delete("component");
    else params.set("component", this.#component);
    if (this.#scenario === "all") params.delete("scenario");
    else params.set("scenario", this.#scenario);
    if (this.#theme === "system") params.delete("theme");
    else params.set("theme", this.#theme);
    params.set("width", String(this.#width));
    if (this.#diagnostics) params.set("diagnostics", "1");
    else params.delete("diagnostics");
    history.replaceState(null, "", `?${params.toString()}`);
  }
}

customElements.define("sefaria-development-status", SefariaDevelopmentStatus);

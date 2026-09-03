import { SefariaElement } from "@sefaria/components";
import { css, html } from "lit";

import { bilingualSegmentScenarios } from "./bilingual-segment.scenarios.js";
import { refLabelScenarios } from "./ref-label.scenarios.js";
import { textSegmentScenarios } from "./text-segment.scenarios.js";

class SefariaDevelopmentStatus extends SefariaElement {
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        max-width: 64rem;
        margin: 2rem auto;
        padding: 2rem;
        border: 1px solid var(--sefaria-border);
        border-radius: 0.75rem;
      }

      h1 {
        margin-top: 0;
        font-family: var(--sefaria-font-english);
      }

      code {
        color: var(--sefaria-link);
      }

      .states {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
        gap: 1rem;
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
    `,
  ];

  protected override render() {
    return html`
      <h1>Sefaria Web Components</h1>
      <p>
        The examples use authored view models. The elements make no API request.
      </p>
      <div class="states">
        ${refLabelScenarios.map(
          ({ title, viewModel }) => html`
            <section>
              <h2>${title}</h2>
              <sefaria-ref-label
                linked
                label-language="both"
                .viewModel=${viewModel}
              ></sefaria-ref-label>
            </section>
          `,
        )}
        ${textSegmentScenarios.map(
          ({ title, viewModel }) => html`
            <section>
              <h2>${title}</h2>
              <sefaria-text-segment
                .viewModel=${viewModel}
              ></sefaria-text-segment>
            </section>
          `,
        )}
      </div>
      <h2>Bilingual segment</h2>
      <p>
        Each bilingual example pairs one source side with one translation side
        from a single authored view model.
      </p>
      <div class="states">
        ${bilingualSegmentScenarios.map(
          ({ title, viewModel }) => html`
            <section>
              <h2>${title}</h2>
              <sefaria-bilingual-segment
                .viewModel=${viewModel}
              ></sefaria-bilingual-segment>
            </section>
          `,
        )}
      </div>
    `;
  }
}

customElements.define("sefaria-development-status", SefariaDevelopmentStatus);

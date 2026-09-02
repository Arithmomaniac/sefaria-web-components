import { SefariaElement } from "@sefaria/components";
import { css, html } from "lit";

import { componentFixtureCatalogRows } from "./fixture-catalog.js";

class SefariaDevelopmentStatus extends SefariaElement {
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        max-width: 48rem;
        margin: 4rem auto;
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

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      th,
      td {
        padding: 0.5rem;
        border-bottom: 1px solid var(--sefaria-border);
        text-align: left;
        vertical-align: top;
      }

      th {
        font-family: var(--sefaria-font-english);
      }

      td:first-child {
        overflow-wrap: anywhere;
      }
    `,
  ];

  protected override render() {
    return html`
      <h1>Sefaria Web Components</h1>
      <p>
        The shared fixture catalog is ready. The production component factories
        and elements remain planned.
      </p>
      <table>
        <thead>
          <tr>
            <th>Fixture</th>
            <th>State</th>
            <th>Owner</th>
            <th>Widths</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${componentFixtureCatalogRows.map(
            (row) => html`
              <tr>
                <td><code>${row.id}</code></td>
                <td>${row.state}</td>
                <td>#${row.ownerIssue}</td>
                <td>${row.widths.map((width) => `${width}px`).join(", ")}</td>
                <td>${row.status}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }
}

customElements.define("sefaria-development-status", SefariaDevelopmentStatus);

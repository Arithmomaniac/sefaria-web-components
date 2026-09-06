import { css, html, nothing, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";

import {
  bilingualPairStyles,
  renderBilingualPair,
  type BilingualPairContentLanguage,
  type BilingualPairLayout,
  type BilingualPairSide,
  type BilingualPairSideOrder,
} from "./bilingual-pair.js";
import "./ref-label-element.js";
import { SefariaElement } from "./sefaria-element.js";
import type { RefLabelViewModel } from "./ref-label.js";
import type {
  SourceCardAttributionViewModel,
  SourceCardHeaderViewModel,
  SourceCardItemViewModel,
  SourceCardViewModel,
} from "./source-card.js";

/** Request-free custom element that renders one source-card view model. */
export class SefariaSourceCard extends SefariaElement {
  /** Lit property metadata for host-supplied data and presentation. */
  static override properties = {
    viewModel: { attribute: false },
    referenceLabel: { attribute: false },
    contentLanguage: { type: String, attribute: "content-language" },
    layout: { type: String },
    sideOrder: { type: String, attribute: "side-order" },
    hideAttributions: { type: Boolean, attribute: "hide-attributions" },
    showAddressLabels: { attribute: false },
    selectable: { type: Boolean },
    selectedPosition: { attribute: false },
  };

  /** Card structure, heading, collection, and shared pair styles. */
  static override styles = [
    ...SefariaElement.styles,
    css`
      :host {
        container-type: inline-size;
        max-width: 100%;
        min-width: 0;
        border: 1px solid var(--_sefaria-border);
        border-radius: 0.75rem;
        padding: 1.25rem;
      }

      header {
        margin-block-end: 1.25rem;
        padding-block-end: 0.75rem;
        border-block-end: 1px solid var(--_sefaria-border);
      }

      .payload-label {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.35rem 1rem;
        font-size: 1.125em;
        font-weight: 700;
        line-height: 1.3;
      }

      .english {
        font-family: var(--_sefaria-font-english);
      }

      .hebrew {
        font-family: var(--_sefaria-font-hebrew);
      }

      .items {
        display: grid;
        gap: 1.25rem;
      }

      .item {
        min-width: 0;
        max-width: 100%;
      }

      .item.selectable {
        position: relative;
        cursor: pointer;
      }

      .item-content {
        min-width: 0;
      }

      .item.selected {
        outline: 2px solid var(--_sefaria-border);
        outline-offset: 0.3rem;
      }

      .segment-label {
        width: 2rem;
        font-size: 0.8em;
        font-weight: 600;
        line-height: 1;
        color: inherit;
        background: transparent;
        border: 0;
        border-radius: 0.2rem;
        padding: 0.2rem 0.3rem;
        align-self: start;
        cursor: pointer;
      }

      .pair-side {
        display: grid;
        gap: 0.65rem;
        align-items: start;
        min-width: 0;
      }

      .pair-side[data-pair-side="translation"] {
        grid-template-columns: minmax(0, 1fr);
      }

      .pair-side[data-pair-side="translation"][data-adornment="true"] {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .pair-side[data-pair-side="primary"] {
        grid-template-columns: minmax(0, 1fr);
      }

      .pair-side[data-pair-side="primary"][data-adornment="true"] {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .pair-side[data-pair-side="translation"][data-adornment="true"]
        sefaria-text-segment {
        grid-column: 2;
        grid-row: 1;
      }

      .pair-side[data-pair-side="primary"][data-adornment="true"]
        .segment-label {
        grid-column: 2;
        grid-row: 1;
      }

      .pair-side[data-pair-side="primary"][data-adornment="true"]
        sefaria-text-segment {
        grid-column: 1;
        grid-row: 1;
      }

      .segment-label.english {
        font-family: var(--_sefaria-font-label-english);
      }

      .segment-label.hebrew {
        font-family: var(--_sefaria-font-label-hebrew);
      }

      .segment-select-control {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .segment-select-control:focus {
        position: static;
        width: auto;
        height: auto;
        margin: 0 0 0.5rem;
        padding: 0.35rem 0.5rem;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }

      .segment-label:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .item + .item {
        border-block-start: 1px solid var(--_sefaria-border);
        padding-block-start: 1.25rem;
      }

      .attributions {
        display: grid;
        gap: 0.45rem;
        margin-block-start: 1.25rem;
        padding: 1rem;
        border-block-start: 1px solid var(--_sefaria-border);
        border-radius: 0.4rem;
        background: var(--_sefaria-surface-muted);
        color: var(--_sefaria-fg-muted);
        font-size: 0.8125em;
      }

      .attribution {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35em;
        margin: 0;
        min-width: 0;
      }

      .attribution > * {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .attribution-label {
        font-weight: 600;
      }

      .version-title-link {
        color: var(--_sefaria-link);
        text-underline-offset: 0.16em;
      }

      .version-title-link:focus-visible {
        border-radius: 0.15em;
        outline: 2px solid var(--_sefaria-accent);
        outline-offset: 0.18em;
      }

      .version-source::before {
        content: "— ";
      }
    `,
    bilingualPairStyles,
  ];

  /** Render-ready state supplied by the host. */
  declare viewModel: SourceCardViewModel;

  /** Optional richer label supplied by a host that already owns it. */
  declare referenceLabel: RefLabelViewModel | undefined;

  /** Sides the host wants displayed for every pair. */
  declare contentLanguage: BilingualPairContentLanguage;

  /** Requested arrangement for every pair. */
  declare layout: BilingualPairLayout;

  /** Requested role order for every pair. */
  declare sideOrder: BilingualPairSideOrder;
  /** Whether compact address labels are visible beside rendered text sides. */
  declare showAddressLabels: boolean;
  /** Enables selection controls for items with proven canonical targets. */
  declare selectable: boolean;
  /** Host-controlled original position path, never a reference string. */
  declare selectedPosition: readonly number[] | undefined;

  /** Whether resolved edition attribution is intentionally omitted. */
  declare hideAttributions: boolean;

  constructor() {
    super();
    this.referenceLabel = undefined;
    this.contentLanguage = "both";
    this.layout = "auto";
    this.sideOrder = "primary-first";
    this.hideAttributions = false;
    this.showAddressLabels = true;
    this.selectable = false;
    this.selectedPosition = undefined;
  }

  /** Reveals the selected control without requesting or changing data. */
  async revealSelection(): Promise<void> {
    await this.updateComplete;
    const control = this.renderRoot.querySelector<HTMLButtonElement>(
      '.segment-label[aria-pressed="true"], .segment-select-control[aria-pressed="true"]',
    );
    control?.scrollIntoView({ block: "nearest" });
    control?.focus({ preventScroll: true });
  }

  protected override render() {
    const viewModel = this.viewModel;
    if (!viewModel) {
      return nothing;
    }

    switch (viewModel.state) {
      case "loading":
        return html`<p role="status" aria-live="polite">
          ${viewModel.message}
        </p>`;
      case "error":
        return html`<p role="alert">${viewModel.message}</p>`;
      case "empty":
        return html`
          ${this.#renderHeader(viewModel.header)}
          <p role="status" aria-live="polite">
            ${viewModel.absent.map((side) => side.message).join(" ")}
          </p>
          ${this.#renderAttributions(viewModel.attributions)}
        `;
      case "data":
        return html`
          ${this.#renderHeader(viewModel.header)}
          <section class="items" aria-label="Source text">
            ${repeat(
              viewModel.items,
              (item) => positionKey(item.position),
              (item) => this.#renderItem(item),
            )}
          </section>
          ${this.#renderAttributions(viewModel.attributions)}
        `;
    }
  }

  #renderItem(item: SourceCardItemViewModel): TemplateResult {
    const selectable = this.#isSelectable(item);
    const hiddenControl =
      selectable && !this.showAddressLabels
        ? this.#renderSelectionControl(
            item.position,
            item.ref!,
            "segment-select-control",
            "Show connections",
          )
        : nothing;

    return html`<div
      class=${this.#itemClass(item)}
      data-position=${positionKey(item.position)}
      @click=${(event: MouseEvent) => this.#handleItemClick(event, item)}
    >
      ${hiddenControl}
      <div class="item-content">
        ${renderBilingualPair(
          item.pair,
          {
            contentLanguage: this.contentLanguage,
            layout: this.layout,
            sideOrder: this.sideOrder,
            announceAbsent: false,
          },
          selectable && this.showAddressLabels
            ? (side) => this.#renderAddressLabel(item, side)
            : undefined,
        )}
      </div>
    </div>`;
  }

  #renderAddressLabel(
    item: SourceCardItemViewModel,
    side: BilingualPairSide,
  ): TemplateResult {
    const language = side === "primary" ? "hebrew" : "english";
    return this.#renderSelectionControl(
      item.position,
      item.ref!,
      `segment-label ${language}`,
      formatAddressLabel(item.addressLabel!, language),
      language === "hebrew" ? "he" : "en",
    );
  }

  #renderSelectionControl(
    position: readonly number[],
    ref: string,
    className: string,
    content: string,
    language?: string,
  ): TemplateResult {
    return html`<button
      type="button"
      class=${className}
      title=${ref}
      aria-label=${`Show connections for ${ref}`}
      aria-pressed=${
        this.selectedPosition !== undefined &&
        positionKey(position) === positionKey(this.selectedPosition)
      }
      @click=${(event: MouseEvent) => {
        event.stopPropagation();
        this.#selectItem(position, ref);
      }}
    >
      <span lang=${language ?? nothing}>${content}</span>
    </button>`;
  }

  #isSelectable(
    item: SourceCardItemViewModel,
  ): item is SourceCardItemViewModel & {
    readonly ref: string;
    readonly addressLabel: string;
  } {
    return (
      this.selectable &&
      item.ref !== undefined &&
      item.addressLabel !== undefined
    );
  }

  #itemClass(item: SourceCardItemViewModel): string {
    const classes = ["item"];
    if (this.#isSelectable(item)) classes.push("selectable");
    if (
      this.#isSelectable(item) &&
      this.selectedPosition !== undefined &&
      positionKey(item.position) === positionKey(this.selectedPosition)
    ) {
      classes.push("selected");
    }
    return classes.join(" ");
  }

  #handleItemClick(event: MouseEvent, item: SourceCardItemViewModel): void {
    if (!this.#isSelectable(item)) return;
    if (
      event
        .composedPath()
        .some(
          (target) =>
            target instanceof Element &&
            target.matches(
              "a, button, input, select, textarea, summary, [contenteditable='true']",
            ),
        )
    ) {
      return;
    }
    const selection = this.ownerDocument.getSelection();
    if (selection !== null && !selection.isCollapsed) return;
    this.#selectItem(item.position, item.ref);
  }

  #selectItem(position: readonly number[], ref: string): void {
    this.dispatchEvent(
      new CustomEvent("sefaria-source-select", {
        detail: { position: [...position], ref },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #renderHeader(header: SourceCardHeaderViewModel): TemplateResult {
    if (this.referenceLabel !== undefined) {
      return html`<header>
        <sefaria-ref-label
          .viewModel=${this.referenceLabel}
          label-language="both"
          linked
        ></sefaria-ref-label>
      </header>`;
    }

    return html`<header>
      <div class="payload-label">
        <span class="english" lang="en" dir="ltr">${header.ref}</span>
        <span class="hebrew" lang="he" dir="rtl">${header.heRef}</span>
      </div>
    </header>`;
  }

  #renderAttributions(
    attributions: readonly SourceCardAttributionViewModel[],
  ): TemplateResult | typeof nothing {
    if (this.hideAttributions) {
      return nothing;
    }
    const visible = attributions.filter(
      (attribution) =>
        this.contentLanguage === "both" ||
        this.contentLanguage === attribution.side,
    );
    if (visible.length === 0) {
      return nothing;
    }

    return html`<section class="attributions" aria-label="Text editions">
      ${visible.map((attribution) => this.#renderAttribution(attribution))}
    </section>`;
  }

  #renderAttribution(
    attribution: SourceCardAttributionViewModel,
  ): TemplateResult {
    const label =
      attribution.side === "primary" ? "Primary text:" : "Translation:";
    const sourceUrl = attribution.versionSourceUrl ?? null;
    const source =
      attribution.versionSource === null || sourceUrl !== null
        ? nothing
        : html`<span class="version-source"
            >${attribution.versionSource}</span
          >`;
    const title =
      sourceUrl === null
        ? html`<span class="version-title">${attribution.versionTitle}</span>`
        : html`<a
            class="version-title version-title-link"
            href=${sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            >${attribution.versionTitle}</a
          >`;

    return html`<p class="attribution" data-side=${attribution.side}>
      <span class="attribution-label">${label}</span>
      ${title} ${source}
    </p>`;
  }
}

function positionKey(position: readonly number[]): string {
  return position.length === 0 ? "root" : position.join(".");
}

function formatAddressLabel(
  label: string,
  language: "english" | "hebrew",
): string {
  if (language === "english" || !/^[1-9]\d*$/.test(label)) return label;
  const value = Number(label);
  if (!Number.isSafeInteger(value)) return label;
  return encodeHebrewNumeral(value);
}

function encodeHebrewNumeral(value: number): string {
  const groups: number[] = [];
  for (let remaining = value; remaining > 0;) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  return groups
    .flatMap((group, index) => {
      if (group === 0) return [];
      const letters = encodeHebrewGroup(group);
      return [
        index < groups.length - 1
          ? `${punctuateHebrewNumeral(letters)}\u05f3`.replace(
              "\u05f3\u05f3",
              "\u05f3",
            )
          : punctuateHebrewNumeral(letters),
      ];
    })
    .join("");
}

function encodeHebrewGroup(value: number): string {
  const hundreds = ["", "\u05e7", "\u05e8", "\u05e9"];
  const tens = [
    "",
    "\u05d9",
    "\u05db",
    "\u05dc",
    "\u05de",
    "\u05e0",
    "\u05e1",
    "\u05e2",
    "\u05e4",
    "\u05e6",
  ];
  const ones = [
    "",
    "\u05d0",
    "\u05d1",
    "\u05d2",
    "\u05d3",
    "\u05d4",
    "\u05d5",
    "\u05d6",
    "\u05d7",
    "\u05d8",
  ];
  let remaining = value;
  let result = "";
  while (remaining >= 400) {
    result += "\u05ea";
    remaining -= 400;
  }
  result += hundreds[Math.floor(remaining / 100)] ?? "";
  remaining %= 100;
  if (remaining === 15) return `${result}\u05d8\u05d5`;
  if (remaining === 16) return `${result}\u05d8\u05d6`;
  result += tens[Math.floor(remaining / 10)] ?? "";
  result += ones[remaining % 10] ?? "";
  return result;
}

function punctuateHebrewNumeral(letters: string): string {
  return letters.length === 1
    ? `${letters}\u05f3`
    : `${letters.slice(0, -1)}\u05f4${letters.slice(-1)}`;
}

if (!customElements.get("sefaria-source-card")) {
  customElements.define("sefaria-source-card", SefariaSourceCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "sefaria-source-card": SefariaSourceCard;
  }
}

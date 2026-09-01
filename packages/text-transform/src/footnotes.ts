import type { ChildNode } from "domhandler";
import { isText } from "domhandler";
import { escapeText } from "entities";

import {
  hasClass,
  hasOnlyWhitespace,
  isElement,
  parseHtml,
  serializeCloseTag,
  serializeNodes,
  serializeOpenTag,
  textContent,
} from "./html.js";

/** One logical footnote extracted from a sanitized HTML fragment. */
export interface ExtractedFootnote {
  /** Stable zero-based logical index within one extraction result. */
  readonly index: number;
  /** Decoded plain text for text-node rendering, never an HTML fragment. */
  readonly markerText: string;
  /** Escaped HTML, `""` for a present empty body, or `null` for a missing body. */
  readonly content: string | null;
}

/** Ordered content emitted for the footnote-free body rendering surface. */
export type FootnoteBodyPart =
  | {
      readonly kind: "html";
      readonly html: string;
    }
  | {
      readonly kind: "footnote-marker";
      readonly noteIndex: number;
      readonly markerText: string;
    };

/** Structured body and note collections produced by {@link extractFootnotes}. */
export interface ExtractFootnotesResult {
  /** Ordered balanced HTML fragments and logical marker insertion points. */
  readonly body: readonly FootnoteBodyPart[];
  /** Source-ordered logical notes referenced by body marker parts. */
  readonly notes: readonly ExtractedFootnote[];
}

/**
 * Splits sanitized HTML into balanced body fragments and logical footnotes.
 *
 * This function does not sanitize its input and does not assign DOM IDs.
 *
 * @throws {RangeError} When nested marker projection exceeds the output bound.
 * @see [Footnotes](../README.md#footnotes)
 * @see [Footnote extraction](../README.md#footnote-extraction)
 */
export function extractFootnotes(html: string): ExtractFootnotesResult {
  const body: FootnoteBodyPart[] = [];
  const notes: ExtractedFootnote[] = [];
  const maximumProjectedLength = Math.max(65_536, html.length * 8);
  const projectionBudget = new ProjectionBudget(maximumProjectedLength);
  const writer = new FootnoteBodyWriter(body, projectionBudget);
  const tasks: FootnoteTask[] = [
    { kind: "nodes", nodes: parseHtml(html), index: 0 },
  ];

  while (tasks.length > 0) {
    const task = tasks.pop();
    if (!task) {
      break;
    }

    if (task.kind === "close") {
      writer.closeElement(task.name);
      continue;
    }

    if (task.index >= task.nodes.length) {
      continue;
    }

    const node = task.nodes[task.index];
    if (!node) {
      continue;
    }

    const bodyIndex = findFollowingFootnoteBody(task.nodes, task.index);
    const isMarker =
      isElement(node, "sup") && hasClass(node, "footnote-marker");
    tasks.push({
      ...task,
      index: isMarker && bodyIndex !== null ? bodyIndex + 1 : task.index + 1,
    });

    if (isMarker) {
      const markerText = textContent(node.children);
      const noteIndex = notes.length;
      const footnoteBody =
        bodyIndex === null ? null : (task.nodes[bodyIndex] ?? null);
      const content =
        footnoteBody && isElement(footnoteBody, "i")
          ? serializeNodes(footnoteBody.children)
          : null;
      projectionBudget.add(content?.length ?? 0);
      notes.push({
        index: noteIndex,
        markerText,
        content,
      });
      writer.appendMarker(noteIndex, markerText);
      continue;
    }

    if (isText(node)) {
      writer.appendText(node.data);
      continue;
    }

    if (!isElement(node)) {
      continue;
    }

    if (node.name === "i" && hasClass(node, "footnote")) {
      writer.openElement("i", {});
      tasks.push({ kind: "close", name: "i" });
      tasks.push({ kind: "nodes", nodes: node.children, index: 0 });
      continue;
    }

    writer.openElement(node.name, node.attribs);
    if (node.name !== "br") {
      tasks.push({ kind: "close", name: node.name });
      tasks.push({ kind: "nodes", nodes: node.children, index: 0 });
    }
  }

  writer.finish();
  return { body, notes };
}

function findFollowingFootnoteBody(
  nodes: readonly ChildNode[],
  markerIndex: number,
): number | null {
  let index = markerIndex + 1;
  while (index < nodes.length) {
    const node = nodes[index];
    if (!node) {
      return null;
    }
    if (hasOnlyWhitespace(node)) {
      index += 1;
      continue;
    }
    return isElement(node, "i") && hasClass(node, "footnote") ? index : null;
  }
  return null;
}

class FootnoteBodyWriter {
  readonly #body: FootnoteBodyPart[];
  readonly #chunks: string[] = [];
  readonly #openElements: Array<{
    readonly name: string;
    readonly attributes: Readonly<Record<string, string>>;
  }> = [];
  readonly #projectionBudget: ProjectionBudget;

  constructor(body: FootnoteBodyPart[], projectionBudget: ProjectionBudget) {
    this.#body = body;
    this.#projectionBudget = projectionBudget;
  }

  appendText(text: string): void {
    this.#appendChunk(escapeText(text));
  }

  openElement(
    name: string,
    attributes: Readonly<Record<string, string>>,
  ): void {
    this.#appendChunk(serializeOpenTag(name, attributes));
    if (name !== "br") {
      this.#openElements.push({ name, attributes });
    }
  }

  closeElement(name: string): void {
    this.#appendChunk(serializeCloseTag(name));
    const openElement = this.#openElements.pop();
    if (!openElement || openElement.name !== name) {
      throw new Error(`Unbalanced parsed element: ${name}`);
    }
  }

  appendMarker(noteIndex: number, markerText: string): void {
    // Closing and reopening active ancestors makes both neighboring HTML
    // fragments balanced while preserving the marker's original nesting.
    for (let index = this.#openElements.length - 1; index >= 0; index -= 1) {
      const element = this.#openElements[index];
      if (element) {
        this.#appendChunk(serializeCloseTag(element.name));
      }
    }
    this.#flushHtml();
    this.#body.push({ kind: "footnote-marker", noteIndex, markerText });
    for (const element of this.#openElements) {
      this.#appendChunk(serializeOpenTag(element.name, element.attributes));
    }
  }

  finish(): void {
    this.#flushHtml();
  }

  #flushHtml(): void {
    const html = this.#chunks.join("");
    this.#chunks.length = 0;
    if (html.length === 0) {
      return;
    }

    const previous = this.#body.at(-1);
    if (previous?.kind === "html") {
      this.#body[this.#body.length - 1] = {
        kind: "html",
        html: previous.html + html,
      };
    } else {
      this.#body.push({ kind: "html", html });
    }
  }

  #appendChunk(chunk: string): void {
    this.#projectionBudget.add(chunk.length);
    this.#chunks.push(chunk);
  }
}

class ProjectionBudget {
  readonly #maximumLength: number;
  #length = 0;

  constructor(maximumLength: number) {
    this.#maximumLength = maximumLength;
  }

  add(length: number): void {
    // Body fragments and note contents share this budget because either side
    // can grow when nested ancestors are serialized around many markers.
    this.#length += length;
    if (this.#length > this.#maximumLength) {
      throw new RangeError(
        "Footnote extraction exceeded the projected output limit",
      );
    }
  }
}

interface FootnoteNodesTask {
  readonly kind: "nodes";
  readonly nodes: readonly ChildNode[];
  readonly index: number;
}

interface FootnoteCloseTask {
  readonly kind: "close";
  readonly name: string;
}

type FootnoteTask = FootnoteNodesTask | FootnoteCloseTask;

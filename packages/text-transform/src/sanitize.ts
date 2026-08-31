import type { ChildNode, Element } from "domhandler";
import { isText } from "domhandler";
import { escapeText } from "entities";

import {
  classTokens,
  hasClass,
  hasOnlyWhitespace,
  isElement,
  parseHtml,
  serializeCloseTag,
  serializeOpenTag,
} from "./html.js";

export interface SanitizeOptions {
  allowFootnotes?: boolean;
  allowInlineAnnotations?: boolean;
  allowNamedEntities?: boolean;
  allowRefLinks?: boolean;
}

interface ResolvedSanitizeOptions {
  readonly allowFootnotes: boolean;
  readonly allowInlineAnnotations: boolean;
  readonly allowNamedEntities: boolean;
  readonly allowRefLinks: boolean;
}

const ORDINARY_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "big",
  "small",
  "sup",
  "sub",
]);
const ACTIVE_TAGS = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "audio",
  "video",
  "source",
  "track",
  "canvas",
  "noscript",
]);
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "caption",
  "center",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "li",
  "main",
  "marquee",
  "menu",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "search",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);
const MAM_CLASSES = new Set([
  "mam-spi-pe",
  "mam-spi-samekh",
  "mam-kq",
  "mam-kq-k",
  "mam-kq-q",
  "mam-kq-trivial",
]);
const APPROVED_HOSTS = new Set([
  "sefaria.org",
  "www.sefaria.org",
  "sefaria.org.il",
  "www.sefaria.org.il",
]);

export function sanitize(html: string, options: SanitizeOptions = {}): string {
  const resolvedOptions: ResolvedSanitizeOptions = {
    allowFootnotes: options.allowFootnotes ?? true,
    allowInlineAnnotations: options.allowInlineAnnotations ?? true,
    allowNamedEntities: options.allowNamedEntities ?? true,
    allowRefLinks: options.allowRefLinks ?? true,
  };
  const writer = new SanitizeWriter();
  const tasks: SanitizeTask[] = [
    { kind: "nodes", nodes: parseHtml(html), index: 0 },
  ];

  while (tasks.length > 0) {
    const task = tasks.pop();
    if (!task) {
      break;
    }

    if (task.kind === "close") {
      writer.appendMarkup(serializeCloseTag(task.name));
      continue;
    }

    if (task.kind === "separator") {
      writer.requestSeparator();
      continue;
    }

    if (task.index >= task.nodes.length) {
      continue;
    }

    const node = task.nodes[task.index];
    if (!node) {
      continue;
    }

    const footnoteBodyIndex = findFollowingFootnoteBody(task.nodes, task.index);
    const nextIndex =
      !resolvedOptions.allowFootnotes &&
      isFootnoteMarker(node) &&
      footnoteBodyIndex !== null
        ? footnoteBodyIndex + 1
        : task.index + 1;
    tasks.push({ ...task, index: nextIndex });

    if (isText(node)) {
      writer.appendText(node.data);
      continue;
    }

    if (!isElement(node)) {
      continue;
    }

    const action = classifyElement(node, resolvedOptions);
    if (action.kind === "remove") {
      continue;
    }

    if (action.kind === "text") {
      writer.appendText(action.text);
      continue;
    }

    if (action.kind === "unwrap") {
      tasks.push({ kind: "nodes", nodes: node.children, index: 0 });
      continue;
    }

    if (action.kind === "block") {
      writer.requestSeparator();
      tasks.push({ kind: "separator" });
      tasks.push({ kind: "nodes", nodes: node.children, index: 0 });
      continue;
    }

    writer.appendMarkup(serializeOpenTag(action.name, action.attributes));
    if (action.name !== "br") {
      tasks.push({ kind: "close", name: action.name });
      tasks.push({ kind: "nodes", nodes: node.children, index: 0 });
    }
  }

  return writer.toString();
}

function classifyElement(
  element: Element,
  options: ResolvedSanitizeOptions,
): ElementAction {
  const name = element.name;
  if (ACTIVE_TAGS.has(name)) {
    return { kind: "remove" };
  }

  if (name === "img") {
    return { kind: "text", text: element.attribs.alt ?? "" };
  }

  if (BLOCK_TAGS.has(name)) {
    return { kind: "block" };
  }

  if (name === "br") {
    return { kind: "element", name, attributes: {} };
  }

  if (name === "span") {
    const attributes = spanAttributes(element);
    return Object.keys(attributes).length === 0
      ? { kind: "unwrap" }
      : { kind: "element", name, attributes };
  }

  if (name === "a") {
    return classifyAnchor(element, options);
  }

  if (name === "i") {
    return classifyItalic(element, options);
  }

  if (name === "sup") {
    return classifySuperscript(element, options);
  }

  if (ORDINARY_TAGS.has(name)) {
    const dir = approvedDirection(element.attribs.dir);
    return {
      kind: "element",
      name,
      attributes: dir ? { dir } : {},
    };
  }

  return { kind: "unwrap" };
}

function classifyItalic(
  element: Element,
  options: ResolvedSanitizeOptions,
): ElementAction {
  if (hasClass(element, "footnote")) {
    return options.allowFootnotes
      ? {
          kind: "element",
          name: "i",
          attributes: { class: "footnote" },
        }
      : { kind: "remove" };
  }

  if (isEmptyElement(element)) {
    const commentator = element.attribs["data-commentator"];
    const overlay = element.attribs["data-overlay"];
    const value = element.attribs["data-value"];
    const hasCommentary = commentator !== undefined && overlay === undefined;
    const hasOverlay =
      overlay !== undefined && value !== undefined && commentator === undefined;

    if (hasCommentary || hasOverlay) {
      if (!options.allowInlineAnnotations) {
        return { kind: "remove" };
      }

      const attributes: Record<string, string> = {};
      addDirection(attributes, element.attribs.dir);
      if (hasCommentary) {
        attributes["data-commentator"] = commentator;
        addIfDefined(attributes, "data-label", element.attribs["data-label"]);
        addIfDefined(attributes, "data-order", element.attribs["data-order"]);
      } else if (overlay !== undefined && value !== undefined) {
        attributes["data-overlay"] = overlay;
        attributes["data-value"] = value;
      }
      return { kind: "element", name: "i", attributes };
    }
  }

  const dir = approvedDirection(element.attribs.dir);
  return {
    kind: "element",
    name: "i",
    attributes: dir ? { dir } : {},
  };
}

function classifySuperscript(
  element: Element,
  options: ResolvedSanitizeOptions,
): ElementAction {
  if (hasClass(element, "footnote-marker")) {
    return options.allowFootnotes
      ? {
          kind: "element",
          name: "sup",
          attributes: { class: "footnote-marker" },
        }
      : { kind: "remove" };
  }

  const annotationClass = classTokens(element).find(
    (token) => token === "endFootnote" || token === "itag",
  );
  if (annotationClass) {
    if (
      !options.allowInlineAnnotations ||
      (!options.allowFootnotes && annotationClass === "endFootnote")
    ) {
      return { kind: "remove" };
    }
    return {
      kind: "element",
      name: "sup",
      attributes: { class: annotationClass },
    };
  }

  return { kind: "element", name: "sup", attributes: {} };
}

function classifyAnchor(
  element: Element,
  options: ResolvedSanitizeOptions,
): ElementAction {
  const dataRef = element.attribs["data-ref"];
  if (dataRef !== undefined) {
    const href = resolveApprovedHref(element.attribs.href);
    if (
      !options.allowRefLinks ||
      (element.attribs.href !== undefined && href === null)
    ) {
      return { kind: "unwrap" };
    }

    const attributes: Record<string, string> = {};
    if (hasClass(element, "refLink")) {
      attributes.class = "refLink";
    }
    addDirection(attributes, element.attribs.dir);
    addIfDefined(attributes, "data-range", element.attribs["data-range"]);
    attributes["data-ref"] = dataRef;
    addIfDefined(
      attributes,
      "data-scroll-link",
      element.attribs["data-scroll-link"],
    );
    addIfDefined(attributes, "data-ven", element.attribs["data-ven"]);
    addIfDefined(attributes, "data-vhe", element.attribs["data-vhe"]);
    addIfDefined(attributes, "href", href ?? undefined);
    return { kind: "element", name: "a", attributes };
  }

  if (hasClass(element, "namedEntityLink")) {
    const slug = element.attribs["data-slug"];
    const href = resolveApprovedHref(element.attribs.href);
    if (
      !options.allowNamedEntities ||
      slug === undefined ||
      (element.attribs.href !== undefined && href === null)
    ) {
      return { kind: "unwrap" };
    }

    const attributes: Record<string, string> = {
      class: "namedEntityLink",
      "data-slug": slug,
    };
    addDirection(attributes, element.attribs.dir);
    addIfDefined(attributes, "data-range", element.attribs["data-range"]);
    addIfDefined(attributes, "href", href ?? undefined);
    return { kind: "element", name: "a", attributes };
  }

  return { kind: "unwrap" };
}

function spanAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  const approvedClasses = classTokens(element)
    .filter((token) => MAM_CLASSES.has(token))
    .sort();
  if (approvedClasses.length > 0) {
    attributes.class = approvedClasses.join(" ");
  }
  addDirection(attributes, element.attribs.dir);
  return attributes;
}

function resolveApprovedHref(href: string | undefined): string | null {
  if (href === undefined) {
    return null;
  }

  const value = href.trim();
  if (
    value.length === 0 ||
    value.startsWith("//") ||
    value.includes("\\") ||
    hasAsciiControl(value)
  ) {
    return null;
  }

  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/iu.test(value);
    const url = hasScheme
      ? new URL(value)
      : new URL(value, "https://www.sefaria.org/");
    if (url.username !== "" || url.password !== "") {
      return null;
    }

    if (!hasScheme) {
      return url.origin === "https://www.sefaria.org" ? url.href : null;
    }

    return url.protocol === "https:" && APPROVED_HOSTS.has(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function hasAsciiControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
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

function isFootnoteMarker(node: ChildNode): boolean {
  return isElement(node, "sup") && hasClass(node, "footnote-marker");
}

function isEmptyElement(element: Element): boolean {
  return element.children.every((child) => hasOnlyWhitespace(child));
}

function approvedDirection(value: string | undefined): string | undefined {
  return value === "ltr" || value === "rtl" || value === "auto"
    ? value
    : undefined;
}

function addDirection(
  attributes: Record<string, string>,
  value: string | undefined,
): void {
  const direction = approvedDirection(value);
  if (direction) {
    attributes.dir = direction;
  }
}

function addIfDefined(
  attributes: Record<string, string>,
  name: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    attributes[name] = value;
  }
}

class SanitizeWriter {
  readonly #chunks: string[] = [];
  #hasVisibleContent = false;
  #pendingSeparator = false;

  appendText(text: string): void {
    if (text.length === 0) {
      return;
    }
    this.#flushSeparator(text);
    this.#chunks.push(escapeText(text));
    this.#hasVisibleContent ||= text.length > 0;
  }

  appendMarkup(markup: string): void {
    if (markup.length === 0) {
      return;
    }
    this.#flushSeparator(markup);
    this.#chunks.push(markup);
  }

  requestSeparator(): void {
    if (this.#hasVisibleContent) {
      this.#pendingSeparator = true;
    }
  }

  toString(): string {
    return this.#chunks.join("");
  }

  #flushSeparator(next: string): void {
    if (!this.#pendingSeparator) {
      return;
    }
    if (!/^\s/u.test(next)) {
      this.#chunks.push(" ");
    }
    this.#pendingSeparator = false;
  }
}

interface NodesTask {
  readonly kind: "nodes";
  readonly nodes: readonly ChildNode[];
  readonly index: number;
}

interface CloseTask {
  readonly kind: "close";
  readonly name: string;
}

interface SeparatorTask {
  readonly kind: "separator";
}

type SanitizeTask = NodesTask | CloseTask | SeparatorTask;

type ElementAction =
  | { readonly kind: "remove" }
  | { readonly kind: "unwrap" }
  | { readonly kind: "block" }
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "element";
      readonly name: string;
      readonly attributes: Readonly<Record<string, string>>;
    };

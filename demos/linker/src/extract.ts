import { Readability } from "@mozilla/readability";

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "DL",
  "FIELDSET",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "UL",
]);

const DEFAULT_EXCLUSIONS = [
  "a",
  "button",
  "script",
  "style",
  "textarea",
  "input",
  "select",
  "option",
  "table",
  "sup",
  "[contenteditable]",
  "[hidden]",
  "[aria-hidden='true']",
  "[data-sefaria-linker-owned]",
].join(",");

export interface TextSegment {
  readonly node: Text;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface ArticleSnapshot {
  readonly title: string;
  readonly body: string;
  readonly segments: readonly TextSegment[];
  readonly root: HTMLElement;
}

export const LINKER_MAX_TEXT_NODES = 20_000;
export const LINKER_MAX_UTF16_CODE_UNITS = 250_000;
export const LINKER_MAX_ELEMENTS = 50_000;

export function extractArticleSnapshot(
  document: Document,
  options: {
    readonly contentSelector?: string;
    readonly includeSelectors?: readonly string[];
    readonly excludeSelectors?: readonly string[];
  } = {},
): ArticleSnapshot {
  const liveElements = [...document.querySelectorAll<HTMLElement>("*")];
  if (liveElements.length > LINKER_MAX_ELEMENTS) {
    throw new Error(
      `The page exceeds the ${LINKER_MAX_ELEMENTS.toLocaleString()} element analysis limit.`,
    );
  }
  const clone = document.cloneNode(true) as Document;
  [...clone.querySelectorAll<HTMLElement>("*")].forEach((element, index) => {
    element.dataset.sefariaLinkerSourceIndex = String(index);
  });
  const parsed = new Readability(clone).parse();
  const root = selectContentRoot(
    document,
    liveElements,
    options.contentSelector,
    parsed?.content,
  );
  const roots = [
    root,
    ...(options.includeSelectors ?? [])
      .flatMap((selector) => [
        ...document.querySelectorAll<HTMLElement>(selector),
      ])
      .filter((element) => element !== root && !root.contains(element)),
  ];
  const excluded = new Set<Element>();
  for (const selector of options.excludeSelectors ?? []) {
    for (const element of document.querySelectorAll(selector)) {
      excluded.add(element);
    }
  }

  const text: string[] = [];
  const segments: TextSegment[] = [];
  let offset = 0;
  let previousBlock: Element | null = null;
  for (const contentRoot of roots) {
    const walker = document.createTreeWalker(
      contentRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (
            parent === null ||
            node.nodeValue?.length === 0 ||
            parent.closest(DEFAULT_EXCLUSIONS) !== null ||
            [...excluded].some((element) => element.contains(parent))
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );
    let node = walker.nextNode();
    while (node !== null) {
      const textNode = node as Text;
      const value = textNode.data;
      if (segments.length >= LINKER_MAX_TEXT_NODES) {
        throw new Error(
          `The article exceeds the ${LINKER_MAX_TEXT_NODES.toLocaleString()} text-node scan limit.`,
        );
      }
      const block = nearestBlock(textNode.parentElement, contentRoot);
      if (text.length > 0 && block !== previousBlock) {
        text.push("\n");
        offset += 1;
      }
      segments.push({
        node: textNode,
        text: value,
        start: offset,
        end: offset + value.length,
      });
      text.push(value);
      offset += value.length;
      if (offset > LINKER_MAX_UTF16_CODE_UNITS) {
        throw new Error(
          `The article exceeds the ${LINKER_MAX_UTF16_CODE_UNITS.toLocaleString()} UTF-16 code-unit scan limit.`,
        );
      }
      previousBlock = block;
      node = walker.nextNode();
    }
  }

  return {
    title: parsed?.title?.trim() || document.title.trim(),
    body: text.join(""),
    segments,
    root,
  };
}

export function codePointOffsetToUtf16(text: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError("Citation offsets must be non-negative integers.");
  }
  let codePoints = 0;
  let utf16 = 0;
  while (utf16 < text.length && codePoints < offset) {
    const point = text.codePointAt(utf16);
    if (point === undefined) {
      break;
    }
    utf16 += point > 0xffff ? 2 : 1;
    codePoints += 1;
  }
  if (codePoints !== offset) {
    throw new RangeError("Citation offset exceeds the extracted text.");
  }
  return utf16;
}

export function mapCodePointOffsets(
  text: string,
  offsets: ReadonlySet<number>,
): ReadonlyMap<number, number> {
  const result = new Map<number, number>();
  let codePoints = 0;
  let utf16 = 0;
  if (offsets.has(0)) {
    result.set(0, 0);
  }
  while (utf16 < text.length && result.size < offsets.size) {
    const point = text.codePointAt(utf16);
    if (point === undefined) {
      break;
    }
    utf16 += point > 0xffff ? 2 : 1;
    codePoints += 1;
    if (offsets.has(codePoints)) {
      result.set(codePoints, utf16);
    }
  }
  return result;
}

function selectContentRoot(
  document: Document,
  liveElements: readonly HTMLElement[],
  selector: string | undefined,
  readableContent: string | null | undefined,
): HTMLElement {
  if (selector !== undefined) {
    const selected = document.querySelector<HTMLElement>(selector);
    if (selected === null) {
      throw new Error(`No linker content matched selector: ${selector}`);
    }
    return selected;
  }
  if (readableContent != null) {
    const template = document.createElement("template");
    template.innerHTML = readableContent;
    const markedRoot =
      template.content.querySelector<HTMLElement>(
        "article[data-sefaria-linker-source-index], main[data-sefaria-linker-source-index]",
      ) ??
      template.content.querySelector<HTMLElement>(
        "[data-sefaria-linker-source-index]",
      );
    const index = Number.parseInt(
      markedRoot?.dataset.sefariaLinkerSourceIndex ?? "",
      10,
    );
    const readableRoot = liveElements[index];
    if (Number.isInteger(index) && readableRoot !== undefined) {
      return readableRoot;
    }
  }
  return (
    document.querySelector<HTMLElement>("article") ??
    document.querySelector<HTMLElement>("main") ??
    document.body
  );
}

function nearestBlock(element: HTMLElement | null, root: HTMLElement): Element {
  let current: HTMLElement | null = element;
  while (current !== null && current !== root) {
    if (BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }
  return root;
}

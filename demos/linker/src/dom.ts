import {
  mapCodePointOffsets,
  type ArticleSnapshot,
  type TextSegment,
} from "./extract.js";
import type { CitationTarget } from "./types.js";

const OWNED_ATTRIBUTE = "data-sefaria-linker-owned";
const SEFARIA_ORIGIN = "https://www.sefaria.org";

export interface WrappedCitation {
  readonly elements: readonly HTMLAnchorElement[];
  readonly target: CitationTarget;
}

interface DetectedMatch {
  readonly startChar: number;
  readonly endChar: number;
  readonly text: string;
  readonly linkFailed: boolean;
  readonly refs: readonly string[] | null;
}

interface DetectedReferenceData {
  readonly url: string;
}

export function wrapDetectedReferences(
  snapshot: ArticleSnapshot,
  matches: readonly DetectedMatch[],
  refData: Readonly<Record<string, DetectedReferenceData>>,
): {
  readonly citations: readonly WrappedCitation[];
  readonly skipped: number;
} {
  if (
    snapshot.segments.some(
      (segment) =>
        !segment.node.isConnected || segment.node.data !== segment.text,
    )
  ) {
    return { citations: [], skipped: matches.length };
  }
  const candidates = matches.filter(
    (match) =>
      !match.linkFailed &&
      match.refs !== null &&
      match.refs.length === 1 &&
      match.startChar >= 0 &&
      match.endChar > match.startChar,
  );
  const offsets = new Set(
    candidates.flatMap((match) => [match.startChar, match.endChar]),
  );
  const mappedOffsets = mapCodePointOffsets(snapshot.body, offsets);
  const accepted = candidates
    .flatMap((match) => {
      const start = mappedOffsets.get(match.startChar);
      const end = mappedOffsets.get(match.endChar);
      return start === undefined || end === undefined
        ? []
        : [{ match, start, end }];
    })
    .sort((left, right) => right.start - left.start);

  const citations: WrappedCitation[] = [];
  let skipped = matches.length - accepted.length;
  let nextStart = Number.POSITIVE_INFINITY;
  for (const item of accepted) {
    if (item.end > nextStart) {
      skipped += 1;
      continue;
    }
    const tref = item.match.refs?.[0];
    const metadata =
      tref !== undefined && Object.hasOwn(refData, tref)
        ? refData[tref]
        : undefined;
    if (
      tref === undefined ||
      metadata === undefined ||
      typeof metadata.url !== "string"
    ) {
      skipped += 1;
      continue;
    }
    const url = resolveCitationUrl(metadata.url);
    if (url === undefined) {
      skipped += 1;
      continue;
    }
    const mappedEnd = resolveMappedEnd(
      snapshot.body,
      item.start,
      item.end,
      item.match.text,
    );
    if (mappedEnd === undefined) {
      skipped += 1;
      continue;
    }
    const elements = wrapRange(snapshot.segments, item.start, mappedEnd, {
      tref,
      url,
    });
    if (elements.length === 0) {
      skipped += 1;
      continue;
    }
    const firstElement = elements[0];
    if (firstElement === undefined) {
      skipped += 1;
      continue;
    }
    citations.push({ elements, target: { tref, url: firstElement.href } });
    nextStart = item.start;
  }
  return { citations: citations.reverse(), skipped };
}

function resolveCitationUrl(value: string): string | undefined {
  try {
    const url = new URL(value, `${SEFARIA_ORIGIN}/`);
    return url.protocol === "https:" && url.origin === SEFARIA_ORIGIN
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function removeOwnedLinks(root: ParentNode = document): void {
  for (const link of root.querySelectorAll<HTMLAnchorElement>(
    `a[${OWNED_ATTRIBUTE}]`,
  )) {
    link.replaceWith(...link.childNodes);
  }
}

function resolveMappedEnd(
  body: string,
  start: number,
  end: number,
  prettyText: string,
): number | undefined {
  if (body.slice(start, end) === prettyText) {
    return end;
  }
  return body.startsWith(prettyText, start)
    ? start + prettyText.length
    : undefined;
}

function wrapRange(
  segments: readonly TextSegment[],
  start: number,
  end: number,
  target: CitationTarget,
): HTMLAnchorElement[] {
  const affected = segments.filter(
    (segment) =>
      segment.node.isConnected && segment.end > start && segment.start < end,
  );
  if (affected.length === 0) {
    return [];
  }
  const links: HTMLAnchorElement[] = [];
  for (const segment of [...affected].reverse()) {
    const localStart = Math.max(0, start - segment.start);
    const localEnd = Math.min(segment.node.length, end - segment.start);
    if (localEnd <= localStart) {
      continue;
    }
    const range = document.createRange();
    range.setStart(segment.node, localStart);
    range.setEnd(segment.node, localEnd);
    const link = document.createElement("a");
    link.href = target.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.sefariaLinkerOwned = "";
    link.dataset.sefariaRef = target.tref;
    link.setAttribute("aria-controls", "sefaria-linker-popup");
    link.setAttribute("aria-haspopup", "dialog");
    link.style.textDecoration = "underline dotted";
    link.style.textUnderlineOffset = "0.15em";
    link.style.cursor = "pointer";
    range.surroundContents(link);
    links.push(link);
  }
  return links.reverse();
}

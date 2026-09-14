import { access, readFile } from "node:fs/promises";
import path from "node:path";

export async function validateMarkdownLinks(root, filenames) {
  const issues = [];
  for (const filename of filenames) {
    const source = await readFile(path.join(root, filename), "utf8");
    const markdown = stripFencedCode(source);
    const hrefs = [
      ...[
        ...markdown.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu),
      ].map((match) => match[1]),
      ...[...markdown.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gmu)].map(
        (match) => match[1],
      ),
      ...[...markdown.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/giu)].map(
        (match) => match[1],
      ),
    ];
    for (const href of hrefs) {
      if (
        href.startsWith("http:") ||
        href.startsWith("https:") ||
        href.startsWith("mailto:")
      ) {
        continue;
      }
      const [pathAndQuery, rawHash] = href.split("#", 2);
      const rawPath = pathAndQuery.split("?", 1)[0];
      const decodedPath = decodeURIComponent(rawPath);
      const destination =
        decodedPath === ""
          ? path.join(root, filename)
          : decodedPath.startsWith("/")
            ? path.join(root, decodedPath.slice(1))
            : path.resolve(
                path.dirname(path.join(root, filename)),
                decodedPath,
              );
      try {
        await access(destination);
      } catch {
        issues.push(`${filename}: missing target ${href}`);
        continue;
      }
      if (!rawHash || path.extname(destination).toLowerCase() !== ".md") {
        continue;
      }
      const destinationSource = await readFile(destination, "utf8");
      const anchors = markdownAnchors(destinationSource);
      const anchor = decodeURIComponent(rawHash).toLowerCase();
      if (!anchors.has(anchor)) {
        issues.push(`${filename}: missing anchor ${href}`);
      }
    }
  }
  return issues;
}

export function markdownAnchors(source) {
  const anchors = new Set();
  const counts = new Map();
  for (const match of stripFencedCode(source).matchAll(/^#{1,6}\s+(.+)$/gmu)) {
    const base = match[1]
      .replace(/\s+#+\s*$/u, "")
      .trim()
      .toLowerCase()
      .replace(/<[^>]*>/gu, "")
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
      .replace(/\s+/gu, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function stripFencedCode(source) {
  return source.replace(/```[\s\S]*?```/gu, "");
}

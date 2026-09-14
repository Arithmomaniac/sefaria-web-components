import { URL } from "node:url";

export function classifySiteRequest({ method, requestUrl, siteOrigin }) {
  const url = new URL(requestUrl);
  if (url.origin === siteOrigin || url.protocol === "data:") {
    return "local";
  }
  if (method !== "GET" || url.origin !== "https://www.sefaria.org") {
    return "deny";
  }
  const reference = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
  if (
    url.pathname.startsWith("/api/v3/texts/") &&
    [
      "Micah 6",
      "Micah 6:8",
      "Rashi on Micah 6:8",
      "Rashi on Micah 6:8:1",
    ].includes(reference) &&
    queryEquals(url, [
      ["return_format", "default"],
      ["version", "primary"],
      ["version", "translation"],
    ])
  ) {
    return "text-fixture";
  }
  if (
    url.pathname.startsWith("/api/links/") &&
    ["Micah 6:8", "Rashi on Micah 6:8:1"].includes(reference) &&
    queryEquals(url, [
      ["with_sheet_links", "0"],
      ["with_text", "1"],
    ])
  ) {
    return "links-fixture";
  }
  return "deny";
}

function queryEquals(url, expected) {
  const compare = ([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue);
  const actual = [...url.searchParams.entries()].sort(compare);
  return JSON.stringify(actual) === JSON.stringify([...expected].sort(compare));
}

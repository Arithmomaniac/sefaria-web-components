import { URL } from "node:url";

export function classifySiteRequest({ method, requestUrl, siteOrigin }) {
  const url = new URL(requestUrl);
  if (url.origin === siteOrigin || url.protocol === "data:") {
    return "local";
  }
  if (
    method === "GET" &&
    url.origin === "https://www.sefaria.org" &&
    url.pathname === "/api/v3/texts/Micah%206%3A8"
  ) {
    const query = [...url.searchParams.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .sort();
    if (
      JSON.stringify(query) ===
      JSON.stringify([
        "return_format=default",
        "version=primary",
        "version=translation",
      ])
    ) {
      return "fixture";
    }
  }
  return "deny";
}

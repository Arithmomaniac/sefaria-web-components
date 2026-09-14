const expectedQuery = [
  ["version", "primary"],
  ["version", "translation"],
  ["return_format", "default"],
] as const;

export function createLinkedArticleFixtureFetch(
  payload: unknown,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const query = [...url.searchParams.entries()];
    if (
      request.method !== "GET" ||
      url.origin !== "https://example.invalid" ||
      decodeURIComponent(url.pathname) !== "/api/v3/texts/Micah 6:8" ||
      JSON.stringify(query) !== JSON.stringify(expectedQuery)
    ) {
      throw new Error(
        `Unexpected linked-article request: ${request.method} ${url}`,
      );
    }
    return Response.json(payload);
  };
}

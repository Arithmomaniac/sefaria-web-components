import {
  createClient,
  type Client,
  type Config,
} from "./generated/client/index.js";

import { validateResponse } from "./validation.js";

export interface SefariaClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export type SefariaClient = Client;

export function createSefariaClient(
  options: SefariaClientOptions = {},
): SefariaClient {
  const config: Config = {
    baseUrl: options.baseUrl ?? "https://www.sefaria.org",
  };
  if (options.fetch !== undefined) {
    config.fetch = options.fetch;
  }

  const client = createClient(config);
  client.interceptors.response.use(
    async (response, request, requestOptions) => {
      await validateResponse({
        method: request.method,
        path: requestOptions.url,
        response,
      });
      return response;
    },
  );
  client.interceptors.error.use((error, response) => {
    if (error instanceof Error || response === undefined) {
      throw error;
    }
    return error;
  });
  return client;
}

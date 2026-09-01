import {
  createClient,
  type Config,
  type RequestOptions,
  type RequestResult,
} from "@hey-api/client-fetch";

import { validateResponse } from "./validation.js";

export interface SefariaClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

const sefariaClientBrand: unique symbol = Symbol("SefariaClient");
const sefariaClients = new WeakSet<object>();

type SefariaGetOptions<ThrowOnError extends boolean> = Omit<
  RequestOptions<"fields", ThrowOnError>,
  "method" | "responseStyle"
> & {
  readonly responseStyle?: "fields";
};

export interface SefariaClient {
  readonly [sefariaClientBrand]: true;
  readonly get: <
    TData = unknown,
    TError = unknown,
    ThrowOnError extends boolean = false,
  >(
    options: SefariaGetOptions<ThrowOnError>,
  ) => RequestResult<TData, TError, ThrowOnError, "fields">;
}

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
  const facade: SefariaClient = {
    [sefariaClientBrand]: true,
    get: client.get,
  };
  sefariaClients.add(facade);
  return Object.freeze(facade);
}

export function requireSefariaClient(client: SefariaClient): SefariaClient {
  if (!sefariaClients.has(client)) {
    throw new TypeError(
      "Generated Sefaria SDK functions require createSefariaClient().",
    );
  }
  return client;
}

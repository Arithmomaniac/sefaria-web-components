import {
  createClient,
  type Config,
  type RequestOptions,
  type RequestResult,
} from "@hey-api/client-fetch";

import { validateResponse } from "./validation.js";

/** Configuration used to create an isolated Sefaria API client. */
export interface SefariaClientOptions {
  /** API origin. Defaults to `https://www.sefaria.org`. */
  readonly baseUrl?: string;
  /** Fetch implementation used for requests, testing, or host integration. */
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

/** Branded client accepted by the generated Sefaria SDK operations. */
export interface SefariaClient {
  /** Compile-time brand preventing accidental structural substitutes. */
  readonly [sefariaClientBrand]: true;
  /** Performs a validated GET request using fields-style responses. */
  readonly get: <
    TData = unknown,
    TError = unknown,
    ThrowOnError extends boolean = false,
  >(
    options: SefariaGetOptions<ThrowOnError>,
  ) => RequestResult<TData, TError, ThrowOnError, "fields">;
}

/** Creates a frozen generated-SDK client with status-aware response validation. */
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

/** Rejects clients that were not created by {@link createSefariaClient}. */
export function requireSefariaClient(client: SefariaClient): SefariaClient {
  if (!sefariaClients.has(client)) {
    throw new TypeError(
      "Generated Sefaria SDK functions require createSefariaClient().",
    );
  }
  return client;
}

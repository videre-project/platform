/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { All } from '@videre-api/validation';

import type Env from "@bot/env";


/**
 * Constructs a new URL query string from any number of query objects.
 */
export class Query extends URLSearchParams {
  /**
   * Constructs a new URL query string.
   * @param queries - The objects containing the query parameters.
   */
  constructor(private url: string, ...queries: Record<string, any>[]) {
    super();
    for (const [key, value] of Object.entries(All(...queries))) {
      if (value === undefined || value === null) continue;
      this.set(key, value.toString());
    }
  }
  add(key: string, value: any): this {
    super.append(key, value.toString());
    return this;
  }
  toString(): string {
    return this.url + '?' + super.toString();
  }
}

/**
 * Represents a query-like value for an endpoint.
 */
export type QueryLike = string | Query;

/**
 * Represents the API response with a generic data type.
 * @template T - The type of the data in the API response.
 */
export type APIResponse<T extends any[]> = {
  parameters: { [key: string]: any },
  data: T
};

/**
 * Represents an endpoint for making requests.
 */
export class Endpoint extends Request {
  /**
   * Constructs a new endpoint.
   * @param base - The base URL of the endpoint.
   * @param query - The query parameters for the endpoint.
   */
  constructor(base: string, query: QueryLike) {
    super(`${base}${query.toString()}`);
  }
}

/**
 * Sets the service worker bindings.
 * @param env The worker's environment variables.
 */
export const setBindings = (env: Env) => {
  Bindings.API ??= async (query) =>
    await env.VIDERE_API?.fetch(new Endpoint('https://api.videreproject.com', query));
}

const Bindings = {
  API: null!
} as {
  /**
   * The request context for the Videre API.
   */
  API: (query: QueryLike) => Promise<Response>;
};

export default Bindings;

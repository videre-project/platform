/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type Env from './env';
import type { Context } from "./handler";


/**
 * The default cache policy used by the Cloudflare CDN.
 * - Browser cache: 1 hour
 * - CDN cache: 30 minutes
 */
export const CACHE_POLICY = `max-age=3600, s-maxage=1800`;

/**
 * Default cache namespace. Override CACHE_VERSION when deploying API behavior
 * or backing data changes that should not share cached responses.
 */
export const DEFAULT_CACHE_VERSION = '1';

export const QUERY_MEDIA_TYPE = 'application/json';

export class CacheHandler {
  private readonly cache: Cache;
  private readonly key: RequestInfo;

  constructor(cache: Cache, key: RequestInfo) {
    this.cache = cache;
    this.key = key;
  }

  public async delete(options?: CacheQueryOptions): Promise<boolean> {
    return this.cache.delete(this.key, options);
  }

  public async match(options?: CacheQueryOptions): Promise<Response | undefined> {
    return this.cache.match(this.key, options);
  }

  public async put(response: Response): Promise<void> {
    return this.cache.put(this.key, response);
  }
}

export interface BodyCacheOptions {
  namespace: string;
  body: unknown;
  policy?: string;
}

export const useCache = async (req: Request, ctx: Context, env: Env) => {
  const cache = new CacheHandler(caches.default, createCacheKey(req, env));
  const res = await cache.match();
  if (res) return res;

  ctx.cache = cache;
}

/**
 * Prepare a shared cache entry for a body-bearing POST or QUERY request.
 *
 * Cloudflare's Cache API only accepts GET keys for cache.put(), so the request
 * body is represented by a hash in an internal synthetic GET key. The caller
 * supplies already-validated endpoint parameters so semantically equivalent
 * requests can share an entry without exposing their bodies in the URL.
 */
export const prepareBodyCache = async (
  req: Request,
  ctx: Context,
  env: Env,
  options: BodyCacheOptions,
  cacheStore: Cache = caches.default,
) => {
  if (req.method !== 'POST' && req.method !== 'QUERY') return;

  const cache = new CacheHandler(
    cacheStore,
    await createBodyCacheKey(req, env, options.namespace, options.body),
  );
  const res = await cache.match();
  if (res) return res;

  ctx.cache = cache;
  ctx.cachePolicy = options.policy || CACHE_POLICY;
}

const createCacheKey = (req: Request, env: Env): Request => {
  const url = new URL(req.url);
  url.searchParams.set('__cache_version', String(env.CACHE_VERSION || DEFAULT_CACHE_VERSION));
  return new Request(url.toString(), req);
}

export const createBodyCacheKey = async (
  req: Request,
  env: Env,
  namespace: string,
  body: unknown,
): Promise<Request> => {
  const url = new URL(req.url);
  const query = [...url.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  const canonical = canonicalize({
    body,
    contentType: req.headers.get('content-type') || QUERY_MEDIA_TYPE,
    namespace,
    query,
    version: String(env.CACHE_VERSION || DEFAULT_CACHE_VERSION),
  });
  const hash = await sha256(JSON.stringify(canonical));

  const key = new URL(url.origin + url.pathname);
  key.searchParams.set('__cache_version', String(env.CACHE_VERSION || DEFAULT_CACHE_VERSION));
  key.searchParams.set('__query_namespace', namespace);
  key.searchParams.set('__query_hash', hash);

  return new Request(key.toString(), { method: 'GET' });
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const values = value.map(canonicalize);
    return values.every((item) => typeof item === 'number')
      ? [...new Set(values)].sort((left, right) => Number(left) - Number(right))
      : values;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }

  return value;
}

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export const updateCache = (res: Response, { cf, cache, cachePolicy }: Context) => {
  if (res.status >= 400) return res;

  const responsePolicy = res.headers.get('Cache-Control');
  if (responsePolicy && /(?:^|[,\s])(?:private|no-store)(?:$|[,\s])/i.test(responsePolicy)) {
    return res;
  }

  if (cache && res.headers.get('CF-Cache-Status') !== 'HIT') {
    if (!responsePolicy) {
      res.headers.set('Cache-Control', cachePolicy || CACHE_POLICY);
    }
    cf.waitUntil(cache.put(res.clone()));
  }

  return res;
}

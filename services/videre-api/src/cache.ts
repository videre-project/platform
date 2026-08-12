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

export class CacheHandler {
  constructor(private cache: Cache, private key: RequestInfo) {}

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

export const useCache = async (req: Request, ctx: Context, env: Env) => {
  const cache = new CacheHandler(caches.default, createCacheKey(req, env));
  const res = await cache.match();
  if (res) return res;

  ctx.cache = cache;
}

const createCacheKey = (req: Request, env: Env): Request => {
  const url = new URL(req.url);
  url.searchParams.set('__cache_version', String(env.CACHE_VERSION || DEFAULT_CACHE_VERSION));
  return new Request(url.toString(), req);
}

export const updateCache = (res: Response, { cf, cache }: Context) => {
  if (res.status >= 400) return res;

  if (cache && res.headers.get('CF-Cache-Status') !== 'HIT') {
    res.headers.set('Cache-Control', CACHE_POLICY);
    cf.waitUntil(cache.put(res.clone()));
  }

  return res;
}

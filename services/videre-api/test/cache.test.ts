/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Context } from '../src/handler.ts';
import {
  createBodyCacheKey,
  updateCache,
  prepareBodyCache,
} from '../src/cache.ts';


class MemoryCache {
  readonly entries = new Map<string, Response>();
  readonly puts: Request[] = [];

  async match(request: Request): Promise<Response | undefined> {
    return this.entries.get(request.url)?.clone();
  }

  async put(request: Request, response: Response): Promise<void> {
    assert.equal(request.method, 'GET');
    this.puts.push(request);
    this.entries.set(request.url, response.clone());
  }

  async delete(request: Request): Promise<boolean> {
    return this.entries.delete(request.url);
  }
}

const env = { CACHE_VERSION: 'test' } as any;

const context = (): Context => ({
  cf: { waitUntil: (promise: Promise<unknown>) => promise } as any,
  params: {},
  sql: undefined as any,
});

const request = (method: string, url = 'https://api.videreproject.com/prices') =>
  new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
  });

test('POST and QUERY requests share a canonical body cache entry', async () => {
  const cache = new MemoryCache();
  const postContext = context();

  assert.equal(await prepareBodyCache(
    request('POST'),
    postContext,
    env,
    { namespace: 'prices-batch', body: { ids: [2, 1, 2], date: 'latest' } },
    cache as unknown as Cache,
  ), undefined);

  await postContext.cache!.put(new Response('{"ok":true}'));

  const queryContext = context();
  const cached = await prepareBodyCache(
    request('QUERY'),
    queryContext,
    env,
    { namespace: 'prices-batch', body: { date: 'latest', ids: [1, 2] } },
    cache as unknown as Cache,
  );

  assert.equal(await cached?.text(), '{"ok":true}');
  assert.equal(queryContext.cache, undefined);
  assert.equal(cache.puts.length, 1);
});

test('body cache keys include route, query parameters, content type, and version', async () => {
  const base = await createBodyCacheKey(
    request('POST', 'https://api.videreproject.com/cards/search?limit=10'),
    env,
    'cards-search',
    { collection: { ids: [2, 1] } },
  );
  const reordered = await createBodyCacheKey(
    request('QUERY', 'https://api.videreproject.com/cards/search?limit=10'),
    env,
    'cards-search',
    { collection: { ids: [1, 2, 2] } },
  );
  const differentQuery = await createBodyCacheKey(
    request('QUERY', 'https://api.videreproject.com/cards/search?limit=20'),
    env,
    'cards-search',
    { collection: { ids: [1, 2] } },
  );
  const differentContentType = await createBodyCacheKey(
    new Request('https://api.videreproject.com/cards/search?limit=10', {
      method: 'QUERY',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
    env,
    'cards-search',
    { collection: { ids: [1, 2] } },
  );
  const differentVersion = await createBodyCacheKey(
    request('QUERY', 'https://api.videreproject.com/cards/search?limit=10'),
    { CACHE_VERSION: 'next' } as any,
    'cards-search',
    { collection: { ids: [1, 2] } },
  );

  assert.equal(base.method, 'GET');
  assert.equal(base.url, reordered.url);
  assert.notEqual(base.url, differentQuery.url);
  assert.notEqual(base.url, differentContentType.url);
  assert.notEqual(base.url, differentVersion.url);
  assert.match(base.url, /__query_hash=/);
  assert.doesNotMatch(base.url, /"ids"/);
});

test('cache hits bypass the downstream handler', async () => {
  const cache = new MemoryCache();
  let handlerCalls = 0;

  const run = async (method: string) => {
    const ctx = context();
  const cached = await prepareBodyCache(
      request(method),
      ctx,
      env,
      { namespace: 'cards-search', body: { collection: { ids: [605] } } },
      cache as unknown as Cache,
    );
    if (cached) return cached;

    handlerCalls += 1;
    const response = new Response('{"data":[]}');
    await ctx.cache!.put(response.clone());
    return response;
  };

  await run('POST');
  await run('QUERY');

  assert.equal(handlerCalls, 1);
});

test('private and no-store responses are not cached', async () => {
  const cache = new MemoryCache();
  const ctx = context();
  await prepareBodyCache(
    request('QUERY'),
    ctx,
    env,
    { namespace: 'prices-batch', body: { ids: [1] } },
    cache as unknown as Cache,
  );

  const response = new Response('{}', {
    headers: { 'Cache-Control': 'private, no-store' },
  });
  updateCache(response, ctx);

  assert.equal(cache.puts.length, 0);
});

test('error responses are not cached and route cache headers are preserved', async () => {
  const cache = new MemoryCache();
  const ctx = context();
  await prepareBodyCache(
    request('QUERY'),
    ctx,
    env,
    { namespace: 'prices-batch', body: { ids: [1] }, policy: 'public, max-age=60' },
    cache as unknown as Cache,
  );

  const error = new Response('{}', { status: 500 });
  updateCache(error, ctx);
  assert.equal(cache.puts.length, 0);

  const response = new Response('{}', {
    headers: { 'Cache-Control': 'public, max-age=123, s-maxage=456' },
  });
  updateCache(response, ctx);

  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=123, s-maxage=456');
  assert.equal(cache.puts.length, 1);
});

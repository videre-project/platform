/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict';
import test from 'node:test';

import { applyPublicApiCors, publicApiPreflight } from '../src/apiPolicy.ts';

const request = (method = 'GET') => new Request('https://api.videreproject.com/cards/named', {
  method,
  headers: {
    Origin: 'http://localhost:3000',
    ...(method === 'OPTIONS' ? {
      'Access-Control-Request-Method': method === 'OPTIONS' ? 'QUERY' : 'GET',
      'Access-Control-Request-Headers': 'content-type',
    } : {}),
  },
});

test('adds public CORS headers to catalog responses', () => {
  const response = applyPublicApiCors(new Response('{}'), request());

  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('answers catalog CORS preflight requests', () => {
  const response = publicApiPreflight(request('OPTIONS'));

  assert.equal(response?.status, 204);
  assert.equal(response?.headers.get('access-control-allow-origin'), '*');
  assert.match(response?.headers.get('access-control-allow-methods') || '', /QUERY/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import type Env from '../src/env.ts';
import { SUPPORTED_FORMATS } from '../src/formats.ts';
import handler from '../src/handler.ts';

const ORIGIN = 'https://ml.videreproject.com';

function testEnv(requests: Request[]): Env {
  const service = {
    async fetch(request: Request): Promise<Response> {
      requests.push(request);
      return Response.json({
        endpoint: new URL(request.url).pathname,
        format: request.headers.get('x-manafold-format'),
      });
    },
  };
  return Object.fromEntries(SUPPORTED_FORMATS.map((format) => [
    `MANAFOLD_${format.toUpperCase()}`,
    service,
  ])) as Env;
}

test('describes the Manafold service and its available formats', async () => {
  const requests: Request[] = [];
  const response = await handler(
    new Request(`${ORIGIN}/manafold`),
    testEnv(requests),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    object: 'service',
    service: 'manafold',
    formats: SUPPORTED_FORMATS,
    inference: {
      method: 'POST',
      endpoint: '/manafold/{format}',
    },
  });
  assert.equal(requests.length, 0);
});

test('forwards inference requests to the selected format worker', async () => {
  const requests: Request[] = [];
  const body = JSON.stringify([{ name: 'Amped Raptor', quantity: 4 }]);
  const response = await handler(
    new Request(`${ORIGIN}/manafold/modern?top=3`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }),
    testEnv(requests),
  );

  assert.equal(response.status, 200);
  assert.equal(requests.length, 1);
  const forwarded = requests[0];
  const forwardedUrl = new URL(forwarded.url);
  assert.equal(forwarded.method, 'POST');
  assert.equal(forwardedUrl.hostname, 'manafold.internal');
  assert.equal(forwardedUrl.pathname, '/predict');
  assert.equal(forwardedUrl.searchParams.get('top'), '3');
  assert.equal(forwardedUrl.searchParams.get('format'), 'modern');
  assert.equal(forwarded.headers.get('content-type'), 'application/json');
  assert.equal(forwarded.headers.get('x-manafold-format'), 'modern');
  assert.equal(await forwarded.text(), body);
  assert.equal(response.headers.get('x-manafold-format'), 'modern');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('accepts format selection through the generic inference endpoint', async () => {
  const requests: Request[] = [];
  const response = await handler(
    new Request(`${ORIGIN}/manafold?format=modern`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '[]',
    }),
    testEnv(requests),
  );

  assert.equal(response.status, 200);
  assert.equal(requests.length, 1);
  assert.equal(new URL(requests[0].url).pathname, '/predict');
});

test('forwards format health checks without a request body', async () => {
  const requests: Request[] = [];
  const response = await handler(
    new Request(`${ORIGIN}/manafold/modern`),
    testEnv(requests),
  );

  assert.equal(response.status, 200);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
  assert.equal(new URL(requests[0].url).pathname, '/health');
  assert.equal(await requests[0].text(), '');
});

test('validates format selection before dispatch', async () => {
  const cases = [
    {
      path: '/manafold',
      status: 400,
      message: `Choose a supported format: ${SUPPORTED_FORMATS.join(', ')}.`,
    },
    {
      path: '/manafold/not-a-format',
      status: 400,
      message: "Unknown Magic format 'not-a-format'.",
    },
    {
      path: '/manafold/modern?format=pioneer',
      status: 400,
      message: "The path format 'modern' does not match 'pioneer'.",
    },
  ];

  for (const { path, status, message } of cases) {
    const requests: Request[] = [];
    const response = await handler(
      new Request(`${ORIGIN}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '[]',
      }),
      testEnv(requests),
    );
    const error = await response.json() as {
      object: string;
      message: string;
    };

    assert.equal(response.status, status, path);
    assert.equal(error.object, 'error', path);
    assert.equal(error.message, message, path);
    assert.equal(requests.length, 0, path);
  }
});

test('requires JSON for inference and rejects unsupported methods', async () => {
  const requests: Request[] = [];
  const env = testEnv(requests);
  const unsupportedMedia = await handler(
    new Request(`${ORIGIN}/manafold/modern`, {
      method: 'POST',
      body: '[]',
    }),
    env,
  );
  const unsupportedMethod = await handler(
    new Request(`${ORIGIN}/manafold/modern`, { method: 'PUT' }),
    env,
  );

  assert.equal(unsupportedMedia.status, 415);
  assert.equal(unsupportedMethod.status, 405);
  assert.equal(requests.length, 0);
});

test('handles CORS preflight without dispatching to a model', async () => {
  const requests: Request[] = [];
  const response = await handler(
    new Request(`${ORIGIN}/manafold/modern`, { method: 'OPTIONS' }),
    testEnv(requests),
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(requests.length, 0);
});

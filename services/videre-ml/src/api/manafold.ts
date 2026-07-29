import type { IRequest } from 'itty-router';

import { Error } from '@videre-api/responses';

import type Env from '../env';
import {
  getModelService,
  isKnownFormat,
  isSupportedFormat,
  KNOWN_FORMATS,
  SUPPORTED_FORMATS,
} from '../formats';
import type { Format, SupportedFormat } from '../formats';

const MAX_PAYLOAD_BYTES = 512 * 1024;

export function describeManafold() {
  return {
    object: 'service',
    service: 'manafold',
    formats: SUPPORTED_FORMATS,
    inference: {
      method: 'POST',
      endpoint: '/manafold/{format}',
    },
  };
}

export function modelHealth(request: IRequest, env: Env): Promise<Response> | Response {
  const selected = selectFormat(request);
  if (selected instanceof Response) {
    return selected;
  }
  if (selected === null) {
    return Error(400, `Choose a supported format: ${SUPPORTED_FORMATS.join(', ')}.`);
  }
  return dispatch(request, env, selected, '/health');
}

export function runInference(request: IRequest, env: Env): Promise<Response> | Response {
  const selected = selectFormat(request);
  if (selected instanceof Response) {
    return selected;
  }
  if (selected === null) {
    return Error(400, `Choose a supported format: ${SUPPORTED_FORMATS.join(', ')}.`);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return Error(415, "Set Content-Type to 'application/json'.");
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return Error(413, 'Payload too large. Request body must be under 512 KB.');
  }

  return dispatch(request, env, selected, '/predict');
}

function selectFormat(request: IRequest): SupportedFormat | Response | null {
  const pathFormat = typeof request.params?.format === 'string'
    ? request.params.format.trim().toLowerCase()
    : null;
  const queryFormat = new URL(request.url).searchParams.get('format')?.trim().toLowerCase()
    || null;

  if (pathFormat && queryFormat && pathFormat !== queryFormat) {
    return Error(
      400,
      `The path format '${pathFormat}' does not match '${queryFormat}'.`,
    );
  }

  const requested = pathFormat || queryFormat;
  if (!requested) {
    return null;
  }
  if (!isKnownFormat(requested)) {
    return Error(
      400,
      `Unknown Magic format '${requested}'.`,
      { formats: KNOWN_FORMATS },
    );
  }
  if (!isSupportedFormat(requested)) {
    return Error(
      404,
      `Manafold does not currently serve '${requested}'.`,
      { formats: SUPPORTED_FORMATS },
    );
  }
  return requested;
}

async function dispatch(
  request: IRequest,
  env: Env,
  format: SupportedFormat,
  endpoint: '/health' | '/predict',
): Promise<Response> {
  const service = getModelService(format, env);
  if (!service) {
    return Error(404, `Manafold does not currently serve '${format}'.`);
  }

  const internalUrl = new URL(request.url);
  internalUrl.hostname = 'manafold.internal';
  internalUrl.pathname = endpoint;
  internalUrl.searchParams.set('format', format);

  const headers = new Headers(request.headers);
  headers.set('host', 'manafold.internal');
  headers.set('x-manafold-format', format);

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_PAYLOAD_BYTES) {
      return Error(413, 'Payload too large. Request body must be under 512 KB.');
    }
  }

  try {
    const response = await service.fetch(new Request(internalUrl, {
      body,
      headers,
      method: request.method,
      redirect: request.redirect,
    }));
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('x-manafold-format', format);
    return new Response(response.body, {
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error(`[videre-ml] ${format} service failed`, error);
    return Error(502, `The '${format}' Manafold model could not be reached.`);
  }
}


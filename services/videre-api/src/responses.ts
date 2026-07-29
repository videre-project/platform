/* @file
 * Copyright (c) 2026, The Videre Project Authors. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
*/

import { clampListLimit, clampOffset } from './queryPolicy';

export interface ErrorResponse {
  object: 'error',
  status: number,
  reason: string,
  message: string,
  body?: any
};

export function Error(status = 500, message: string, body?: any): Response {
  const statusText = ({
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    415: 'Unsupported Media Type',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
  })[status] || 'Unknown Error';

  const error = {
    object: 'error',
    status,
    reason: statusText,
    message,
    body
  } as ErrorResponse;

  return asJSON(error, { status, statusText });
}

export function asJSON(body: any, { headers = {}, ...rest }: ResponseInit = {}) {
  if (body === undefined || body instanceof Response) return body;

  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...rest
  });
}

export interface ListPagination {
  has_more?: boolean,
  next_offset?: number | null
};

export const getListLimit = (params: { [key: string]: any }): number =>
  clampListLimit(params.limit);

export const getListOffset = (params: { [key: string]: any }): number =>
  clampOffset(params.offset);

export const getListPagination = (
  params: { [key: string]: any },
  dataLength: number,
  total: number
): Required<ListPagination> => {
  const limit = getListLimit(params);
  const offset = getListOffset(params);
  const hasMore = offset + dataLength < total;

  return {
    has_more: hasMore,
    next_offset: hasMore ? offset + limit : null,
  };
}

export const getProbePagination = (
  params: { [key: string]: any },
  fetchedLength: number
): Required<ListPagination> => {
  const limit = getListLimit(params);
  const offset = getListOffset(params);
  const hasMore = fetchedLength > limit;

  return {
    has_more: hasMore,
    next_offset: hasMore ? offset + limit : null,
  };
}

export const buildListResponse = (
  params: { [key: string]: any },
  data: any[],
  total: number | null,
  start: number,
  pagination: ListPagination = {}
) => {
  const { host, backend, __empty, ...outputParams } = params;
  const limit = getListLimit(params);
  const offset = getListOffset(params);

  return {
    object: 'list',
    parameters: outputParams,
    meta: {
      database: host,
      backend,
      exec_ms: Number((performance.now() - start).toFixed(3)),
      row_count: data.length,
      total,
      limit,
      offset,
      has_more: pagination.has_more ?? false,
      next_offset: pagination.next_offset ?? null,
    },
    data
  };
}

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { MAX_DB_QUERY_EXECUTION } from '@/handler';
import { Error } from '@/responses';

import type { PendingSql, RowList, Sql } from "./postgres";

export async function Execute(
  query: PendingSql<any[]>,
  parameters: { [key: string]: any } = {}
) {
  const start = performance.now();
  let data: RowList<any[]> = null!;
  try {
    data = await new Promise<typeof data>((resolve, reject) => {
      const timeout = setTimeout(() => {
        query.cancel();
        return reject(Error(500, 'Database query timed out.'))
      }, MAX_DB_QUERY_EXECUTION);

      query
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  } catch (err: any) {
    console.error('[Execute] Fatal error:', err);

    // Workers can stringify opaque thrown values poorly, so copy what we can
    // before returning a sanitized API error.
    const errorDetail: any = {};
    if (err instanceof globalThis.Error) {
      errorDetail.message = (err as any).message;
      errorDetail.name = (err as any).name;
      errorDetail.stack = (err as any).stack;
    }

    for (const key in err) {
      try {
        errorDetail[key] = (err as any)[key];
      } catch (_error) {
        errorDetail[key] = "[Unserializable]";
      }
    }

    console.error('[Execute] Serialized error:', JSON.stringify(errorDetail));

    return Error(500, 'Encountered a fatal error while executing the query.');
  }

  const { host, backend, ...params } = parameters;
  const output = {
    parameters: params,
    meta: {
      database: host,
      backend: backend,
      exec_ms: Number((performance.now() - start).toFixed(3)),
      row_count: data?.length || 0,
    },
    data
  };

  if (!data?.length)
    return Error(400, 'No results found.', output);

  return output;
}

export async function Analyze(sql: Sql, query: PendingSql<any>): Promise<any> {
  return await sql`
    EXPLAIN (
      ANALYZE,
      COSTS OFF,
      TIMING OFF,
      FORMAT JSON
    ) ${query}
  `;
}

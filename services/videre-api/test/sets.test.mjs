/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict';
import test from 'node:test';

import postgres from 'postgres';

import { buildSetsQuery } from '../src/db/queries/sets/buildSetsQuery.ts';

const sql = postgres({
  host: process.env.PGHOST ?? '127.0.0.1',
  port: Number(process.env.PGPORT ?? 6432),
  database: process.env.PGDATABASE ?? 'mtgo',
  username: process.env.PGUSER ?? 'public_api',
  password: process.env.PGPASSWORD || undefined,
  ssl: process.env.PGSSL === 'true' ? 'require' : false,
  transform: {
    undefined: null,
  },
});

test.after(async () => {
  await sql.end({ timeout: 5 });
});

const apiSets = ({
  q = null,
  code = null,
  name = null,
  type = null,
  order = null,
  dir = null,
  limit = 25,
  offset = 0,
} = {}) => {
  const query = buildSetsQuery({
    q,
    code,
    name,
    type,
    order,
    dir,
    limit,
    offset,
  });

  return sql.unsafe(query.text, [...query.values]);
};

test('set lookup by code returns counts and release metadata', async () => {
  const [set] = await apiSets({ code: 'SOS', limit: 1 });

  assert.ok(set);
  assert.equal(set.code, 'SOS');
  assert.ok(Number(set.card_count) > 0);
  assert.ok('release_date' in set);
  assert.ok('product_count' in set);
});

test('set text search finds sets by name', async () => {
  const rows = await apiSets({ q: 'Strixhaven', limit: 10 });

  assert.ok(rows.length > 0);
  assert.ok(rows.some((row) => row.code === 'SOS' || /strixhaven/i.test(row.name ?? '')));
});

test('set type filters are exact and case-insensitive', async () => {
  const [candidate] = await sql`
    SELECT set_type
    FROM sets
    WHERE set_type IS NOT NULL
    GROUP BY set_type
    ORDER BY count(*) DESC
    LIMIT 1
  `;

  assert.ok(candidate);

  const rows = await apiSets({ type: String(candidate.set_type).toLowerCase(), limit: 25 });
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.set_type === candidate.set_type));
});

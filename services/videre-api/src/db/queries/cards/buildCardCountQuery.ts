/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  and,
  compile,
  optional,
  raw,
  sql,
  type CompiledSql,
  type SqlFragment
} from '@videreproject/sql-builder';
import { table } from '@videreproject/sql-schema';
import { collectionCtes } from './collection.ts';
import { normalizeUniqueMode } from './modes.ts';
import {
  cardPredicates,
  hasLegalityFilter,
  legalityPredicate,
  tokenPredicate,
  usesSimpleCountPath
} from './predicates.ts';
import type { CardQueryParams, UniqueMode } from './types.ts';

const cards = table('cards', 'c');
const cardLegalities = table('card_legalities', 'cl');
const oracleCards = table('oracle_cards', 'oc');
const sets = table('sets', 's');

export const buildCardCountQuery = (params: CardQueryParams): CompiledSql => {
  const countParams = params.collection?.mode === 'rank'
    ? { ...params, collection: null }
    : params;
  const uniqueMode = normalizeUniqueMode(countParams.unique);
  if (usesSimpleCountPath(countParams)) {
    return compile(simpleCardCountQuery(countParams, uniqueMode));
  }

  const countExpression = uniqueMode === 'cards'
    ? sql`count(DISTINCT ${cards.column('oracle_id')})::bigint`
    : raw('count(*)::bigint');

  return compile(sql`
    WITH
    ${collectionCtes(countParams)}
    card_count AS (
      SELECT ${countExpression} AS count
      FROM ${cards.source}
      LEFT JOIN ${sets.source} ON ${sets.column('code')} = ${cards.column('set_code')}
      WHERE ${cardPredicates(countParams)}
    )
    SELECT count
    FROM card_count
  `);
};

function simpleCardCountQuery(params: CardQueryParams, uniqueMode: UniqueMode): SqlFragment {
  if (uniqueMode === 'cards') {
    if (hasLegalityFilter(params)) {
      return sql`
        SELECT count(DISTINCT ${cardLegalities.column('oracle_id')})::bigint AS count
        FROM ${cardLegalities.source}
        INNER JOIN ${oracleCards.source}
          ON ${oracleCards.column('id')} = ${cardLegalities.column('oracle_id')}
        WHERE ${and([
          optional(
            params.format,
            sql`${cardLegalities.column('format_code')} = lower(${params.format ?? null})`
          ),
          optional(
            params.legality,
            sql`${cardLegalities.column('status')} = lower(${params.legality ?? null})`
          ),
          tokenPredicate(oracleCards.alias, params),
        ])}
      `;
    }

    return sql`
      SELECT count(*)::bigint AS count
      FROM ${oracleCards.source}
      WHERE ${tokenPredicate(oracleCards.alias, params)}
    `;
  }

  return sql`
    SELECT count(*)::bigint AS count
    FROM ${cards.source}
    WHERE ${and([
      tokenPredicate(cards.alias, params),
      legalityPredicate(params.format, params.legality, cards.alias),
    ])}
  `;
}

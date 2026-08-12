/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  ident,
  raw,
  sql,
  type SqlFragment
} from '@videreproject/sql-builder';

import type { CardCollectionFilter, CardQueryParams } from './types.ts';

const collectionCardsAlias = 'collection_cards';
const collectionMatchesAlias = 'collection_matches';

type CardQueryParamsWithCollection = CardQueryParams & {
  readonly collection: CardCollectionFilter,
};

export function hasCollection(params: CardQueryParams): params is CardQueryParamsWithCollection {
  return params.collection !== undefined && params.collection !== null;
}

export function hasCollectionRank(params: CardQueryParams): boolean {
  return params.collection?.mode === 'rank';
}

export function collectionCtes(params: CardQueryParams): SqlFragment {
  if (!hasCollection(params)) {
    return raw('');
  }

  const collection = params.collection as CardCollectionFilter;
  const matchQuery = collection.match === 'oracle'
    ? sql`
      SELECT DISTINCT matched_cards.id AS card_id
      FROM ${ident(collectionCardsAlias)} collection_cards
      INNER JOIN cards owned_cards
        ON owned_cards.id = collection_cards.card_id
      INNER JOIN cards matched_cards
        ON matched_cards.oracle_id = owned_cards.oracle_id
    `
    : sql`
      SELECT DISTINCT owned_cards.id AS card_id
      FROM ${ident(collectionCardsAlias)} collection_cards
      INNER JOIN cards owned_cards
        ON owned_cards.id = collection_cards.card_id
    `;

  return sql`
    ${ident(collectionCardsAlias)} AS MATERIALIZED (
      SELECT DISTINCT value::int AS card_id
      FROM jsonb_array_elements_text((${JSON.stringify(collection.ids)})::text::jsonb) ids(value)
    ),
    ${ident(collectionMatchesAlias)} AS MATERIALIZED (
      ${matchQuery}
    ),
  `;
}

export function collectionPredicate(
  cardAlias: string,
  params: CardQueryParams
): SqlFragment | null {
  if (!hasCollection(params) || params.collection?.mode === 'rank') {
    return null;
  }

  const { collection } = params;
  const matched = collectionMatchExpression(cardAlias);
  return collection.mode === 'exclude'
    ? sql`NOT ${matched}`
    : matched;
}

export function collectionSelectExpression(params: CardQueryParams): SqlFragment {
  return hasCollection(params)
    ? collectionMatchExpression('c')
    : raw('FALSE');
}

export function collectionCandidateOrder(
  params: CardQueryParams,
  order: SqlFragment
): SqlFragment {
  return hasCollectionRank(params)
    ? sql`in_collection DESC, ${order}`
    : order;
}

export function collectionCardOrder(
  params: CardQueryParams,
  order: SqlFragment
): SqlFragment {
  return hasCollectionRank(params)
    ? sql`cc.in_collection DESC, ${order}`
    : order;
}

export function collectionUniqueRepresentativeOrder(params: CardQueryParams): SqlFragment {
  return hasCollectionRank(params)
    ? raw('in_collection DESC,')
    : raw('');
}

function collectionMatchExpression(cardAlias: string): SqlFragment {
  return sql`EXISTS (
    SELECT 1
    FROM ${ident(collectionMatchesAlias)} collection_matches
    WHERE collection_matches.card_id = ${ident(cardAlias, 'id')}
  )`;
}

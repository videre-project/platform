/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  compile,
  sql,
  tableColumns,
  type CompiledSql
} from '@videreproject/sql-builder';
import { table } from '@videreproject/sql-schema';
import { CARD_FACE_FIELDS } from './types.ts';

const cardFaces = table('card_faces', 'cf');

export type CardFacesQueryParams = {
  readonly id?: number | null,
};

export const buildCardFacesQuery = (params: CardFacesQueryParams): CompiledSql =>
  compile(sql`
    SELECT ${tableColumns(cardFaces, CARD_FACE_FIELDS)}
    FROM ${cardFaces.source}
    WHERE ${cardFaces.column('card_id')} = ${params.id ?? null}::int
    ORDER BY ${cardFaces.column('face_index')}
  `);

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { fromCompiledQuery } from '../compiledQuery.ts';

import { buildCardCountQuery } from './buildCardCountQuery.ts';
import { buildCardFacesQuery } from './buildCardFacesQuery.ts';
import { buildCardNameAutocompleteQuery } from './buildCardNameAutocompleteQuery.ts';
import { buildCardsQuery } from './buildCardsQuery.ts';
import type { ICard, ICardCount, ICardFace, ICardNameAutocomplete } from './types.ts';

export const getCards = fromCompiledQuery<ICard>(buildCardsQuery);

export const getCardCount = fromCompiledQuery<ICardCount>(buildCardCountQuery);

export const getCardFaces = fromCompiledQuery<ICardFace>(buildCardFacesQuery);

export const getCardNameAutocomplete = fromCompiledQuery<ICardNameAutocomplete>(
  buildCardNameAutocompleteQuery
);

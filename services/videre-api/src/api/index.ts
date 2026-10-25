/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { applyPublicApiCors, publicApiPreflight } from '@/apiPolicy';
import { useCache } from '@/cache';
import { withParams } from '@/parameters';
import { Error, asJSON } from '@/responses';
import { openApiResponse } from '@/openapiDocument';

import archetypes from './archetypes';
import cards from './cards';
import decks from './decks';
import events from './events';
import matchups from './matchups';
import matches from './matches';
import metagame from './metagame';
import mtgo from './mtgo';
import prices from './prices';
import products from './products';
import sets from './sets';
import sideboarding from './sideboarding';
import standings from './standings';


export const apiRouters = { archetypes, cards, decks, events, matchups, matches, metagame, mtgo, prices, products, sets, sideboarding, standings };

const router = Router({
  before: [publicApiPreflight],
  finally: [asJSON, applyPublicApiCors],
})
  .get('*', useCache)
  .all('*', withParams)
  .get('/openapi.json', () => openApiResponse(apiRouters));

for (const [base, child] of Object.entries(apiRouters)) {
  router.all(`/${base}`, child.fetch).all(`/${base}/*`, child.fetch);
}
router.all('*', () => Error(404, 'Could not find the requested resource.'));
export default router;

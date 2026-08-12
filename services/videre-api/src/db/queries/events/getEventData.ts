/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  and,
  compile,
  ilikeContains,
  optional,
  orderBy,
  selectFields,
  sql,
  tableColumnFields,
  type CompiledSql,
  type SqlFragment
} from '@videreproject/sql-builder';
import { clampListLimit, clampOffset } from '../../../queryPolicy.ts';
import { table } from '@videreproject/sql-schema';
import { fromCompiledQuery } from '../compiledQuery.ts';
import type {
  EventDataQueryParams,
  IEventDeck,
  IEventMatch,
  IEventStanding
} from './types.ts';
import {
  EVENT_ARCHETYPE_FIELDS,
  EVENT_DECK_DECK_FIELDS,
  EVENT_DATE_FORMAT_FIELDS,
  EVENT_MATCH_MATCH_FIELDS,
  EVENT_STANDING_STANDING_FIELDS,
} from './types.ts';

const events = table('events', 'e');
const decks = table('decks', 'd');
const matches = table('matches', 'm');
const standings = table('standings', 's');
const archetypes = table('archetypes', 'a');
const playerDeck = table('decks', 'd1');
const opponentDeck = table('decks', 'd2');
const playerArchetype = table('archetypes', 'a1');
const opponentArchetype = table('archetypes', 'a2');

const eventDeckSelectFields = {
  ...tableColumnFields(decks, EVENT_DECK_DECK_FIELDS),
  ...tableColumnFields(events, EVENT_DATE_FORMAT_FIELDS),
  ...tableColumnFields(archetypes, EVENT_ARCHETYPE_FIELDS),
  event_name: events.column('name'),
  event_type: events.column('kind'),
  deck_name: archetypes.column('name'),
} satisfies Record<keyof IEventDeck, SqlFragment>;

const eventMatchSelectFields = {
  ...tableColumnFields(matches, EVENT_MATCH_MATCH_FIELDS),
  ...tableColumnFields(events, EVENT_DATE_FORMAT_FIELDS),
  event_name: events.column('name'),
  event_type: events.column('kind'),
  player_deck_id: playerDeck.column('id'),
  player_deck_name: playerArchetype.column('name'),
  player_archetype: playerArchetype.column('archetype'),
  player_archetype_id: playerArchetype.column('archetype_id'),
  opponent_deck_id: opponentDeck.column('id'),
  opponent_deck_name: opponentArchetype.column('name'),
  opponent_archetype: opponentArchetype.column('archetype'),
  opponent_archetype_id: opponentArchetype.column('archetype_id'),
} satisfies Record<keyof IEventMatch, SqlFragment>;

const eventStandingSelectFields = {
  ...tableColumnFields(standings, EVENT_STANDING_STANDING_FIELDS),
  ...tableColumnFields(events, EVENT_DATE_FORMAT_FIELDS),
  ...tableColumnFields(archetypes, EVENT_ARCHETYPE_FIELDS),
  event_name: events.column('name'),
  event_type: events.column('kind'),
  deck_id: decks.column('id'),
  deck_name: archetypes.column('name'),
} satisfies Record<keyof IEventStanding, SqlFragment>;

export const buildEventDecksQuery = (params: EventDataQueryParams): CompiledSql =>
  compile(sql`
    SELECT ${selectFields(eventDeckSelectFields)}
    FROM ${decks.source}
    INNER JOIN ${events.source} ON ${events.column('id')} = ${decks.column('event_id')}
    LEFT JOIN ${archetypes.source} ON ${archetypes.column('deck_id')} = ${decks.column('id')}
    WHERE ${and([
      eventPredicates(params),
      optional(params.player, ilikeContains(decks.column('player'), params.player ?? null)),
      archetypePredicates(params, archetypes),
    ])}
    ORDER BY ${eventDataOrderBy([decks.column('player')])}
    LIMIT ${eventDataProbeLimit(params)}::int
    OFFSET ${eventDataOffset(params)}::int
  `);

export const buildEventMatchesQuery = (params: EventDataQueryParams): CompiledSql =>
  compile(sql`
    SELECT ${selectFields(eventMatchSelectFields)}
    FROM ${matches.source}
    INNER JOIN ${events.source} ON ${events.column('id')} = ${matches.column('event_id')}
    LEFT JOIN ${playerDeck.source} ON ${playerDeck.column('event_id')} = ${matches.column('event_id')}
                                AND ${playerDeck.column('player')} = ${matches.column('player')}
    LEFT JOIN ${opponentDeck.source} ON ${opponentDeck.column('event_id')} = ${matches.column('event_id')}
                                  AND ${opponentDeck.column('player')} = ${matches.column('opponent')}
    LEFT JOIN ${playerArchetype.source} ON ${playerArchetype.column('deck_id')} = ${playerDeck.column('id')}
    LEFT JOIN ${opponentArchetype.source} ON ${opponentArchetype.column('deck_id')} = ${opponentDeck.column('id')}
    WHERE ${and([
      eventPredicates(params),
      matchPlayerPredicates(params),
      matchArchetypePredicates(params),
    ])}
    ORDER BY ${eventDataOrderBy([
      matches.column('round'),
      matches.column('player'),
    ])}
    LIMIT ${eventDataProbeLimit(params)}::int
    OFFSET ${eventDataOffset(params)}::int
  `);

export const buildEventStandingsQuery = (params: EventDataQueryParams): CompiledSql =>
  compile(sql`
    SELECT ${selectFields(eventStandingSelectFields)}
    FROM ${standings.source}
    INNER JOIN ${events.source} ON ${events.column('id')} = ${standings.column('event_id')}
    LEFT JOIN ${decks.source} ON ${decks.column('event_id')} = ${standings.column('event_id')}
                           AND ${decks.column('player')} = ${standings.column('player')}
    LEFT JOIN ${archetypes.source} ON ${archetypes.column('deck_id')} = ${decks.column('id')}
    WHERE ${and([
      eventPredicates(params),
      optional(params.player, ilikeContains(standings.column('player'), params.player ?? null)),
      archetypePredicates(params, archetypes),
    ])}
    ORDER BY ${eventDataOrderBy([standings.column('rank')])}
    LIMIT ${eventDataProbeLimit(params)}::int
    OFFSET ${eventDataOffset(params)}::int
  `);

export const getEventDecks = fromCompiledQuery<IEventDeck>(buildEventDecksQuery);
export const getEventMatches = fromCompiledQuery<IEventMatch>(buildEventMatchesQuery);
export const getEventStandings = fromCompiledQuery<IEventStanding>(buildEventStandingsQuery);

function eventPredicates(params: EventDataQueryParams): SqlFragment {
  if (params.event_id !== undefined && params.event_id !== null) {
    return sql`${events.column('id')} = ${params.event_id}::int`;
  }

  return and([
    optional(
      params.format,
      sql`${events.column('format')} = ${params.format ?? null}::FormatType`
    ),
    optional(params.min_date, sql`${events.column('date')} >= ${params.min_date ?? null}::date`),
    optional(params.max_date, sql`${events.column('date')} <= ${params.max_date ?? null}::date`),
  ]);
}

function archetypePredicates(
  params: EventDataQueryParams,
  archetypeTable: typeof archetypes
): SqlFragment | null {
  return optional(
    params.archetype,
    sql`(${ilikeContains(archetypeTable.column('archetype'), params.archetype ?? null)}
      OR ${ilikeContains(archetypeTable.column('name'), params.archetype ?? null)})`
  );
}

function matchPlayerPredicates(params: EventDataQueryParams): SqlFragment | null {
  return optional(
    params.player,
    sql`(${ilikeContains(matches.column('player'), params.player ?? null)}
      OR ${ilikeContains(matches.column('opponent'), params.player ?? null)})`
  );
}

function matchArchetypePredicates(params: EventDataQueryParams): SqlFragment | null {
  return optional(
    params.archetype,
    sql`(${ilikeContains(playerArchetype.column('archetype'), params.archetype ?? null)}
      OR ${ilikeContains(playerArchetype.column('name'), params.archetype ?? null)}
      OR ${ilikeContains(opponentArchetype.column('archetype'), params.archetype ?? null)}
      OR ${ilikeContains(opponentArchetype.column('name'), params.archetype ?? null)})`
  );
}

function eventDataOrderBy(tiebreakers: readonly SqlFragment[]): SqlFragment {
  return orderBy([
    sql`${events.column('date')} DESC`,
    sql`${events.column('id')} DESC`,
    ...tiebreakers,
  ]);
}

function eventDataProbeLimit(params: EventDataQueryParams): number {
  return clampListLimit(params.limit) + 1;
}

function eventDataOffset(params: EventDataQueryParams): number {
  return clampOffset(params.offset);
}

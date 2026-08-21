/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { PendingSql, Sql } from '../../postgres.ts';

import {
  DECK_SUMMARY_ARCHETYPE_FIELDS,
  DECK_SUMMARY_DECK_FIELDS,
  EVENT_DATE_FORMAT_FIELDS,
  EVENT_FIELDS,
  type EventQueryParams,
  type IDeck,
  type IEvent,
  type IMatch,
} from './types.ts';
export type { EventQueryParams, IDeck, IEvent, IMatch } from './types.ts';

export type IDeckEntry = IDeck & {
  event_id: number,
  player: string,
};

type IMatchEntry = Omit<IMatch, 'games'> & {
  player: string,
  games: string,
};

type IMatchDeckJoin = {
  event_id: number,
  player: string,
  id1: number | null,
  id2: number,
  deck_id: number,
  date: Date,
  format: IMatch['format'],
  event_type: IMatch['event_type'],
  archetype1: string,
  archetype2: string,
  games: unknown[],
  result: IMatch['result'],
};

export const getEvents = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IEvent[]> => {
  const eventEntries = getEventEntries(sql, params);

  return sql`
    ${eventEntries}
    ORDER BY
      e.date DESC,
      e.id DESC
  `;
}

/**
 * Builds the filtered event relation used by aggregate queries.
 *
 * Aggregate consumers deliberately leave ordering to their final result. The
 * public events endpoint adds its date ordering in getEvents instead.
 */
export const getEventEntries = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IEvent[]> => {
  return sql`
    SELECT ${eventSelectFields(sql)}
    FROM Events e
    WHERE ${eventPredicates(sql, params)}
  `;
}

export const getDecks = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IDeck[]> => {
  const deckEntries = getDeckEntries(sql, params);

  return sql`
    SELECT
      id,
      name,
      archetype,
      archetype_id,
      mainboard,
      sideboard
    FROM (${deckEntries}) d
    WHERE archetype_id IS NOT NULL
  `;
}

/**
 * Builds the canonical deck relation used by aggregate queries.
 *
 * The event and player fields let consumers apply a matched-deck semi-join
 * without rebuilding the deck/event joins or the full match projection.
 */
export const getDeckEntries = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IDeckEntry[]> => {
  const eventEntries = getEventEntries(sql, params);

  return sql`
    WITH
      event_entries AS (${eventEntries})
    SELECT
      a.deck_id AS id,
      d.event_id,
      d.player,
      ${tableFields(sql, 'a', DECK_SUMMARY_ARCHETYPE_FIELDS)},
      ${tableFields(sql, 'd', DECK_SUMMARY_DECK_FIELDS)}
    FROM Archetypes a
    INNER JOIN Decks d ON d.id = a.deck_id
    INNER JOIN event_entries e ON e.id = d.event_id
    WHERE
      e.kind <> 'League'::EventType
  `;
}

export const getMatches = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IMatch[]> => {
  return getMatchEntries(sql, params);
}

/** Builds the filtered event, match, and deck join used by match aggregates. */
const getMatchDeckJoin = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IMatchDeckJoin[]> => {
  const eventEntries = getEventEntries(sql, params);

  return sql`
    WITH event_entries AS (${eventEntries})
    SELECT
      a1.archetype_id AS id1,
      a2.archetype_id AS id2,
      a1.deck_id AS deck_id,
      ${tableFields(sql, 'e', EVENT_DATE_FORMAT_FIELDS)},
      m.event_id,
      m.player,
      e.kind AS event_type,
      a1.archetype AS archetype1,
      m.games,
      m.result,
      a2.archetype AS archetype2
    FROM Matches m
    INNER JOIN Decks d1 ON d1.event_id = m.event_id
                        AND d1.player = m.player
    INNER JOIN Decks d2 ON d2.event_id = m.event_id
                        AND d2.player = m.opponent
    INNER JOIN Archetypes a1 ON a1.deck_id = d1.id
    INNER JOIN Archetypes a2 ON a2.deck_id = d2.id
    INNER JOIN event_entries e ON e.id = m.event_id
    WHERE
      e.kind <> 'League'::EventType
  `;
}

/** Converts the raw game results into the string used by match aggregates. */
export const getMatchEntries = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<IMatchEntry[]> => {
  const matchDeckJoin = getMatchDeckJoin(sql, params);

  return sql`
    WITH match_deck_entries AS (${matchDeckJoin})
    SELECT
      id1,
      id2,
      deck_id,
      date,
      format,
      event_id,
      player,
      event_type,
      archetype1,
      ARRAY_TO_STRING(ARRAY(
        SELECT CASE
          WHEN game.result = 'win' THEN 'W'
          WHEN game.result = 'loss' THEN 'L'
          WHEN game.result = 'draw' THEN 'T'
        END
        FROM UNNEST(games) AS game
      ), '-') AS games,
      result,
      archetype2
    FROM match_deck_entries
  `;
}

/**
 * Projects the match relation needed for deck-presence checks. The base join
 * remains shared with getMatchEntries, while game results stay unexpanded.
 */
export const getMatchDeckEntries = (
  sql: Sql,
  params: EventQueryParams
): PendingSql<Omit<IMatchDeckJoin, 'games' | 'result'>[]> => {
  const matchDeckJoin = getMatchDeckJoin(sql, params);

  return sql`
    SELECT
      event_id,
      player,
      id1,
      id2,
      deck_id,
      date,
      format,
      event_type,
      archetype1,
      archetype2
    FROM (${matchDeckJoin}) matches
  `;
}

function eventPredicates(sql: Sql, params: EventQueryParams): PendingSql<unknown[]> {
  if (params.event_id !== undefined && params.event_id !== null) {
    return sql`e.id = ${params.event_id}`;
  }

  return sql`
    (${params.format ?? null}::FormatType IS NULL OR e.format = ${params.format ?? null}::FormatType)
    AND (${params.kind ?? null}::EventType IS NULL OR e.kind = ${params.kind ?? null}::EventType)
    AND (${params.min_date ?? null}::date IS NULL OR e.date >= ${params.min_date ?? null}::date)
    AND (${params.max_date ?? null}::date IS NULL OR e.date <= ${params.max_date ?? null}::date)
  `;
}

function eventSelectFields(sql: Sql): PendingSql<unknown[]> {
  return tableFields(sql, 'e', EVENT_FIELDS);
}

function tableFields(
  sql: Sql,
  alias: string,
  fields: readonly string[]
): PendingSql<unknown[]> {
  return sql.unsafe(fields.map((field) => `${alias}.${field}`).join(', '));
}

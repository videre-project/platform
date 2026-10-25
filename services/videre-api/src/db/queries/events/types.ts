/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type {
  CardQuantityPair,
  GameResult,
} from '@videreproject/sql-schema';
import type { EventType, FormatType, ResultType } from '@videreproject/constants';
import type { CI, Percentage } from '@/db/statistics';
import type { TableColumn } from '@videreproject/sql-schema';

const field = <T>() => undefined as unknown as T;

export type EventQueryParams = {
  readonly format?: string | null,
  readonly kind?: EventType | string | null,
  readonly event_id?: number | null,
  readonly min_date?: string | null,
  readonly max_date?: string | null,
};

const eventShape = {
  /** @multipleOf 1 */
  id: field<number>(),
  name: field<string>(),
  date: field<Date>(),
  format: field<FormatType>(),
  kind: field<EventType>(),
  /** @multipleOf 1 */
  rounds: field<number>(),
  /** @multipleOf 1 */
  players: field<number>(),
} satisfies Partial<Record<TableColumn<'events'>, unknown>>;

export type IEvent = typeof eventShape;

export type EventField = Extract<keyof IEvent, TableColumn<'events'>>;

export const EVENT_FIELDS = Object.keys(eventShape) as readonly EventField[];

const deckSummaryArchetypeShape = {
  name: field<string>(),
  archetype: field<string>(),
  /** @multipleOf 1 */
  archetype_id: field<number>(),
} satisfies Partial<Record<TableColumn<'archetypes'>, unknown>>;

export type DeckSummaryArchetypeField = Extract<
  keyof typeof deckSummaryArchetypeShape,
  TableColumn<'archetypes'>
>;

export const DECK_SUMMARY_ARCHETYPE_FIELDS = Object.keys(
  deckSummaryArchetypeShape
) as readonly DeckSummaryArchetypeField[];

const deckSummaryDeckShape = {
  mainboard: field<CardQuantityPair[] | null>(),
  sideboard: field<CardQuantityPair[] | null>(),
} satisfies Partial<Record<TableColumn<'decks'>, unknown>>;

export type DeckSummaryDeckField = Extract<
  keyof typeof deckSummaryDeckShape,
  TableColumn<'decks'>
>;

export const DECK_SUMMARY_DECK_FIELDS = Object.keys(
  deckSummaryDeckShape
) as readonly DeckSummaryDeckField[];

const _deckSummaryJoinedShape = {
  /** @multipleOf 1 */
  id: field<number>(),
};

export type IDeck = typeof _deckSummaryJoinedShape
  & typeof deckSummaryArchetypeShape
  & typeof deckSummaryDeckShape;

export type IMatch = {
  /** @multipleOf 1 */
  id1: number | null,
  /** @multipleOf 1 */
  id2: number | null,
  /** @multipleOf 1 */
  deck_id: number,
  date: Date,
  format: FormatType,
  /** @multipleOf 1 */
  event_id: number,
  event_type: EventType,
  archetype1: string,
  games: string,
  result: ResultType,
  archetype2: string
};


export type EventDataQueryParams = EventQueryParams & {
  readonly player?: string | null,
  readonly archetype?: string | null,
  readonly limit?: number | null,
  readonly offset?: number | null,
};

const eventDateFormatShape = {
  date: field<Date>(),
  format: field<FormatType>(),
} satisfies Partial<Record<TableColumn<'events'>, unknown>>;

export type EventDateFormatField = Extract<
  keyof typeof eventDateFormatShape,
  TableColumn<'events'>
>;

export const EVENT_DATE_FORMAT_FIELDS = Object.keys(
  eventDateFormatShape
) as readonly EventDateFormatField[];

const eventDeckDeckShape = {
  /** @multipleOf 1 */
  id: field<number>(),
  /** @multipleOf 1 */
  event_id: field<number>(),
  player: field<string>(),
  mainboard: field<CardQuantityPair[] | null>(),
  sideboard: field<CardQuantityPair[] | null>(),
} satisfies Partial<Record<TableColumn<'decks'>, unknown>>;

export type EventDeckDeckField = Extract<
  keyof typeof eventDeckDeckShape,
  TableColumn<'decks'>
>;

export const EVENT_DECK_DECK_FIELDS = Object.keys(
  eventDeckDeckShape
) as readonly EventDeckDeckField[];

const eventArchetypeShape = {
  archetype: field<string | null>(),
  /** @multipleOf 1 */
  archetype_id: field<number | null>(),
} satisfies Partial<Record<TableColumn<'archetypes'>, unknown>>;

export type EventArchetypeField = Extract<
  keyof typeof eventArchetypeShape,
  TableColumn<'archetypes'>
>;

export const EVENT_ARCHETYPE_FIELDS = Object.keys(
  eventArchetypeShape
) as readonly EventArchetypeField[];

const _eventDeckJoinedShape = {
  event_name: field<string>(),
  event_type: field<EventType>(),
  deck_name: field<string | null>(),
};

export type IEventDeck = typeof eventDeckDeckShape
  & typeof eventDateFormatShape
  & typeof eventArchetypeShape
  & typeof _eventDeckJoinedShape;

const eventMatchMatchShape = {
  /** @multipleOf 1 */
  id: field<number>(),
  /** @multipleOf 1 */
  event_id: field<number>(),
  /** @multipleOf 1 */
  round: field<number>(),
  player: field<string>(),
  opponent: field<string>(),
  record: field<string>(),
  result: field<ResultType>(),
  isbye: field<boolean>(),
  games: field<GameResult[] | null>(),
} satisfies Partial<Record<TableColumn<'matches'>, unknown>>;

export type EventMatchMatchField = Extract<
  keyof typeof eventMatchMatchShape,
  TableColumn<'matches'>
>;

export const EVENT_MATCH_MATCH_FIELDS = Object.keys(
  eventMatchMatchShape
) as readonly EventMatchMatchField[];

const _eventMatchJoinedShape = {
  event_name: field<string>(),
  event_type: field<EventType>(),
  /** @multipleOf 1 */
  player_deck_id: field<number | null>(),
  player_deck_name: field<string | null>(),
  player_archetype: field<string | null>(),
  /** @multipleOf 1 */
  player_archetype_id: field<number | null>(),
  /** @multipleOf 1 */
  opponent_deck_id: field<number | null>(),
  opponent_deck_name: field<string | null>(),
  opponent_archetype: field<string | null>(),
  /** @multipleOf 1 */
  opponent_archetype_id: field<number | null>(),
};

export type IEventMatch = typeof eventMatchMatchShape
  & typeof eventDateFormatShape
  & typeof _eventMatchJoinedShape;

const eventStandingStandingShape = {
  /** @multipleOf 1 */
  event_id: field<number>(),
  /** @multipleOf 1 */
  rank: field<number | null>(),
  player: field<string>(),
  record: field<string>(),
  /** @multipleOf 1 */
  points: field<number | null>(),
  omwp: field<number | null>(),
  gwp: field<number | null>(),
  owp: field<number | null>(),
} satisfies Partial<Record<TableColumn<'standings'>, unknown>>;

export type EventStandingStandingField = Extract<
  keyof typeof eventStandingStandingShape,
  TableColumn<'standings'>
>;

export const EVENT_STANDING_STANDING_FIELDS = Object.keys(
  eventStandingStandingShape
) as readonly EventStandingStandingField[];

const _eventStandingJoinedShape = {
  event_name: field<string>(),
  event_type: field<EventType>(),
  /** @multipleOf 1 */
  deck_id: field<number | null>(),
  deck_name: field<string | null>(),
};

export type IEventStanding = typeof eventStandingStandingShape
  & typeof eventDateFormatShape
  & typeof eventArchetypeShape
  & typeof _eventStandingJoinedShape;

export type ICardStatistics = {
  card: string,
  /** @multipleOf 1 */
  count: number,
  percentage: Percentage,
  /** @multipleOf 1 */
  total: number,
  average: number
};

export type IDeckStatistics = {
  /** @multipleOf 1 */
  id: number,
  archetype: string,
  /** @multipleOf 1 */
  count: number,
  mainboard: ICardStatistics[],
  sideboard: ICardStatistics[]
};

export type IMetagame = {
  /** @multipleOf 1 */
  id: number,
  archetype: string,
  /** @multipleOf 1 */
  count: number,
  percentage: Percentage,
  /** @multipleOf 1 */
  match_count: number,
  match_winrate: Percentage,
  match_ci: CI,
  /** @multipleOf 1 */
  game_count: number,
  game_winrate: Percentage,
  game_ci: CI
};

export type IMatchup = {
  /** @multipleOf 1 */
  id1: number | null,
  /** @multipleOf 1 */
  id2: number | null,
  archetype1: string,
  archetype2: string,
  /** @multipleOf 1 */
  match_count: number,
  match_winrate: Percentage,
  match_ci: CI,
  /** @multipleOf 1 */
  game_count: number,
  game_winrate: Percentage,
  game_ci: CI
};

const matchupSummaryShape = {
  /** @multipleOf 1 */
  id: field<number | null>(),
  archetype: field<string>(),
  /** @multipleOf 1 */
  match_count: field<number>(),
  match_winrate: field<Percentage>(),
  match_ci: field<CI>(),
  /** @multipleOf 1 */
  game_count: field<number>(),
  game_winrate: field<Percentage>(),
  game_ci: field<CI>(),
};

export type IMatchupSummary = typeof matchupSummaryShape;

export type MatchupSummaryField = keyof IMatchupSummary;

export const MATCHUP_SUMMARY_FIELDS = Object.keys(
  matchupSummaryShape
) as readonly MatchupSummaryField[];

export type IMatchupMatrix = {
  /** @multipleOf 1 */
  id: number | null,
  archetype: string,
  matchups: IMatchupSummary[]
};

export type ISideboarding = {
  /** @multipleOf 1 */
  id: number | null,
  archetype: string,
  /** @multipleOf 1 */
  game_one_count: number,
  game_one_winrate: Percentage,
  game_one_ci: CI,
  /** @multipleOf 1 */
  postboard_game_count: number | null,
  postboard_game_winrate: Percentage | null,
  postboard_game_ci: CI | null,
};

const sideboardingSummaryShape = {
  /** @multipleOf 1 */
  id: field<number | null>(),
  archetype: field<string>(),
  /** @multipleOf 1 */
  game_one_count: field<number>(),
  game_one_winrate: field<Percentage>(),
  game_one_ci: field<CI>(),
  /** @multipleOf 1 */
  postboard_game_count: field<number | null>(),
  postboard_game_winrate: field<Percentage | null>(),
  postboard_game_ci: field<CI | null>(),
};

export type ISideboardingSummary = typeof sideboardingSummaryShape;

export type SideboardingSummaryField = keyof ISideboardingSummary;

export const SIDEBOARDING_SUMMARY_FIELDS = Object.keys(
  sideboardingSummaryShape
) as readonly SideboardingSummaryField[];

export type ISideboardingMatrix = {
  /** @multipleOf 1 */
  id: number | null,
  archetype: string,
  matchups: ISideboardingSummary[]
};

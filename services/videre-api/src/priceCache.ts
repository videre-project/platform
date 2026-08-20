/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

const HISTORICAL_PRICE_CACHE_SECONDS = 31_536_000;
const PRICE_REFRESH_TIME_ZONE = 'Europe/Berlin';
const PRICE_REFRESH_HOUR = 5;
const PRICE_REFRESH_MINUTE = 40;

export function getPriceCachePolicy(
  date: 'latest' | string,
  now: Date = new Date(),
): string {
  if (date !== 'latest') {
    return `public, max-age=${HISTORICAL_PRICE_CACHE_SECONDS}, s-maxage=${HISTORICAL_PRICE_CACHE_SECONDS}, immutable`;
  }

  const seconds = Math.max(60, Math.ceil((nextPriceRefresh(now).getTime() - now.getTime()) / 1000));
  return `public, max-age=${seconds}, s-maxage=${seconds}`;
}

function nextPriceRefresh(now: Date): Date {
  const current = zonedParts(now);
  let target = new Date(Date.UTC(
    current.year,
    current.month - 1,
    current.day,
    PRICE_REFRESH_HOUR,
    PRICE_REFRESH_MINUTE,
  ));
  target = localTimeToUtc(target);

  if (target <= now) {
    target = localTimeToUtc(new Date(Date.UTC(
      current.year,
      current.month - 1,
      current.day + 1,
      PRICE_REFRESH_HOUR,
      PRICE_REFRESH_MINUTE,
    )));
  }

  return target;
}

function localTimeToUtc(localGuess: Date): Date {
  const local = zonedParts(localGuess);
  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  const offset = localAsUtc - localGuess.getTime();
  return new Date(localGuess.getTime() - offset);
}

function zonedParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRICE_REFRESH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

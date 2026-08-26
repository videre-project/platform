/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMetagameSearchParameters,
  createMetagameShareUrl,
  readMetagameShareParameters,
} from '../src/utils/metagameShareParameters.ts'
import { getSecondsUntilNextMetagameRefresh } from '../src/utils/metagameCacheSchedule.ts'

const date = (year, month, day) => new Date(year, month - 1, day)

test('normalizes metagame filters from share parameters', () => {
  const state = readMetagameShareParameters(
    '?format=modern&min_date=2026-07-21&max_date=2026-08-21',
  )

  assert.equal(state.format, 'Modern')
  assert.deepEqual(state.dateRange, {
    from: date(2026, 7, 21),
    to: date(2026, 8, 21),
  })
})

test('rejects invalid formats and calendar dates', () => {
  const now = new Date(2026, 7, 21, 12)
  const state = readMetagameShareParameters(
    '?format=not-a-format&min_date=2026-02-30&max_date=nope',
    now,
  )

  assert.equal(state.format, 'Standard')
  assert.deepEqual(state.dateRange, {
    from: date(2026, 7, 21),
    to: date(2026, 8, 21),
  })
})

test('orders reversed date parameters and emits a canonical query', () => {
  const state = readMetagameShareParameters(
    '?max_date=2026-07-21&min_date=2026-08-21&format=MODERN',
  )

  assert.equal(
    createMetagameSearchParameters(state).toString(),
    'format=modern&min_date=2026-07-21&max_date=2026-08-21',
  )
  assert.equal(
    createMetagameShareUrl('https://videreproject.com/anything', state).toString(),
    'https://videreproject.com/metagame?format=modern&min_date=2026-07-21&max_date=2026-08-21',
  )
})

test('omits default metagame parameters for page URLs', () => {
  const now = new Date(2026, 7, 21, 12)
  const defaults = readMetagameShareParameters('', now)

  assert.equal(
    createMetagameSearchParameters(defaults, { includeDefaults: false, now }).toString(),
    '',
  )
  assert.equal(
    createMetagameSearchParameters({ ...defaults, format: 'Modern' }, { includeDefaults: false, now }).toString(),
    'format=modern',
  )
  assert.equal(
    createMetagameSearchParameters({
      ...defaults,
      dateRange: { from: date(2026, 8, 1), to: date(2026, 8, 21) },
    }, { includeDefaults: false, now }).toString(),
    'min_date=2026-08-01&max_date=2026-08-21',
  )
})

test('aligns metagame image expiry with the MTGOBot reset schedule', () => {
  const beforeReset = new Date('2026-08-21T03:29:30Z')
  const afterReset = new Date('2026-08-21T03:30:30Z')

  assert.equal(getSecondsUntilNextMetagameRefresh(beforeReset), 30)
  assert.equal(getSecondsUntilNextMetagameRefresh(afterReset), 7_170)
})

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeSmoothRationalDisparity,
  computeArchetypePolarities,
} from '../src/utils/polarity.ts'
import type { MetagameData } from '../src/utils/metagameData.ts'
import type { SideboardingData } from '../src/hooks/useSideboarding.ts'

test('computeSmoothRationalDisparity - edge cases and properties', () => {
  // 1. Zero or 1 game sample size evaluates to 0.0%
  assert.equal(computeSmoothRationalDisparity(100.0, 0), 0.0)
  assert.equal(computeSmoothRationalDisparity(100.0, 1), 0.0)

  // 2. Exactly 50-50 matchup evaluates to 0.0%
  assert.equal(computeSmoothRationalDisparity(50.0, 10), 0.0)
  assert.equal(computeSmoothRationalDisparity(50.0, 100), 0.0)

  // 3. Small sample noise dampening (6 wins out of 10 = 60%, raw 20% disparity halved)
  const smallNoiseDisparity = computeSmoothRationalDisparity(60.0, 10)
  assert.ok(smallNoiseDisparity < 12.0 && smallNoiseDisparity > 0, `Expected small noise disparity < 12%, got ${smallNoiseDisparity}%`)

  // 4. Genuine high-sample blowout (80% win rate on 40 games)
  const blowoutDisparity = computeSmoothRationalDisparity(80.0, 40)
  assert.ok(blowoutDisparity > 50.0, `Expected blowout disparity > 50%, got ${blowoutDisparity}%`)
  assert.ok(blowoutDisparity <= 60.0, `Expected blowout disparity <= 60%, got ${blowoutDisparity}%`)
})

test('computeArchetypePolarities - full metagame and sideboarding integration', () => {
  const mockMetagame: MetagameData = {
    archetypes: [
      { id: 1, archetype: 'Deck A', count: 100, percentage: 50.0, games: 200, winrate: 55.0, confidenceInterval: 5.0 },
      { id: 2, archetype: 'Deck B', count: 100, percentage: 50.0, games: 200, winrate: 45.0, confidenceInterval: 5.0 },
    ],
    matchups: [
      { archetype: 'Deck A', opponent: 'Deck B', games: 50, winrate: 70.0, confidenceInterval: 8.0 },
      { archetype: 'Deck B', opponent: 'Deck A', games: 50, winrate: 30.0, confidenceInterval: 8.0 },
    ],
  }

  const mockSideboarding: SideboardingData = {
    rows: [
      { id: 1, archetype: 'Deck A', gameOne: { games: 20, winrate: 80.0, confidenceInterval: 10.0 }, postboard: { games: 30, winrate: 63.3, confidenceInterval: 12.0 } },
      { id: 2, archetype: 'Deck B', gameOne: { games: 20, winrate: 20.0, confidenceInterval: 10.0 }, postboard: { games: 30, winrate: 36.7, confidenceInterval: 12.0 } },
    ],
    matchups: [
      { archetype: 'Deck A', opponent: 'Deck B', gameOne: { games: 20, winrate: 80.0, confidenceInterval: 10.0 }, postboard: { games: 30, winrate: 63.3, confidenceInterval: 12.0 } },
      { archetype: 'Deck B', opponent: 'Deck A', gameOne: { games: 20, winrate: 20.0, confidenceInterval: 10.0 }, postboard: { games: 30, winrate: 36.7, confidenceInterval: 12.0 } },
    ],
  }

  const result = computeArchetypePolarities(mockMetagame, mockSideboarding)
  assert.ok(result !== null)

  assert.equal(result.rows.length, 2)
  const deckA = result.rows.find(r => r.archetype === 'Deck A')!
  const deckB = result.rows.find(r => r.archetype === 'Deck B')!

  assert.ok(deckA.polarity > 0)
  assert.ok(deckB.polarity > 0)

  // Game 1 vs Post-board sideboarding delta
  assert.ok(deckA.gameOnePolarity !== null)
  assert.ok(deckA.postboardPolarity !== null)
  assert.ok(deckA.gameOnePolarity > deckA.postboardPolarity, 'Expected G1 polarity to be higher than postboard for Deck A')

  // Overall format polarity and diversity metrics
  assert.ok(result.overallPolarity > 0)
  assert.ok(result.effectiveDecks > 0)
  assert.ok(result.effectiveDiversityRatio > 0)
  assert.equal(typeof deckA.concentrationIndex, 'number')
  assert.ok(deckA.concentrationIndex > 0)
  assert.ok(result.gameOneMeanPolarity !== null)
  assert.ok(result.postboardMeanPolarity !== null)
  assert.ok(result.gameOneMeanPolarity > result.postboardMeanPolarity, 'Expected format G1 polarity to compress post-board')
})

test('computeArchetypePolarities - normalizes homogeneity for small formats', () => {
  const result = computeArchetypePolarities({
    archetypes: [
      { id: 1, archetype: 'Deck A', count: 100, percentage: 75.0, games: 200, winrate: 50.0, confidenceInterval: 5.0 },
      { id: 2, archetype: 'Deck B', count: 33, percentage: 25.0, games: 100, winrate: 50.0, confidenceInterval: 7.0 },
    ],
    matchups: [],
  }, null)

  assert.ok(result !== null)
  assert.deepEqual(result.rows.map(row => row.concentrationIndex), [90, 10])
  assert.equal(result.rows.reduce((sum, row) => sum + row.concentrationIndex, 0), 100)
})

test('computeArchetypePolarities - represents unavailable sideboarding data as null', () => {
  const result = computeArchetypePolarities({
    archetypes: [
      { id: 1, archetype: 'Deck A', count: 100, percentage: 60.0, games: 200, winrate: 50.0, confidenceInterval: 5.0 },
      { id: 2, archetype: 'Deck B', count: 66, percentage: 40.0, games: 100, winrate: 50.0, confidenceInterval: 7.0 },
    ],
    matchups: [],
  }, null)

  assert.ok(result !== null)
  assert.equal(result.gameOneMeanPolarity, null)
  assert.equal(result.postboardMeanPolarity, null)
})

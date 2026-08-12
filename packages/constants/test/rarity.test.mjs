/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeCardRarity } from '../dist/index.js'

test('normalizes canonical card rarities', () => {
  assert.equal(normalizeCardRarity('common'), 'common')
  assert.equal(normalizeCardRarity('Basic Land'), 'basic land')
})

test('normalizes generated rarity aliases', () => {
  assert.equal(normalizeCardRarity('land'), 'basic land')
  assert.equal(normalizeCardRarity('basicland'), 'basic land')
  assert.equal(normalizeCardRarity('m'), 'mythic')
})

test('normalizes separators and whitespace', () => {
  assert.equal(normalizeCardRarity(' mythic-rare '), 'mythic')
  assert.equal(normalizeCardRarity('mythic_rare'), 'mythic')
  assert.equal(normalizeCardRarity('basic   land'), 'basic land')
})

test('rejects empty and unknown rarities', () => {
  assert.equal(normalizeCardRarity(), undefined)
  assert.equal(normalizeCardRarity(''), undefined)
  assert.equal(normalizeCardRarity('nonsense'), undefined)
})

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict'
import test from 'node:test'

import { CARD_TYPES } from '../dist/index.js'

test('exports the database card type constants in bit-mask order', () => {
  assert.deepEqual([...CARD_TYPES], [
    'Artifact',
    'Creature',
    'Enchantment',
    'Instant',
    'Land',
    'Planeswalker',
    'Sorcery',
    'Battle',
    'Kindred',
  ])
})

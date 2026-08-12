/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { APIMessageComponentEmoji } from 'discord-api-types/v10';

import type { EventType } from '@videreproject/constants';


export const League: APIMessageComponentEmoji = {
  id: '950924856852086784',
  name: 'League',
  animated: false
};

export const Preliminary: APIMessageComponentEmoji = {
  id: '950924856952770610',
  name: 'Preliminary',
  animated: false
};

export const Challenge: APIMessageComponentEmoji = {
  id: '950924856810143744',
  name: 'Challenge',
  animated: false
};

export const Premier: APIMessageComponentEmoji = {
  id: '950924857183453234',
  name: 'Premier',
  animated: false
};

export default (kind: EventType): APIMessageComponentEmoji => {
  switch (kind) {
    case 'League':
      return League;
    case 'Preliminary':
      return Preliminary;
    case 'Challenge':
      return Challenge;
    case 'Showcase':
      return Premier;
    case 'Qualifier':
      return Premier;
    default:
      return Premier;
  }
};

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { BnRMilestone, SetMilestone, YearMarker } from '../types'

export const SET_MILESTONES: SetMilestone[] = [
  { code: 'LTR', name: 'The Lord of the Rings: Tales of Middle-earth', date: '2023-06-23', displayDate: 'Jun 23, 2023' },
  { code: 'WOE', name: 'Wilds of Eldraine', date: '2023-09-05', displayDate: 'Sep 5, 2023' },
  { code: 'LCI', name: 'The Lost Caverns of Ixalan', date: '2023-11-14', displayDate: 'Nov 14, 2023' },
  { code: 'RVR', name: 'Ravnica Remastered', date: '2024-01-16', displayDate: 'Jan 16, 2024' },
  { code: 'MKM', name: 'Murders at Karlov Manor', date: '2024-01-30', displayDate: 'Jan 30, 2024' },
  { code: 'OTJ', name: 'Outlaws of Thunder Junction', date: '2024-04-16', displayDate: 'Apr 16, 2024' },
  { code: 'MH3', name: 'Modern Horizons 3', date: '2024-06-11', displayDate: 'Jun 11, 2024' },
  { code: 'ACR', name: "Assassin's Creed", date: '2024-07-02', displayDate: 'Jul 2, 2024' },
  { code: 'BLB', name: 'Bloomburrow', date: '2024-07-30', displayDate: 'Jul 30, 2024' },
  { code: 'DSK', name: 'Duskmourn: House of Horror', date: '2024-09-24', displayDate: 'Sep 24, 2024' },
  { code: 'FDN', name: 'Foundations', date: '2024-11-12', displayDate: 'Nov 12, 2024' },
  { code: 'INR', name: 'Innistrad Remastered', date: '2025-01-21', displayDate: 'Jan 21, 2025' },
  { code: 'DFT', name: 'Aetherdrift', date: '2025-02-11', displayDate: 'Feb 11, 2025' },
  { code: 'TDM', name: 'Tarkir: Dragonstorm', date: '2025-04-08', displayDate: 'Apr 8, 2025' },
  { code: 'FIN', name: 'FINAL FANTASY', date: '2025-06-10', displayDate: 'Jun 10, 2025' },
  { code: 'EOE', name: 'Edge of Eternities', date: '2025-07-29', displayDate: 'Jul 29, 2025' },
  { code: 'SPM', name: "Marvel's Spider-Man", date: '2025-09-23', displayDate: 'Sep 23, 2025' },
  { code: 'TLA', name: 'Avatar: The Last Airbender™', date: '2025-11-18', displayDate: 'Nov 18, 2025' },
  { code: 'ECL', name: 'Lorwyn Eclipsed', date: '2026-01-20', displayDate: 'Jan 20, 2026' },
  { code: 'TMT', name: 'Teenage Mutant Ninja Turtles™', date: '2026-03-03', displayDate: 'Mar 3, 2026' },
  { code: 'SOS', name: 'Secrets of Strixhaven', date: '2026-04-21', displayDate: 'Apr 21, 2026' },
  { code: 'MSH', name: 'Marvel Super Heroes', date: '2026-06-23', displayDate: 'Jun 23, 2026' },
  { code: 'HOB', name: 'The Hobbit™', date: '2026-08-11', displayDate: 'Aug 11, 2026' },
]

export const BNR_MILESTONES: BnRMilestone[] = [
  {
    id: 'bnr-2023-08',
    date: '2023-08-07',
    displayDate: 'Aug 7, 2023',
    bannedCards: [],
    unbannedCards: ['Preordain'],
    affectedArchetypes: ['Izzet Murktide', 'Temur Rhinos', 'Jeskai Control'],
  },
  {
    id: 'bnr-2023-12',
    date: '2023-12-04',
    displayDate: 'Dec 4, 2023',
    bannedCards: ['Fury', 'Up the Beanstalk'],
    unbannedCards: [],
    affectedArchetypes: ['Rakdos Evoke', 'Cascade Beanstalk', '4 Color Beans to Light'],
  },
  {
    id: 'bnr-2024-03',
    date: '2024-03-11',
    displayDate: 'Mar 11, 2024',
    bannedCards: ['Violent Outburst'],
    unbannedCards: [],
    affectedArchetypes: ['Temur Rhinos', 'Living End'],
  },
  {
    id: 'bnr-2024-08',
    date: '2024-08-26',
    displayDate: 'Aug 26, 2024',
    bannedCards: ['Nadu, Winged Wisdom', 'Grief'],
    unbannedCards: [],
    affectedArchetypes: ['Nadu Combo', 'Grief Scam / Reanimator', 'Grief Reanimator'],
  },
  {
    id: 'bnr-2024-12',
    date: '2024-12-16',
    displayDate: 'Dec 16, 2024',
    bannedCards: ['The One Ring', 'Amped Raptor', 'Jegantha, the Wellspring'],
    unbannedCards: [],
    affectedArchetypes: ['Boros Energy', 'Mardu Energy'],
  },
  {
    id: 'bnr-2026-05',
    date: '2026-05-18',
    displayDate: 'May 18, 2026',
    bannedCards: ["Phlage, Titan of Fire's Fury", 'Lotus Field'],
    unbannedCards: [],
    affectedArchetypes: ['Boros Energy', 'Mardu Energy'],
  },
]

export const YEAR_MARKERS: YearMarker[] = [
  { year: '2023', date: '2023-06-01' },
  { year: '2024', date: '2024-01-01' },
  { year: '2025', date: '2025-01-01' },
  { year: '2026', date: '2026-01-01' },
]

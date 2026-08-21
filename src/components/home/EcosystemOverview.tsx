/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { BarChart3, CalendarDays, Layers3, Trophy, type LucideIcon } from 'lucide-react';

interface EcosystemItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ITEMS: EcosystemItem[] = [
  {
    icon: BarChart3,
    title: 'See what\'s working',
    description: 'Learn which decks are winning for you, where your results are slipping, and your performance over time.',
  },
  {
    icon: CalendarDays,
    title: 'Find the right event',
    description: 'See what\'s coming up, choose an event that fits your format and schedule, and know when it\'s time to join.',
  },
  {
    icon: Layers3,
    title: 'Build, test, and iterate',
    description: 'Search cards, finetune your list, compare revisions and past performances, and connect to rental services.',
  },
  {
    icon: Trophy,
    title: 'Track your standings live',
    description: 'Watch live placement updates as each round progresses, with records, tiebreakers, and match results kept current.',
  },
];

/**
 * Benefit overview rendered directly under the hero. It translates the four
 * product surfaces in the screenshot scene into player outcomes before the
 * page moves into the detailed feature walkthroughs.
 */
export const EcosystemOverview: React.FC = () => (
  <section id="workflow" className="ecosystem-section">
    <div className="container">
      <div className="ecosystem-copy">
        <h2>Your MTGO, all in one place</h2>
        <p className="text-sm text-muted">
          Videre Tracker connects each part of how you use MTGO, from choosing an event and fine-tuning a deck to understanding your results as they happen.
        </p>
      </div>

      <div className="ecosystem-grid">
        {ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="ecosystem-card"
            >
              <span className="ecosystem-card-icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

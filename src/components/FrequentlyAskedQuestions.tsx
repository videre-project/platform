/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const questions = [
  {
    question: 'Is Videre Tracker free to use?',
    answer: (
      <>
        Yes. Videre Tracker is free and open source under the{' '}
        <a
          href="https://github.com/videre-project/Tracker/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          Apache 2.0 license
        </a>
        . There is no subscription or license fee, and you can inspect or build the source
        yourself.
      </>
    ),
  },
  {
    question: 'What does Videre Tracker record?',
    answer: (
      <>
        Tracker records game events and the board state after each action. It also keeps match
        details and tracks how trades or product openings change your collection.
      </>
    ),
  },
  {
    question: 'Does Tracker modify the MTGO client?',
    answer: (
      <>
        No. Tracker does not alter MTGO&apos;s code or start-up behavior. Through{' '}
        <a
          href="https://github.com/videre-project/MTGOSDK/blob/main/docs/FAQ.md#does-using-this-sdk-modify-the-mtgo-client"
          target="_blank"
          rel="noreferrer"
        >
          MTGOSDK
        </a>, it uses Microsoft&apos;s ClrMD debugging APIs to inspect snapshots of the running client.
        Tracker interacts through MTGO&apos;s public .NET interfaces and UI events, preserving the
        client&apos;s normal safeguards.
      </>
    ),
  },
  {
    question: 'How does MTGOSDK protect my account and the game?',
    answer: (
      <>
        MTGOSDK is intentionally designed against unattended gameplay and trade automation. It can
        inspect client state for user-interactive tools, but it does not expose UI-owned
        capabilities required to control gameplay or trades. Its runtime-type boundaries also block access
        to sensitive values such as user credentials.
        <br/>
        <br/>See the discussions of{' '}
        <a
          href="https://github.com/videre-project/MTGOSDK/issues/39"
          target="_blank"
          rel="noreferrer"
        >
          trade automation
        </a>{' '}
        and{' '}
        <a
          href="https://github.com/videre-project/MTGOSDK/issues/41"
          target="_blank"
          rel="noreferrer"
        >
          bot detection
        </a>{' '}
        for more technical details and how these safeguards relate to the{' '}
        <a href="https://www.mtgo.com/en/mtgo/eula" target="_blank" rel="noreferrer">
          MTGO EULA
        </a>{' '}
        and{' '}
        <a href="https://www.daybreakgames.com/terms-of-service" target="_blank" rel="noreferrer">
          Daybreak&apos;s terms
        </a>
        .
      </>
    ),
  },
  {
    question: 'Do I need Tracker to use the Videre API?',
    answer: (
      <>
        No. The Videre API is independent of Tracker and provides MTGO catalog, tournament, and
        metagame data. Its HTTP routes do not require an API key.
      </>
    ),
  },
  {
    question: 'Where does Videre Tracker get its data?',
    answer: (
      <>
        Tracker reads your live MTGO client through{' '}
        <a href="https://github.com/videre-project/MTGOSDK" target="_blank" rel="noreferrer">
          MTGOSDK
        </a>
        {' '}and stores the resulting history in local SQLite databases. It also uses the Videre API
        for card information and market prices.{' '}
        <a href="https://github.com/videre-project/CardExporter" target="_blank" rel="noreferrer">
          CardExporter
        </a>{' '}
        supplies catalog data through{' '}
        <a href="https://github.com/videre-project/mtgo-db" target="_blank" rel="noreferrer">
          mtgo-db
        </a>
        .
      </>
    ),
  },
  {
    question: 'Does Videre Tracker run locally?',
    answer: (
      <>
        Yes. Tracker and its API run on your computer. Your data is stored locally, while Tracker
        connects to the hosted Videre API for card information and market prices. You can also
        clone the{' '}
        <a href="https://github.com/videre-project/Tracker" target="_blank" rel="noreferrer">
          Tracker repository
        </a>{' '}
        and build it yourself.
      </>
    ),
  },
] as const;

export const FrequentlyAskedQuestions: React.FC = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="faq-section" aria-labelledby="faq-heading">
      <div className="container faq-layout">
        <div className="faq-copy">
          <p className="faq-eyebrow">Frequently asked questions</p>
          <h2 id="faq-heading">A few things before you start</h2>
          <p className="text-sm text-muted">
            Videre connects your local Tracker data with the separate, hosted Videre API.
            Here&apos;s how the pieces fit together.
          </p>
        </div>

        <div className="faq-list">
          {questions.map(({ question, answer }, index) => {
            const isOpen = index === openIndex;
            const buttonId = `faq-question-${index}`;
            const panelId = `faq-answer-${index}`;

            return (
              <div className="faq-item" data-open={isOpen} key={question}>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(index)}
                >
                  <span>{question}</span>
                  <ChevronDown className="faq-chevron" size={18} aria-hidden="true" />
                </button>
                <div
                  id={panelId}
                  className="faq-answer-panel"
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                >
                  <div className="faq-answer-clip">
                    <div className="faq-answer text-sm text-muted">{answer}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer" style={{
      borderTop: '1px solid hsl(var(--sidebar-border) / 0.6)',
      marginTop: 'auto',
    }}>
      <div className="container" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
        <div className="site-footer-main" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 'var(--space-2xl)',
          marginBottom: 'var(--space-xl)',
        }}>
          <div className="site-footer-description">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Videre Project</span>
            </div>
            <p className="text-xs text-muted" style={{ maxWidth: '420px', lineHeight: 1.6 }}>
              We build open-source software and research for Magic: The Gathering. Our work combines
              real-time game tracking and action-by-action replays with public tournament data and
              model-assisted archetype classification.
            </p>
          </div>

          <div>
            <p className="text-xxs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Repositories
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: 'Videre Tracker', href: 'https://github.com/videre-project/Tracker' },
                { label: 'MTGOSDK', href: 'https://github.com/videre-project/MTGOSDK' },
                { label: 'Videre Services', href: 'https://github.com/videre-project/videre-project' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted"
                  style={{ transition: 'color 150ms', lineHeight: 1.6 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
                  onMouseLeave={e => (e.currentTarget.style.color = '')}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xxs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Resources
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <a
                href="https://github.com/videre-project/platform/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted"
                style={{ transition: 'color 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
                onMouseLeave={e => (e.currentTarget.style.color = '')}
              >
                Apache License 2.0
              </a>
              <a
                href="https://api.videreproject.com/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted"
                style={{ transition: 'color 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
                onMouseLeave={e => (e.currentTarget.style.color = '')}
              >
                OpenAPI Spec
              </a>
            </div>
          </div>
        </div>

        <div className="separator separator-subtle" style={{ margin: '0 0 var(--space-md) 0' }} />

        <div className="site-footer-bottom" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <span className="text-xxs text-dim">
            © 2020–2026 Videre Project
          </span>
          <span className="site-footer-legal text-xxs text-dim" style={{ maxWidth: '760px', textAlign: 'right', lineHeight: 1.5 }}>
            Videre Project is unofficial Fan Content permitted under the{' '}
            <a
              href="https://company.wizards.com/en/legal/fancontentpolicy"
              target="_blank"
              rel="noreferrer"
            >
              Wizards of the Coast Fan Content Policy
            </a>
            . Not approved or endorsed by Wizards of the Coast or affiliated with Daybreak Games.
            Portions of the materials used are property of Wizards of the Coast LLC.
            {' '}© Wizards of the Coast LLC.
          </span>
        </div>
      </div>
    </footer>
  );
};

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import './Header.css';

export function navigateTo(path: string) {
  return (event: React.MouseEvent<HTMLElement>) => {
    if (window.location.pathname === path) return;
    event.preventDefault();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
}

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: isScrolled
        ? '1px solid hsl(var(--sidebar-border) / 0.6)'
        : '1px solid transparent',
      background: isScrolled
        ? 'hsl(var(--background) / 0.85)'
        : 'transparent',
      backdropFilter: isScrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
      transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '3.5rem',
        position: 'relative',
      }}>
        {/* Logo + brand */}
        <a
          href="/"
          aria-label="Videre Project home"
          onClick={navigateTo('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'inherit', textDecoration: 'none' }}
        >
          <img
            src="/logo-small.png"
            alt="Videre Project Logo"
            width={64}
            height={52}
            style={{
              height: '18px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
          <span className="site-brand-name" style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'hsl(var(--foreground))',
            letterSpacing: '-0.01em',
          }}>
            Videre Project
          </span>
        </a>

        <nav className="site-primary-nav" aria-label="Primary navigation">
          <a
            href="/events"
            onClick={navigateTo('/events')}
            className={window.location.pathname.startsWith('/events') ? 'is-active' : undefined}
            aria-current={window.location.pathname.startsWith('/events') ? 'page' : undefined}
          >
            Events
          </a>
          <a
            href="/metagame"
            onClick={navigateTo('/metagame')}
            className={window.location.pathname.startsWith('/metagame') ? 'is-active' : undefined}
            aria-current={window.location.pathname.startsWith('/metagame') ? 'page' : undefined}
          >
            Metagame
          </a>
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="https://github.com/videre-project"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            title="View on GitHub"
            aria-label="View on GitHub"
          >
            <Github size={16} />
          </a>
        </div>
      </div>
    </header>
  );
};

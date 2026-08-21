/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, BarChart3, Database, RotateCw, Loader2 } from 'lucide-react';

interface Endpoint {
  category: 'Metagame & Tournament' | 'Cards & Catalog';
  method: string;
  path: string;
  queryExample: string;
  requestBody?: string;
  summary: string;
  description: string;
}

const ALL_VIDERE_ENDPOINTS: Endpoint[] = [
  // --- Metagame & Tournament Intelligence ---
  {
    category: 'Metagame & Tournament',
    method: 'GET',
    path: '/metagame',
    queryExample: '/modern',
    summary: 'Format metagame shares & win rates',
    description: 'Retrieve live archetype meta shares, match win rates, 95% confidence intervals, and game counts for a format.',
  },
  {
    category: 'Metagame & Tournament',
    method: 'GET',
    path: '/archetypes',
    queryExample: '/modern',
    summary: 'Archetype deck statistics & card counts',
    description: 'Card inclusion rates, total counts, and average copy counts across mainboard and sideboard.',
  },
  {
    category: 'Metagame & Tournament',
    method: 'GET',
    path: '/matchups',
    queryExample: '/modern',
    summary: 'Head-to-head matchup win matrix',
    description: 'Pairwise archetype win rates, match counts, and confidence intervals.',
  },
  {
    category: 'Metagame & Tournament',
    method: 'GET',
    path: '/events',
    queryExample: '/modern?limit=5',
    summary: 'MTGO tournament events & metadata',
    description: 'Query MTGO Challenges, Preliminaries, and Leagues with player counts and round numbers.',
  },
  {
    category: 'Metagame & Tournament',
    method: 'GET',
    path: '/decks',
    queryExample: '/modern?limit=3',
    summary: 'Tournament decklists & placements',
    description: 'Fetch full 75-card mainboard and sideboard lists with player handles and archetype associations.',
  },
  {
    category: 'Metagame & Tournament',
    method: 'GET',
    path: '/matches',
    queryExample: '/modern?limit=3',
    summary: 'Match telemetry & round results',
    description: 'MTGO round results, opponent handles, player records, and game score details.',
  },

  // --- Cards & Catalog Data ---
  {
    category: 'Cards & Catalog',
    method: 'GET',
    path: '/cards',
    queryExample: '?q=c:blue+t:instant&limit=3',
    summary: 'Search card catalog',
    description: 'Full query search across card names, types, text, colors, rarities, legalities, and sets.',
  },
  {
    category: 'Cards & Catalog',
    method: 'QUERY',
    path: '/cards/search',
    queryExample: '?q=t:instant&limit=3',
    requestBody: '{\n  "collection": {\n    "ids": [67014, 93020],\n    "mode": "only"\n  }\n}',
    summary: 'Search cards with collection filter',
    description: 'Filter search results against an array of owned MTGO catalog IDs using only, exclude, or rank modes.',
  },
  {
    category: 'Cards & Catalog',
    method: 'GET',
    path: '/cards/named',
    queryExample: '?exact=Counterspell',
    summary: 'Find card by exact/fuzzy name',
    description: 'Returns card details, oracle text, legalities, and MTGO catalog IDs for exact or fuzzy card names.',
  },
  {
    category: 'Cards & Catalog',
    method: 'GET',
    path: '/cards/autocomplete',
    queryExample: '?q=Delver',
    summary: 'Autocomplete card names',
    description: 'Fast string completion endpoint for card names with optional token inclusion.',
  },
  {
    category: 'Cards & Catalog',
    method: 'GET',
    path: '/cards/42436',
    queryExample: '',
    summary: 'Get card by MTGO catalog ID',
    description: 'Fetch multi-face card structures, face rules text, powers/toughnesses, and catalog IDs directly.',
  },
  {
    category: 'Cards & Catalog',
    method: 'QUERY',
    path: '/prices',
    queryExample: '',
    requestBody: '{\n  "ids": [67014, 93020],\n  "date": "latest"\n}',
    summary: 'Get prices for catalog IDs',
    description: 'Fetch the latest or historical prices for a batch of MTGO catalog IDs with shared POST/QUERY response caching.',
  },
  {
    category: 'Cards & Catalog',
    method: 'GET',
    path: '/prices/67014',
    queryExample: '',
    summary: 'Get latest prices for catalog ID',
    description: 'Fetch latest buy/sell price, vendor source, and cardset details for an MTGO catalog ID.',
  },
];

/**
 * Chrome DevTools / VS Code style JSON syntax highlighter.
 */
function renderHighlightedJson(jsonString: string): React.ReactNode[] {
  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\]:,])/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(jsonString)) !== null) {
    if (match.index > lastIndex) {
      elements.push(jsonString.substring(lastIndex, match.index));
    }

    const token = match[0];
    const isKey = token.endsWith(':');

    if (isKey) {
      const keyName = token.slice(0, -1);
      elements.push(
        <span key={match.index} style={{ color: '#9cdcfe', fontWeight: 500 }}>
          {keyName}
        </span>
      );
      elements.push(
        <span key={match.index + '_colon'} style={{ color: '#808080' }}>
          :
        </span>
      );
    } else if (token.startsWith('"')) {
      elements.push(
        <span key={match.index} style={{ color: '#ce9178' }}>
          {token}
        </span>
      );
    } else if (token === 'true' || token === 'false') {
      elements.push(
        <span key={match.index} style={{ color: '#569cd6', fontWeight: 600 }}>
          {token}
        </span>
      );
    } else if (token === 'null') {
      elements.push(
        <span key={match.index} style={{ color: '#569cd6', fontStyle: 'italic' }}>
          {token}
        </span>
      );
    } else if (/^-?\d/.test(token)) {
      elements.push(
        <span key={match.index} style={{ color: '#b5cea8' }}>
          {token}
        </span>
      );
    } else {
      elements.push(
        <span key={match.index} style={{ color: '#808080' }}>
          {token}
        </span>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < jsonString.length) {
    elements.push(jsonString.substring(lastIndex));
  }

  return elements;
}

export const ApiPreview: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'Metagame & Tournament' | 'Cards & Catalog'>('Metagame & Tournament');
  const filteredEndpoints = useMemo(
    () => ALL_VIDERE_ENDPOINTS.filter(e => e.category === activeCategory),
    [activeCategory],
  );

  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  // Live fetch states
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<string>('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Fallback if index is out of bounds on category switch
  const safeIndex = selected < filteredEndpoints.length ? selected : 0;
  const ep = useMemo(
    () => filteredEndpoints[safeIndex] || ALL_VIDERE_ENDPOINTS[0],
    [filteredEndpoints, safeIndex],
  );

  const fullUrl = `https://api.videreproject.com${ep.path}${ep.queryExample}`;

  const curlRequest = ep.method === 'POST' || ep.method === 'QUERY'
    ? `curl -X ${ep.method} "${fullUrl}" -H "Content-Type: application/json" -d '${ep.requestBody}'`
    : `curl "${fullUrl}"`;

  const fetchLiveData = async (endpoint: Endpoint) => {
    setLoading(true);
    setErrorText(null);
    const start = performance.now();

    try {
      const url = `https://api.videreproject.com${endpoint.path}${endpoint.queryExample}`;
      const res = endpoint.method === 'POST' || endpoint.method === 'QUERY'
        ? await fetch(url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: endpoint.requestBody,
          })
        : await fetch(url);

      const elapsed = Math.round(performance.now() - start);
      setExecTimeMs(elapsed);
      setStatusCode(res.status);

      const json = await res.json();
      setResponseJson(JSON.stringify(json, null, 2));
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Failed to fetch live response');
      setStatusCode(500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData(ep);
  }, [ep]);

  const handleCopy = () => {
    let command = `curl "${fullUrl}"`;
    if (ep.method === 'POST' || ep.method === 'QUERY') {
      command = `curl -X ${ep.method} "${fullUrl}" -H "Content-Type: application/json" -d '${ep.requestBody}'`;
    }
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="container" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ marginBottom: '0.35rem' }}>Videre Open API</h2>
        <p className="text-sm text-muted" style={{ maxWidth: '600px' }}>
          High-performance endpoints for metagame shares, archetype stats, matchup matrices, card catalogs, and live pricing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-md)' }}>
        {/* Endpoint list sidebar */}
        <div className="card card-padded" style={{ padding: 'var(--space-sm)', maxHeight: '520px', overflowY: 'auto' }}>
          {/* Integrated Sidebar Category Switcher */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2px',
            background: 'hsl(var(--muted) / 0.5)',
            padding: '2px',
            borderRadius: 'calc(var(--radius) - 2px)',
            marginBottom: 'var(--space-xs)',
          }}>
            <button
              className={`btn btn-xs ${activeCategory === 'Metagame & Tournament' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setActiveCategory('Metagame & Tournament'); setSelected(0); }}
              style={{ fontSize: '0.6875rem', padding: '0.35rem 0.25rem', gap: '0.25rem', justifyContent: 'center' }}
            >
              <BarChart3 size={12} /> Metagame & Analytics
            </button>
            <button
              className={`btn btn-xs ${activeCategory === 'Cards & Catalog' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setActiveCategory('Cards & Catalog'); setSelected(0); }}
              style={{ fontSize: '0.6875rem', padding: '0.35rem 0.25rem', gap: '0.25rem', justifyContent: 'center' }}
            >
              <Database size={12} /> Cards & Prices
            </button>
          </div>

          {/* Endpoint buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredEndpoints.map((item, i) => (
              <button
                key={`${item.method}-${item.path}`}
                className={`tab-btn ${safeIndex === i ? 'active' : ''}`}
                style={{ textAlign: 'left', width: '100%', padding: '0.5rem 0.6rem' }}
                onClick={() => setSelected(i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                  <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    color: item.method === 'POST' ? 'hsl(var(--emerald))' : 'hsl(var(--cyan))',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {item.method}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'hsl(var(--foreground))' }}>
                    {item.path}
                  </span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground) / 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.summary}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint detail */}
        <div className="card card-padded">
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className={`badge ${ep.method === 'POST' ? 'badge-emerald' : 'badge-primary'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                {ep.method}
              </span>
              <code style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {ep.path}{ep.queryExample}
              </code>
            </div>
            <p className="text-xs text-muted">{ep.description}</p>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span className="text-xxs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                cURL Request
              </span>
              <button onClick={handleCopy} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
                {copied ? <Check size={12} style={{ color: 'hsl(var(--emerald))' }} /> : <Copy size={12} />}
                <span className="text-xxs">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {curlRequest}
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-xxs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Response
                </span>
                {statusCode && (
                  <span className={`badge ${statusCode === 200 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)' }}>
                    {statusCode} {statusCode === 200 ? 'OK' : 'Error'}
                  </span>
                )}
                {execTimeMs !== null && (
                  <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}>
                    {execTimeMs}ms
                  </span>
                )}
              </div>
              <button
                onClick={() => fetchLiveData(ep)}
                disabled={loading}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.2rem 0.5rem', gap: '0.3rem' }}
                title="Re-fetch live response"
              >
                <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
                <span className="text-xxs">{loading ? 'Fetching...' : 'Re-fetch'}</span>
              </button>
            </div>

            <pre className="code-block" style={{ maxHeight: '260px', overflowY: 'auto', position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--muted-foreground))', padding: '1rem 0' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-mono">Fetching live response from api.videreproject.com...</span>
                </div>
              ) : errorText ? (
                <span style={{ color: 'hsl(var(--rose, 0 84% 60%))' }}>{errorText}</span>
              ) : (
                renderHighlightedJson(responseJson)
              )}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

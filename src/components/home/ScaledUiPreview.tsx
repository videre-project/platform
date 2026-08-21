/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { type ReactNode, useEffect, useState } from 'react';
import { useNearViewport } from '@/hooks/useNearViewport';

interface ScaledUiPreviewProps {
  width: number;
  height: number;
  children: ReactNode;
}

/** Keeps an application UI at its native geometry and scales the whole surface uniformly. */
export function ScaledUiPreview({ width, height, children }: ScaledUiPreviewProps) {
  const [containerRef, isNearViewport] = useNearViewport<HTMLDivElement>();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => setScale(Math.min(1, container.clientWidth / width));
    updateScale();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, width]);

  return (
    <div ref={containerRef} className="scaled-ui-preview" style={{ height: height * scale }}>
      {isNearViewport ? (
        <div
          className="scaled-ui-preview__surface"
          style={{ width, height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

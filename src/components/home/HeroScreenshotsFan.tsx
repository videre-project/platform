/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Screenshot {
  id: 'dashboard' | 'decks' | 'events' | 'tournament';
  src: string;
  thumbnailSrc: string;
  width: number;
  height: number;
  tabLabel: string;
  title: string;
  subtitle: string;
}

const SCREENSHOTS: Screenshot[] = [
  {
    id: 'dashboard',
    src: '/screenshots/full-res/Dashboard - December 14 2025.png',
    thumbnailSrc: '/screenshots/thumbnails/Dashboard - December 14 2025.webp',
    width: 1551,
    height: 924,
    tabLabel: 'Dashboard',
    title: 'Match performance dashboard',
    subtitle: 'Compare overall win rate, play and draw results, average match duration, and each deck\'s record.',
  },
  {
    id: 'events',
    src: '/screenshots/full-res/Events - August 8 2026.png',
    thumbnailSrc: '/screenshots/thumbnails/Events - August 8 2026.webp',
    width: 1919,
    height: 1022,
    tabLabel: 'Events',
    title: 'MTGO event schedule',
    subtitle: 'Browse scheduled tournaments by format, entry fee, player count, round structure, and start time.',
  },
  {
    id: 'tournament',
    src: '/screenshots/full-res/Events - Tournamaent 12851142.png',
    thumbnailSrc: '/screenshots/thumbnails/Events - Tournamaent 12851142.webp',
    width: 1919,
    height: 1016,
    tabLabel: 'Standings',
    title: 'Tournament standings and round progress',
    subtitle: 'Follow player records, points, tiebreakers, current matches, and completed round results.',
  },
  {
    id: 'decks',
    src: '/screenshots/full-res/Decks - Pauper Delver.png',
    thumbnailSrc: '/screenshots/thumbnails/Decks - Pauper Delver.webp',
    width: 1918,
    height: 1020,
    tabLabel: 'Deck editor',
    title: 'Deck editor and match history',
    subtitle: 'Review the main deck and sideboard, compare saved revisions, and inspect the deck\'s recorded matches.',
  },
];

const DASHBOARD_CROP_HEIGHT = 840;

export const HeroScreenshotsFan: React.FC = () => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const lightboxOpen = lightboxIndex !== null;

  const openLightbox = (index: number) => {
    lightboxTriggerRef.current = document.activeElement as HTMLElement | null;
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    window.requestAnimationFrame(() => lightboxTriggerRef.current?.focus());
  };

  const stepLightbox = (direction: -1 | 1) => {
    setLightboxIndex(current => {
      if (current === null) return current;
      return (current + direction + SCREENSHOTS.length) % SCREENSHOTS.length;
    });
  };

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    const handleDialogKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepLightbox(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepLightbox(1);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        lightboxRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleDialogKeyboard);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleDialogKeyboard);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const scene = sceneRef.current;
    if (!track || !sticky || !scene) return undefined;

    const animationMedia = window.matchMedia(
      '(min-width: 769px) and (prefers-reduced-motion: no-preference)',
    );
    const layers = Array.from(
      scene.querySelectorAll<HTMLButtonElement>('.hero-screenshot-layer'),
    );
    const viewports = layers.map(layer =>
      layer.querySelector<HTMLElement>('.hero-screenshot-viewport'),
    );
    const depths = [0, 55, 105, 155];
    let initialRects: Array<{ left: number; top: number; width: number }> = [];
    let targetRects: Array<{ left: number; top: number; width: number }> = [];
    let settledHeight = 0;
    let isSettled = false;
    let frameId = 0;

    const clearLayerGeometry = () => {
      layers.forEach(layer => {
        layer.style.removeProperty('left');
        layer.style.removeProperty('right');
        layer.style.removeProperty('top');
        layer.style.removeProperty('bottom');
        layer.style.removeProperty('width');
      });
    };

    const measure = () => {
      clearLayerGeometry();

      const sceneWidth = scene.clientWidth;
      const sceneHeight = scene.clientHeight;
      const sceneRect = scene.getBoundingClientRect();
      initialRects = layers.map(layer => {
        const layerRect = layer.getBoundingClientRect();
        return {
          left: layerRect.left - sceneRect.left,
          top: layerRect.top - sceneRect.top,
          width: layerRect.width,
        };
      });

      // Keep the target in the scene's own coordinate system so the grid
      // remains balanced as the desktop scene changes size.
      const gridWidth = sceneWidth * 0.48;
      const gridLeft = 0;
      const gridTop = sceneHeight * 0.06;
      const lowerLeft = sceneWidth * 0.02;
      const horizontalGap = sceneWidth * 0.02;
      const gridRight = gridLeft + gridWidth + horizontalGap;
      const lowerRight = lowerLeft + gridWidth + horizontalGap;
      const verticalGap = Math.min(16, sceneHeight * 0.02);
      const dashboardHeight = gridWidth * (DASHBOARD_CROP_HEIGHT / 1219);
      const eventsHeight = gridWidth * (1022 / 1589);
      const rightColumnOffset = dashboardHeight - eventsHeight;
      const lowerLeftTop = gridTop + dashboardHeight + verticalGap;
      const lowerRightTop = lowerLeftTop;
      targetRects = [
        { left: gridLeft, top: gridTop, width: gridWidth },
        { left: gridRight, top: gridTop + rightColumnOffset, width: gridWidth },
        // The lower pair follows the actual top-row heights, so the gaps stay
        // tight while retaining the subtle rose-petal stagger.
        { left: lowerRight, top: lowerRightTop, width: gridWidth },
        { left: lowerLeft, top: lowerLeftTop, width: gridWidth },
      ];

      const targetHeights = [
        dashboardHeight,
        gridWidth * (1022 / 1589),
        gridWidth * (1016 / 1589),
        gridWidth * (1020 / 1588),
      ];
      const contentHeight = Math.max(
        ...targetRects.map((target, index) => target.top + targetHeights[index]),
      ) + 8;
      // Never make settling expand the original scene. The wider panels can
      // overflow into the existing hero breathing room, but the next section
      // should not be pushed downward by the layout-mode switch.
      settledHeight = Math.min(sceneHeight, Math.ceil(contentHeight));
    };

    const interpolate = (from: number, to: number, amount: number) =>
      from + (to - from) * amount;

    const applyProgress = (progress: number) => {
      const clampedProgress = Math.max(0, Math.min(1, progress));
      scene.style.setProperty('--hero-grid-progress', String(clampedProgress));
      scene.style.setProperty(
        '--hero-perspective-opacity',
        String(1 - clampedProgress),
      );
      scene.style.setProperty(
        '--hero-glow-opacity',
        String(1 - clampedProgress * 0.6),
      );

      layers.forEach((layer, index) => {
        const viewport = viewports[index];
        if (!viewport) return;

        viewport.style.setProperty(
          '--hero-layer-depth',
          `${interpolate(depths[index], 0, clampedProgress)}px`,
        );
        viewport.style.setProperty(
          '--hero-layer-tilt',
          `${interpolate(48, 0, clampedProgress)}deg`,
        );
        viewport.style.setProperty(
          '--hero-layer-twist',
          `${interpolate(-20, 0, clampedProgress)}deg`,
        );
        viewport.style.setProperty(
          '--hero-layer-shadow-y',
          `${interpolate(30, 14, clampedProgress)}px`,
        );
        viewport.style.setProperty(
          '--hero-layer-shadow-blur',
          `${interpolate(55, 30, clampedProgress)}px`,
        );
        viewport.style.setProperty(
          '--hero-layer-shadow-opacity',
          String(interpolate(0.92, 0.68, clampedProgress)),
        );

        if (clampedProgress === 0) {
          // The original CSS owns the first frame, preserving the current 3D
          // composition without translating it through a new layout system.
          clearLayerGeometry();
          return;
        }

        const initial = initialRects[index];
        const target = targetRects[index];
        layer.style.left = `${interpolate(initial.left, target.left, clampedProgress)}px`;
        layer.style.top = `${interpolate(initial.top, target.top, clampedProgress)}px`;
        layer.style.width = `${interpolate(initial.width, target.width, clampedProgress)}px`;
        layer.style.right = 'auto';
        layer.style.bottom = 'auto';
      });
    };

    const setSettled = (settled: boolean) => {
      if (isSettled === settled) return;
      isSettled = settled;

      if (settled) {
        track.dataset.settled = 'true';
        track.style.setProperty('--hero-settled-height', `${settledHeight}px`);
      } else {
        delete track.dataset.settled;
        track.style.removeProperty('--hero-settled-height');
      }
    };

    const updateFromScroll = () => {
      frameId = 0;
      if (!animationMedia.matches) {
        setSettled(false);
        scene.dataset.scrollAnimation = 'inactive';
        applyProgress(0);
        return;
      }

      scene.dataset.scrollAnimation = 'active';
      const stickyTop = parseFloat(window.getComputedStyle(sticky).top) || 0;
      const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
      const nextProgress = (stickyTop - track.getBoundingClientRect().top) / travel;

      // Once the grid is complete, replace the old tall sticky scene with a
      // compact normal-flow scene. The track's top padding preserves its
      // viewport position while the next section moves up behind it.
      setSettled(nextProgress >= 0.999);
      applyProgress(nextProgress);
    };

    const requestUpdate = () => {
      if (frameId === 0) frameId = window.requestAnimationFrame(updateFromScroll);
    };

    const handleResize = () => {
      setSettled(false);
      measure();
      requestUpdate();
    };

    measure();
    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', handleResize);
    animationMedia.addEventListener('change', handleResize);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', handleResize);
      animationMedia.removeEventListener('change', handleResize);
      if (frameId) window.cancelAnimationFrame(frameId);
      setSettled(false);
      scene.dataset.scrollAnimation = 'inactive';
      clearLayerGeometry();
    };
  }, []);

  return (
    <div className="hero-product-showcase">
      <div className="hero-product-scroll-track" ref={trackRef}>
        <div className="hero-product-sticky" ref={stickyRef}>
          <div className="hero-product-scene" ref={sceneRef}>
            <div className="hero-product-glow" />

            {SCREENSHOTS.map((shot, index) => (
              <button
                key={shot.id}
                type="button"
                className={`hero-screenshot-layer hero-screenshot-layer--${shot.id} hero-screenshot-layer--slot-${index}`}
                onClick={() => openLightbox(index)}
                aria-label={`Open full ${shot.title} screenshot`}
              >
                <span className="hero-screenshot-viewport">
                  <img
                    src={shot.thumbnailSrc}
                    alt=""
                    width={shot.width}
                    height={shot.height}
                    decoding="async"
                    draggable={false}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && createPortal(
        <div
          className="screenshot-lightbox"
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Product screenshot viewer"
          onMouseDown={closeLightbox}
        >
          <button
            type="button"
            className="screenshot-lightbox-control screenshot-lightbox-close"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={closeLightbox}
            aria-label="Close screenshot viewer"
            autoFocus
          >
            <X size={20} />
          </button>

          <button
            type="button"
            className="screenshot-lightbox-control screenshot-lightbox-previous"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => stepLightbox(-1)}
            aria-label="Previous screenshot"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="screenshot-lightbox-stage" onMouseDown={(event) => event.stopPropagation()}>
            <div
              className={`screenshot-lightbox-image screenshot-lightbox-image--${SCREENSHOTS[lightboxIndex].id}`}
            >
              <img
                src={SCREENSHOTS[lightboxIndex].src}
                alt={`${SCREENSHOTS[lightboxIndex].title} interface`}
                width={SCREENSHOTS[lightboxIndex].width}
                height={SCREENSHOTS[lightboxIndex].height}
                decoding="async"
              />
            </div>
          </div>

          <button
            type="button"
            className="screenshot-lightbox-control screenshot-lightbox-next"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => stepLightbox(1)}
            aria-label="Next screenshot"
          >
            <ChevronRight size={22} />
          </button>

          <div
            className="screenshot-lightbox-thumbnails"
            role="tablist"
            aria-label="Product screenshots"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {SCREENSHOTS.map((shot, index) => (
              <button
                key={shot.id}
                type="button"
                role="tab"
                aria-label={shot.tabLabel}
                aria-selected={index === lightboxIndex}
                className={`screenshot-lightbox-thumbnail${index === lightboxIndex ? ' active' : ''}`}
                onClick={() => setLightboxIndex(index)}
              >
                <span className={`screenshot-lightbox-thumbnail-image screenshot-lightbox-thumbnail-image--${shot.id}`}>
                  <img
                    src={shot.thumbnailSrc}
                    alt=""
                    width={shot.width}
                    height={shot.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

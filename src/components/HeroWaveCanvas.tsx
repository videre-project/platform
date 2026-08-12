/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useEffect, useRef } from 'react';

export const HeroWaveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Vertical stroke gradient fading out towards the bottom
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, height);
      strokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      strokeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
      strokeGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.02)');
      strokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = strokeGrad;

      const lineCount = 28;
      const segments = 60;

      for (let i = 0; i < lineCount; i++) {
        const normalizedY = i / (lineCount - 1);
        const baseY = height * (-0.2 + normalizedY * 1.4);

        ctx.beginPath();
        for (let j = 0; j <= segments; j++) {
          const normalizedX = j / segments;

          const xOffset = Math.sin(normalizedY * 8.0 + normalizedX * 4.0 + time * 0.5) * 15.0;
          const x = width * normalizedX + xOffset;

          let offset = 0;
          offset += Math.sin(normalizedX * 5.0 + normalizedY * 4.0 + time) * 20.0;
          offset += Math.sin(normalizedX * 7.0 - normalizedY * 5.0 - time * 0.8) * 15.0;
          offset += Math.cos(normalizedX * 12.0 + normalizedY * 10.0 + Math.sin(normalizedX * 5.0) + time * 1.5) * 8.0;
          offset += Math.sin(normalizedX * 25.0 + time * 2.0) * 3.0;

          const y = baseY + offset;
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
      time += 0.008;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

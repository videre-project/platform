/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from 'lucide-react'

import { Button } from '../../primitives/Button'
import type { ReplaySnapshot } from '../../types/replay-types'

export interface ReplayTimelineProps {
  snapshots: ReplaySnapshot[]
  currentIndex: number
  onStepTo: (index: number) => void
}

export function ReplayTimeline({ snapshots, currentIndex, onStepTo }: ReplayTimelineProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const maxIndex = snapshots.length - 1

  useEffect(() => {
    if (playing) intervalRef.current = setInterval(() => onStepTo(currentIndex + 1), speed)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, currentIndex, speed, onStepTo])

  useEffect(() => {
    if (currentIndex >= maxIndex && playing) setPlaying(false)
  }, [currentIndex, maxIndex, playing])

  const togglePlay = useCallback(() => setPlaying(value => !value), [])
  const cycleSpeed = useCallback(() => {
    setSpeed(value => value === 1000 ? 500 : value === 500 ? 250 : 1000)
  }, [])
  const handleTrackClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || maxIndex <= 0) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    onStepTo(Math.round(ratio * maxIndex))
  }, [maxIndex, onStepTo])
  const progress = maxIndex > 0 ? ((currentIndex + 1) / (maxIndex + 1)) * 100 : 0

  return (
    <div className="flex flex-col gap-2 bg-card/50 px-4 pt-3">
      <div ref={trackRef} onClick={handleTrackClick} className="group relative h-3 cursor-pointer rounded-full bg-muted/50">
        <div className="absolute left-0 top-0 h-full rounded-full bg-primary/60 transition-all duration-150" style={{ width: `${progress}%` }} />
        {snapshots.map((snapshot, index) => {
          const previous = index > 0 ? snapshots[index - 1] : null
          if (previous && snapshot.turnNumber === previous.turnNumber) return null
          const position = maxIndex > 0 ? (index / maxIndex) * 100 : 0
          return <div key={index} className="absolute top-0 h-full w-px bg-muted-foreground/20" style={{ left: `${position}%` }} title={`Turn ${snapshot.turnNumber}`} />
        })}
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow transition-all duration-150" style={{ left: `calc(${progress}% - 7px)` }} />
      </div>

      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStepTo(-1)} disabled={currentIndex <= -1} title="Jump to start"><SkipBack className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStepTo(currentIndex - 1)} disabled={currentIndex <= -1} title="Step backward"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay} disabled={maxIndex < 0} title={playing ? 'Pause' : 'Play'}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStepTo(currentIndex + 1)} disabled={currentIndex >= maxIndex} title="Step forward"><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStepTo(maxIndex)} disabled={currentIndex >= maxIndex} title="Jump to end"><SkipForward className="h-3.5 w-3.5" /></Button>
        <button onClick={cycleSpeed} className="ml-3 rounded bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/80" title="Cycle playback speed">{speed === 1000 ? '1x' : speed === 500 ? '2x' : '4x'}</button>
      </div>
    </div>
  )
}

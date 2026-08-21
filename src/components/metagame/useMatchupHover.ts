/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ActiveMatchup {
  row: string
  opponent: string
}

const ACTIVATE_DELAY = 32
const CLEAR_DELAY = 88

/** Keeps matchup highlighting stable while the pointer crosses cell boundaries. */
export function useMatchupHover() {
  const [activeMatchup, setActiveMatchup] = useState<ActiveMatchup | null>(null)
  const timerRef = useRef<number | null>(null)

  const cancelPendingChange = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const activateMatchup = useCallback((row: string, opponent: string) => {
    cancelPendingChange()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setActiveMatchup(current => (
        current?.row === row && current.opponent === opponent
          ? current
          : { row, opponent }
      ))
    }, ACTIVATE_DELAY)
  }, [cancelPendingChange])

  const deactivateMatchup = useCallback(() => {
    cancelPendingChange()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setActiveMatchup(null)
    }, CLEAR_DELAY)
  }, [cancelPendingChange])

  const resetMatchup = useCallback(() => {
    cancelPendingChange()
    setActiveMatchup(null)
  }, [cancelPendingChange])

  useEffect(() => () => cancelPendingChange(), [cancelPendingChange])

  return {
    activeMatchup,
    activateMatchup,
    deactivateMatchup,
    resetMatchup,
  }
}

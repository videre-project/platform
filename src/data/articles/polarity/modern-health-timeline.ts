/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { TimelineDataPoint } from './types'
import { MODERN_TIMELINE_2023 } from './modern-health/timeline-2023'
import { MODERN_TIMELINE_2024 } from './modern-health/timeline-2024'
import { MODERN_TIMELINE_2025 } from './modern-health/timeline-2025'
import { MODERN_TIMELINE_2026 } from './modern-health/timeline-2026'

export {
  BNR_MILESTONES,
  SET_MILESTONES,
  YEAR_MARKERS,
} from './modern-health/milestones'
export { getTimelineDeckPolarity } from './modern-health/polarity'

export const MODERN_DAILY_SERIES: TimelineDataPoint[] = [
  ...MODERN_TIMELINE_2023,
  ...MODERN_TIMELINE_2024,
  ...MODERN_TIMELINE_2025,
  ...MODERN_TIMELINE_2026,
]

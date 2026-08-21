/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'

interface MetagameMobileLabel {
  key: string
  content: ReactNode
  dimmed?: boolean
}

export function MetagameMobileLabelRail({
  heading,
  labels,
}: {
  heading: ReactNode
  labels: MetagameMobileLabel[]
}) {
  return (
    <div className="metagame-mobile-label-rail" aria-hidden="true">
      <header>{heading}</header>
      {labels.map(label => (
        <div
          key={label.key}
          className={`metagame-mobile-label-row${label.dimmed ? ' is-matchup-dimmed' : ''}`}
        >
          {label.content}
        </div>
      ))}
      <footer />
    </div>
  )
}

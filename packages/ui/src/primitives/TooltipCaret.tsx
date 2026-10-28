/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { forwardRef, type SVGProps } from 'react'

/** Downward caret; positioners rotate it toward the tooltip's anchor. */
export const TooltipCaret = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function TooltipCaret(props, ref) {
    return (
      <svg ref={ref} width={12} height={6} viewBox="0 0 12 6" aria-hidden="true" {...props}>
        <path d="M0 0H12L6 6Z" stroke="none" />
        <path d="M0 0L6 6L12 0" fill="none" strokeWidth={1} />
      </svg>
    )
  },
)

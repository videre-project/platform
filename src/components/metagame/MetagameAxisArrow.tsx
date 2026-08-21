/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export function MetagameAxisArrow({ direction }: { direction: 'up' | 'right' | 'down' }) {
  return (
    <svg
      className="metagame-axis-arrow"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      {direction === 'up' ? (
        <>
          <path d="M6 10V2" />
          <path d="m3.5 4.5 2.5-2.5 2.5 2.5" />
        </>
      ) : direction === 'down' ? (
        <>
          <path d="M6 2v8" />
          <path d="m3.5 7.5 2.5 2.5 2.5-2.5" />
        </>
      ) : (
        <>
          <path d="M2 6h8" />
          <path d="m7.5 3.5 2.5 2.5-2.5 2.5" />
        </>
      )}
    </svg>
  )
}

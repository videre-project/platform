/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { CSSProperties, ReactNode } from 'react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import './SiteLayout.css'

export function SiteLayout({
  children,
  mainClassName,
  mainStyle,
}: {
  children: ReactNode
  mainClassName?: string
  mainStyle?: CSSProperties
}) {
  return (
    <div className="site-layout">
      <Header />
      <main className={mainClassName} style={mainStyle}>{children}</main>
      <Footer />
    </div>
  )
}

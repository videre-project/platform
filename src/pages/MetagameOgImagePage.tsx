/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { AlertCircle } from 'lucide-react'

import { MetagameChart } from '@/components/metagame/MetagameChart'
import { useMetagame } from '@/hooks/useMetagame'
import { readMetagameShareParameters } from '@/utils/metagameShareParameters'
import './MetagamePage.css'
import './MetagameOgImagePage.css'

export default function MetagameOgImagePage() {
  const { format, dateRange } = readMetagameShareParameters(window.location.search)
  const { data, loading, error } = useMetagame(format, dateRange)
  const ready = !loading

  return (
    <main
      className="metagame-og-image"
      data-metagame-og-ready={ready ? 'true' : undefined}
      aria-label={`${format} metagame share image`}
    >
      {error ? (
        <section className="metagame-og-error">
          <AlertCircle size={28} />
          <div>
            <h1>{format} Metagame</h1>
            <p>Metagame data was unavailable while generating this preview.</p>
          </div>
        </section>
      ) : (
        <MetagameChart
          data={data}
          format={format}
          from={dateRange.from}
          to={dateRange.to}
          loading={loading}
          staticRender
        />
      )}
    </main>
  )
}

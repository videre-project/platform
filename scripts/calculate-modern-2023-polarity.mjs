import fs from 'node:fs/promises'

const matchupPath = process.argv[2] ?? '/tmp/modern-2023-paper-matchups.json'
const outputPath = process.argv[3] ?? '/tmp/modern-2023-polarity.json'
const overridesPath = process.argv[4] ?? '/tmp/modern-2023-decklist-overrides.json'
const windowMode = process.argv[5] ?? 'coverage'
const source = JSON.parse(await fs.readFile(matchupPath, 'utf8'))
const decklistOverrides = new Map(JSON.parse(await fs.readFile(overridesPath, 'utf8')).decklists
  .map((entry) => [entry.decklistId, entry.canonicalArchetype]))

const endpointDates = [
  '2023-06-01', '2023-06-08', '2023-06-15', '2023-06-17', '2023-06-23', '2023-06-29',
  '2023-07-06', '2023-07-13', '2023-07-20', '2023-07-27', '2023-08-03',
  '2023-08-10', '2023-08-17', '2023-08-24', '2023-08-31', '2023-09-05',
  '2023-09-14', '2023-09-21', '2023-09-28', '2023-10-05', '2023-10-12',
  '2023-10-19', '2023-10-26', '2023-11-02', '2023-11-09', '2023-11-14',
  '2023-11-23', '2023-11-30', '2023-12-04', '2023-12-07', '2023-12-14',
  '2023-12-21',
]

// Estimate both matchup records and their field weights from the paper events in
// the same trailing 30-day window. Field diversity remains a separate MTGO series.
const LOTR_RELEASE = '2023-06-23'
const DECEMBER_BAN = '2023-12-04'
const TARGET_MATCHES = 3000

const isoDaysBefore = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}

function matchupEventsFor(endpoint) {
  const windowStart = isoDaysBefore(endpoint, 30)
  const eraStart = endpoint > DECEMBER_BAN
    ? DECEMBER_BAN
    : endpoint > LOTR_RELEASE
      ? LOTR_RELEASE
      : '0000-01-01'
  const closesPreviousEra = endpoint === DECEMBER_BAN || endpoint === LOTR_RELEASE
  const effectiveStart = windowStart > eraStart ? windowStart : eraStart
  const eligible = source.events
    .filter((event) => event.date >= effectiveStart && (closesPreviousEra ? event.date < endpoint : event.date <= endpoint))
    .sort((left, right) => left.date.localeCompare(right.date))
  if (windowMode !== 'coverage') return eligible

  const coverageEligible = source.events
    .filter((event) => event.date >= eraStart && (closesPreviousEra ? event.date < endpoint : event.date <= endpoint))
    .sort((left, right) => right.date.localeCompare(left.date))
  const selected = []
  let matches = 0
  for (const event of coverageEligible) {
    selected.push(event)
    matches += event.matches.length
    if (matches >= TARGET_MATCHES) break
  }
  return selected.sort((left, right) => left.date.localeCompare(right.date))
}

const paperAliases = new Map([
  ['Rakdos Grief', 'Rakdos Evoke'],
  ['Rakdos Scam', 'Rakdos Evoke'],
  ['Rakdos Midrange', 'Rakdos Evoke'],
  ['Mono-Green Tron', 'Tron'],
  ['Boros Burn', 'Burn'],
  ['Five-Color Creativity', 'Indomitable Creativity'],
  ['Five-Color Indomitable Creativity', 'Indomitable Creativity'],
  ['Jund Creativity', 'Indomitable Creativity'],
  ['Four-Color Rhinos', 'Temur Rhinos'],
  ['Mono-White Hammer', 'Hammer Time'],
  ['Azorius Hammer', 'Hammer Time'],
  ['Bant Hammer', 'Hammer Time'],
  ['Boros Hammer', 'Hammer Time'],
  ['Orzhov Hammer', 'Hammer Time'],
  ['Mono-Black Coffers', 'Mono Black Coffers'],
  ['Mono-Green Hardened Scales', 'Hardened Scales'],
  ['Simic Hardened Scales', 'Hardened Scales'],
  ['Yawgmoth Evolution', 'Golgari Yawgmoth'],
  ['Jund Yawgmoth', 'Golgari Yawgmoth'],
  ['Mono-Blue Yawgmoth', 'Golgari Yawgmoth'],
  ['Jund Sagavan', 'Jund Saga'],
  ['Four-Color Omnath', '4 Color Omnath'],
  ['Five-Color Omnath', '5c Omnath'],
  ['Four-color Elementals', '4 Color Omnath'],
  ['Five-color Elementals', '5c Omnath'],
  ['Four-color Midrange', '4 Color Omnath'],
  ['Five-color Control', '5c Omnath'],
  ['Urza ThopterSword', 'Thopter Combo'],
  ['Titanshift', 'Titan Shift'],
  ['Jeskai Breach', 'Grinding Station'],
  ['Artifact Breach', 'Grinding Station'],
])

const canonicalPaper = (player) => {
  const override = decklistOverrides.get(player.decklistId)
  if (override === 'Up the Beanstalk') return override
  let name = paperAliases.get(player.archetype) ?? player.archetype
  if (override === '4 Color Omnath') {
    name = /Five-/i.test(player.archetype) ? '5c Omnath' : '4 Color Omnath'
  }
  return name
}

const matchupKey = (left, right) => left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`

function adjustedDisparity(wins, losses, draws) {
  const count = wins + losses + draws
  if (count < 2) return 0
  const p = (wins + draws * 0.5) / count
  const z = Math.abs(2 * p - 1)
  const variance = (4 * p * (1 - p)) / (count - 1)
  return z === 0 ? 0 : (z * z) / Math.sqrt(z * z + variance)
}

function addMatch(records, left, right, result) {
  const key = matchupKey(left, right)
  if (!records.has(key)) records.set(key, { left: key.split('\u0000')[0], right: key.split('\u0000')[1], leftWins: 0, rightWins: 0, draws: 0 })
  const record = records.get(key)
  if (result === 'draw') record.draws += 1
  else {
    const winner = result === 'left' ? left : right
    if (winner === record.left) record.leftWins += 1
    else record.rightWins += 1
  }
}

const results = []
for (const endpoint of endpointDates) {
  const events = matchupEventsFor(endpoint)
  const counts = new Map()
  for (const event of events) {
    const entrants = new Map()
    for (const match of event.matches) {
      for (const player of [match.left, match.right]) {
        entrants.set(player.decklistId ?? player.displayName, player)
      }
    }
    for (const player of entrants.values()) {
      const name = canonicalPaper(player)
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  const top16 = [...counts].sort((left, right) => right[1] - left[1]).slice(0, 16)
  const fieldTotal = [...counts.values()].reduce((sum, count) => sum + count, 0)
  const topTotal = top16.reduce((sum, [, count]) => sum + count, 0)
  const shares = new Map(top16.map(([name, count]) => [name, count / topTotal]))

  const records = new Map()
  const overall = new Map()
  for (const event of events) {
    for (const match of event.matches) {
      const left = canonicalPaper(match.left)
      const right = canonicalPaper(match.right)
      if (!left || !right || left === right) continue
      addMatch(records, left, right, match.result)
      for (const [name, ownResult] of [[left, match.result], [right, match.result === 'left' ? 'right' : match.result === 'right' ? 'left' : 'draw']]) {
        if (!overall.has(name)) overall.set(name, { wins: 0, losses: 0, draws: 0 })
        const record = overall.get(name)
        if (ownResult === 'left') record.wins += 1
        else if (ownResult === 'right') record.losses += 1
        else record.draws += 1
      }
    }
  }

  let numerator = 0
  let denominator = 0
  let observedDenominator = 0
  let observedPairs = 0
  const pairContributions = []
  for (let leftIndex = 0; leftIndex < top16.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < top16.length; rightIndex += 1) {
      const left = top16[leftIndex][0]
      const right = top16[rightIndex][0]
      const weight = 2 * shares.get(left) * shares.get(right)
      const record = records.get(matchupKey(left, right))
      const disparity = record ? adjustedDisparity(record.leftWins, record.rightWins, record.draws) : 0
      if (record) {
        observedPairs += 1
        observedDenominator += weight
      }
      numerator += weight * disparity
      denominator += weight
      if (record) {
        pairContributions.push({
          left,
          right,
          weight,
          matches: record.leftWins + record.rightWins + record.draws,
          leftWins: record.leftWins,
          rightWins: record.rightWins,
          draws: record.draws,
          disparity: disparity * 100,
        })
      }
    }
  }

  const deckWinRates = Object.fromEntries(top16.map(([name]) => {
    const record = overall.get(name)
    const count = record ? record.wins + record.losses + record.draws : 0
    return [name, count ? (record.wins + record.draws * 0.5) / count * 100 : null]
  }))
  const allWinRates = Object.fromEntries([...overall].map(([name, record]) => {
    const count = record.wins + record.losses + record.draws
    return [name, count ? (record.wins + record.draws * 0.5) / count * 100 : null]
  }))
  const matchCount = [...records.values()].reduce((sum, record) => sum + record.leftWins + record.rightWins + record.draws, 0)
  const observedWeight = denominator ? observedDenominator / denominator : 0
  const hasUsableCoverage = matchCount > 0 && observedWeight >= 0.5

  // Per-archetype polarity: for each top-16 deck i, the weighted average
  // disparity of its observed matchups against the other 15 archetypes.
  // The observed-weight denominator is renormalized so unobserved pairings
  // do not pull the value toward zero, matching the format-level pMeta.
  const archetypePolarities = {}
  if (hasUsableCoverage) {
    for (const [deckName, deckShare] of shares) {
      let num = 0
      let den = 0
      for (const [otherName, otherShare] of shares) {
        if (otherName === deckName) continue
        const weight = 2 * deckShare * otherShare
        const record = records.get(matchupKey(deckName, otherName))
        if (!record) continue
        const disparity = adjustedDisparity(
          record.left === deckName ? record.leftWins : record.rightWins,
          record.left === deckName ? record.rightWins : record.leftWins,
          record.draws,
        )
        num += weight * disparity
        den += weight
      }
      archetypePolarities[deckName] = den > 0 ? num / den * 100 : null
    }
  }
  results.push({
    endpoint,
    matchupWindowStart: events[0]?.date ?? null,
    matchupWindowEnd: events.at(-1)?.date ?? null,
    paperEvents: events.map((event) => ({ date: event.date, title: event.title, meleeId: event.meleeId })),
    matchCount,
    observedPairs,
    possiblePairs: top16.length * (top16.length - 1) / 2,
    observedWeight,
    pMeta: hasUsableCoverage && observedDenominator ? numerator / observedDenominator * 100 : null,
    observedPairPmeta: hasUsableCoverage && observedDenominator ? numerator / observedDenominator * 100 : null,
    pairContributions: pairContributions
      .map((pair) => ({ ...pair, contribution: observedDenominator ? pair.weight * pair.disparity / observedDenominator : 0 }))
      .sort((left, right) => right.contribution - left.contribution),
    winRates: hasUsableCoverage ? allWinRates : {},
    archetypePolarities,
    sampleArchetypes: [...overall].map(([name, record]) => ({
      name,
      matches: record.wins + record.losses + record.draws,
    })).sort((left, right) => right.matches - left.matches),
    top16: top16.map(([name, count]) => ({
      name,
      count,
      share: count / topTotal * 100,
      fieldShare: count / fieldTotal * 100,
      winRate: hasUsableCoverage ? deckWinRates[name] : null,
      polarity: archetypePolarities[name] ?? null,
    })),
  })
}

await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`)
console.error(`Wrote ${outputPath}`)
for (const result of results) {
  console.log(`${result.endpoint}: events=${result.paperEvents.length}, matches=${result.matchCount}, pairs=${result.observedPairs}/${result.possiblePairs}, weight=${(result.observedWeight * 100).toFixed(0)}%, pMeta=${result.pMeta?.toFixed(1) ?? 'n/a'}%, observed=${result.observedPairPmeta?.toFixed(1) ?? 'n/a'}%`)
}

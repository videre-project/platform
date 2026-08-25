/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { MetagameData } from './metagameData'
import type { SideboardingData } from '@/hooks/useSideboarding'

export interface ArchetypePolarityMetric {
  archetype: string
  percentage: number // Metagame share %
  concentrationIndex: number // Share of format HHI contributed by this archetype (%)
  polarity: number // Overall de-biased weighted polarity % (0–100)
  polarityConfidenceInterval: number // Parametric bootstrap 95% CI half-width
  gameOnePolarity: number | null // Pre-board polarity % (0–100)
  postboardPolarity: number | null // Post-board polarity % (0–100)
}

export interface MetagamePolarityData {
  rows: ArchetypePolarityMetric[]
  overallPolarity: number
  effectiveDecks: number
  effectiveDiversityRatio: number
  archetypeCount: number
  gameOneMeanPolarity: number | null
  postboardMeanPolarity: number | null
}

interface BootstrapMatchup {
  archetype: string
  opponent: string
  overallWinrate: number
  overallGames: number
}

interface SideboardingMatchup {
  gameOneWinrate: number | null
  gameOneGames: number | null
  postboardWinrate: number | null
  postboardGames: number | null
}

const POLARITY_BOOTSTRAP_ITERATIONS = 400
const MATCHUP_KEY_SEPARATOR = '\u0000'

function matchupKey(archetype: string, opponent: string) {
  return `${archetype}${MATCHUP_KEY_SEPARATOR}${opponent}`
}

function createSeededRandom(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function sampleBinomial(gameCount: number, winProbability: number, random: () => number): number {
  if (gameCount <= 0 || winProbability <= 0) return 0
  if (winProbability >= 1) return gameCount

  if (gameCount < 20) {
    let wins = 0
    for (let game = 0; game < gameCount; game += 1) {
      if (random() < winProbability) wins += 1
    }
    return wins
  }

  // A Gaussian approximation keeps the fixed-size simulation inexpensive for larger samples.
  const u1 = Math.max(1e-10, random())
  const u2 = random()
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  const mean = gameCount * winProbability
  const standardDeviation = Math.sqrt(gameCount * winProbability * (1.0 - winProbability))
  const sample = Math.round(mean + z * standardDeviation)
  return Math.min(gameCount, Math.max(0, sample))
}

function percentile(values: number[], percentileRank: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const position = (sorted.length - 1) * percentileRank
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + ((sorted[upper] - sorted[lower]) * (position - lower))
}

function computePolarityConfidenceIntervals(
  rows: ArchetypePolarityMetric[],
  matchups: BootstrapMatchup[],
  normalizedShares: Map<string, number>,
) {
  const rowIndex = new Map(rows.map((row, index) => [row.archetype, index]))
  const opponentWeights = rows.map(row => rows.reduce(
    (total, opponent) => opponent.archetype === row.archetype
      ? total
      : total + (normalizedShares.get(opponent.archetype) ?? 0),
    0,
  ))
  const samples = rows.map(() => []) as number[][]
  const random = createSeededRandom(0x706f6c)

  for (let iteration = 0; iteration < POLARITY_BOOTSTRAP_ITERATIONS; iteration += 1) {
    const weightedDisparities = rows.map(() => 0)

    for (const matchup of matchups) {
      const index = rowIndex.get(matchup.archetype)
      if (index === undefined) continue

      const games = matchup.overallGames
      const wins = games > 1
        ? sampleBinomial(games, matchup.overallWinrate / 100, random)
        : 0
      const winrate = games > 0 ? (wins / games) * 100 : 50
      const disparity = computeSmoothRationalDisparity(winrate, games)
      weightedDisparities[index] += (
        (normalizedShares.get(matchup.opponent) ?? 0) * disparity
      )
    }

    for (let index = 0; index < rows.length; index += 1) {
      samples[index].push(opponentWeights[index] > 0
        ? weightedDisparities[index] / opponentWeights[index]
        : 0)
    }
  }

  return samples.map(values => {
    const lower = percentile(values, 0.025)
    const upper = percentile(values, 0.975)
    return (upper - lower) / 2
  })
}

/**
 * Computes the smooth rational de-biased matchup disparity.
 *
 * @param winrate Win rate percentage (0–100).
 * @param gameCount Total games played.
 * @returns De-biased disparity percentage (0–100).
 */
export function computeSmoothRationalDisparity(winrate: number, gameCount: number): number {
  if (gameCount <= 1 || !Number.isFinite(winrate)) return 0

  const winProbability = winrate / 100
  const z = Math.abs(2 * winProbability - 1)
  const variance = (4 * winProbability * (1 - winProbability)) / (gameCount - 1)
  if (z * z + variance <= 0) return 0

  const deBiased = (z * z) / Math.sqrt(z * z + variance)
  return Math.min(100, Math.max(0, deBiased * 100))
}

function indexOverallMatchups(metagame: MetagameData, archetypeNames: Set<string>) {
  const matchups = new Map<string, { winrate: number, games: number }>()
  for (const matchup of metagame.matchups) {
    if (archetypeNames.has(matchup.archetype) && archetypeNames.has(matchup.opponent)) {
      matchups.set(matchupKey(matchup.archetype, matchup.opponent), {
        winrate: matchup.winrate,
        games: matchup.games,
      })
    }
  }
  return matchups
}

function indexSideboardingMatchups(
  sideboarding: SideboardingData | null,
  archetypeNames: Set<string>,
) {
  const matchups = new Map<string, SideboardingMatchup>()
  if (!sideboarding) return matchups

  for (const matchup of sideboarding.matchups) {
    if (archetypeNames.has(matchup.archetype) && archetypeNames.has(matchup.opponent)) {
      matchups.set(matchupKey(matchup.archetype, matchup.opponent), {
        gameOneWinrate: matchup.gameOne.winrate,
        gameOneGames: matchup.gameOne.games,
        postboardWinrate: matchup.postboard?.winrate ?? null,
        postboardGames: matchup.postboard?.games ?? null,
      })
    }
  }
  return matchups
}

/** Computes the format and archetype polarity values displayed by the Health view. */
export function computeArchetypePolarities(
  metagame: MetagameData | null,
  sideboarding: SideboardingData | null,
): MetagamePolarityData | null {
  if (!metagame || metagame.archetypes.length === 0) return null

  const archetypes = metagame.archetypes.slice(0, 16)
  const archetypeNames = new Set(archetypes.map(archetype => archetype.archetype))
  const totalShare = archetypes.reduce((sum, archetype) => sum + archetype.percentage, 0)
  if (totalShare <= 0) return null

  const normalizedShares = new Map(
    archetypes.map(archetype => [archetype.archetype, archetype.percentage / totalShare]),
  )
  const overallMatchups = indexOverallMatchups(metagame, archetypeNames)
  const sideboardingMatchups = indexSideboardingMatchups(sideboarding, archetypeNames)
  const bootstrapMatchups: BootstrapMatchup[] = []
  const rows: ArchetypePolarityMetric[] = []

  let totalPolarityNumerator = 0
  let totalPolarityDenominator = 0
  let totalGameOneNumerator = 0
  let totalGameOneDenominator = 0
  let totalPostboardNumerator = 0
  let totalPostboardDenominator = 0

  for (const archetype of archetypes) {
    const archetypeName = archetype.archetype
    const archetypeShare = normalizedShares.get(archetypeName) ?? 0
    let weightedPolarity = 0
    let opponentWeight = 0
    let weightedGameOne = 0
    let gameOneWeight = 0
    let weightedPostboard = 0
    let postboardWeight = 0

    for (const opponent of archetypes) {
      const opponentName = opponent.archetype
      if (archetypeName === opponentName) continue

      const opponentShare = normalizedShares.get(opponentName) ?? 0
      const key = matchupKey(archetypeName, opponentName)
      const overall = overallMatchups.get(key)
      const overallWinrate = overall?.winrate ?? 50
      const overallGames = overall?.games ?? 0
      const overallPolarity = computeSmoothRationalDisparity(overallWinrate, overallGames)

      weightedPolarity += opponentShare * overallPolarity
      opponentWeight += opponentShare
      totalPolarityNumerator += archetypeShare * opponentShare * overallPolarity
      totalPolarityDenominator += archetypeShare * opponentShare
      bootstrapMatchups.push({
        archetype: archetypeName,
        opponent: opponentName,
        overallWinrate,
        overallGames,
      })

      const sideboardingMatchup = sideboardingMatchups.get(key)
      if (sideboardingMatchup && sideboardingMatchup.gameOneWinrate !== null && sideboardingMatchup.gameOneGames !== null && sideboardingMatchup.gameOneGames > 0) {
        const gameOnePolarity = computeSmoothRationalDisparity(
          sideboardingMatchup.gameOneWinrate,
          sideboardingMatchup.gameOneGames,
        )
        weightedGameOne += opponentShare * gameOnePolarity
        gameOneWeight += opponentShare
        totalGameOneNumerator += archetypeShare * opponentShare * gameOnePolarity
        totalGameOneDenominator += archetypeShare * opponentShare
      }

      if (sideboardingMatchup && sideboardingMatchup.postboardWinrate !== null && sideboardingMatchup.postboardGames !== null && sideboardingMatchup.postboardGames > 0) {
        const postboardPolarity = computeSmoothRationalDisparity(
          sideboardingMatchup.postboardWinrate,
          sideboardingMatchup.postboardGames,
        )
        weightedPostboard += opponentShare * postboardPolarity
        postboardWeight += opponentShare
        totalPostboardNumerator += archetypeShare * opponentShare * postboardPolarity
        totalPostboardDenominator += archetypeShare * opponentShare
      }
    }

    const polarity = opponentWeight > 0 ? weightedPolarity / opponentWeight : 0
    const gameOnePolarity = gameOneWeight > 0 ? weightedGameOne / gameOneWeight : null
    const postboardPolarity = postboardWeight > 0 ? weightedPostboard / postboardWeight : null

    rows.push({
      archetype: archetypeName,
      percentage: archetype.percentage,
      concentrationIndex: 0,
      polarity,
      polarityConfidenceInterval: 0,
      gameOnePolarity,
      postboardPolarity,
    })
  }

  const overallPolarity = totalPolarityDenominator > 0
    ? totalPolarityNumerator / totalPolarityDenominator
    : 0
  const topFractions = archetypes.map(archetype => normalizedShares.get(archetype.archetype) ?? 0)
  const formatHHI = topFractions.reduce((sum, share) => sum + share * share, 0)
  const effectiveDecks = formatHHI > 0 ? 1 / formatHHI : 0
  const archetypeCount = archetypes.length

  for (const row of rows) {
    const share = normalizedShares.get(row.archetype) ?? 0
    row.concentrationIndex = formatHHI > 0
      ? ((share * share) / formatHHI) * 100
      : 0
  }

  const polarityConfidenceIntervals = computePolarityConfidenceIntervals(
    rows,
    bootstrapMatchups,
    normalizedShares,
  )
  rows.forEach((row, index) => {
    row.polarityConfidenceInterval = polarityConfidenceIntervals[index] ?? 0
  })

  return {
    rows,
    overallPolarity,
    effectiveDecks,
    effectiveDiversityRatio: archetypeCount > 0 ? (effectiveDecks / archetypeCount) * 100 : 0,
    archetypeCount,
    gameOneMeanPolarity: totalGameOneDenominator > 0
      ? totalGameOneNumerator / totalGameOneDenominator
      : null,
    postboardMeanPolarity: totalPostboardDenominator > 0
      ? totalPostboardNumerator / totalPostboardDenominator
      : null,
  }
}

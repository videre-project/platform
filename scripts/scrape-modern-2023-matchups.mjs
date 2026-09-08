import fs from 'node:fs/promises'

const events = [
  [45783, 38286],
  [45771, 38959],
  [null, 15654],
  [45551, 38334],
  [45474, 30634],
  [45458, 30641],
  [45240, 25116],
  [45217, 25124],
  [45243, 32882],
  [45203, 25125],
  [45144, 17459],
  [45107, 17463],
  [44929, 24574],
  [44930, 24573],
  [44891, 24572],
  [44751, 23251],
  [44683, 16957],
  [44686, 16954],
  [44687, 17761],
  [44545, 15485],
  [44508, 19222],
  [44461, 16075],
  [44443, 15650],
  [44303, 16772],
  [44267, 16429],
  [44135, 16137],
  [44040, 16657],
  [43875, 14061],
  [43801, 15702],
  [43768, 15701],
  [43733, 15992],
]

const outputPath = process.argv[2] ?? '/tmp/modern-2023-paper-matchups.json'
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const decodeHtml = (value = '') => value
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&#39;', "'")
  .replaceAll('&#039;', "'")
  .replaceAll('&apos;', "'")
  .replaceAll('&quot;', '"')
  .replaceAll('&amp;', '&')
  .replaceAll(/<[^>]+>/g, '')
  .replaceAll(/\s+/g, ' ')
  .trim()

const normalizeName = (value = '') => decodeHtml(value)
  .normalize('NFKD')
  .replaceAll(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('en-US')
  .replaceAll(/[^a-z0-9]/g, '')

async function fetchText(url, options = {}, attempt = 1) {
  const response = await fetch(url, {
    ...options,
    headers: { 'user-agent': userAgent, ...options.headers },
  })
  if (!response.ok) {
    if (attempt < 4 && (response.status === 403 || response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 750))
      return fetchText(url, options, attempt + 1)
    }
    throw new Error(`${response.status} ${response.statusText}: ${url}`)
  }
  return response.text()
}

function parseGoldfish(html) {
  const title = decodeHtml(html.match(/<h2>([^<]+)<\/h2>/)?.[1])
  const date = html.match(/Date:\s*(\d{4}-\d{2}-\d{2})/)?.[1]
  const players = []
  const rowPattern = /<tr class='tournament-decklist(?:-odd|-event)?'>([\s\S]*?)<\/tr>/g
  for (const rowMatch of html.matchAll(rowPattern)) {
    const row = rowMatch[1]
    const archetype = decodeHtml(row.match(/<a href="\/deck\/\d+">([\s\S]*?)<\/a>/)?.[1])
    const player = decodeHtml(row.match(/<a href="\/player\/[^"]+">([\s\S]*?)<\/a>/)?.[1])
    if (player && archetype) players.push({ player, archetype })
  }
  return { title, date, players }
}

function parseMeleePage(html) {
  const title = decodeHtml(html.match(/property="og:title"[^>]*content="([^"]+)"/)?.[1]
    ?? html.match(/content="([^"]+)" property="og:title"/)?.[1])
  const date = html.match(/fa-calendar-alt[\s\S]{0,160}?data-value="(\d{4}-\d{2}-\d{2})/)?.[1]
  const pairings = html.match(/<div id="pairings"[\s\S]*?<table[^>]+id="tournament-pairings-table"/)?.[0] ?? ''
  const roundIds = [...new Set([...pairings.matchAll(/class="[^"]*round-selector[^"]*" data-id="(\d+)"/g)]
    .map((match) => Number(match[1])))]
  return { title, date, roundIds }
}

function pairingsForm() {
  const columns = [
    ['TableNumber', true, true],
    ['PodNumber', true, true],
    ['Teams', false, false],
    ['Decklists', false, false],
    ['ResultString', false, false],
  ]
  const body = new URLSearchParams({ draw: '1', start: '0', length: '2000' })
  for (const [index, [name, searchable, orderable]] of columns.entries()) {
    body.set(`columns[${index}][data]`, name)
    body.set(`columns[${index}][name]`, name)
    body.set(`columns[${index}][searchable]`, String(searchable))
    body.set(`columns[${index}][orderable]`, String(orderable))
    body.set(`columns[${index}][search][value]`, '')
    body.set(`columns[${index}][search][regex]`, 'false')
  }
  body.set('order[0][column]', '0')
  body.set('order[0][dir]', 'asc')
  body.set('search[value]', '')
  body.set('search[regex]', 'false')
  return body
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await mapper(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

async function fetchRound(roundId, meleeId) {
  const text = await fetchText(`https://melee.gg/Match/GetRoundMatches/${roundId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      referer: `https://melee.gg/Tournament/View/${meleeId}`,
    },
    body: pairingsForm(),
  })
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.data)) throw new Error(`No match data for Melee ${meleeId}, round ${roundId}`)
  return parsed.data
}

function competitorDetails(competitor) {
  const player = competitor.Team?.Players?.[0]
  const decklist = competitor.Decklists?.[0]
  return {
    displayName: decodeHtml(player?.DisplayName),
    username: decodeHtml(player?.Username),
    decklistId: decklist?.DecklistId ?? null,
    meleeArchetype: decodeHtml(decklist?.DecklistName),
    gameWins: competitor.GameWins ?? 0,
  }
}

function getGoldfishArchetype(competitor, goldfishByName) {
  const keys = [competitor.displayName, competitor.username].map(normalizeName).filter(Boolean)
  const matches = new Set(keys.flatMap((key) => goldfishByName.get(key) ?? []))
  return matches.size === 1 ? [...matches][0] : null
}

async function scrapeEvent([goldfishId, meleeId], index) {
  const meleeUrl = `https://melee.gg/Tournament/View/${meleeId}`
  const goldfishUrl = goldfishId ? `https://www.mtggoldfish.com/tournament/${goldfishId}` : null
  const [meleeHtml, goldfishHtml] = await Promise.all([
    fetchText(meleeUrl),
    goldfishUrl ? fetchText(goldfishUrl) : Promise.resolve(''),
  ])
  const melee = parseMeleePage(meleeHtml)
  const goldfish = goldfishHtml ? parseGoldfish(goldfishHtml) : { title: '', date: '', players: [] }
  if (!melee.roundIds.length) throw new Error(`No rounds found for Melee ${meleeId}`)

  const goldfishByName = new Map()
  for (const { player, archetype } of goldfish.players) {
    const key = normalizeName(player)
    if (!goldfishByName.has(key)) goldfishByName.set(key, [])
    goldfishByName.get(key).push(archetype)
  }

  const rounds = await mapLimit(melee.roundIds, 4, (roundId) => fetchRound(roundId, meleeId))
  const rawMatches = rounds.flat()
  const seen = new Set()
  const matches = []
  const players = new Map()

  for (const match of rawMatches) {
    if (seen.has(match.Guid)) continue
    seen.add(match.Guid)
    if (!match.HasResult || match.Competitors?.length !== 2) continue
    const competitors = match.Competitors.map(competitorDetails)
    if (competitors.some((competitor) => !competitor.displayName)) continue
    const [left, right] = competitors.map((competitor) => {
      const goldfishArchetype = getGoldfishArchetype(competitor, goldfishByName)
      const details = {
        ...competitor,
        goldfishArchetype,
        archetype: goldfishArchetype ?? competitor.meleeArchetype ?? null,
      }
      players.set(normalizeName(details.displayName), details)
      return details
    })
    if (!left.archetype || !right.archetype) continue
    matches.push({
      id: match.Guid,
      round: match.RoundDescription,
      left,
      right,
      result: left.gameWins === right.gameWins ? 'draw' : left.gameWins > right.gameWins ? 'left' : 'right',
    })
  }

  const playerList = [...players.values()]
  const joined = playerList.filter((player) => player.goldfishArchetype).length
  const disagreements = playerList.filter((player) => player.goldfishArchetype
    && player.meleeArchetype
    && normalizeName(player.goldfishArchetype) !== normalizeName(player.meleeArchetype))
  console.error(`[${index + 1}/${events.length}] ${goldfish.date || melee.date} ${meleeId}: ${matches.length} matches, ${joined}/${playerList.length} players joined, ${disagreements.length} label differences`)
  return {
    goldfishId,
    meleeId,
    title: goldfish.title || melee.title,
    date: goldfish.date || melee.date,
    sources: { goldfishUrl, meleeUrl },
    roundCount: melee.roundIds.length,
    playerCount: playerList.length,
    goldfishPlayerCount: goldfish.players.length,
    joinedPlayerCount: joined,
    disagreements,
    matches,
  }
}

const scraped = await mapLimit(events, 1, scrapeEvent)
scraped.sort((left, right) => left.date.localeCompare(right.date))
await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), events: scraped }, null, 2)}\n`)
console.error(`Wrote ${outputPath}`)

import fs from 'node:fs/promises'

const inputPath = process.argv[2] ?? '/tmp/modern-2023-paper-matchups.json'
const outputPath = process.argv[3] ?? '/tmp/modern-2023-decklist-overrides.json'
const source = JSON.parse(await fs.readFile(inputPath, 'utf8'))
const ambiguousLabels = new Set([
  'Four-color Control',
  'Four-Color Omnath',
  'Five-Color Omnath',
  'Four-color Elementals',
  'Five-color Elementals',
  'Four-color Midrange',
  'Five-color Control',
])

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

async function fetchDecklist(decklistId, attempt = 1) {
  const url = `https://melee.gg/Decklist/View/${decklistId}`
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    },
  })
  if (!response.ok) {
    if (attempt < 4 && (response.status === 403 || response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 750))
      return fetchDecklist(decklistId, attempt + 1)
    }
    throw new Error(`${response.status} ${response.statusText}: ${url}`)
  }
  const html = await response.text()
  const deck = html.match(/<pre class="d-none" id="decklist-text">([\s\S]*?)<\/pre>/)?.[1] ?? ''
  return {
    decklistId,
    hasBeanstalk: /\bUp the Beanstalk\b/i.test(deck),
    canonicalArchetype: /\bUp the Beanstalk\b/i.test(deck) ? 'Up the Beanstalk' : '4 Color Omnath',
  }
}

const candidates = new Map()
for (const event of source.events) {
  if (event.date < '2023-09-05') continue
  for (const match of event.matches) {
    for (const player of [match.left, match.right]) {
      if (!player.decklistId || !ambiguousLabels.has(player.archetype)) continue
      candidates.set(player.decklistId, {
        decklistId: player.decklistId,
        date: event.date,
        submittedArchetype: player.meleeArchetype,
        goldfishArchetype: player.goldfishArchetype,
      })
    }
  }
}

console.error(`Checking ${candidates.size} ambiguous decklists`)
const checks = await mapLimit([...candidates.values()], 4, async (candidate, index) => {
  const result = await fetchDecklist(candidate.decklistId)
  if ((index + 1) % 50 === 0 || index + 1 === candidates.size) console.error(`[${index + 1}/${candidates.size}]`)
  return { ...candidate, ...result }
})
await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), decklists: checks }, null, 2)}\n`)

const beanstalk = checks.filter((entry) => entry.hasBeanstalk).length
console.error(`Wrote ${outputPath}: ${beanstalk} Beanstalk, ${checks.length - beanstalk} non-Beanstalk`)

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from "react"
import { HighlightedText } from './highlighted-text'
import { getManaSymbolSvgPath } from "./mana-symbols"
import { getMtgoChatMarkupSymbol, getMtgoChatSymbolImagePath } from './mtgo-chat-symbols'

interface ParsedPart {
  type: "text" | "purple" | "card" | "mana" | "chatSymbol" | "italic" | "bold"
  value: string
  cardId?: number
  textureId?: number
}

function InlineSymbolImage({
  src,
  alt,
  fallback,
  className,
}: {
  src: string
  alt: string
  fallback: string
  className: string
}) {
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => setFailed(false), [src])

  return failed ? (
    <>{fallback}</>
  ) : (
    <img
      src={src}
      alt={alt}
      title={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function renderTextWithInlineMana(
  text: string,
  keyPrefix: string,
  symbolClassName: string,
  highlightText?: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = /\{([^}]+)\}/g
  let cursor = 0
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-t-${idx++}`}>
          <HighlightedText text={text.slice(cursor, match.index)} highlight={highlightText} />
        </React.Fragment>
      )
    }

    const symbol = match[1]
    const symbolPath = getManaSymbolSvgPath(symbol)
    if (symbolPath) {
      nodes.push(
        <InlineSymbolImage
          key={`${keyPrefix}-m-${idx++}`}
          src={symbolPath}
          alt={symbol}
          fallback={match[0]}
          className={symbolClassName}
        />
      )
    } else {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-r-${idx++}`}>
          {match[0]}
        </React.Fragment>
      )
    }

    cursor = re.lastIndex
  }

  if (cursor < text.length) {
    nodes.push(
      <React.Fragment key={`${keyPrefix}-t-${idx}`}>
        <HighlightedText text={text.slice(cursor)} highlight={highlightText} />
      </React.Fragment>
    )
  }

  return nodes
}

export function parseGameLogMarkup(text: string): ParsedPart[] {
  const parts: ParsedPart[] = []
  const len = text.length
  let buf = ""

  const flush = () => {
    if (buf) {
      parts.push({ type: "text", value: buf })
      buf = ""
    }
  }

  let i = 0
  while (i < len) {
    if (text[i] === "@" && i + 1 < len) {
      const next = text[i + 1]

      if (next === "P") {
        flush()
        i += 2
        let value = ""
        while (i < len && text[i] !== " " && text[i] !== "@") {
          value += text[i++]
        }
        if (i < len && text[i] === " ") {
          value += " "
          i++
        }
        parts.push({ type: "purple", value })
        continue
      }

      if (next === "[") {
        flush()
        i += 2
        let cardName = ""
        while (i < len && text[i] !== "@") {
          cardName += text[i++]
        }
        let nameToken = ""
        let textureId = ""
        while (i < len && (text[i] === "@" || text[i] === ":" || text[i] === "~")) i++
        while (i < len && text[i] !== "," && text[i] !== ":" && text[i] !== "@") {
          nameToken += text[i++]
        }
        while (i < len && (text[i] === "," || text[i] === ":" || text[i] === "@" || text[i] === "~")) i++
        while (i < len && text[i] !== "," && text[i] !== ":" && text[i] !== "@" && text[i] !== "]") {
          textureId += text[i++]
        }
        while (i < len && text[i] !== "]") i++
        if (i < len) i++

        const parsedCardId = parseInt(nameToken, 10)
        const parsedTextureId = parseInt(textureId, 10)
        parts.push({
          type: "card",
          value: cardName,
          cardId: isNaN(parsedCardId) ? undefined : parsedCardId,
          textureId: isNaN(parsedTextureId) ? undefined : parsedTextureId,
        })
        continue
      }

      if (next === "i") {
        flush()
        i += 2
        let value = ""
        while (i < len) {
          if (text[i] === "@" && i + 1 < len && text[i + 1] === "i") {
            i += 2
            break
          }
          value += text[i++]
        }
        if (value) parts.push({ type: "italic", value })
        continue
      }

      if (next === "/") {
        i += 2
        continue
      }
      if ("RbgYKH".includes(next)) {
        i += 2
        continue
      }

      buf += text[i++]
      continue
    }

    if (text[i] === "{") {
      const closeIdx = text.indexOf("}", i)
      if (closeIdx > i) {
        flush()
        const symbol = text.slice(i + 1, closeIdx)
        parts.push({ type: "mana", value: symbol })
        i = closeIdx + 1
        continue
      }
    }

    if (text[i] === '[') {
      if (text.startsWith('[b]', i)) {
        flush()
        i += 3
        let value = ''
        while (i < len) {
          if (text.startsWith('[/b]', i)) {
            i += 4
            break
          }
          value += text[i++]
        }
        if (value) parts.push({ type: 'bold', value })
        continue
      }

      const closeIdx = text.indexOf(']', i)
      if (closeIdx > i) {
        const symbol = getMtgoChatMarkupSymbol(text.slice(i + 1, closeIdx))
        if (symbol) {
          flush()
          parts.push(symbol)
          i = closeIdx + 1
          continue
        }
      }
    }

    buf += text[i++]
  }
  flush()
  return parts
}

export function GameLogText({
  text,
  className,
  manaSymbolClassName,
  highlightText,
}: {
  text: string
  className?: string
  manaSymbolClassName?: string
  highlightText?: string
}) {
  const parts = parseGameLogMarkup(text)
  const symbolClassName = manaSymbolClassName ?? "inline h-3.5 w-3.5 align-text-bottom mx-px"
  return (
    <span className={className}>
      {parts.map((part, i) => {
        switch (part.type) {
          case "purple":
            return <span key={i} style={{ color: 'hsl(var(--cyan))', fontWeight: 500 }}>{part.value}</span>
          case "card":
            return <span key={i} style={{ color: 'hsl(var(--cyan))', fontStyle: 'italic', cursor: 'default' }}>{part.value}</span>
          case "italic":
            return (
              <span key={i} style={{ fontStyle: 'italic' }}>
                {renderTextWithInlineMana(part.value, `italic-${i}`, symbolClassName, highlightText)}
              </span>
            )
          case "bold":
            return (
              <strong key={i} style={{ fontWeight: 600 }}>
                {renderTextWithInlineMana(part.value, `bold-${i}`, symbolClassName, highlightText)}
              </strong>
            )
          case "mana": {
            const symbolPath = getManaSymbolSvgPath(part.value)
            if (symbolPath) {
              return (
                <InlineSymbolImage
                  key={i}
                  src={symbolPath}
                  alt={part.value}
                  fallback={`{${part.value}}`}
                  className={symbolClassName}
                />
              )
            }
            return <React.Fragment key={i}>{`{${part.value}}`}</React.Fragment>
          }
          case 'chatSymbol': {
            const symbolPath = getMtgoChatSymbolImagePath(part.value)
            if (symbolPath) {
              return (
                <InlineSymbolImage
                  key={i}
                  src={symbolPath}
                  alt={part.value}
                  fallback={`[${part.value}]`}
                  className={symbolClassName}
                />
              )
            }
            return <React.Fragment key={i}>{`[${part.value}]`}</React.Fragment>
          }
          default:
            return <React.Fragment key={i}><HighlightedText text={part.value} highlight={highlightText} /></React.Fragment>
        }
      })}
    </span>
  )
}

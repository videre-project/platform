/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { motion, AnimatePresence } from "framer-motion"
import type { BoardState, CardState, BoardTransition, ReplayCardInteraction } from "../../../types/replay-types"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../../../primitives/Tooltip"
import { GameLogText } from "../../../utils/parse-game-log"
import {
  CARD_RATIO,
  CARD_TRANSITION,
  CardImg,
  CardTooltipContent,
  RevealedCardCell,
  cardSelectionClassName,
} from "./card-visuals"
import { m15FrameUrl as defaultM15FrameUrl } from "../../../assets"

const REVEAL_CARD_H = 140
const REVEAL_CARD_W = Math.floor(REVEAL_CARD_H * CARD_RATIO)
const REVEAL_OVERLAP = 0.88
const REVEAL_COL_GAP = 8
const REVEAL_VISIBLE_H = Math.floor(REVEAL_CARD_H * (1 - REVEAL_OVERLAP))

function RevealedColumnGrid({ cards }: { cards: CardState[] }) {
  const numCols = Math.min(5, Math.max(1, cards.length))
  const cardsPerCol = Math.ceil(cards.length / numCols)

  const columns: CardState[][] = Array.from({ length: numCols }, (_, i) =>
    cards.slice(i * cardsPerCol, (i + 1) * cardsPerCol)
  )

  const maxInCol = Math.max(...columns.map(c => c.length))
  const gridH = maxInCol <= 1 ? REVEAL_CARD_H : (maxInCol - 1) * REVEAL_VISIBLE_H + REVEAL_CARD_H
  const gridW = numCols * REVEAL_CARD_W + (numCols - 1) * REVEAL_COL_GAP

  return (
    <div className="relative" style={{ width: gridW, height: gridH }}>
      {columns.map((colCards, colIdx) =>
        colCards.map((card, rowIdx) => (
          <RevealedCardCell key={card.cardId} card={card} colIdx={colIdx} rowIdx={rowIdx} />
        ))
      )}
    </div>
  )
}

export function RevealedZoneOverlay({
  board,
  transition: _transition,
}: {
  board: BoardState
  transition: BoardTransition
}) {
  const revealedCards = board.zones.get("Revealed") ?? []
  const pile1 = board.zones.get("Pile1") ?? []
  const pile2 = board.zones.get("Pile2") ?? []
  const pile3 = board.zones.get("Pile3") ?? []

  const isPiles = pile1.length > 0 || pile2.length > 0 || pile3.length > 0
  const hasAny = revealedCards.length > 0 || isPiles

  const sections: { label: string; cards: CardState[] }[] = hasAny
    ? (isPiles
        ? ([
            pile1.length > 0 && { label: "Pile 1", cards: pile1 },
            pile2.length > 0 && { label: "Pile 2", cards: pile2 },
            pile3.length > 0 && { label: "Pile 3", cards: pile3 },
          ].filter(Boolean) as { label: string; cards: CardState[] }[])
        : [{ label: "Revealed", cards: revealedCards }])
    : []

  return (
    <AnimatePresence>
      {hasAny && (
        <motion.div
          key="revealed-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-x-0 top-0 z-20 flex justify-center pt-2 pointer-events-none"
        >
          <div className="bg-sidebar border border-sidebar-border/60 rounded-lg px-4 py-3 shadow-2xl pointer-events-auto">
            {sections.map(({ label, cards }) => (
              <div key={label} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                  <span className="text-[10px] text-muted-foreground/50">({cards.length})</span>
                </div>
                <RevealedColumnGrid cards={cards} />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Pending triggers are scene cards awaiting targets or ordering, not Stack items.
export function TriggeredAbilitiesOverlay({
  cards,
  cardFrameUrl = defaultM15FrameUrl,
}: {
  cards: ReplayCardInteraction[]
  cardFrameUrl?: string
}) {
  const sections = [
    { zone: "LocalTriggers", title: "Your Triggered Abilities" },
    { zone: "OpponentTriggers", title: "Opponent's Triggered Abilities" },
  ].map(section => ({ ...section, cards: cards.filter(card => card.zone === section.zone) }))
    .filter(section => section.cards.length > 0)

  if (sections.length === 0) return null

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 max-h-[90%] overflow-auto">
      {sections.map(section => (
        <section key={section.zone} aria-label={section.title}
          className="bg-sidebar border border-sidebar-border/60 rounded-lg px-4 py-3 shadow-2xl">
          <h3 className="text-[10px] font-semibold text-muted-foreground mb-2.5">
            {section.title} <span className="text-muted-foreground/50">({section.cards.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2 max-w-[480px]">
            {section.cards.map(card => (
              <TooltipProvider key={card.logicalAddress} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div data-trigger-address={card.logicalAddress}
                      className={[
                        "rounded-md overflow-hidden border border-sidebar-border/60",
                        cardSelectionClassName({ interaction: card }),
                        card.isActive === false && !card.isBeingCast ? "brightness-50" : "",
                      ].filter(Boolean).join(" ")}
                      style={{ height: STACK_CARD_H, width: STACK_CARD_W }}>
                      <AbilityCardFace name={card.name ?? "Triggered Ability"}
                        rulesText={card.rulesText} catalogId={card.catalogId ?? null}
                        type="Triggered Ability" cardFrameUrl={cardFrameUrl} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <div className="font-semibold">{card.name ?? "Triggered Ability"}</div>
                    <GameLogText text={card.rulesText ?? ""} />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function AbilityCardFace({ name, rulesText, catalogId, type, cardFrameUrl }: {
  name: string
  rulesText?: string | null
  catalogId: number | null
  type: "Triggered Ability" | "Activated Ability"
  cardFrameUrl: string
}) {
  return (
    <div className="w-full h-full relative">
      <img src={cardFrameUrl} alt="" className="absolute inset-0 w-full h-full z-10 pointer-events-none" style={{ filter: 'brightness(0.3)' }} />
      <CardImg catalogId={catalogId} alt={name} className="absolute inset-0 w-full h-full object-cover z-0" />
      <div className="absolute z-20 flex items-center px-1.5 truncate" style={{ top: '3%', left: '5%', right: '5%', height: '12%' }}>
        <span className="text-[7px] font-bold text-foreground leading-none truncate">{name}</span>
      </div>
      <div className="absolute z-20 flex items-center px-1.5" style={{ top: '55%', left: '5%', right: '5%', height: '10%' }}>
        <span className="text-[6px] font-semibold text-foreground/80 leading-none">{type}</span>
      </div>
      <div className="absolute z-20 overflow-hidden px-1.5 py-0.5" style={{ top: '64.5%', left: '5%', right: '5%', bottom: '5%' }}>
        <span className="text-[6px] text-foreground/70 leading-tight line-clamp-4">
          <GameLogText text={rulesText ?? ""} manaSymbolClassName="inline h-[6px] w-[6px] align-text-bottom mx-[0.5px]" />
        </span>
      </div>
    </div>
  )
}

// -- Stack overlay --

const STACK_CARD_H = 120
const STACK_CARD_W = Math.floor(STACK_CARD_H * CARD_RATIO)
const STACK_MIN_OVERLAP = 20

export type StackHoverRelation = {
  sourceCardId: number
  targetIds: number[]
}

export function StackOverlay({
  cards,
  transition: _transition,
  onHoverCard,
  activeSourceCardId,
  cardFrameUrl = defaultM15FrameUrl,
}: {
  cards: CardState[]
  transition: BoardTransition
  /** Called with stack source + targets when hovering a stack card, null on leave. */
  onHoverCard?: (relation: StackHoverRelation | null) => void
  /** Active source card ID for source highlight treatment. */
  activeSourceCardId?: number | null
  cardFrameUrl?: string
}) {
  const hasStack = cards.length > 0

  // The engine keeps the stack in MTGO order, bottom-to-top by ThingID.
  // Render that order left-to-right so the top/resolving item is on the right.
  const orderedForDisplay = [...cards].sort((a, b) => a.cardId - b.cardId)
  const count = orderedForDisplay.length
  const maxW = 480
  const naturalW = count * STACK_CARD_W + (count - 1) * 4
  const offset = naturalW > maxW
    ? Math.max(STACK_MIN_OVERLAP, (maxW - STACK_CARD_W) / (count - 1))
    : STACK_CARD_W
  const containerW = count <= 1 ? STACK_CARD_W : offset * (count - 1) + STACK_CARD_W

  return (
    <AnimatePresence>
    {hasStack && (
    <motion.div
      key="stack-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-y-0 right-0 z-20 flex items-center pr-4"
    >
      <div className="bg-sidebar border border-sidebar-border/60 rounded-lg px-4 py-3 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Stack <span className="text-muted-foreground/50 font-normal">({count})</span>
          </span>
        </div>

        {/* Cards laid out left-to-right, resolving card on the right */}
        <div className="relative" style={{ height: STACK_CARD_H, width: containerW }}>
          <AnimatePresence>
          {orderedForDisplay.map((card, i) => {
            const isTop = i === count - 1 // rightmost = resolves next
            const targets = card.associations?.ActionTarget
            const hasTargets = !!targets && targets.length > 0
            const sourceHighlighted = hasTargets && activeSourceCardId === card.cardId
            return (
              <motion.div
                data-card-id={card.cardId}
                key={card.cardId}
                layoutId={(card.isTriggeredAbility || card.isActivatedAbility) ? undefined : `card-${card.lineageId}`}
                layout
                transition={CARD_TRANSITION}
                className={[
                  "absolute top-0 rounded-md overflow-hidden border",
                  sourceHighlighted
                    ? "border-blue-400/80 ring-2 ring-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.6)]"
                    : isTop ? "border-sidebar-accent" : "border-sidebar-border/60",
                  !sourceHighlighted
                    ? cardSelectionClassName(card) || (isTop ? "ring-1 ring-sidebar-accent/60" : "")
                    : "",
                  card.isDimmed ? "brightness-50" : "",
                ].filter(Boolean).join(" ")}
                style={{
                  left: i * offset,
                  width: STACK_CARD_W,
                  height: STACK_CARD_H,
                  zIndex: i + 1,
                }}
                onMouseEnter={() => {
                  if (targets && targets.length > 0) {
                    onHoverCard?.({ sourceCardId: card.cardId, targetIds: targets })
                  }
                }}
                onMouseLeave={() => onHoverCard?.(null)}
              >
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full h-full">
                        {(card.isTriggeredAbility || card.isActivatedAbility) ? (
                          <AbilityCardFace
                            name={card.name}
                            rulesText={card.rulesText}
                            catalogId={card.catalogId}
                            type={card.isTriggeredAbility ? "Triggered Ability" : "Activated Ability"}
                            cardFrameUrl={cardFrameUrl}
                          />
                        ) : (
                          <CardImg
                            catalogId={card.catalogId}
                            alt={card.name}
                            fallback={
                              <div className="w-full h-full bg-muted/80 flex flex-col items-center justify-center p-1">
                                <span className="text-[8px] font-semibold text-muted-foreground text-center leading-tight">
                                  {card.name}
                                </span>
                                {card.rulesText && (
                                  <span className="text-[7px] text-muted-foreground/70 text-center leading-tight mt-0.5 line-clamp-3">
                                    <GameLogText text={card.rulesText} manaSymbolClassName="inline h-[7px] w-[7px] align-text-bottom mx-[0.5px]" />
                                  </span>
                                )}
                              </div>
                            }
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <CardTooltipContent card={card} footer={
                        <div className="text-muted-foreground/60 text-[10px]">
                          {isTop ? "Resolves next" : `Resolves in ${count - i} steps`}
                        </div>
                      } />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            )
          })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  )
}

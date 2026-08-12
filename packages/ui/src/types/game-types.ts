/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export interface TargetSet {
  reminderText?: string
  description?: string
  minimumTargets?: number
  maximumTargets?: number
  isSet?: boolean
  currentTargets?: string[]
  targetRequirements?: unknown
}

export interface Distribution {
  target?: string
  amount?: number
  minimum?: number
  maximum?: number
}

export interface CardSelectorChoice {
  name?: string
  id?: number
}

export interface NamedValue {
  name?: string
  value?: number
}

export interface BaseAction {
  $type: string
  name?: string
  actionId?: number
  type?: string
  response?: string | number | boolean | null
}

export interface CardAction extends BaseAction {
  $type: "CardAction"
  card?: string
  targets?: TargetSet[]
  requiresTargets?: boolean
  isTargetsSet?: boolean
  isManaAbility?: boolean
}

export interface DistributingCardAction extends BaseAction {
  $type: "DistributingCardAction"
  card?: string
  targets?: TargetSet[]
  requiresTargets?: boolean
  isTargetsSet?: boolean
  isManaAbility?: boolean
  areTargetsEditable?: boolean
  minimumTotal?: number
  maximumTotal?: number
}

export interface SelectFromListAction extends BaseAction {
  $type: "SelectFromListAction"
  itemType?: string
  availableItems?: NamedValue[]
  selectedItem?: NamedValue
}

export interface NumericAction extends BaseAction {
  $type: "NumericAction"
  chosenNumber?: number
  minimum?: number
  maximum?: number
  initial?: number
}

export interface OrderingAction extends BaseAction {
  $type: "OrderingAction"
  source?: string
  orderedTargets?: string[]
}

export interface SelectPlayerAction extends BaseAction {
  $type: "SelectPlayerAction"
  availablePlayers?: string[]
  selectedPlayer?: string
}

export interface CombatDamageAssignmentAction extends BaseAction {
  $type: "CombatDamageAssignmentAction"
  source?: string
  distributions?: Distribution[]
  minimumTotal?: number
  maximumTotal?: number
}

export interface CardSelectorAction extends BaseAction {
  $type: "CardSelectorAction"
  choices?: CardSelectorChoice[]
  selectedCard?: number
}

export interface CardWishAction extends BaseAction {
  $type: "CardWishAction"
  wishedCard?: unknown
}

export interface FunctionKeyMessageAction extends BaseAction {
  $type: "FunctionKeyMessageAction"
  key?: string
}

export interface ToggleMessageAction extends BaseAction {
  $type: "ToggleMessageAction"
  key?: string
  toggleState?: boolean
}

export interface PrimitiveAction extends BaseAction {
  $type: "PrimitiveAction"
}

export interface ConcedeGameAction extends BaseAction {
  $type: "ConcedeGameAction"
}

export interface LocalAction extends BaseAction {
  $type: "LocalAction"
}

export interface UndoAction extends BaseAction {
  $type: "UndoAction"
}

export type GameAction =
  | CardAction
  | DistributingCardAction
  | SelectFromListAction
  | NumericAction
  | OrderingAction
  | SelectPlayerAction
  | CombatDamageAssignmentAction
  | CardSelectorAction
  | CardWishAction
  | FunctionKeyMessageAction
  | ToggleMessageAction
  | PrimitiveAction
  | ConcedeGameAction
  | LocalAction
  | UndoAction

export function parseCardName(cardStr: string | null | undefined): string | null {
  if (!cardStr) return null
  const paren = cardStr.indexOf(" (ID:")
  return paren > 0 ? cardStr.slice(0, paren) : cardStr
}

export function isCardAction(action: GameAction): action is CardAction | DistributingCardAction {
  return (action.$type === 'CardAction' || action.$type === 'DistributingCardAction')
    && action.card != null
}

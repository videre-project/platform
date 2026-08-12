/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

// Primitives
export { Badge, badgeVariants } from './primitives/Badge'
export type { BadgeProps } from './primitives/Badge'
export { Button, buttonVariants } from './primitives/Button'
export type { ButtonProps } from './primitives/Button'
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './primitives/Card'
export { Input } from './primitives/Input'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './primitives/Select'
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './primitives/DropdownMenu'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './primitives/Tooltip'
export { Skeleton } from './primitives/Skeleton'
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './primitives/Table'
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './primitives/Popover'
export { Separator } from './primitives/Separator'
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './primitives/Collapsible'
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './primitives/Breadcrumb'
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './primitives/Sheet'
export { ScrollArea, ScrollBar } from './primitives/ScrollArea'
export { CustomScrollArea } from './primitives/CustomScrollArea'
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './primitives/Sidebar'

// Filters
export { GameTypeFormatFilter } from './components/filters/GameTypeFormatFilter'
export type { GameType, GameTypeFormatFilterProps } from './components/filters/GameTypeFormatFilter'
export { CardFilterPanel } from './components/filters/CardFilterPanel'
export type { CardFilterPanelProps } from './components/filters/CardFilterPanel'

// Tables
export { DataTable } from './components/tables/DataTable'
export type { DataTableProps } from './components/tables/DataTable'
export { DataTablePagination } from './components/tables/DataTablePagination'
export type { DataTablePaginationProps } from './components/tables/DataTablePagination'
export { TableBodySkeleton } from './components/tables/TableBodySkeleton'
export type { TableBodySkeletonProps } from './components/tables/TableBodySkeleton'

// Date
export { Calendar } from './components/date/Calendar'
export type { CalendarProps } from './components/date/Calendar'
export { DatePickerWithRange } from './components/date/DatePickerWithRange'
export type { DatePickerWithRangeProps } from './components/date/DatePickerWithRange'

// Reusable card components
export { CardImage } from './components/cards/CardImage'
export type { CardImageProps } from './components/cards/CardImage'
export { CatalogCardImage } from './components/cards/CatalogCardImage'
export type { CatalogCardImageProps } from './components/cards/CatalogCardImage'
export { VanguardAvatar } from './components/cards/VanguardAvatar'
export type { VanguardAvatarProps } from './components/cards/VanguardAvatar'
export { CardMediaProvider, useCardMedia } from './components/cards/CardMediaProvider'
export type {
  CardFaceInfo,
  CardMediaContextValue,
  CardMediaProviderProps,
  CardMediaRequest,
  CardMediaServices,
} from './components/cards/CardMediaProvider'
export { CardTooltipProvider, useCardTooltipHover } from './components/cards/CardTooltip'
export type {
  CardTooltipData,
  CardTooltipProviderProps,
} from './components/cards/CardTooltip'

// Reusable deck preview
export { DeckGalleryTile } from './components/decks/DeckGalleryTile'

// Composed layouts
export { CollectionLayout } from './layouts/CollectionLayout'
export { MatchDetailsLayout } from './layouts/MatchDetailsLayout'
export type { MatchDetailsLayoutProps } from './layouts/MatchDetailsLayout'
export { ReplayLayout } from './layouts/ReplayLayout'
export type { ReplayLayoutProps } from './layouts/ReplayLayout'
export { TradeHistoryLayout } from './layouts/TradeHistoryLayout'
export { TradesLayout } from './layouts/TradesLayout'
export { DashboardLayout } from './layouts/DashboardLayout'
export { HistoryLayout } from './layouts/HistoryLayout'
export type {
  HistoryLayoutProps,
  HistoryPagination,
  MatchHistoryItem,
} from './types/history'
export { GameLogLayout } from './layouts/GameLogLayout'
export { EventsLayout } from './layouts/EventsLayout'
export { EventDetailsLayout } from './layouts/EventDetailsLayout'
export { DecksLayout } from './layouts/DecksLayout'
export { DeckEditorLayout } from './layouts/DeckEditorLayout'

// Non-visual state
export { ReplayStateEngine } from './state/ReplayStateEngine'
export { backfaceUrl, m15FrameUrl } from './assets'

// Shared rendering and asset helpers
export { HighlightedText } from './utils/highlighted-text'
export { GameLogText, parseGameLogMarkup } from './utils/parse-game-log'
export {
  ALL_TYPES as GAME_LOG_ALL_TYPES,
  TYPE_CONFIG as GAME_LOG_TYPE_CONFIG,
  TYPE_ORDER as GAME_LOG_TYPE_ORDER,
  compareLogEntries,
  formatDataAsText,
  formatLogDelta,
  formatLogTime,
  GameLogDataHeader,
  renderData,
} from './utils/game-log-rendering'
export { getManaSymbolSvgPath } from './utils/mana-symbols'
export { getProductImageUrl } from './utils/videre-cdn'
export {
  CARD_FORMATS,
  compareFormats,
  getFormatBackgroundColor,
  getFormatDotColor,
  getFormatLabel,
  isLimitedFormat,
} from './utils/formats'
export type { CardSearchFormat } from './utils/formats'
export { getDisplayCardColors } from './utils/card-colors'
export {
  CARD_COLORS,
  CARD_COLOR_MODES,
  CARD_LEGALITIES,
  CARD_RARITIES,
  CARD_SEARCH_TEXT_MODES,
  CARD_TYPE_FILTERS,
  COLORLESS_CARD_COLOR,
  DEFAULT_CARD_FILTERS,
  buildCardSearchQuery,
  getActiveCardFilterCount,
  titleCaseCardFilter,
} from './utils/card-search-model'
export type {
  CardBooleanMode,
  CardColor,
  CardColorMode,
  CardComparisonOperator,
  CardFilterState,
  CardFormatFilter,
  CardLegalityFilter,
  CardRarityFilter,
  CardSearchTextMode,
  CardTokenFilterMode,
  CardTypeFilter,
  CardTypeFilterState,
} from './utils/card-search-model'
// Public data contracts
export type {
  CollectionCardEntry,
  CollectionGridItem,
  CollectionLayoutProps,
  CollectionPriceHistoryPoint,
  CollectionProductEntry,
  CollectionSelection,
  CollectionSortDirection,
  CollectionSortMode,
  CollectionViewMode,
} from './types/collection'
export type {
  MatchDetailsCard,
  MatchDetailsData,
  MatchDetailsGame,
} from './types/match'
export type {
  TradeAttributionStatus,
  TradeEscrowItemRole,
  TradeEscrowKind,
  TradeEscrowResult,
  TradeHistoryDetail,
  TradeHistoryEffect,
  TradeHistoryError,
  TradeHistoryItem,
  TradeHistoryLayoutProps,
  TradeHistoryMessage,
  TradePartnerAvatar,
  TradeHistorySummary,
} from './types/trade'
export type {
  TradePartner,
  TradePost,
  TradePostFormatFilter,
  TradePostsPagination,
  TradeView,
  TradesLayoutProps,
} from './types/trades-page'
export type {
  DashboardArchetype,
  DashboardGameType,
  DashboardLayoutProps,
  DashboardStats,
  PerformanceTrendPoint,
} from './types/dashboard'
export type {
  CardChangeData,
  DamageAssignment,
  DamageAssignmentTarget,
  GameLogDTO,
  GameLogEntry,
  GameLogLayoutProps,
  GameLogTimePrecision,
  GameLogType,
  GameStateData,
  PlayerChangeData,
  ZoneTransferData,
} from './types/game-log'
export type {
  EventDetailExtras,
  EventDetailsLayoutProps,
  EventStatus,
  EventType,
  EventsLayoutProps,
  StandingEntry,
  TournamentEvent,
  TournamentPhase,
  TournamentState,
} from './types/events'
export type {
  DeckCardDragEndPayload,
  DeckCardEntry,
  DeckCardSearchResult,
  DeckDiffEntry,
  DeckEditorCard,
  DeckEditorLayoutProps,
  DeckFeaturedCard,
  DeckGalleryItem,
  DeckHistoryChange,
  DeckHistoryData,
  DeckHistoryRevision,
  DeckMatchStats,
  DeckSidePanelView,
  DeckSortMode,
  DecksLayoutProps,
  DeckZone,
} from './types/decks'
export {
  getDeckMatchStats,
  getSortModeColumns,
  groupCardsBySortMode,
  sortCardsBySortMode,
  unrollCards,
} from './utils/deck-sortable'
export { getStackPeekOffset } from './utils/card-layout'
export { getCardStatText } from './utils/card-stats'
export * from './types/game-types'
export * from './types/replay-types'

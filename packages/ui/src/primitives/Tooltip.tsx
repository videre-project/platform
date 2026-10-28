/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { TooltipCaret } from './TooltipCaret'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }
>(({ className, sideOffset = 4, showArrow = false, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={[
        "z-50 overflow-visible rounded-md border border-sidebar-border/70 bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
      {showArrow && <TooltipPrimitive.Arrow asChild width={12} height={6}>
        <TooltipCaret data-tooltip-caret className="overflow-visible fill-popover stroke-sidebar-border/70" />
      </TooltipPrimitive.Arrow>}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button, type ButtonProps } from '../../primitives/Button'
import { Popover, PopoverContent, PopoverTrigger } from '../../primitives/Popover'
import { cn } from '../../lib/cn'
import { Calendar } from './Calendar'

export type DatePickerWithRangeProps = {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  className?: string
  presets?: { label: string; getValue: () => DateRange | undefined }[]
  size?: ButtonProps['size']
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  presets,
  size,
}: React.HTMLAttributes<HTMLDivElement> & DatePickerWithRangeProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size={size}
            className={cn(
              'justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>All Time</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {presets && (
              <div className="flex min-w-[140px] flex-col gap-2 border-r border-border p-2">
                {presets.map(preset => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-left font-normal"
                    onClick={() => setDate(preset.getValue())}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

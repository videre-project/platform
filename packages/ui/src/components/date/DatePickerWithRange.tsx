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
  const [isMobile, setIsMobile] = React.useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches
  ))

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 560px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

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
        <PopoverContent
          className="w-auto p-0 max-[560px]:max-w-[calc(100vw-1rem)] max-[560px]:overflow-hidden"
          align="end"
        >
          <div className="flex max-[560px]:flex-col">
            {presets && (
              <div className="flex min-w-[140px] flex-col gap-2 border-r border-border p-2 max-[560px]:grid max-[560px]:min-w-0 max-[560px]:grid-cols-3 max-[560px]:border-r-0 max-[560px]:border-b">
                {presets.map(preset => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-left font-normal max-[560px]:min-w-0 max-[560px]:px-2"
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
              numberOfMonths={isMobile ? 1 : 2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

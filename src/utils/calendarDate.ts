/**
 * Extracts the calendar-date portion of an API date value.
 *
 * Event dates are dates, not instants. The API currently serializes its SQL
 * DATE values as midnight-UTC timestamps, so passing them directly to Date
 * can display the previous day in western time zones.
 */
export function getCalendarDate(value: string) {
  return value.slice(0, 10)
}

export function formatCalendarDate(value: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = getCalendarDate(value).split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(
    Date.UTC(year, month - 1, day),
  )
}

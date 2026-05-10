import { formatDistanceToNow, type FormatDistanceToNowOptions } from 'date-fns'
import { useDateFnsLocale } from './use-date-fns-locale'

/**
 * Returns a formatter that produces a localized "X ago" string. Defaults to
 * `addSuffix: true`. Accepts an ISO string or a Date.
 *
 *   const formatRelative = useRelativeDate()
 *   formatRelative(log.createdAt)      // "il y a 2 heures"
 *   formatRelative(date, { addSuffix: false })  // "2 heures"
 */
export function useRelativeDate() {
  const locale = useDateFnsLocale()

  return (date: string | Date, options?: FormatDistanceToNowOptions) =>
    formatDistanceToNow(typeof date === 'string' ? new Date(date) : date, {
      addSuffix: true,
      locale,
      ...options,
    })
}

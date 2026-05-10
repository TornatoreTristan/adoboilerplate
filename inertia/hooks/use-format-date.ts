import { useCallback } from 'react'
import { useI18n } from './use-i18n'

export type DateFormatPreset =
  | 'short' // 12/03/2026
  | 'medium' // 12 mars 2026
  | 'long' // 12 mars 2026  (long month)
  | 'full' // jeudi 12 mars 2026
  | 'datetime' // 12 mars 2026, 14:30
  | 'datetime-long' // jeudi 12 mars 2026 à 14:30:45

const PRESETS: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
  'short': { dateStyle: 'short' },
  'medium': { dateStyle: 'medium' },
  'long': { year: 'numeric', month: 'long', day: 'numeric' },
  'full': { dateStyle: 'full' },
  'datetime': { dateStyle: 'medium', timeStyle: 'short' },
  'datetime-long': { dateStyle: 'full', timeStyle: 'long' },
}

/**
 * Locale-aware date formatter. Pass a preset name or raw
 * `Intl.DateTimeFormatOptions`. Accepts an ISO string or a Date.
 *
 *   const formatDate = useFormatDate()
 *   formatDate(user.createdAt, 'datetime')      // 12 mars 2026, 14:30
 *   formatDate(invoice.date, 'long')            // 12 mars 2026
 *   formatDate(log.createdAt, { hour: '2-digit', minute: '2-digit' })
 */
export function useFormatDate() {
  const { locale } = useI18n()
  const intlLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  return useCallback(
    (
      date: string | Date,
      formatOrOptions: DateFormatPreset | Intl.DateTimeFormatOptions = 'medium'
    ) => {
      const options =
        typeof formatOrOptions === 'string' ? PRESETS[formatOrOptions] : formatOrOptions
      return new Intl.DateTimeFormat(intlLocale, options).format(
        typeof date === 'string' ? new Date(date) : date
      )
    },
    [intlLocale]
  )
}

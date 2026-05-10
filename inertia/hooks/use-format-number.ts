import { useCallback } from 'react'
import { useI18n } from './use-i18n'

/**
 * Locale-aware number formatter.
 *
 *   const formatNumber = useFormatNumber()
 *   formatNumber(1234567)                              // "1 234 567" (fr)
 *   formatNumber(0.42, { style: 'percent' })           // "42 %"
 *   formatNumber(3.5, { maximumFractionDigits: 1 })    // "3,5"
 */
export function useFormatNumber() {
  const { locale } = useI18n()
  const intlLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  return useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, options).format(value),
    [intlLocale]
  )
}

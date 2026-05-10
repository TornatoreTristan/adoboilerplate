import { useCallback } from 'react'
import { useI18n } from './use-i18n'

/**
 * Locale-aware currency formatter.
 *
 *   const formatCurrency = useFormatCurrency()
 *   formatCurrency(12.99, 'EUR')   // "12,99 €" (fr) / "€12.99" (en)
 *   formatCurrency(1234, 'USD', { maximumFractionDigits: 0 })  // "1 234 $US"
 */
export function useFormatCurrency() {
  const { locale } = useI18n()
  const intlLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  return useCallback(
    (amount: number, currency: string, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency,
        ...options,
      }).format(amount),
    [intlLocale]
  )
}

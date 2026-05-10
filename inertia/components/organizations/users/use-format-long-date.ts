import { useI18n } from '@/hooks/use-i18n'

/**
 * Locale-aware "20 mars 2025" / "March 20, 2025" formatter shared by
 * the members table, invitations table and view dialog.
 */
export function useFormatLongDate() {
  const { locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  return (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
}

import { fr, enUS, type Locale } from 'date-fns/locale'
import { useI18n } from './use-i18n'

export function useDateFnsLocale(): Locale {
  const { locale } = useI18n()
  return locale === 'en' ? enUS : fr
}

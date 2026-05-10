import { useFormatDate } from '@/hooks/use-format-date'

/**
 * Backwards-compatible alias for `useFormatDate()` returning the `'long'`
 * preset ("20 mars 2025" / "March 20, 2025"). Prefer `useFormatDate()`
 * directly in new code.
 */
export function useFormatLongDate() {
  const formatDate = useFormatDate()
  return (iso: string) => formatDate(iso, 'long')
}

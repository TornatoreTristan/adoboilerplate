import { router } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Options<TFilters extends Record<string, string | undefined>> {
  url: string
  initial: TFilters
  initialPage?: number
  only?: string[]
  searchDebounceMs?: number
}

/**
 * Synchronise les filtres de table avec l'URL via Inertia partial reloads.
 *
 * - `filters`/`page` sont la source de vérité (UI controlled).
 * - `setSearch` debounce automatiquement avant de naviguer.
 * - `setFilter`/`setPage` naviguent immédiatement.
 */
export function useInertiaTableQuery<TFilters extends Record<string, string | undefined>>({
  url,
  initial,
  initialPage = 1,
  only,
  searchDebounceMs = 300,
}: Options<TFilters>) {
  const [filters, setFilters] = useState<TFilters>(initial)
  const [page, setPageState] = useState<number>(initialPage)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const navigate = useCallback(
    (nextFilters: TFilters, nextPage: number) => {
      const params: Record<string, string> = {}
      for (const [key, value] of Object.entries(nextFilters)) {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = String(value)
        }
      }
      if (nextPage > 1) params.page = String(nextPage)

      router.get(url, params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        ...(only ? { only } : {}),
      })
    },
    [url, only]
  )

  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      const next = { ...filters, [key]: value }
      setFilters(next)
      setPageState(1)
      navigate(next, 1)
    },
    [filters, navigate]
  )

  const setSearch = useCallback(
    (key: keyof TFilters, value: string) => {
      const next = { ...filters, [key]: value as TFilters[typeof key] }
      setFilters(next)
      setPageState(1)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => navigate(next, 1), searchDebounceMs)
    },
    [filters, navigate, searchDebounceMs]
  )

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState(nextPage)
      navigate(filters, nextPage)
    },
    [filters, navigate]
  )

  return { filters, page, setFilter, setSearch, setPage }
}

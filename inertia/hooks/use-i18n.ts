import { usePage } from '@inertiajs/react'

type Messages = { [key: string]: string | Messages }

interface I18nData {
  locale: string
  messages: Messages
}

export function useI18n() {
  const { i18n } = usePage<{ i18n: I18nData }>().props

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: string | Messages = i18n.messages

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key // Return key if translation not found
      }
    }

    if (typeof value !== 'string') {
      return key
    }

    // Simple replacement for ICU format like {name}
    if (replacements) {
      return value.replace(/\{(\w+)\}/g, (match, placeholder) => {
        return replacements[placeholder] !== undefined ? String(replacements[placeholder]) : match
      })
    }

    return value
  }

  return {
    t,
    locale: i18n.locale,
  }
}

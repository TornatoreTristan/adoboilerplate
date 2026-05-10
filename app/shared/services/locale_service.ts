import { injectable } from 'inversify'
import { HttpContext } from '@adonisjs/core/http'
import type { TranslatableField, TranslatableFieldNullable } from '#shared/helpers/translatable'
import app from '@adonisjs/core/services/app'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

@injectable()
export default class LocaleService {
  private defaultLocale: 'fr' | 'en' = 'fr'
  private cache: Map<string, Record<string, any>> = new Map()

  getCurrentLocale(): 'fr' | 'en' {
    try {
      const ctx = HttpContext.getOrFail()
      const locale = ctx.i18n?.locale || this.defaultLocale
      return locale as 'fr' | 'en'
    } catch {
      return this.defaultLocale
    }
  }

  translate(
    field: TranslatableField | TranslatableFieldNullable | null | undefined,
    locale?: 'fr' | 'en'
  ): string {
    if (!field) return ''

    const currentLocale = locale || this.getCurrentLocale()
    const fallbackLocale = currentLocale === 'fr' ? 'en' : 'fr'

    return field[currentLocale] || field[fallbackLocale] || ''
  }

  translateArray(
    fields: (TranslatableField | TranslatableFieldNullable | null | undefined)[],
    locale?: 'fr' | 'en'
  ): string[] {
    return fields.map((field) => this.translate(field, locale))
  }

  createField(fr: string, en: string): TranslatableField {
    return { fr, en }
  }

  async getMessages(locale: string): Promise<Record<string, any>> {
    const cacheKey = locale

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const messages: Record<string, any> = {}
    const languagePath = join(app.languageFilesPath(), locale)

    try {
      // Load all JSON files for the locale
      const namespaces = ['common', 'auth', 'admin', 'account', 'notifications', 'organizations']

      for (const namespace of namespaces) {
        try {
          const filePath = join(languagePath, `${namespace}.json`)
          const content = await readFile(filePath, 'utf-8')
          messages[namespace] = JSON.parse(content)
        } catch (error) {
          // Namespace file doesn't exist, skip it
          continue
        }
      }

      this.cache.set(cacheKey, messages)
      return messages
    } catch (error) {
      console.error(`Failed to load messages for locale: ${locale}`, error)
      return {}
    }
  }

  clearCache() {
    this.cache.clear()
  }
}

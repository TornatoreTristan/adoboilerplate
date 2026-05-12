export type TranslatableField = {
  fr: string
  en: string
}

export type TranslatableFieldNullable = {
  fr?: string | null
  en?: string | null
}

export function getTranslation(
  field: TranslatableField | TranslatableFieldNullable | null | undefined,
  locale: 'fr' | 'en' = 'fr',
  fallbackLocale: 'fr' | 'en' = 'fr'
): string {
  if (!field) return ''

  return field[locale] || field[fallbackLocale] || ''
}

export function createTranslatableField(fr: string, en: string): TranslatableField {
  return { fr, en }
}

export function isTranslatableField(value: unknown): value is TranslatableField {
  return typeof value === 'object' && value !== null && ('fr' in value || 'en' in value)
}

export function validateTranslatableField(
  field: unknown,
  required: boolean = true
): { isValid: boolean; error?: string } {
  if (!field) {
    return required ? { isValid: false, error: 'Field is required' } : { isValid: true }
  }

  if (!isTranslatableField(field)) {
    return { isValid: false, error: 'Field must be a translatable object with fr and en keys' }
  }

  if (required && !field.fr && !field.en) {
    return { isValid: false, error: 'At least one translation (fr or en) is required' }
  }

  return { isValid: true }
}

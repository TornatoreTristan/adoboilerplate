import { type DateTime } from 'luxon'
import type { SupportedLocale } from '#mailing/types/email'

export interface CreateUserData {
  email: string
  password: string
  fullName?: string
  locale?: SupportedLocale
}

export interface User {
  id: string
  email: string
  password: string
  createdAt?: DateTime
  updatedAt?: DateTime
}
